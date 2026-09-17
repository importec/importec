import type { RepairStatus } from "@/generated/prisma/enums";

export const REPAIR_STATUS_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["QUOTE_SENT", "CANCELLED"],
  QUOTE_SENT: ["AWAITING_APPROVAL", "CANCELLED"],
  AWAITING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_PART", "DONE", "CANCELLED"],
  AWAITING_PART: ["IN_PROGRESS", "CANCELLED"],
  DONE: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECEIVED: "Recibido",
  DIAGNOSING: "En diagnostico",
  QUOTE_SENT: "Presupuesto enviado",
  AWAITING_APPROVAL: "Esperando aprobacion",
  APPROVED: "Aprobado",
  IN_PROGRESS: "En reparacion",
  AWAITING_PART: "Esperando repuesto",
  DONE: "Terminado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};
