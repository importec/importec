"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

const SupplierSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.email({ error: "Email invalido" }).optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type SupplierFormState = { error: string } | undefined;

export async function createSupplier(
  _prevState: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    return { error: "No tenes permiso para crear proveedores." };
  }

  const parsed = SupplierSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const supplier = await prisma.supplier.create({
    data: { ...parsed.data, email: parsed.data.email || null },
  });

  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}
