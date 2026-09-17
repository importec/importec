import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { customerName, formatCurrency, productTitle } from "@/lib/format";

const SALE_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmada",
  RETURNED: "Devuelta",
  CANCELLED: "Cancelada",
};

const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PARTIALLY_SETTLED: "Vendida, pendiente de liquidar",
  SETTLED: "Liquidada",
  RETURNED: "Devuelta",
  EXPIRED: "Vencida",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { inventoryUnit: { include: { product: true } } } } },
      },
      consignments: {
        orderBy: { createdAt: "desc" },
        include: { inventoryUnit: { include: { product: true } }, settlements: true },
      },
    },
  });

  if (!customer) notFound();

  const canManage = can(session.role, "MANAGE_CUSTOMERS");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/customers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a clientes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{customerName(customer)}</h1>
          {canManage && (
            <Link href={`/customers/${customer.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="size-4" />
              Editar
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{customer.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compras ({customer.sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavia no compro nada.</p>
          ) : (
            <ul className="space-y-3">
              {customer.sales.map((sale) => (
                <li key={sale.id}>
                  <Link href={`/sales/${sale.id}`} className="flex items-center justify-between text-sm hover:underline">
                    <span>
                      {sale.items.map((item) => item.inventoryUnit && productTitle(item.inventoryUnit.product)).filter(Boolean).join(", ") || "Venta"}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {formatCurrency(sale.total.toNumber(), sale.currency)}
                      <Badge variant={sale.status === "CONFIRMED" ? "default" : "destructive"}>
                        {SALE_STATUS_LABEL[sale.status]}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consignaciones ({customer.consignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.consignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dejo equipos en consignacion.</p>
          ) : (
            <ul className="space-y-3">
              {customer.consignments.map((consignment) => (
                <li key={consignment.id}>
                  <Link
                    href={`/consignments/${consignment.id}`}
                    className="flex items-center justify-between text-sm hover:underline"
                  >
                    <span>{productTitle(consignment.inventoryUnit.product)}</span>
                    <Badge variant="secondary">{CONSIGNMENT_STATUS_LABEL[consignment.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
