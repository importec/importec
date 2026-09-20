import { prisma } from "@/server/db";
import { productTitle } from "@/lib/format";
import { getBlueDollarRate, arsToUsd } from "@/lib/blue-dollar";

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

function toUsdEquivalent(rows: { currency: string; value: number }[], rateVenta: number | null) {
  if (rateVenta == null) return null;
  return rows.reduce((sum, row) => sum + (row.currency === "USD" ? row.value : arsToUsd(row.value, { compra: 0, venta: rateVenta, updatedAt: "" })), 0);
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
    salesAllTime,
    stockLots,
    vapeProducts,
    vapeSellerStocks,
    vapeSalesToday,
    vapeSalesThisMonth,
    vapeSalesLastMonth,
    vapeSalesAllTime,
    blueRate,
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
      prisma.sale.groupBy({
        by: ["currency"],
        where: { status: "CONFIRMED" },
        _sum: { profitTotal: true },
      }),
      prisma.stockLot.findMany({
        where: { quantity: { gt: 0 } },
        include: { product: true },
      }),
      prisma.vapeProduct.findMany(),
      prisma.vapeSellerStock.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
      }),
      prisma.cashMovement.groupBy({
        by: ["currency"],
        where: { source: "VAPE_SALE", type: "IN", createdAt: { gte: startOfDay(now) } },
        _sum: { amount: true, costAtSale: true },
        _count: true,
      }),
      prisma.cashMovement.groupBy({
        by: ["currency"],
        where: { source: "VAPE_SALE", type: "IN", createdAt: { gte: startOfMonth(now) } },
        _sum: { amount: true, costAtSale: true },
        _count: true,
      }),
      prisma.cashMovement.groupBy({
        by: ["currency"],
        where: {
          source: "VAPE_SALE",
          type: "IN",
          createdAt: { gte: startOfPrevMonth(now), lt: startOfMonth(now) },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashMovement.groupBy({
        by: ["currency"],
        where: { source: "VAPE_SALE", type: "IN" },
        _sum: { amount: true, costAtSale: true },
      }),
      getBlueDollarRate(),
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
  // que ya se hacia con las ventas. Los totales consolidados en dolar blue
  // se calculan aparte, al final.
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

  // Vapes: se suma tanto el stock propio del local como el asignado a
  // vendedores (todavia no cobrado por el negocio, sigue siendo capital
  // invertido hasta que se liquida la venta).
  const sellerQtyByProduct = new Map(vapeSellerStocks.map((row) => [row.productId, row._sum.quantity ?? 0]));
  let vapeUnitsCount = 0;
  for (const product of vapeProducts) {
    const totalQty = product.stockQuantity + (sellerQtyByProduct.get(product.id) ?? 0);
    if (totalQty <= 0) continue;
    addMoney(product.currency, product.cost.toNumber() * totalQty, product.salePrice.toNumber() * totalQty);
    vapeUnitsCount += totalQty;
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

  // Ventas: se combinan celulares/accesorios (modelo Sale) y vapes
  // (CashMovement source VAPE_SALE) por moneda, para que el dashboard
  // refleje todo el negocio y no solo una parte.
  type SalesRow = { currency: string; _sum: { total?: unknown; profitTotal?: unknown }; _count: number };
  type VapeSalesRow = { currency: string; _sum: { amount: unknown; costAtSale?: unknown }; _count: number };

  function combineSales(saleRows: SalesRow[], vapeRows: VapeSalesRow[]) {
    const combined = new Map<string, { count: number; total: number; profit: number }>();
    for (const row of saleRows) {
      const total = (row._sum.total as { toNumber: () => number } | null)?.toNumber() ?? 0;
      const profit = (row._sum.profitTotal as { toNumber: () => number } | null)?.toNumber() ?? 0;
      const existing = combined.get(row.currency) ?? { count: 0, total: 0, profit: 0 };
      existing.count += row._count;
      existing.total += total;
      existing.profit += profit;
      combined.set(row.currency, existing);
    }
    for (const row of vapeRows) {
      const amount = (row._sum.amount as { toNumber: () => number } | null)?.toNumber() ?? 0;
      const cost = (row._sum.costAtSale as { toNumber: () => number } | null)?.toNumber() ?? 0;
      const existing = combined.get(row.currency) ?? { count: 0, total: 0, profit: 0 };
      existing.count += row._count;
      existing.total += amount;
      existing.profit += amount - cost;
      combined.set(row.currency, existing);
    }
    return Array.from(combined.entries()).map(([currency, v]) => ({
      currency: currency as "USD" | "ARS",
      count: v.count,
      total: v.total,
      profit: v.profit,
    }));
  }

  const salesTodayCombined = combineSales(salesToday, vapeSalesToday);
  const salesThisMonthCombined = combineSales(salesThisMonth, vapeSalesThisMonth);

  const lastMonthByCurrency = new Map<string, number>();
  for (const row of salesLastMonth) {
    lastMonthByCurrency.set(row.currency, (lastMonthByCurrency.get(row.currency) ?? 0) + (row._sum.total?.toNumber() ?? 0));
  }
  for (const row of vapeSalesLastMonth) {
    const amount = (row._sum.amount as { toNumber: () => number } | null)?.toNumber() ?? 0;
    lastMonthByCurrency.set(row.currency, (lastMonthByCurrency.get(row.currency) ?? 0) + amount);
  }
  const salesThisMonthWithTrend = salesThisMonthCombined.map((row) => {
    const previous = lastMonthByCurrency.get(row.currency);
    const trendPct = previous && previous > 0 ? ((row.total - previous) / previous) * 100 : null;
    return { ...row, trendPct };
  });

  // Ganancia total historica realizada (celulares/accesorios + vapes),
  // por moneda: lo que ya se cobro de verdad, no una proyeccion.
  const realizedProfitByCurrency = new Map<string, number>();
  for (const row of salesAllTime) {
    realizedProfitByCurrency.set(
      row.currency,
      (realizedProfitByCurrency.get(row.currency) ?? 0) + (row._sum.profitTotal?.toNumber() ?? 0),
    );
  }
  for (const row of vapeSalesAllTime) {
    const amount = (row._sum.amount as { toNumber: () => number } | null)?.toNumber() ?? 0;
    const cost = (row._sum.costAtSale as { toNumber: () => number } | null)?.toNumber() ?? 0;
    realizedProfitByCurrency.set(row.currency, (realizedProfitByCurrency.get(row.currency) ?? 0) + (amount - cost));
  }
  const realizedProfitAllTime = Array.from(realizedProfitByCurrency.entries()).map(([currency, value]) => ({
    currency: currency as "USD" | "ARS",
    value,
  }));

  // Totales consolidados: todo convertido a un solo numero en dolares usando
  // la cotizacion del dolar blue del momento (null si la API no respondio).
  const blueRateVenta = blueRate?.venta ?? null;
  const consolidated = {
    blueRate,
    investedCapitalUsd: toUsdEquivalent(investedCapital, blueRateVenta),
    potentialProfitUsd: toUsdEquivalent(potentialProfit, blueRateVenta),
    salesThisMonthUsd: toUsdEquivalent(
      salesThisMonthCombined.map((r) => ({ currency: r.currency, value: r.total })),
      blueRateVenta,
    ),
    realizedProfitAllTimeUsd: toUsdEquivalent(realizedProfitAllTime, blueRateVenta),
  };

  return {
    salesToday: salesTodayCombined,
    salesThisMonth: salesThisMonthWithTrend,
    investedCapital,
    potentialRevenue,
    potentialProfit,
    realizedProfitAllTime,
    consolidated,
    ownedUnitsCount: ownedActive.length + lotUnitsCount,
    consignedUnitsCount: consignedActive.length,
    consignedValue,
    vapeUnitsCount,
    totalAvailable: totalAvailable + lotUnitsCount,
    categoryBreakdown: Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]),
    staleUnits: staleUnits.map((unit) => ({
      id: unit.id,
      title: productTitle(unit.product),
      days: Math.floor((Date.now() - unit.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}
