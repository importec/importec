import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getCashAccountBalances } from "@/server/queries/finance";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { MovementForm } from "./movement-form";
import { ExchangeRateForm } from "./exchange-rate-form";

const SOURCE_LABELS: Record<string, string> = {
  SALE: "Venta",
  PURCHASE: "Compra",
  EXPENSE: "Gasto",
  WITHDRAWAL: "Retiro",
  REPAIR: "Reparacion",
  CONSIGNMENT_SETTLEMENT: "Liquidacion",
  OTHER: "Otro",
};

export default async function FinancePage() {
  const session = await requireSession();
  const canManage = can(session.role, "MANAGE_FINANCE");

  const [balances, movements, payables, latestRate] = await Promise.all([
    getCashAccountBalances(),
    prisma.cashMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { cashAccount: true, createdByUser: true },
    }),
    prisma.purchase.findMany({
      where: { status: "RECEIVED" },
      include: { items: true },
    }),
    prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } }),
  ]);

  const payablesByCurrency = new Map<string, number>();
  for (const purchase of payables) {
    const purchaseTotal = purchase.items.reduce((s, item) => s + item.unitCost.toNumber() * item.quantity, 0);
    payablesByCurrency.set(purchase.currency, (payablesByCurrency.get(purchase.currency) ?? 0) + purchaseTotal);
  }
  const payablesLabel =
    payablesByCurrency.size === 0
      ? formatCurrency(0, "USD")
      : Array.from(payablesByCurrency.entries())
          .map(([currency, amount]) => formatCurrency(amount, currency as "USD" | "ARS"))
          .join(" + ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Caja y finanzas</h1>
        <p className="text-sm text-muted-foreground">Estado de las cuentas y movimientos recientes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((account) => (
          <KpiCard
            key={account.id}
            label={account.name}
            value={formatCurrency(account.balance, account.currency)}
            tone={account.balance < 0 ? "warning" : "default"}
            icon={Wallet}
          />
        ))}
        <KpiCard
          label="Cuentas por pagar"
          value={payablesLabel}
          hint={`${payables.length} compra${payables.length === 1 ? "" : "s"} recibidas sin pagar`}
          tone={payables.length > 0 ? "warning" : "default"}
          icon={ArrowUpCircle}
        />
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar retiro o ingreso manual</CardTitle>
          </CardHeader>
          <CardContent>
            <MovementForm cashAccounts={balances.map((a) => ({ id: a.id, name: a.name }))} />
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de cambio del dia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Se usa para convertir precios entre dolares y pesos en ventas, pagos y plan canje.
            </p>
            <ExchangeRateForm currentRate={latestRate?.usdToArs.toNumber() ?? null} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {movements.length === 0 ? (
              <p className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
                Todavia no hay movimientos.
              </p>
            ) : (
              movements.map((movement) => (
                <div key={movement.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {movement.createdAt.toLocaleDateString("es-AR")}
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 font-medium ${movement.type === "IN" ? "text-success" : "text-destructive"}`}
                    >
                      {movement.type === "IN" ? (
                        <ArrowDownCircle className="size-3.5" />
                      ) : (
                        <ArrowUpCircle className="size-3.5" />
                      )}
                      {formatCurrency(movement.amount.toNumber(), movement.currency)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {movement.cashAccount.name} · {SOURCE_LABELS[movement.source] ?? movement.source}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{movement.description ?? "—"}</p>
                </div>
              ))
            )}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Todavia no hay movimientos.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.createdAt.toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="text-sm">{movement.cashAccount.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SOURCE_LABELS[movement.source] ?? movement.source}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{movement.description ?? "—"}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${movement.type === "IN" ? "text-success" : "text-destructive"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {movement.type === "IN" ? (
                            <ArrowDownCircle className="size-3.5" />
                          ) : (
                            <ArrowUpCircle className="size-3.5" />
                          )}
                          {formatCurrency(movement.amount.toNumber(), movement.currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
