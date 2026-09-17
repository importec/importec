import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency, productTitle } from "@/lib/format";
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_TRANSITIONS } from "@/lib/purchases/status";
import { StatusActions } from "./status-actions";
import { PayForm } from "./pay-form";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } } },
  });

  if (!purchase) notFound();

  const canManage = can(session.role, "MANAGE_SUPPLIERS");
  const cashAccounts = purchase.status === "RECEIVED" ? await prisma.cashAccount.findMany({ orderBy: { name: "asc" } }) : [];
  const total = purchase.items.reduce((sum, item) => sum + item.unitCost.toNumber() * item.quantity, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/purchases" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a compras
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            <Link href={`/suppliers/${purchase.supplier.id}`} className="hover:underline">
              {purchase.supplier.name}
            </Link>
          </h1>
          <Badge>{PURCHASE_STATUS_LABELS[purchase.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{purchase.createdAt.toLocaleDateString("es-AR")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {purchase.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {productTitle(item.product)} x{item.quantity}
              </span>
              <span className="font-medium">
                {formatCurrency(item.unitCost.toNumber() * item.quantity, purchase.currency)}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total, purchase.currency)}</span>
          </div>
          {purchase.notes && <p className="mt-2 text-sm text-muted-foreground">{purchase.notes}</p>}
        </CardContent>
      </Card>

      {canManage && PURCHASE_STATUS_TRANSITIONS[purchase.status].length > 0 && purchase.status !== "PAID" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {purchase.status === "RECEIVED" ? "Registrar pago" : "Cambiar estado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {purchase.status === "RECEIVED" && (
              <PayForm
                purchaseId={purchase.id}
                suggestedAmount={total}
                cashAccounts={cashAccounts.map((a) => ({ id: a.id, name: a.name }))}
              />
            )}
            <StatusActions purchaseId={purchase.id} options={PURCHASE_STATUS_TRANSITIONS[purchase.status]} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
