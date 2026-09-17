"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { STATUS_TRANSITIONS } from "@/lib/inventory/status";
import { ProductCategory, ConditionGrade, OwnerType, Currency } from "@/generated/prisma/enums";
import type { InventoryUnitStatus } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const NewUnitSchema = z.object({
  productId: z.string().min(1).optional(),
  newProduct: z
    .object({
      category: asEnum(Object.values(ProductCategory)),
      brand: z.string().min(1),
      model: z.string().min(1),
      variant: z.string().optional(),
      storageGb: z.coerce.number().int().positive().optional(),
      color: z.string().optional(),
      currency: asEnum(Object.values(Currency)).default(Currency.USD),
    })
    .optional(),
  locationId: z.string().min(1, "Elegi una ubicacion"),
  imei: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  condition: asEnum(Object.values(ConditionGrade)),
  batteryPct: z.coerce.number().int().min(0).max(100).optional(),
  isNew: z.coerce.boolean().optional(),
  cost: z.coerce.number().nonnegative(),
  listPrice: z.coerce.number().positive(),
  minPrice: z.coerce.number().nonnegative().optional(),
  ownerType: asEnum(Object.values(OwnerType)).default(OwnerType.COMPANY),
  notes: z.string().optional(),
});

export type NewUnitState = { error: string } | undefined;

export async function createInventoryUnit(
  _prevState: NewUnitState,
  formData: FormData,
): Promise<NewUnitState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para cargar inventario." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewUnitSchema.safeParse({
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
            currency: raw.currency || undefined,
          }
        : undefined,
    locationId: raw.locationId,
    imei: raw.imei || undefined,
    serialNumber: raw.serialNumber || undefined,
    condition: raw.condition,
    batteryPct: raw.batteryPct || undefined,
    isNew: raw.isNew === "on",
    cost: raw.cost,
    listPrice: raw.listPrice,
    minPrice: raw.minPrice || undefined,
    ownerType: raw.ownerType || undefined,
    notes: raw.notes || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const data = parsed.data;

  if (!data.productId || data.productId === "new") {
    if (!data.newProduct) {
      return { error: "Falta la informacion del producto nuevo." };
    }
  }

  let unitId = "";

  await prisma.$transaction(async (tx) => {
    let productId = data.productId;

    if (!productId || productId === "new") {
      const product = await tx.product.create({ data: data.newProduct! });
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
        isNew: data.isNew ?? false,
        cost: data.cost,
        listPrice: data.listPrice,
        minPrice: data.minPrice ?? null,
        ownerType: data.ownerType,
        notes: data.notes || null,
        status: "AVAILABLE",
      },
    });

    await tx.inventoryUnitStatusEvent.create({
      data: {
        inventoryUnitId: unit.id,
        toStatus: "AVAILABLE",
        changedByUserId: session.userId,
        note: "Alta de inventario",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "inventory_unit.create",
        entityType: "InventoryUnit",
        entityId: unit.id,
        after: { ...data, id: unit.id },
      },
    });

    unitId = unit.id;
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${unitId}`);
}

export type StatusChangeState = { error: string } | undefined;

export async function changeInventoryUnitStatus(
  unitId: string,
  nextStatus: InventoryUnitStatus,
): Promise<StatusChangeState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para cambiar el estado de este equipo." };
  }

  const unit = await prisma.inventoryUnit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return { error: "El equipo no existe." };
  }

  const allowed = STATUS_TRANSITIONS[unit.status];
  if (!allowed.includes(nextStatus)) {
    return { error: `No se puede pasar de ${unit.status} a ${nextStatus}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.update({
      where: { id: unitId },
      data: { status: nextStatus },
    });

    await tx.inventoryUnitStatusEvent.create({
      data: {
        inventoryUnitId: unitId,
        fromStatus: unit.status,
        toStatus: nextStatus,
        changedByUserId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "inventory_unit.status_change",
        entityType: "InventoryUnit",
        entityId: unitId,
        before: { status: unit.status },
        after: { status: nextStatus },
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
}

export type PriceEditState = { error: string } | undefined;

export async function updateInventoryUnitPrice(
  unitId: string,
  field: "cost" | "listPrice",
  value: number,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para editar precios." };
  }
  if (field === "cost" && !can(session.role, "VIEW_COSTS")) {
    return { error: "No tenes permiso para editar el costo." };
  }

  const unit = await prisma.inventoryUnit.findUnique({ where: { id: unitId } });
  if (!unit) return { error: "El equipo no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.update({ where: { id: unitId }, data: { [field]: value } });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: `inventory_unit.${field === "cost" ? "update_cost" : "update_price"}`,
        entityType: "InventoryUnit",
        entityId: unitId,
        before: { [field]: unit[field].toNumber() },
        after: { [field]: value },
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
}

export async function updateStockLotCost(lotId: string, value: number): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY") || !can(session.role, "VIEW_COSTS")) {
    return { error: "No tenes permiso para editar el costo." };
  }

  const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
  if (!lot) return { error: "El lote no existe." };

  await prisma.stockLot.update({ where: { id: lotId }, data: { avgCost: value } });
  revalidatePath("/inventory");
}

export async function updateProductListPrice(productId: string, value: number): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para editar precios." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "El producto no existe." };

  await prisma.product.update({ where: { id: productId }, data: { listPrice: value } });
  revalidatePath("/inventory");
}
