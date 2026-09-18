"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Currency } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const MovementSchema = z.object({
  cashAccountId: z.string().min(1),
  type: asEnum(["IN", "OUT"]),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export type MovementFormState = { error: string } | undefined;

export async function createManualMovement(
  _prevState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para registrar movimientos de caja." };
  }

  const parsed = MovementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const account = await prisma.cashAccount.findUnique({ where: { id: parsed.data.cashAccountId } });
  if (!account) return { error: "La cuenta no existe." };

  await prisma.cashMovement.create({
    data: {
      cashAccountId: account.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      currency: account.currency,
      source: parsed.data.type === "OUT" ? "WITHDRAWAL" : "OTHER",
      description: parsed.data.description || (parsed.data.type === "OUT" ? "Retiro" : "Ingreso manual"),
      createdByUserId: session.userId,
    },
  });

  revalidatePath("/finance");
}

const ExchangeRateSchema = z.object({
  usdToArs: z.coerce.number().positive(),
});

export async function setTodayExchangeRate(
  _prevState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para cargar el tipo de cambio." };
  }

  const parsed = ExchangeRateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ingresa un valor valido." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.exchangeRate.upsert({
    where: { date: today },
    update: { usdToArs: parsed.data.usdToArs },
    create: { date: today, usdToArs: parsed.data.usdToArs },
  });

  revalidatePath("/finance");
  revalidatePath("/sales/new");
}

const NewPlanSchema = z.object({
  customerId: z.string().min(1, "Elegi un cliente"),
  totalAmount: z.coerce.number().positive(),
  currency: asEnum(Object.values(Currency)).default(Currency.ARS),
  installmentsCount: z.coerce.number().int().min(2).max(60),
  firstDueDate: z.string().min(1, "Elegi la fecha del primer vencimiento"),
  description: z.string().optional(),
});

export type PlanFormState = { error: string } | undefined;

export async function createInstallmentPlan(
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para cargar planes de cuotas." };
  }

  const parsed = NewPlanSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) return { error: "El cliente no existe." };

  const baseAmount = Math.floor((data.totalAmount / data.installmentsCount) * 100) / 100;
  const roundingRemainder = Math.round((data.totalAmount - baseAmount * data.installmentsCount) * 100) / 100;
  const firstDueDate = new Date(`${data.firstDueDate}T00:00:00`);

  let planId = "";
  await prisma.$transaction(async (tx) => {
    const plan = await tx.installmentPlan.create({
      data: {
        customerId: data.customerId,
        totalAmount: data.totalAmount,
        currency: data.currency,
        description: data.description || null,
      },
    });
    planId = plan.id;

    for (let i = 0; i < data.installmentsCount; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const isLast = i === data.installmentsCount - 1;
      await tx.installment.create({
        data: {
          planId: plan.id,
          seq: i + 1,
          dueDate,
          amount: isLast ? baseAmount + roundingRemainder : baseAmount,
        },
      });
    }
  });

  revalidatePath("/finance/installments");
  redirect(`/finance/installments/${planId}`);
}

export async function markInstallmentPaid(
  installmentId: string,
  _prevState: MovementFormState,
  formData: FormData,
): Promise<MovementFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para registrar cobros." };
  }

  const cashAccountId = formData.get("cashAccountId");
  if (typeof cashAccountId !== "string" || !cashAccountId) {
    return { error: "Elegi una cuenta de destino." };
  }

  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { plan: { include: { customer: true } } },
  });
  if (!installment) return { error: "La cuota no existe." };
  if (installment.paidAt) return { error: "Esta cuota ya estaba pagada." };

  const account = await prisma.cashAccount.findUnique({ where: { id: cashAccountId } });
  if (!account) return { error: "La cuenta no existe." };
  if (account.currency !== installment.plan.currency) {
    return { error: `Esta cuota es en ${installment.plan.currency}, elegi una cuenta de esa moneda.` };
  }

  await prisma.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({
      data: {
        cashAccountId: account.id,
        type: "IN",
        amount: installment.amount,
        currency: installment.plan.currency,
        source: "INSTALLMENT",
        referenceId: installment.id,
        description: `Cuota ${installment.seq} · ${installment.plan.customer.firstName} ${installment.plan.customer.lastName}`,
        createdByUserId: session.userId,
      },
    });

    await tx.installment.update({
      where: { id: installmentId },
      data: { paidAt: new Date(), cashMovementId: movement.id },
    });
  });

  revalidatePath("/finance");
  revalidatePath("/finance/installments");
  revalidatePath(`/finance/installments/${installment.planId}`);
}

export async function deleteInstallmentPlan(planId: string): Promise<MovementFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: { installments: true },
  });
  if (!plan) return { error: "El plan no existe." };

  const hasPaidInstallments = plan.installments.some((i) => i.paidAt);
  if (hasPaidInstallments) {
    return { error: "No se puede eliminar: ya hay cuotas cobradas. Esos movimientos de caja deben quedar registrados." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.installment.deleteMany({ where: { planId } });
    await tx.installmentPlan.delete({ where: { id: planId } });
  });

  revalidatePath("/finance/installments");
}
