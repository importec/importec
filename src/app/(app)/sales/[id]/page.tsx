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
import { customerName, formatCurrency, productTitle } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmada",
  RETURNED: "Devuelta",
  CANCELLED: "Cancelada",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  TRADE_IN: "Plan canje",
  OTHER: "Otro",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const showCosts = can(session.role, "VIEW_COSTS");

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      soldByUser: true,
      items: {
        include: {
          inventoryUnit: { include: { product: true } },
          stockLot: { include: { product: true } },
        },
      },
      payments: { include: { cashAccount: true } },
      tradeIn: { include: { receivedInventoryUnit: { include: { product: true } } } },
    },
  });

  if (!sale) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/sales" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a ventas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            Venta del {sale.createdAt.toLocaleDateString("es-AR")}
          </h1>
          <Badge variant={sale.status === "CONFIRMED" ? "default" : "destructive"}>
            {STATUS_LABEL[sale.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {sale.customer ? (
            <Link href={`/customers/${sale.customer.id}`} className="hover:underline">
              {customerName(sale.customer)}
            </Link>
          ) : (
            "Consumidor final"
          )}
          {" · Vendido por "}
          {sale.soldByUser.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sale.items.map((item) => {
            const product = item.inventoryUnit?.product ?? item.stockLot?.product;
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>
                  {product ? productTitle(product) : "Item"}
                  {item.quantity > 1 && ` x${item.quantity}`}
                </span>
                <span className="font-medium">{formatCurrency(item.unitPrice.toNumber() * item.quantity, sale.currency)}</span>
              </div>
            );
          })}
          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal.toNumber(), sale.currency)}</span>
            </div>
            {sale.discount.toNumber() > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span>
                <span>-{formatCurrency(sale.discount.toNumber(), sale.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(sale.total.toNumber(), sale.currency)}</span>
            </div>
            {showCosts && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Ganancia</span>
                <span>{formatCurrency(sale.profitTotal.toNumber(), sale.currency)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {sale.tradeIn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan canje</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Equipo recibido:{" "}
              <Link
                href={`/inventory/${sale.tradeIn.receivedInventoryUnitId}`}
                className="font-medium hover:underline"
              >
                {productTitle(sale.tradeIn.receivedInventoryUnit.product)}
              </Link>
            </p>
            <p className="text-muted-foreground">
              Valor tomado: {formatCurrency(sale.tradeIn.appraisedValue.toNumber(), sale.tradeIn.currency)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between text-sm">
              <span>
                {METHOD_LABEL[payment.method]}
                {payment.cashAccount && (
                  <span className="text-muted-foreground"> · {payment.cashAccount.name}</span>
                )}
              </span>
              <span className="font-medium">{formatCurrency(payment.amount.toNumber(), payment.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
