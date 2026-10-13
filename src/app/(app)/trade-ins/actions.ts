"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export type DeleteTradeInState = { error: string } | undefined;

export async function deleteTradeIn(tradeInId: string): Promise<DeleteTradeInState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para eliminar canjes." };
  }

  const tradeIn = await prisma.tradeIn.findUnique({
    where: { id: tradeInId },
    include: { receivedInventoryUnit: { include: { saleItems: true, consignment: true } } },
  });
  if (!tradeIn) return { error: "El canje no existe." };

  const unit = tradeIn.receivedInventoryUnit;
  if (unit.saleItems.length > 0) {
    return { error: "No se puede eliminar: el equipo recibido ya se vendio." };
  }
  if (unit.consignment) {
    return { error: "No se puede eliminar: el equipo recibido esta en consignacion." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.tradeIn.delete({ where: { id: tradeInId } });
    await tx.inventoryUnitStatusEvent.deleteMany({ where: { inventoryUnitId: unit.id } });
    await tx.quoteItem.updateMany({ where: { inventoryUnitId: unit.id }, data: { inventoryUnitId: null } });
    await tx.purchaseItem.updateMany({ where: { inventoryUnitId: unit.id }, data: { inventoryUnitId: null } });
    await tx.reservation.deleteMany({ where: { inventoryUnitId: unit.id } });
    await tx.inventoryUnit.delete({ where: { id: unit.id } });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "trade_in.delete",
        entityType: "TradeIn",
        entityId: tradeInId,
        before: {
          saleId: tradeIn.saleId,
          appraisedValue: tradeIn.appraisedValue.toString(),
          currency: tradeIn.currency,
          unitId: unit.id,
        },
      },
    });
  });

  revalidatePath("/trade-ins");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
