"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

const CustomerSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.email({ error: "Email invalido" }).optional().or(z.literal("")),
  docId: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerFormState = { error: string } | undefined;

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CUSTOMERS")) {
    return { error: "No tenes permiso para crear clientes." };
  }

  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "customer.create",
      entityType: "Customer",
      entityId: customer.id,
      after: parsed.data,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CUSTOMERS")) {
    return { error: "No tenes permiso para editar clientes." };
  }

  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const before = await prisma.customer.findUnique({ where: { id: customerId } });

  await prisma.customer.update({
    where: { id: customerId },
    data: { ...parsed.data, email: parsed.data.email || null },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "customer.update",
      entityType: "Customer",
      entityId: customerId,
      before: before ?? undefined,
      after: parsed.data,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}
