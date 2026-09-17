import { prisma } from "@/server/db";
import { productTitle } from "@/lib/format";

type Range = { from: Date; to: Date };

function toSummary<T extends { currency: string; _count: number; _sum: { total?: unknown; profitTotal?: unknown } }>(
  rows: T[],
) {
  return rows.map((row) => ({
    currency: row.currency,
    count: row._count,
    total: (row._sum.total as { toNumber: () => number } | null)?.toNumber() ?? 0,
    profit: (row._sum.profitTotal as { toNumber: () => number } | null)?.toNumber() ?? 0,
  }));
}

export async function getReportsData(range: Range) {
  const { from, to } = range;

  const [salesByCurrency, saleItems, expensesByCategory, deliveredRepairs, staleUnits, customersWithSales] =
    await Promise.all([
      prisma.sale.groupBy({
        by: ["currency"],
        where: { status: "CONFIRMED", createdAt: { gte: from, lte: to } },
        _sum: { total: true, profitTotal: true },
        _count: true,
      }),
      prisma.saleItem.findMany({
        where: { sale: { status: "CONFIRMED", createdAt: { gte: from, lte: to } } },
        include: {
          inventoryUnit: { include: { product: true } },
          stockLot: { include: { product: true } },
        },
      }),
      prisma.expense.groupBy({
        by: ["categoryId", "currency"],
        where: { createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.repair.findMany({
        where: { status: "DELIVERED", deliveredAt: { gte: from, lte: to } },
      }),
      prisma.inventoryUnit.findMany({
        where: { status: "AVAILABLE" },
        select: { createdAt: true },
      }),
      prisma.customer.findMany({
        include: { _count: { select: { sales: true } } },
        orderBy: { sales: { _count: "desc" } },
        take: 8,
      }),
    ]);

  // Ventas por modelo
  const byProduct = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const item of saleItems) {
    const product = item.inventoryUnit?.product ?? item.stockLot?.product;
    if (!product) continue;
    const key = product.id;
    const existing = byProduct.get(key) ?? { title: productTitle(product), quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += item.unitPrice.toNumber() * item.quantity;
    byProduct.set(key, existing);
  }
  const topProducts = Array.from(byProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Gastos por categoria
  const categories = await prisma.expenseCategory.findMany();
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const expenseRows = expensesByCategory.map((row) => ({
    category: categoryById.get(row.categoryId) ?? "Otros",
    currency: row.currency,
    amount: row._sum.amount?.toNumber() ?? 0,
  }));

  // Rentabilidad de servicio tecnico
  const repairProfit = deliveredRepairs.reduce(
    (sum, repair) =>
      sum +
      (repair.finalPrice?.toNumber() ?? 0) -
      (repair.partsCost?.toNumber() ?? 0) -
      (repair.laborCost?.toNumber() ?? 0),
    0,
  );

  // Antiguedad de stock (dias desde el ingreso, solo disponibles)
  const now = Date.now();
  const ageBuckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const unit of staleUnits) {
    const days = Math.floor((now - unit.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    if (days <= 30) ageBuckets["0-30"]++;
    else if (days <= 60) ageBuckets["31-60"]++;
    else if (days <= 90) ageBuckets["61-90"]++;
    else ageBuckets["90+"]++;
  }

  return {
    salesSummary: toSummary(salesByCurrency),
    topProducts,
    expenseRows,
    repairsDelivered: deliveredRepairs.length,
    repairProfit,
    ageBuckets,
    recurringCustomers: customersWithSales
      .filter((c) => c._count.sales > 1)
      .map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, salesCount: c._count.sales })),
  };
}
