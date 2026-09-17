"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const ExpenseSchema = z.object({
  categoryId: z.string().min(1),
  newCategoryName: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: asEnum(["USD", "ARS"]),
  cashAccountId: z.string().min(1, "Elegi de que cuenta sale el dinero"),
  description: z.string().optional(),
});

export type ExpenseFormState = { error: string } | undefined;

export async function createExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    return { error: "No tenes permiso para registrar gastos." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = ExpenseSchema.safeParse({
    categoryId: raw.categoryId,
    newCategoryName: raw.newCategoryName || undefined,
    amount: raw.amount,
    currency: raw.currency,
    cashAccountId: raw.cashAccountId,
    description: raw.description || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const cashAccount = await prisma.cashAccount.findUnique({ where: { id: parsed.data.cashAccountId } });
  if (!cashAccount) return { error: "La cuenta no existe." };

  await prisma.$transaction(async (tx) => {
    let categoryId = parsed.data.categoryId;
    if (categoryId === "new") {
      if (!parsed.data.newCategoryName) throw new Error("Falta el nombre de la categoria nueva.");
      const category = await tx.expenseCategory.create({ data: { name: parsed.data.newCategoryName } });
      categoryId = category.id;
    }

    const expense = await tx.expense.create({
      data: {
        categoryId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        cashAccountId: parsed.data.cashAccountId,
        description: parsed.data.description || null,
        createdByUserId: session.userId,
      },
    });

    await tx.cashMovement.create({
      data: {
        cashAccountId: parsed.data.cashAccountId,
        type: "OUT",
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        source: "EXPENSE",
        referenceId: expense.id,
        description: parsed.data.description || "Gasto",
        createdByUserId: session.userId,
      },
    });
  });

  revalidatePath("/expenses");
  redirect("/expenses");
}
