import { getDashboardData } from "@/server/queries/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatUsd, formatCurrency, CATEGORY_LABELS } from "@/lib/format";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  Boxes,
  Package,
  TrendingUp,
  Users2,
  AlertTriangle,
  ShoppingCart,
  CalendarDays,
} from "lucide-react";

type SalesSummaryRow = { currency: "USD" | "ARS"; count: number; total: number; profit: number };

function formatSalesTotal(rows: SalesSummaryRow[]) {
  if (rows.length === 0) return formatUsd(0);
  return rows.map((row) => formatCurrency(row.total, row.currency)).join(" + ");
}

function salesCount(rows: SalesSummaryRow[]) {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData();
  const showFinancials = can(session.role, "VIEW_MARGINS");

  const maxCategoryCount = Math.max(1, ...data.categoryBreakdown.map(([, count]) => count));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Estado del inventario en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas de hoy"
          value={formatSalesTotal(data.salesToday)}
          hint={`${formatNumber(salesCount(data.salesToday))} operacion${salesCount(data.salesToday) === 1 ? "" : "es"}`}
          icon={ShoppingCart}
        />
        <KpiCard
          label="Ventas del mes"
          value={formatSalesTotal(data.salesThisMonth)}
          hint={`${formatNumber(salesCount(data.salesThisMonth))} operacion${salesCount(data.salesThisMonth) === 1 ? "" : "es"}`}
          icon={CalendarDays}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Unidades disponibles"
          value={formatNumber(data.totalAvailable)}
          hint={`${formatNumber(data.ownedUnitsCount)} propias · ${formatNumber(data.consignedUnitsCount)} consignadas`}
          icon={Package}
        />
        {showFinancials ? (
          <>
            <KpiCard
              label="Capital invertido"
              value={formatUsd(data.investedCapital)}
              hint="Costo del stock propio activo"
              icon={Boxes}
            />
            <KpiCard
              label="Valor de venta potencial"
              value={formatUsd(data.potentialRevenue)}
              hint="Si se vende todo el stock propio a precio de lista"
              icon={TrendingUp}
            />
            <KpiCard
              label="Ganancia potencial"
              value={formatUsd(data.potentialProfit)}
              tone="positive"
              hint="Valor de venta menos capital invertido"
              icon={TrendingUp}
            />
          </>
        ) : (
          <KpiCard
            label="Stock consignado"
            value={formatUsd(data.consignedValue)}
            hint="Valor de lista de equipos de terceros"
            icon={Users2}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock disponible por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavia no hay stock cargado.</p>
            ) : (
              <ul className="space-y-3">
                {data.categoryBreakdown.map(([category, count]) => (
                  <li key={category} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm">
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              Stock sin rotar (+45 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.staleUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay equipos disponibles con mas de 45 dias en stock.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.staleUnits.map((unit) => (
                  <li key={unit.id} className="flex items-center justify-between text-sm">
                    <span>{unit.title}</span>
                    <Badge variant="secondary">{unit.days} dias</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
