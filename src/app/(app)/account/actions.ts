"use server";

import { z } from "zod";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contrasena actual"),
    newPassword: z.string().min(8, "La contrasena nueva debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Las contrasenas nuevas no coinciden",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error: string; success?: boolean } | undefined;

export async function changeOwnPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireSession();

  const parsed = ChangePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "Usuario no encontrado." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "La contrasena actual no es correcta." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { error: "", success: true };
}
