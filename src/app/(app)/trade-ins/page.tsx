import Link from "next/link";
import { Plus, Repeat } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName, formatCurrency, productTitle } from "@/lib/format";

export default async function TradeInsPage() {
  const session = await requireSession();

  const tradeIns = await prisma.tradeIn.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sale: { include: { customer: true } },
      receivedInventoryUnit: { include: { product: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plan canje</h1>
          <p className="text-sm text-muted-foreground">
            Equipos recibidos como parte de pago. El canje se registra dentro de una venta nueva.
          </p>
        </div>
        {can(session.role, "MANAGE_SALES") && (
          <Link href="/sales/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nueva venta con canje
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {tradeIns.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Repeat className="size-8" />
            <p>Todavia no se registraron canjes.</p>
          </div>
        ) : (
          tradeIns.map((tradeIn) => (
            <Link
              key={tradeIn.id}
              href={`/inventory/${tradeIn.receivedInventoryUnitId}`}
              className="rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {productTitle(tradeIn.receivedInventoryUnit.product)}
                </span>
                <span className="shrink-0 font-medium">
                  {formatCurrency(tradeIn.appraisedValue.toNumber(), tradeIn.currency)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {tradeIn.createdAt.toLocaleDateString("es-AR")} ·{" "}
                {tradeIn.sale.customer ? customerName(tradeIn.sale.customer) : "Consumidor final"}
              </p>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo recibido</TableHead>
              <TableHead className="text-right">Valor tomado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradeIns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Repeat className="size-8" />
                    <p>Todavia no se registraron canjes.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tradeIns.map((tradeIn) => (
                <TableRow key={tradeIn.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {tradeIn.createdAt.toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>
                    {tradeIn.sale.customer ? customerName(tradeIn.sale.customer) : "Consumidor final"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/inventory/${tradeIn.receivedInventoryUnitId}`}
                      className="font-medium hover:underline"
                    >
                      {productTitle(tradeIn.receivedInventoryUnit.product)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tradeIn.appraisedValue.toNumber(), tradeIn.currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
