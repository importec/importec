import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PurchaseForm } from "./purchase-form";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    redirect("/purchases");
  }

  const { supplierId } = await searchParams;

  const [suppliers, productsRaw] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
  ]);

  const products = productsRaw.map((p) => ({
    id: p.id,
    brand: p.brand,
    model: p.model,
    variant: p.variant,
    storageGb: p.storageGb,
    color: p.color,
    isSerialized: p.isSerialized,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nueva compra</h1>
        <p className="text-sm text-muted-foreground">Registra un pedido a un proveedor.</p>
      </div>
      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        products={products}
        initialSupplierId={supplierId}
      />
    </div>
  );
}
