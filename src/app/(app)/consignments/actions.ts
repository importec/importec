"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ProductCategory, ConditionGrade } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const NewConsignmentSchema = z.object({
  productId: z.string().optional(),
  newProduct: z
    .object({
      category: asEnum(Object.values(ProductCategory)),
      brand: z.string().min(1),
      model: z.string().min(1),
      variant: z.string().optional(),
      storageGb: z.coerce.number().int().positive().optional(),
      color: z.string().optional(),
    })
    .optional(),
  locationId: z.string().min(1),
  imei: z.string().optional(),
  serialNumber: z.string().optional(),
  condition: asEnum(Object.values(ConditionGrade)),
  batteryPct: z.coerce.number().int().min(0).max(100).optional(),
  listPrice: z.coerce.number().positive(),
  ownerCustomerId: z.string().min(1, "Elegi el cliente que consigna el equipo"),
  commissionPct: z.coerce.number().min(0).max(100),
  minPrice: z.coerce.number().nonnegative().optional(),
  termEndAt: z.string().optional(),
  notes: z.string().optional(),
});

export type ConsignmentFormState = { error: string } | undefined;

export async function createConsignment(
  _prevState: ConsignmentFormState,
  formData: FormData,
): Promise<ConsignmentFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CONSIGNMENTS")) {
    return { error: "No tenes permiso para cargar consignaciones." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewConsignmentSchema.safeParse({
    productId: raw.productId || undefined,
    newProduct:
      raw.productId === "new"
        ? {
            category: raw.category,
            brand: raw.brand,
            model: raw.model,
            variant: raw.variant || undefined,
            storageGb: raw.storageGb || undefined,
            color: raw.color || undefined,
          }
        : undefined,
    locationId: raw.locationId,
    imei: raw.imei || undefined,
    serialNumber: raw.serialNumber || undefined,
    condition: raw.condition,
    batteryPct: raw.batteryPct || undefined,
    listPrice: raw.listPrice,
    ownerCustomerId: raw.ownerCustomerId,
    commissionPct: raw.commissionPct,
    minPrice: raw.minPrice || undefined,
    termEndAt: raw.termEndAt || undefined,
    notes: raw.notes || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const data = parsed.data;
  let consignmentId = "";

  await prisma.$transaction(async (tx) => {
    let productId = data.productId;
    if (!productId || productId === "new") {
      if (!data.newProduct) throw new Error("Falta la informacion del producto nuevo.");
      const product = await tx.product.create({ data: data.newProduct });
      productId = product.id;
    }

    const unit = await tx.inventoryUnit.create({
      data: {
        productId,
        locationId: data.locationId,
        imei: data.imei || null,
        serialNumber: data.serialNumber || null,
        condition: data.condition,
        batteryPct: data.batteryPct ?? null,
        isNew: false,
        cost: 0,
        listPrice: data.listPrice,
        ownerType: "CONSIGNMENT",
        notes: data.notes || null,
        status: "AVAILABLE",
      },
    });

    await tx.inventoryUnitStatusEvent.create({
      data: {
        inventoryUnitId: unit.id,
        toStatus: "AVAILABLE",
        changedByUserId: session.userId,
        note: "Ingreso por consignacion",
      },
    });

    const consignment = await tx.consignment.create({
      data: {
        inventoryUnitId: unit.id,
        ownerCustomerId: data.ownerCustomerId,
        commissionPct: data.commissionPct,
        minPrice: data.minPrice ?? null,
        termEndAt: data.termEndAt ? new Date(data.termEndAt) : null,
        status: "ACTIVE",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "consignment.create",
        entityType: "Consignment",
        entityId: consignment.id,
        after: { unitId: unit.id, ownerCustomerId: data.ownerCustomerId },
      },
    });

    consignmentId = consignment.id;
  });

  revalidatePath("/consignments");
  revalidatePath("/inventory");
  redirect(`/consignments/${consignmentId}`);
}

const SettlementSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: asEnum(["USD", "ARS"]),
  notes: z.string().optional(),
});

export type SettlementFormState = { error: string } | undefined;

export async function recordSettlement(
  consignmentId: string,
  _prevState: SettlementFormState,
  formData: FormData,
): Promise<SettlementFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CONSIGNMENTS")) {
    return { error: "No tenes permiso para liquidar consignaciones." };
  }

  const parsed = SettlementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const consignment = await prisma.consignment.findUnique({
    where: { id: consignmentId },
    include: { inventoryUnit: true },
  });
  if (!consignment) return { error: "La consignacion no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.settlement.create({
      data: {
        consignmentId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        notes: parsed.data.notes || null,
      },
    });

    if (consignment.inventoryUnit.status === "SOLD") {
      await tx.consignment.update({ where: { id: consignmentId }, data: { status: "SETTLED" } });
    } else {
      await tx.consignment.update({ where: { id: consignmentId }, data: { status: "PARTIALLY_SETTLED" } });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "consignment.settle",
        entityType: "Consignment",
        entityId: consignmentId,
        after: parsed.data,
      },
    });
  });

  revalidatePath(`/consignments/${consignmentId}`);
}

export async function markConsignmentReturned(consignmentId: string) {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CONSIGNMENTS")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const consignment = await prisma.consignment.findUnique({ where: { id: consignmentId } });
  if (!consignment) return { error: "La consignacion no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.consignment.update({ where: { id: consignmentId }, data: { status: "RETURNED" } });
    await tx.inventoryUnit.update({ where: { id: consignment.inventoryUnitId }, data: { status: "RETURNED" } });
    await tx.inventoryUnitStatusEvent.create({
      data: {
        inventoryUnitId: consignment.inventoryUnitId,
        toStatus: "RETURNED",
        changedByUserId: session.userId,
        note: "Devolucion al consignante",
      },
    });
  });

  revalidatePath(`/consignments/${consignmentId}`);
  revalidatePath("/inventory");
}
