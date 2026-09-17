import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getAlerts } from "@/server/queries/alerts";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AlertsPage() {
  await requireSession();
  const alerts = await getAlerts();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          {alerts.length} alerta{alerts.length === 1 ? "" : "s"} activa{alerts.length === 1 ? "" : "s"}
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <CheckCircle2 className="size-8" />
            <p>Todo en orden. No hay alertas por el momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <Link key={alert.id} href={alert.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-start gap-3 py-4">
                  <AlertTriangle
                    className={`mt-0.5 size-4 shrink-0 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.detail}</p>
                  </div>
                  <StatusBadge tone={alert.severity === "critical" ? "danger" : "warning"}>
                    {alert.severity === "critical" ? "Urgente" : "Atencion"}
                  </StatusBadge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
