import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { PURCHASE_STATUS_LABELS } from "@/lib/purchases/status";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!supplier) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/suppliers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a proveedores
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{supplier.name}</h1>
          {can(session.role, "MANAGE_SUPPLIERS") && (
            <Link href={`/purchases/new?supplierId=${supplier.id}`} className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" />
              Nueva compra
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compras ({supplier.purchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no hay compras registradas.</p>
          ) : (
            <ul className="space-y-3">
              {supplier.purchases.map((purchase) => {
                const total = purchase.items.reduce((sum, item) => sum + item.unitCost.toNumber() * item.quantity, 0);
                return (
                  <li key={purchase.id}>
                    <Link href={`/purchases/${purchase.id}`} className="flex items-center justify-between text-sm hover:underline">
                      <span>{purchase.createdAt.toLocaleDateString("es-AR")}</span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {formatCurrency(total, purchase.currency)}
                        <Badge variant="secondary">{PURCHASE_STATUS_LABELS[purchase.status]}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
