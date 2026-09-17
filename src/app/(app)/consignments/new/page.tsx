import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ConsignmentForm } from "./consignment-form";

export default async function NewConsignmentPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CONSIGNMENTS")) {
    redirect("/consignments");
  }

  const [productsRaw, locations] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const products = productsRaw.map((product) => ({
    id: product.id,
    brand: product.brand,
    model: product.model,
    variant: product.variant,
    storageGb: product.storageGb,
    color: product.color,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nueva consignacion</h1>
        <p className="text-sm text-muted-foreground">
          Carga un equipo de un tercero para vender en el local.
        </p>
      </div>
      <ConsignmentForm products={products} locations={locations} />
    </div>
  );
}
