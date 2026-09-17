"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PURCHASE_STATUS_TRANSITIONS } from "@/lib/purchases/status";
import type { PurchaseStatus } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const PurchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

const CreatePurchaseSchema = z.object({
  supplierId: z.string().min(1, "Elegi un proveedor"),
  currency: asEnum(["USD", "ARS"]),
  notes: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, "Agrega al menos un producto"),
});

export type PurchaseFormState = { error: string } | undefined;

export async function createPurchase(input: unknown): Promise<PurchaseFormState & { id?: string }> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    return { error: "No tenes permiso para registrar compras." };
  }

  const parsed = CreatePurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos de la compra." };
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        supplierId: parsed.data.supplierId,
        currency: parsed.data.currency,
        notes: parsed.data.notes || null,
        status: "ORDERED",
        items: {
          create: parsed.data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "purchase.create",
        entityType: "Purchase",
        entityId: created.id,
        after: parsed.data,
      },
    });

    return created;
  });

  revalidatePath("/purchases");
  revalidatePath(`/suppliers/${parsed.data.supplierId}`);
  redirect(`/purchases/${purchase.id}`);
}

export type StatusState = { error: string } | undefined;

export async function changePurchaseStatus(
  purchaseId: string,
  nextStatus: PurchaseStatus,
): Promise<StatusState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: { include: { product: true } } },
  });
  if (!purchase) return { error: "La compra no existe." };

  const allowed = PURCHASE_STATUS_TRANSITIONS[purchase.status];
  if (!allowed.includes(nextStatus)) {
    return { error: `No se puede pasar de ${purchase.status} a ${nextStatus}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({ where: { id: purchaseId }, data: { status: nextStatus } });

    if (nextStatus === "RECEIVED") {
      const defaultLocation = await tx.location.findFirst({ where: { isDefault: true } });
      for (const item of purchase.items) {
        if (item.product.isSerialized) continue;
        if (!defaultLocation) continue;

        const existingLot = await tx.stockLot.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: defaultLocation.id } },
        });

        if (existingLot) {
          const newQuantity = existingLot.quantity + item.quantity;
          const newAvgCost =
            (existingLot.avgCost.toNumber() * existingLot.quantity + item.unitCost.toNumber() * item.quantity) /
            newQuantity;
          await tx.stockLot.update({
            where: { id: existingLot.id },
            data: { quantity: newQuantity, avgCost: newAvgCost },
          });
        } else {
          await tx.stockLot.create({
            data: {
              productId: item.productId,
              locationId: defaultLocation.id,
              quantity: item.quantity,
              avgCost: item.unitCost,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "purchase.status_change",
        entityType: "Purchase",
        entityId: purchaseId,
        before: { status: purchase.status },
        after: { status: nextStatus },
      },
    });
  });

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${purchaseId}`);
  revalidatePath("/inventory");
}

const PaySchema = z.object({
  cashAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export async function payPurchase(
  purchaseId: string,
  _prevState: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    return { error: "No tenes permiso para registrar pagos." };
  }

  const parsed = PaySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return { error: "La compra no existe." };

  const cashAccount = await prisma.cashAccount.findUnique({ where: { id: parsed.data.cashAccountId } });
  if (!cashAccount) return { error: "La cuenta no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({ where: { id: purchaseId }, data: { status: "PAID" } });
    await tx.cashMovement.create({
      data: {
        cashAccountId: cashAccount.id,
        type: "OUT",
        amount: parsed.data.amount,
        currency: cashAccount.currency,
        source: "PURCHASE",
        referenceId: purchaseId,
        description: `Pago a proveedor - compra ${purchaseId}`,
        createdByUserId: session.userId,
      },
    });
  });

  revalidatePath(`/purchases/${purchaseId}`);
}
