"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.email({ error: "Ingresa un email valido" }),
  password: z.string().min(1, { error: "Ingresa tu contrasena" }),
});

export type LoginState =
  | { error: string }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Revisa el email y la contrasena." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return { error: "Credenciales invalidas." };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return { error: "Credenciales invalidas." };
  }

  await createSession({ id: user.id, role: user.role, name: user.name });
  redirect("/dashboard");
}
