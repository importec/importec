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
import { customerName, formatCurrency, formatUsd, productTitle } from "@/lib/format";
import { SettlementForm } from "./settlement-form";
import { ReturnButton } from "./return-button";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PARTIALLY_SETTLED: "Vendida, pendiente de liquidar",
  SETTLED: "Liquidada",
  RETURNED: "Devuelta",
  EXPIRED: "Vencida",
};

export default async function ConsignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const consignment = await prisma.consignment.findUnique({
    where: { id },
    include: {
      inventoryUnit: {
        include: {
          product: true,
          location: true,
          saleItems: { include: { sale: true } },
        },
      },
      ownerCustomer: true,
      settlements: { orderBy: { settledAt: "desc" } },
    },
  });

  if (!consignment) notFound();

  const canManage = can(session.role, "MANAGE_CONSIGNMENTS");
  const sale = consignment.inventoryUnit.saleItems[0]?.sale;
  const salePrice = sale?.total.toNumber() ?? consignment.inventoryUnit.listPrice.toNumber();
  const commission = (salePrice * consignment.commissionPct.toNumber()) / 100;
  const owed = salePrice - commission;
  const settledSoFar = consignment.settlements.reduce((sum, s) => sum + s.amount.toNumber(), 0);
  const isSold = consignment.inventoryUnit.status === "SOLD";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/consignments" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a consignacion
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {productTitle(consignment.inventoryUnit.product)}
          </h1>
          <Badge>{STATUS_LABEL[consignment.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Consignado por{" "}
          <Link href={`/customers/${consignment.ownerCustomer.id}`} className="hover:underline">
            {customerName(consignment.ownerCustomer)}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Condiciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Precio de venta</p>
            <p className="font-medium">{formatUsd(consignment.inventoryUnit.listPrice.toNumber())}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comision</p>
            <p className="font-medium">{consignment.commissionPct.toNumber()}%</p>
          </div>
          {consignment.minPrice && (
            <div>
              <p className="text-xs text-muted-foreground">Precio minimo</p>
              <p className="font-medium">{formatUsd(consignment.minPrice.toNumber())}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Ubicacion</p>
            <p className="font-medium">{consignment.inventoryUnit.location.name}</p>
          </div>
          {consignment.termEndAt && (
            <div>
              <p className="text-xs text-muted-foreground">Vencimiento</p>
              <p className="font-medium">{consignment.termEndAt.toLocaleDateString("es-AR")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isSold && sale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Se vendio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Precio de venta</p>
              <p className="font-medium">{formatCurrency(salePrice, sale.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comision ({consignment.commissionPct.toNumber()}%)</p>
              <p className="font-medium">{formatCurrency(commission, sale.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A liquidar al consignante</p>
              <p className="font-medium">{formatCurrency(owed, sale.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ya liquidado</p>
              <p className="font-medium">{formatCurrency(settledSoFar, sale.currency)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && consignment.status !== "RETURNED" && consignment.status !== "SETTLED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liquidar al consignante</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettlementForm consignmentId={consignment.id} defaultCurrency={sale?.currency ?? "USD"} />
            {!isSold && (
              <div className="border-t pt-4">
                <ReturnButton consignmentId={consignment.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {consignment.settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de liquidaciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {consignment.settlements.map((settlement) => (
              <div key={settlement.id} className="flex items-center justify-between text-sm">
                <span>
                  {settlement.settledAt.toLocaleDateString("es-AR")}
                  {settlement.notes && <span className="text-muted-foreground"> · {settlement.notes}</span>}
                </span>
                <span className="font-medium">{formatCurrency(settlement.amount.toNumber(), settlement.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
