import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName, formatCurrency, productTitle } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmada",
  RETURNED: "Devuelta",
  CANCELLED: "Cancelada",
};

const STATUS_TONE: Record<string, StatusTone> = {
  CONFIRMED: "success",
  RETURNED: "warning",
  CANCELLED: "danger",
};

export default async function SalesPage() {
  const session = await requireSession();
  const showProfit = can(session.role, "VIEW_MARGINS");

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: true,
      soldByUser: true,
      items: { include: { inventoryUnit: { include: { product: true } }, stockLot: { include: { product: true } } } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {sales.length} venta{sales.length === 1 ? "" : "s"}
          </p>
        </div>
        {can(session.role, "MANAGE_SALES") && (
          <Link href="/sales/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nueva venta
          </Link>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Todavia no hay ventas registradas"
          description="Las ventas que confirmes van a aparecer aca."
        />
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 md:hidden">
            {sales.map((sale) => {
              const items = sale.items
                .map((item) => {
                  const product = item.inventoryUnit?.product ?? item.stockLot?.product;
                  return product ? productTitle(product) : null;
                })
                .filter(Boolean)
                .join(", ");
              return (
                <Link
                  key={sale.id}
                  href={`/sales/${sale.id}`}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {sale.customer ? customerName(sale.customer) : "Consumidor final"}
                    </span>
                    <StatusBadge tone={STATUS_TONE[sale.status]} className="shrink-0">
                      {STATUS_LABEL[sale.status]}
                    </StatusBadge>
                  </div>
                  {items && <p className="mt-0.5 truncate text-xs text-muted-foreground">{items}</p>}
                  <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {sale.createdAt.toLocaleDateString("es-AR")} · {sale.soldByUser.name}
                    </span>
                    <div className="text-right">
                      <p className="font-medium tabular-nums">{formatCurrency(sale.total.toNumber(), sale.currency)}</p>
                      {showProfit && (
                        <p className="text-xs tabular-nums text-success">
                          {formatCurrency(sale.profitTotal.toNumber(), sale.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipos</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {showProfit && <TableHead className="text-right">Ganancia</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.createdAt.toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales/${sale.id}`} className="font-medium hover:underline">
                        {sale.customer ? customerName(sale.customer) : "Consumidor final"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sale.items
                        .map((item) => {
                          const product = item.inventoryUnit?.product ?? item.stockLot?.product;
                          return product ? productTitle(product) : null;
                        })
                        .filter(Boolean)
                        .join(", ")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sale.soldByUser.name}</TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[sale.status]}>{STATUS_LABEL[sale.status]}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(sale.total.toNumber(), sale.currency)}
                    </TableCell>
                    {showProfit && (
                      <TableCell className="text-right tabular-nums text-success">
                        {formatCurrency(sale.profitTotal.toNumber(), sale.currency)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
