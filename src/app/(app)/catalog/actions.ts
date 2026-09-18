"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ProductCategory, Currency } from "@/generated/prisma/enums";

const asEnum = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const NewEntrySchema = z.object({
  category: asEnum(Object.values(ProductCategory)),
  brand: z.string().min(1).default("Apple"),
  model: z.string().min(1, "El modelo es obligatorio"),
  variant: z.string().optional(),
  storageGb: z.coerce.number().int().positive().optional(),
  currency: asEnum(Object.values(Currency)).default(Currency.USD),
  sealedPrice: z.coerce.number().nonnegative().optional(),
  likeNewPrice: z.coerce.number().nonnegative().optional(),
  goodPrice: z.coerce.number().nonnegative().optional(),
  fairPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type FormState = { error: string } | undefined;

export async function createCatalogEntry(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para cargar el catalogo." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = NewEntrySchema.safeParse({
    category: raw.category,
    brand: raw.brand || undefined,
    model: raw.model,
    variant: raw.variant || undefined,
    storageGb: raw.storageGb || undefined,
    currency: raw.currency || undefined,
    sealedPrice: raw.sealedPrice || undefined,
    likeNewPrice: raw.likeNewPrice || undefined,
    goodPrice: raw.goodPrice || undefined,
    fairPrice: raw.fairPrice || undefined,
    notes: raw.notes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const data = parsed.data;
  if (
    data.sealedPrice == null &&
    data.likeNewPrice == null &&
    data.goodPrice == null &&
    data.fairPrice == null
  ) {
    return { error: "Cargá al menos un precio." };
  }

  await prisma.buyPriceCatalog.create({
    data: {
      category: data.category,
      brand: data.brand,
      model: data.model,
      variant: data.variant || null,
      storageGb: data.storageGb ?? null,
      currency: data.currency,
      sealedPrice: data.sealedPrice ?? null,
      likeNewPrice: data.likeNewPrice ?? null,
      goodPrice: data.goodPrice ?? null,
      fairPrice: data.fairPrice ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/catalog");
  redirect("/catalog");
}

export type PriceEditState = { error: string } | undefined;

const PRICE_FIELDS = ["sealedPrice", "likeNewPrice", "goodPrice", "fairPrice"] as const;
type PriceField = (typeof PRICE_FIELDS)[number];

export async function updateCatalogPrice(
  entryId: string,
  field: PriceField,
  value: number,
): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para editar el catalogo." };
  }
  if (!PRICE_FIELDS.includes(field)) {
    return { error: "Campo invalido." };
  }

  const entry = await prisma.buyPriceCatalog.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "El registro no existe." };

  await prisma.buyPriceCatalog.update({ where: { id: entryId }, data: { [field]: value } });
  revalidatePath("/catalog");
}

export async function deleteCatalogEntry(entryId: string): Promise<PriceEditState> {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    return { error: "No tenes permiso para eliminar del catalogo." };
  }

  await prisma.buyPriceCatalog.delete({ where: { id: entryId } });
  revalidatePath("/catalog");
}
