import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getReportsData } from "@/server/queries/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatUsd } from "@/lib/format";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const showFinancials = can(session.role, "VIEW_MARGINS");
  const { from: fromParam, to: toParam } = await searchParams;

  const now = new Date();
  const from = fromParam ? new Date(fromParam) : startOfMonth(now);
  const to = toParam ? new Date(`${toParam}T23:59:59`) : now;

  const data = await getReportsData({ from, to });

  const maxAge = Math.max(1, ...Object.values(data.ageBuckets));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">Periodo del {from.toLocaleDateString("es-AR")} al {to.toLocaleDateString("es-AR")}.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="from">Desde</Label>
          <Input id="from" name="from" type="date" defaultValue={toInputDate(from)} className="w-40" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="to">Hasta</Label>
          <Input id="to" name="to" type="date" defaultValue={toInputDate(to)} className="w-40" />
        </div>
        <Button type="submit" variant="outline">
          Aplicar
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas del periodo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.salesSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hubo ventas en este periodo.</p>
            ) : (
              data.salesSummary.map((row) => (
                <div key={row.currency} className="flex items-center justify-between text-sm">
                  <span>
                    {row.count} operacion{row.count === 1 ? "" : "es"} · ticket promedio{" "}
                    {formatCurrency(row.count ? row.total / row.count : 0, row.currency as "USD" | "ARS")}
                  </span>
                  <span className="text-right">
                    <span className="block font-medium">
                      {formatCurrency(row.total, row.currency as "USD" | "ARS")}
                    </span>
                    {showFinancials && (
                      <span className="block text-xs text-success">
                        Ganancia {formatCurrency(row.profit, row.currency as "USD" | "ARS")}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
            {showFinancials && (
              <div className="border-t pt-2 text-sm text-muted-foreground">
                Servicio tecnico: {data.repairsDelivered} entregas · ganancia {formatUsd(data.repairProfit)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas por modelo</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos en este periodo.</p>
            ) : (
              <ul className="space-y-2">
                {data.topProducts.map((product) => (
                  <li key={product.title} className="flex items-center justify-between text-sm">
                    <span>
                      {product.title} <span className="text-muted-foreground">x{product.quantity}</span>
                    </span>
                    <span className="font-medium">{formatUsd(product.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antiguedad del stock disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {Object.entries(data.ageBuckets).map(([bucket, count]) => (
                <li key={bucket} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm">{bucket} dias</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${(count / maxAge) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes recurrentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recurringCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavia no hay clientes con mas de una compra.</p>
            ) : (
              <ul className="space-y-2">
                {data.recurringCustomers.map((customer) => (
                  <li key={customer.id} className="flex items-center justify-between text-sm">
                    <span>{customer.name}</span>
                    <span className="text-muted-foreground">{customer.salesCount} compras</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {showFinancials && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Gastos del periodo por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expenseRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hubo gastos en este periodo.</p>
              ) : (
                <ul className="space-y-2">
                  {data.expenseRows.map((row, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>{row.category}</span>
                      <span className="font-medium">{formatCurrency(row.amount, row.currency as "USD" | "ARS")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
