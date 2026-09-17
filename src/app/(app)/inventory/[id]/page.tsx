import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  STATUS_LABELS,
  formatUsd,
  productTitle,
} from "@/lib/format";
import { STATUS_TONE, STATUS_TRANSITIONS } from "@/lib/inventory/status";
import { StatusActions } from "./status-actions";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function InventoryUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const unit = await prisma.inventoryUnit.findUnique({
    where: { id },
    include: {
      product: true,
      location: true,
      consignment: { include: { ownerCustomer: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedByUser: true },
      },
    },
  });

  if (!unit) notFound();

  const showCosts = can(session.role, "VIEW_COSTS");
  const canManage = can(session.role, "MANAGE_INVENTORY");
  const margin = unit.listPrice.toNumber() - unit.cost.toNumber();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/inventory"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}
        >
          <ArrowLeft className="size-4" />
          Volver a inventario
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {productTitle(unit.product)}
          </h1>
          <StatusBadge tone={STATUS_TONE[unit.status]}>{STATUS_LABELS[unit.status]}</StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          {CATEGORY_LABELS[unit.product.category]}
          {unit.product.color ? ` · ${unit.product.color}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de la unidad</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="IMEI" value={unit.imei ?? "—"} />
            <Field label="Numero de serie" value={unit.serialNumber ?? "—"} />
            <Field label="Condicion" value={CONDITION_LABELS[unit.condition]} />
            <Field label="Bateria" value={unit.batteryPct ? `${unit.batteryPct}%` : "—"} />
            <Field label="Nuevo / usado" value={unit.isNew ? "Nuevo" : "Usado"} />
            <Field label="Ubicacion" value={unit.location.name} />
            <Field
              label="Propiedad"
              value={
                unit.ownerType === "COMPANY"
                  ? "Propio"
                  : `Consignado${unit.consignment?.ownerCustomer ? ` — ${unit.consignment.ownerCustomer.firstName} ${unit.consignment.ownerCustomer.lastName}` : ""}`
              }
            />
            {showCosts && <Field label="Costo" value={formatUsd(unit.cost.toNumber())} />}
            <Field label="Precio de lista" value={formatUsd(unit.listPrice.toNumber())} />
            {unit.minPrice && <Field label="Precio minimo" value={formatUsd(unit.minPrice.toNumber())} />}
            {showCosts && (
              <Field
                label="Margen"
                value={
                  <span className={margin >= 0 ? "text-success" : "text-destructive"}>
                    {formatUsd(margin)}
                  </span>
                }
              />
            )}
          </dl>
          {unit.notes && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground">Observaciones</p>
              <p className="text-sm">{unit.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cambiar estado</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusActions unitId={unit.id} options={STATUS_TRANSITIONS[unit.status]} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {unit.statusHistory.map((event) => (
              <li key={event.id} className="flex items-center justify-between text-sm">
                <span>
                  {event.fromStatus ? `${STATUS_LABELS[event.fromStatus]} → ` : ""}
                  {STATUS_LABELS[event.toStatus]}
                  {event.changedByUser && (
                    <span className="text-muted-foreground"> · {event.changedByUser.name}</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.createdAt.toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
