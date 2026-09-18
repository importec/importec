import Link from "next/link";
import { ArrowLeft, HandCoins, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DebtActions } from "./debt-actions";

export default async function VapeDebtsPage() {
  const session = await requireSession();
  const canManage = can(session.role, "MANAGE_VAPES");

  const debts = await prisma.vapeDebt.findMany({
    include: { product: true },
    orderBy: [{ paidAt: "asc" }, { createdAt: "desc" }],
  });

  const pending = debts.filter((d) => !d.paidAt);
  const totalsByCurrency = new Map<string, number>();
  for (const debt of pending) {
    totalsByCurrency.set(debt.currency, (totalsByCurrency.get(debt.currency) ?? 0) + debt.amount.toNumber());
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/vapes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a vapes
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Adeudado</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length} deuda{pending.length === 1 ? "" : "s"} pendiente
              {pending.length === 1 ? "" : "s"}
              {totalsByCurrency.size > 0 &&
                " · " +
                  Array.from(totalsByCurrency.entries())
                    .map(([currency, amount]) => formatCurrency(amount, currency as "USD" | "ARS"))
                    .join(" + ")}
            </p>
          </div>
          {canManage && (
            <Link href="/vapes/debts/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Nueva deuda
            </Link>
          )}
        </div>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No hay deudas cargadas"
          description="Cuando le des vapes a alguien que todavia no te paga, cargalo aca."
        />
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 md:hidden">
            {debts.map((debt) => (
              <div key={debt.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{debt.debtorName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {debt.product ? debt.product.name : debt.description || "—"}
                      {debt.quantity ? ` · x${debt.quantity}` : ""}
                    </p>
                  </div>
                  <StatusBadge tone={debt.paidAt ? "success" : "warning"} className="shrink-0">
                    {debt.paidAt ? "Pagado" : "Pendiente"}
                  </StatusBadge>
                </div>
                <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {debt.createdAt.toLocaleDateString("es-AR")}
                    {debt.phone ? ` · ${debt.phone}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(debt.amount.toNumber(), debt.currency)}</span>
                </div>
                {canManage && (
                  <div className="mt-2 flex justify-end border-t pt-2">
                    <DebtActions debtId={debt.id} paid={!!debt.paidAt} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deudor</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell>
                      <p className="font-medium">{debt.debtorName}</p>
                      {debt.phone && <p className="text-xs text-muted-foreground">{debt.phone}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {debt.product ? debt.product.name : debt.description || "—"}
                      {debt.quantity ? ` · x${debt.quantity}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {debt.createdAt.toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={debt.paidAt ? "success" : "warning"}>
                        {debt.paidAt ? "Pagado" : "Pendiente"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(debt.amount.toNumber(), debt.currency)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <DebtActions debtId={debt.id} paid={!!debt.paidAt} />
                        </div>
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
