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
import { customerName, formatUsd } from "@/lib/format";
import { REPAIR_STATUS_LABELS, REPAIR_STATUS_TRANSITIONS } from "@/lib/repairs/status";
import { StatusActions } from "./status-actions";
import { DiagnosisForm } from "./diagnosis-form";
import { DeliverForm } from "./deliver-form";

export default async function RepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const repair = await prisma.repair.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedTechUser: true,
      warranty: true,
      statusHistory: { orderBy: { createdAt: "desc" }, include: { changedByUser: true } },
    },
  });

  if (!repair) notFound();

  const canManage = can(session.role, "MANAGE_REPAIRS");
  const showCosts = can(session.role, "VIEW_COSTS");
  const cashAccounts = await prisma.cashAccount.findMany({ orderBy: { name: "asc" } });

  const partsCost = repair.partsCost?.toNumber() ?? 0;
  const laborCost = repair.laborCost?.toNumber() ?? 0;
  const finalPrice = repair.finalPrice?.toNumber() ?? 0;
  const profit = finalPrice - partsCost - laborCost;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/repairs" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a servicio tecnico
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{repair.deviceDescription}</h1>
          <Badge>{REPAIR_STATUS_LABELS[repair.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/customers/${repair.customer.id}`} className="hover:underline">
            {customerName(repair.customer)}
          </Link>
          {repair.assignedTechUser && ` · Tecnico: ${repair.assignedTechUser.name}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingreso</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">IMEI / Serie</p>
            <p className="font-medium">{repair.imei ?? repair.serialNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accesorios entregados</p>
            <p className="font-medium">{repair.accessoriesReceived ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Falla reportada</p>
            <p className="font-medium">{repair.reportedIssue}</p>
          </div>
          {repair.receivedCondition && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Condicion al recibirlo</p>
              <p className="font-medium">{repair.receivedCondition}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && REPAIR_STATUS_TRANSITIONS[repair.status].length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cambiar estado</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusActions repairId={repair.id} options={REPAIR_STATUS_TRANSITIONS[repair.status]} />
          </CardContent>
        </Card>
      )}

      {canManage && repair.status !== "DELIVERED" && repair.status !== "CANCELLED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diagnostico y presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosisForm
              repairId={repair.id}
              repair={{
                diagnosis: repair.diagnosis,
                laborCost: repair.laborCost?.toString() ?? null,
                partsCost: repair.partsCost?.toString() ?? null,
                finalPrice: repair.finalPrice?.toString() ?? null,
              }}
            />
          </CardContent>
        </Card>
      )}

      {(repair.diagnosis || repair.finalPrice) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {repair.diagnosis && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-muted-foreground">Diagnostico</p>
                <p className="font-medium">{repair.diagnosis}</p>
              </div>
            )}
            {showCosts && (
              <div>
                <p className="text-xs text-muted-foreground">Repuestos</p>
                <p className="font-medium">{formatUsd(partsCost)}</p>
              </div>
            )}
            {showCosts && (
              <div>
                <p className="text-xs text-muted-foreground">Mano de obra</p>
                <p className="font-medium">{formatUsd(laborCost)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Precio final</p>
              <p className="font-medium">{formatUsd(finalPrice)}</p>
            </div>
            {showCosts && (
              <div>
                <p className="text-xs text-muted-foreground">Ganancia</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">{formatUsd(profit)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && repair.status === "DONE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entregar al cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliverForm
              repairId={repair.id}
              suggestedAmount={finalPrice}
              cashAccounts={cashAccounts.map((a) => ({ id: a.id, name: a.name }))}
            />
          </CardContent>
        </Card>
      )}

      {repair.warranty && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Garantia</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{repair.warranty.terms}</p>
            <p className="text-muted-foreground">
              Vence el {repair.warranty.endAt.toLocaleDateString("es-AR")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {repair.statusHistory.map((event) => (
              <li key={event.id} className="flex items-center justify-between text-sm">
                <span>
                  {event.fromStatus ? `${REPAIR_STATUS_LABELS[event.fromStatus]} → ` : ""}
                  {REPAIR_STATUS_LABELS[event.toStatus]}
                  {event.changedByUser && <span className="text-muted-foreground"> · {event.changedByUser.name}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{event.createdAt.toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
