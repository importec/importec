"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const CreateUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.email({ error: "Email invalido" }),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  role: asEnum(Object.values(UserRole)),
});

export type UserFormState = { error: string } | undefined;

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    return { error: "No tenes permiso para crear usuarios." };
  }

  const parsed = CreateUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese email." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "user.create",
        entityType: "User",
        entityId: created.id,
        after: { name: created.name, email: created.email, role: created.role },
      },
    });
    return created;
  });

  revalidatePath("/users");
  redirect(`/users/${user.id}`);
}

const UpdateUserSchema = z.object({
  role: asEnum(Object.values(UserRole)),
  isActive: z.coerce.boolean(),
});

export type StatusState = { error: string } | undefined;

export async function updateUser(
  userId: string,
  _prevState: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    return { error: "No tenes permiso para editar usuarios." };
  }
  if (userId === session.userId) {
    return { error: "No podes editar tu propio usuario desde aca." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = UpdateUserSchema.safeParse({
    role: raw.role,
    isActive: raw.isActive === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) return { error: "El usuario no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: parsed.data });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: "user.update",
        entityType: "User",
        entityId: userId,
        before: { role: before.role, isActive: before.isActive },
        after: parsed.data,
      },
    });
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

export async function resetPassword(
  userId: string,
  _prevState: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "user.reset_password",
      entityType: "User",
      entityId: userId,
    },
  });

  revalidatePath(`/users/${userId}`);
}
