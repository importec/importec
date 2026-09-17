import type { InventoryUnitStatus } from "@/generated/prisma/enums";

export const STATUS_TRANSITIONS: Record<InventoryUnitStatus, InventoryUnitStatus[]> = {
  AVAILABLE: ["RESERVED", "IN_REVIEW", "IN_REPAIR", "SOLD", "DISPOSED"],
  RESERVED: ["AVAILABLE", "SOLD"],
  IN_REVIEW: ["AVAILABLE", "DISPOSED"],
  IN_REPAIR: ["AVAILABLE"],
  SOLD: ["RETURNED"],
  RETURNED: ["AVAILABLE", "DISPOSED"],
  DISPOSED: [],
};
