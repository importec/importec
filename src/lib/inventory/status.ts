import type { InventoryUnitStatus } from "@/generated/prisma/enums";
import type { StatusTone } from "@/components/ui/status-badge";

export const STATUS_TRANSITIONS: Record<InventoryUnitStatus, InventoryUnitStatus[]> = {
  AVAILABLE: ["RESERVED", "IN_REVIEW", "IN_REPAIR", "SOLD", "DISPOSED"],
  RESERVED: ["AVAILABLE", "SOLD"],
  IN_REVIEW: ["AVAILABLE", "DISPOSED"],
  IN_REPAIR: ["AVAILABLE"],
  SOLD: ["RETURNED"],
  RETURNED: ["AVAILABLE", "DISPOSED"],
  DISPOSED: [],
};

export const STATUS_TONE: Record<InventoryUnitStatus, StatusTone> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  SOLD: "neutral",
  IN_REVIEW: "info",
  IN_REPAIR: "info",
  RETURNED: "danger",
  DISPOSED: "danger",
};
