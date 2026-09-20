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

  const defaultLocation = await prisma.location.findFirst({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!defaultLocation) {
    return { error: "No hay ninguna ubicacion cargada en el sistema todavia." };
  }

  await prisma.$transaction(async (tx) => {
    let productId = data.productId;

    if (!productId || productId === "new") {
      const product = await tx.product.create({ data: data.newProduct! });
      productId = product.id;
    }

    const unit = await tx.inventoryUnit.create({
      data: {
        productId,
        locationId: defaultLocation.id,
        condition: data.isNew ? "NEW" : "GOOD",
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

const EditUnitSchema = z.object({
  locationId: z.string().min(1, "Elegi una ubicacion"),
  condition: asEnum(Object.values(ConditionGrade)),
  imei: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  batteryPct: z.coerce.number().int().min(0).max(100).optional(),
  isNew: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type EditUnitState = { error: string } | undefined;

export async function updateInventoryUnit(
  unitId: string,
  _prevState: EditUnitState,
  formData: FormData,
): Promise<EditUnitState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para editar equipos." };
  }

  const unit = await prisma.inventoryUnit.findUnique({ where: { id: unitId } });
  if (!unit) return { error: "El equipo no existe." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = EditUnitSchema.safeParse({
    locationId: raw.locationId,
    condition: raw.condition,
    imei: raw.imei || undefined,
    serialNumber: raw.serialNumber || undefined,
    batteryPct: raw.batteryPct || undefined,
    isNew: raw.isNew === "on",
    minPrice: raw.minPrice || undefined,
    notes: raw.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.update({
      where: { id: unitId },
      data: {
        locationId: data.locationId,
        condition: data.condition,
        imei: data.imei || null,
        serialNumber: data.serialNumber || null,
        batteryPct: data.batteryPct ?? null,
        isNew: data.isNew ?? false,
        minPrice: data.minPrice ?? null,
        notes: data.notes || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "inventory_unit.update",
        entityType: "InventoryUnit",
        entityId: unitId,
        before: {
          locationId: unit.locationId,
          condition: unit.condition,
          imei: unit.imei,
          serialNumber: unit.serialNumber,
          batteryPct: unit.batteryPct,
          isNew: unit.isNew,
          minPrice: unit.minPrice?.toNumber() ?? null,
          notes: unit.notes,
        },
        after: data,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${unitId}`);
  redirect(`/inventory/${unitId}`);
}

export type DeleteUnitState = { error: string } | undefined;

export async function deleteInventoryUnit(unitId: string): Promise<DeleteUnitState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para eliminar equipos." };
  }

  const unit = await prisma.inventoryUnit.findUnique({
    where: { id: unitId },
    include: {
      saleItems: true,
      consignment: true,
      tradeInReceived: true,
    },
  });
  if (!unit) return { error: "El equipo no existe." };

  if (unit.saleItems.length > 0) {
    return { error: "No se puede eliminar: tiene una venta asociada." };
  }
  if (unit.consignment) {
    return { error: "No se puede eliminar: esta en consignacion." };
  }
  if (unit.tradeInReceived) {
    return { error: "No se puede eliminar: ingreso por un plan canje registrado." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnitStatusEvent.deleteMany({ where: { inventoryUnitId: unitId } });
    await tx.quoteItem.updateMany({ where: { inventoryUnitId: unitId }, data: { inventoryUnitId: null } });
    await tx.purchaseItem.updateMany({ where: { inventoryUnitId: unitId }, data: { inventoryUnitId: null } });
    await tx.reservation.deleteMany({ where: { inventoryUnitId: unitId } });
    await tx.inventoryUnit.delete({ where: { id: unitId } });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "inventory_unit.delete",
        entityType: "InventoryUnit",
        entityId: unitId,
        before: { imei: unit.imei, serialNumber: unit.serialNumber, status: unit.status },
      },
    });
  });

  revalidatePath("/inventory");
}
