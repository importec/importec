"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Currency } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const NewProductSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  flavor: z.string().optional(),
  cost: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative(),
  currency: asEnum(Object.values(Currency)).default(Currency.USD),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
});

export type FormState = { error: string } | undefined;

export async function createVapeProduct(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para cargar productos de vapes." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewProductSchema.safeParse({
    name: raw.name,
    flavor: raw.flavor || undefined,
    cost: raw.cost,
    salePrice: raw.salePrice,
    currency: raw.currency || undefined,
    stockQuantity: raw.stockQuantity || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  await prisma.vapeProduct.create({ data: parsed.data });

  revalidatePath("/vapes");
  redirect("/vapes");
}

export type PriceEditState = { error: string } | undefined;

export async function updateVapeProductField(
  productId: string,
  field: "cost" | "salePrice",
  value: number,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para editar precios." };
  }

  const product = await prisma.vapeProduct.findUnique({ where: { id: productId } });
  if (!product) return { error: "El producto no existe." };

  await prisma.vapeProduct.update({ where: { id: productId }, data: { [field]: value } });
  revalidatePath("/vapes");
}

export async function updateVapeProductCurrency(
  productId: string,
  currency: string,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para editar precios." };
  }

  const parsed = asEnum(Object.values(Currency)).safeParse(currency);
  if (!parsed.success) return { error: "Moneda invalida." };

  const product = await prisma.vapeProduct.findUnique({ where: { id: productId } });
  if (!product) return { error: "El producto no existe." };

  await prisma.vapeProduct.update({ where: { id: productId }, data: { currency: parsed.data } });
  revalidatePath("/vapes");
}

const AddStockSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

export async function addCentralStock(
  productId: string,
  _prevState: PriceEditState,
  formData: FormData,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para cargar stock." };
  }

  const parsed = AddStockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ingresa una cantidad valida." };
  }

  await prisma.vapeProduct.update({
    where: { id: productId },
    data: { stockQuantity: { increment: parsed.data.quantity } },
  });

  revalidatePath("/vapes");
}

export async function removeCentralStock(
  productId: string,
  _prevState: PriceEditState,
  formData: FormData,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para quitar stock." };
  }

  const parsed = AddStockSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ingresa una cantidad valida." };
  }

  const product = await prisma.vapeProduct.findUnique({ where: { id: productId } });
  if (!product) return { error: "El producto no existe." };
  if (product.stockQuantity < parsed.data.quantity) {
    return { error: `Solo hay ${product.stockQuantity} unidades en stock propio.` };
  }

  await prisma.vapeProduct.update({
    where: { id: productId },
    data: { stockQuantity: { decrement: parsed.data.quantity } },
  });

  revalidatePath("/vapes");
}

export async function deleteVapeProduct(productId: string): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para eliminar productos." };
  }

  const product = await prisma.vapeProduct.findUnique({
    where: { id: productId },
    include: { sellerStocks: true },
  });
  if (!product) return { error: "El producto no existe." };

  const withSellers = product.sellerStocks.reduce((sum, s) => sum + s.quantity, 0);
  if (product.stockQuantity > 0 || withSellers > 0) {
    return {
      error: "No se puede eliminar: todavia hay stock propio o en manos de vendedores. Vaciá el stock primero.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.vapeSellerStock.deleteMany({ where: { productId } });
    await tx.vapeProduct.delete({ where: { id: productId } });
  });

  revalidatePath("/vapes");
}

export async function createVapeSeller(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para cargar vendedores." };
  }

  const schema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    phone: z.string().optional(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const seller = await prisma.vapeSeller.create({
    data: { name: parsed.data.name, phone: parsed.data.phone || null, notes: parsed.data.notes || null },
  });

  revalidatePath("/vapes/sellers");
  redirect(`/vapes/sellers/${seller.id}`);
}

const AssignSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

export async function assignStockToSeller(
  sellerId: string,
  _prevState: PriceEditState,
  formData: FormData,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para asignar stock." };
  }

  const parsed = AssignSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const product = await prisma.vapeProduct.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return { error: "El producto no existe." };
  if (product.stockQuantity < parsed.data.quantity) {
    return { error: `Solo hay ${product.stockQuantity} unidades en stock propio.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.vapeProduct.update({
      where: { id: parsed.data.productId },
      data: { stockQuantity: { decrement: parsed.data.quantity } },
    });
    await tx.vapeSellerStock.upsert({
      where: { sellerId_productId: { sellerId, productId: parsed.data.productId } },
      update: { quantity: { increment: parsed.data.quantity } },
      create: { sellerId, productId: parsed.data.productId, quantity: parsed.data.quantity },
    });
  });

  revalidatePath("/vapes");
  revalidatePath(`/vapes/sellers/${sellerId}`);
}

export async function returnStockFromSeller(
  sellerId: string,
  productId: string,
  quantity: number,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para esta accion." };
  }
  if (quantity <= 0) return { error: "Cantidad invalida." };

  const sellerStock = await prisma.vapeSellerStock.findUnique({
    where: { sellerId_productId: { sellerId, productId } },
  });
  if (!sellerStock || sellerStock.quantity < quantity) {
    return { error: "El vendedor no tiene esa cantidad para devolver." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.vapeSellerStock.update({
      where: { sellerId_productId: { sellerId, productId } },
      data: { quantity: { decrement: quantity } },
    });
    await tx.vapeProduct.update({
      where: { id: productId },
      data: { stockQuantity: { increment: quantity } },
    });
  });

  revalidatePath("/vapes");
  revalidatePath(`/vapes/sellers/${sellerId}`);
}

const NewDebtSchema = z.object({
  debtorName: z.string().min(1, "El nombre es obligatorio"),
  phone: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: asEnum(Object.values(Currency)).default(Currency.ARS),
  notes: z.string().optional(),
});

export async function createVapeDebt(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para cargar deudas." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewDebtSchema.safeParse({
    debtorName: raw.debtorName,
    phone: raw.phone || undefined,
    productId: raw.productId && raw.productId !== "none" ? raw.productId : undefined,
    quantity: raw.quantity || undefined,
    description: raw.description || undefined,
    amount: raw.amount,
    currency: raw.currency || undefined,
    notes: raw.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const data = parsed.data;

  if (data.productId && data.quantity) {
    const product = await prisma.vapeProduct.findUnique({ where: { id: data.productId } });
    if (!product) return { error: "El producto no existe." };
    if (product.stockQuantity < data.quantity) {
      return { error: `Solo hay ${product.stockQuantity} unidades en stock propio.` };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (data.productId && data.quantity) {
      await tx.vapeProduct.update({
        where: { id: data.productId },
        data: { stockQuantity: { decrement: data.quantity } },
      });
    }

    await tx.vapeDebt.create({
      data: {
        debtorName: data.debtorName,
        phone: data.phone || null,
        productId: data.productId || null,
        quantity: data.quantity ?? null,
        description: data.description || null,
        amount: data.amount,
        currency: data.currency,
        notes: data.notes || null,
      },
    });
  });

  revalidatePath("/vapes");
  revalidatePath("/vapes/debts");
  redirect("/vapes/debts");
}

export async function markVapeDebtPaid(debtId: string): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const debt = await prisma.vapeDebt.findUnique({ where: { id: debtId } });
  if (!debt) return { error: "La deuda no existe." };
  if (debt.paidAt) return { error: "Ya estaba marcada como pagada." };

  await prisma.vapeDebt.update({ where: { id: debtId }, data: { paidAt: new Date() } });
  revalidatePath("/vapes/debts");
}

export async function deleteVapeDebt(debtId: string): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    return { error: "No tenes permiso para esta accion." };
  }

  const debt = await prisma.vapeDebt.findUnique({ where: { id: debtId } });
  if (!debt) return { error: "La deuda no existe." };

  await prisma.$transaction(async (tx) => {
    if (debt.productId && debt.quantity) {
      await tx.vapeProduct.update({
        where: { id: debt.productId },
        data: { stockQuantity: { increment: debt.quantity } },
      });
    }
    await tx.vapeDebt.delete({ where: { id: debtId } });
  });

  revalidatePath("/vapes");
  revalidatePath("/vapes/debts");
}
