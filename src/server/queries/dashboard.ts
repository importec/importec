import { prisma } from "@/server/db";
import { productTitle } from "@/lib/format";

const ACTIVE_STATUSES = ["AVAILABLE", "RESERVED", "IN_REVIEW"] as const;
const STALE_DAYS = 45;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function startOfPrevMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export async function getDashboardData() {
  const now = new Date();
  const [
    ownedActive,
    consignedActive,
    byCategory,
    staleUnits,
    totalAvailable,
    salesToday,
    salesThisMonth,
    salesLastMonth,
    stockLots,
  ] = await Promise.all([
      prisma.inventoryUnit.findMany({
        where: { ownerType: "COMPANY", status: { in: [...ACTIVE_STATUSES] } },
        select: { cost: true, listPrice: true, product: { select: { currency: true } } },
      }),
      prisma.inventoryUnit.findMany({
        where: { ownerType: "CONSIGNMENT", status: { in: [...ACTIVE_STATUSES] } },
        select: { listPrice: true, product: { select: { currency: true } } },
      }),
      prisma.inventoryUnit.groupBy({
        by: ["productId"],
        where: { status: "AVAILABLE" },
        _count: true,
      }),
      prisma.inventoryUnit.findMany({
        where: {
          status: "AVAILABLE",
          createdAt: { lt: new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000) },
        },
        include: { product: true },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
      prisma.inventoryUnit.count({ where: { status: "AVAILABLE" } }),
      prisma.sale.groupBy({
        by: ["currency"],
        where: { status: "CONFIRMED", createdAt: { gte: startOfDay(now) } },
        _sum: { total: true, profitTotal: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["currency"],
        where: { status: "CONFIRMED", createdAt: { gte: startOfMonth(now) } },
        _sum: { total: true, profitTotal: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ["currency"],
        where: {
          status: "CONFIRMED",
          createdAt: { gte: startOfPrevMonth(now), lt: startOfMonth(now) },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.stockLot.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: true },
      }),
    ]);

  const products = await prisma.product.findMany({
    where: { id: { in: byCategory.map((row) => row.productId) } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const categoryTotals = new Map<string, number>();
  for (const row of byCategory) {
    const product = productById.get(row.productId);
    if (!product) continue;
    categoryTotals.set(
      product.category,
      (categoryTotals.get(product.category) ?? 0) + row._count,
    );
  }

  // Nunca se suma USD y ARS en una misma cifra: se agrupa por moneda, igual
  // que ya se hacia con las ventas.
  type MoneyByCurrency = Map<string, { invested: number; potential: number }>;
  const byCurrency: MoneyByCurrency = new Map();
  const addMoney = (currency: string, invested: number, potential: number) => {
    const existing = byCurrency.get(currency) ?? { invested: 0, potential: 0 };
    existing.invested += invested;
    existing.potential += potential;
    byCurrency.set(currency, existing);
  };

  for (const unit of ownedActive) {
    addMoney(unit.product.currency, unit.cost.toNumber(), unit.listPrice.toNumber());
  }

  let lotUnitsCount = 0;
  for (const lot of stockLots) {
    const invested = lot.avgCost.toNumber() * lot.quantity;
    const potential = (lot.product.listPrice?.toNumber() ?? lot.avgCost.toNumber()) * lot.quantity;
    addMoney(lot.product.currency, invested, potential);
    lotUnitsCount += lot.quantity;
    categoryTotals.set(lot.product.category, (categoryTotals.get(lot.product.category) ?? 0) + lot.quantity);
  }

  const investedCapital = Array.from(byCurrency.entries()).map(([currency, v]) => ({
    currency: currency as "USD" | "ARS",
    value: v.invested,
  }));
  const potentialRevenue = Array.from(byCurrency.entries()).map(([currency, v]) => ({
    currency: currency as "USD" | "ARS",
    value: v.potential,
  }));
  const potentialProfit = Array.from(byCurrency.entries()).map(([currency, v]) => ({
    currency: currency as "USD" | "ARS",
    value: v.potential - v.invested,
  }));

  const consignedValueByCurrency = new Map<string, number>();
  for (const unit of consignedActive) {
    consignedValueByCurrency.set(
      unit.product.currency,
      (consignedValueByCurrency.get(unit.product.currency) ?? 0) + unit.listPrice.toNumber(),
    );
  }
  const consignedValue = Array.from(consignedValueByCurrency.entries()).map(([currency, value]) => ({
    currency: currency as "USD" | "ARS",
    value,
  }));

  const toSalesSummary = (rows: typeof salesToday) =>
    rows.map((row) => ({
      currency: row.currency,
      count: row._count,
      total: row._sum.total?.toNumber() ?? 0,
      profit: row._sum.profitTotal?.toNumber() ?? 0,
    }));

  const lastMonthByCurrency = new Map(
    salesLastMonth.map((row) => [row.currency, row._sum.total?.toNumber() ?? 0]),
  );
  const salesThisMonthWithTrend = toSalesSummary(salesThisMonth).map((row) => {
    const previous = lastMonthByCurrency.get(row.currency);
    const trendPct = previous && previous > 0 ? ((row.total - previous) / previous) * 100 : null;
    return { ...row, trendPct };
  });

  return {
    salesToday: toSalesSummary(salesToday),
    salesThisMonth: salesThisMonthWithTrend,
    investedCapital,
    potentialRevenue,
    potentialProfit,
    ownedUnitsCount: ownedActive.length + lotUnitsCount,
    consignedUnitsCount: consignedActive.length,
    consignedValue,
    totalAvailable: totalAvailable + lotUnitsCount,
    categoryBreakdown: Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]),
    staleUnits: staleUnits.map((unit) => ({
      id: unit.id,
      title: productTitle(unit.product),
      days: Math.floor((Date.now() - unit.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}
