import { prisma } from "@/server/db";
import { productTitle, customerName } from "@/lib/format";

export type Alert = {
  id: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  href: string;
};

const STALE_DAYS = 45;
const CONSIGNMENT_DUE_SOON_DAYS = 7;
const REPAIR_STALLED_DAYS = 5;
const PURCHASE_UNPAID_DAYS = 15;
const LOW_MARGIN_PCT = 10;

export async function getAlerts(): Promise<Alert[]> {
  const now = Date.now();
  const alerts: Alert[] = [];

  const [staleUnits, consignments, stalledRepairs, unpaidPurchases, lowMarginUnits] = await Promise.all([
    prisma.inventoryUnit.findMany({
      where: {
        status: "AVAILABLE",
        createdAt: { lt: new Date(now - STALE_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.consignment.findMany({
      where: { status: "ACTIVE", termEndAt: { not: null } },
      include: { inventoryUnit: { include: { product: true } }, ownerCustomer: true },
    }),
    prisma.repair.findMany({
      where: {
        status: { in: ["RECEIVED", "DIAGNOSING", "QUOTE_SENT", "AWAITING_APPROVAL", "APPROVED", "IN_PROGRESS", "AWAITING_PART"] },
        updatedAt: { lt: new Date(now - REPAIR_STALLED_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { customer: true },
    }),
    prisma.purchase.findMany({
      where: {
        status: "RECEIVED",
        updatedAt: { lt: new Date(now - PURCHASE_UNPAID_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { supplier: true },
    }),
    prisma.inventoryUnit.findMany({
      where: { status: "AVAILABLE", ownerType: "COMPANY" },
      include: { product: true },
    }),
  ]);

  for (const unit of staleUnits.slice(0, 10)) {
    const days = Math.floor((now - unit.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    alerts.push({
      id: `stale-${unit.id}`,
      severity: "warning",
      title: `${productTitle(unit.product)} sin rotar`,
      detail: `${days} dias en stock sin venderse`,
      href: `/inventory/${unit.id}`,
    });
  }

  for (const consignment of consignments) {
    if (!consignment.termEndAt) continue;
    const daysLeft = Math.floor((consignment.termEndAt.getTime() - now) / (24 * 60 * 60 * 1000));
    if (daysLeft < 0) {
      alerts.push({
        id: `consignment-expired-${consignment.id}`,
        severity: "critical",
        title: `Consignacion vencida — ${productTitle(consignment.inventoryUnit.product)}`,
        detail: `Plazo vencido hace ${-daysLeft} dias · ${customerName(consignment.ownerCustomer)}`,
        href: `/consignments/${consignment.id}`,
      });
    } else if (daysLeft <= CONSIGNMENT_DUE_SOON_DAYS) {
      alerts.push({
        id: `consignment-due-${consignment.id}`,
        severity: "warning",
        title: `Consignacion por vencer — ${productTitle(consignment.inventoryUnit.product)}`,
        detail: `Vence en ${daysLeft} dia${daysLeft === 1 ? "" : "s"} · ${customerName(consignment.ownerCustomer)}`,
        href: `/consignments/${consignment.id}`,
      });
    }
  }

  for (const repair of stalledRepairs) {
    const days = Math.floor((now - repair.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
    alerts.push({
      id: `repair-${repair.id}`,
      severity: "warning",
      title: `Reparacion demorada — ${repair.deviceDescription}`,
      detail: `${days} dias sin actualizar · ${customerName(repair.customer)}`,
      href: `/repairs/${repair.id}`,
    });
  }

  for (const purchase of unpaidPurchases) {
    const days = Math.floor((now - purchase.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
    alerts.push({
      id: `purchase-${purchase.id}`,
      severity: "warning",
      title: `Compra pendiente de pago — ${purchase.supplier.name}`,
      detail: `Recibida hace ${days} dias, todavia no se pago`,
      href: `/purchases/${purchase.id}`,
    });
  }

  for (const unit of lowMarginUnits) {
    const cost = unit.cost.toNumber();
    const price = unit.listPrice.toNumber();
    if (price <= 0) continue;
    const marginPct = ((price - cost) / price) * 100;
    if (marginPct < LOW_MARGIN_PCT) {
      alerts.push({
        id: `margin-${unit.id}`,
        severity: marginPct < 0 ? "critical" : "warning",
        title: `Margen bajo — ${productTitle(unit.product)}`,
        detail: `Margen de ${marginPct.toFixed(0)}% (costo ${cost.toFixed(0)} / precio ${price.toFixed(0)})`,
        href: `/inventory/${unit.id}`,
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}
