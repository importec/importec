"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { REPAIR_STATUS_TRANSITIONS } from "@/lib/repairs/status";
import type { RepairStatus } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const NewRepairSchema = z.object({
  customerId: z.string().min(1, "Elegi el cliente"),
  deviceDescription: z.string().min(1, "Describi el equipo"),
  imei: z.string().optional(),
  serialNumber: z.string().optional(),
  reportedIssue: z.string().min(1, "Describi la falla reportada"),
  receivedCondition: z.string().optional(),
  accessoriesReceived: z.string().optional(),
  assignedTechUserId: z.string().optional(),
});

export type RepairFormState = { error: string } | undefined;

export async function createRepair(
  _prevState: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_REPAIRS")) {
    return { error: "No tenes permiso para cargar reparaciones." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewRepairSchema.safeParse({
    customerId: raw.customerId,
    deviceDescription: raw.deviceDescription,
    imei: raw.imei || undefined,
    serialNumber: raw.serialNumber || undefined,
    reportedIssue: raw.reportedIssue,
    receivedCondition: raw.receivedCondition || undefined,
    accessoriesReceived: raw.accessoriesReceived || undefined,
    assignedTechUserId:
      raw.assignedTechUserId && raw.assignedTechUserId !== "unassigned"
        ? String(raw.assignedTechUserId)
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const repair = await prisma.$transaction(async (tx) => {
    const created = await tx.repair.create({ data: parsed.data });
    await tx.repairStatusEvent.create({
      data: { repairId: created.id, toStatus: "RECEIVED", changedByUserId: session.userId },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "repair.create",
        entityType: "Repair",
        entityId: created.id,
        after: parsed.data,
      },
    });
    return created;
  });

  revalidatePath("/repairs");
  redirect(`/repairs/${repair.id}`);
}

export type StatusState = { error: string } | undefined;

export async function changeRepairStatus(
  repairId: string,
  nextStatus: RepairStatus,
): Promise<StatusState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_REPAIRS")) {
    return { error: "No tenes permiso para cambiar el estado de esta reparacion." };
  }

  const repair = await prisma.repair.findUnique({ where: { id: repairId } });
  if (!repair) return { error: "La reparacion no existe." };

  const allowed = REPAIR_STATUS_TRANSITIONS[repair.status];
  if (!allowed.includes(nextStatus)) {
    return { error: `No se puede pasar de ${repair.status} a ${nextStatus}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.repair.update({ where: { id: repairId }, data: { status: nextStatus } });
    await tx.repairStatusEvent.create({
      data: {
        repairId,
        fromStatus: repair.status,
        toStatus: nextStatus,
        changedByUserId: session.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "repair.status_change",
        entityType: "Repair",
        entityId: repairId,
        before: { status: repair.status },
        after: { status: nextStatus },
      },
    });
  });

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${repairId}`);
}

const DiagnosisSchema = z.object({
  diagnosis: z.string().min(1, "Escribi el diagnostico"),
  laborCost: z.coerce.number().nonnegative().optional(),
  partsCost: z.coerce.number().nonnegative().optional(),
  finalPrice: z.coerce.number().nonnegative().optional(),
});

export async function updateDiagnosis(
  repairId: string,
  _prevState: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_REPAIRS")) {
    return { error: "No tenes permiso para editar el diagnostico." };
  }

  const parsed = DiagnosisSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  await prisma.repair.update({
    where: { id: repairId },
    data: {
      diagnosis: parsed.data.diagnosis,
      laborCost: parsed.data.laborCost,
      partsCost: parsed.data.partsCost,
      finalPrice: parsed.data.finalPrice,
    },
  });

  revalidatePath(`/repairs/${repairId}`);
}

const DeliverSchema = z.object({
  method: asEnum(["CASH", "TRANSFER", "CARD", "OTHER"]),
  cashAccountId: z.string().min(1, "Elegi la cuenta de destino"),
  amount: z.coerce.number().nonnegative(),
  warrantyDays: z.coerce.number().int().min(0).default(90),
});

export async function deliverRepair(
  repairId: string,
  _prevState: RepairFormState,
  formData: FormData,
): Promise<RepairFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_REPAIRS")) {
    return { error: "No tenes permiso para entregar esta reparacion." };
  }

  const parsed = DeliverSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const repair = await prisma.repair.findUnique({ where: { id: repairId } });
  if (!repair) return { error: "La reparacion no existe." };
  if (repair.status !== "DONE") {
    return { error: "Solo se puede entregar una reparacion en estado Terminado." };
  }

  const cashAccount = await prisma.cashAccount.findUnique({ where: { id: parsed.data.cashAccountId } });
  if (!cashAccount) return { error: "La cuenta de destino no existe." };

  const now = new Date();
  const warrantyEnd = new Date(now.getTime() + parsed.data.warrantyDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.repair.update({
      where: { id: repairId },
      data: { status: "DELIVERED", deliveredAt: now },
    });
    await tx.repairStatusEvent.create({
      data: { repairId, fromStatus: "DONE", toStatus: "DELIVERED", changedByUserId: session.userId },
    });

    if (parsed.data.amount > 0) {
      await tx.cashMovement.create({
        data: {
          cashAccountId: cashAccount.id,
          type: "IN",
          amount: parsed.data.amount,
          currency: cashAccount.currency,
          source: "REPAIR",
          referenceId: repairId,
          description: `Cobro reparacion ${repairId}`,
          createdByUserId: session.userId,
        },
      });
    }

    if (parsed.data.warrantyDays > 0) {
      await tx.warranty.create({
        data: {
          repairId,
          startAt: now,
          endAt: warrantyEnd,
          terms: `Garantia de ${parsed.data.warrantyDays} dias sobre la reparacion realizada.`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "repair.deliver",
        entityType: "Repair",
        entityId: repairId,
        after: parsed.data,
      },
    });
  });

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${repairId}`);
}
