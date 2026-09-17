import type { PurchaseStatus } from "@/generated/prisma/enums";

export const PURCHASE_STATUS_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  ORDERED: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["PAID", "CANCELLED"],
  INVOICED: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  ORDERED: "Pedida",
  RECEIVED: "Recibida",
  INVOICED: "Facturada",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
};
