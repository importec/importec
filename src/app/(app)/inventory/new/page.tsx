import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { NewUnitForm } from "./new-unit-form";

export default async function NewInventoryUnitPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    redirect("/inventory");
  }

  const [productsRaw, locations] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const products = productsRaw.map((product) => ({
    id: product.id,
    category: product.category,
    brand: product.brand,
    model: product.model,
    variant: product.variant,
    storageGb: product.storageGb,
    color: product.color,
    currency: product.currency,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo equipo</h1>
        <p className="text-sm text-muted-foreground">
          Carga una unidad fisica al inventario propio.
        </p>
      </div>
      <NewUnitForm products={products} locations={locations} />
    </div>
  );
}
