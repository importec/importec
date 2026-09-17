"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

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
