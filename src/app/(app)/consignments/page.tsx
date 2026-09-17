import Link from "next/link";
import { Plus, HandCoins } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName, formatUsd, productTitle } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PARTIALLY_SETTLED: "Vendida, pendiente de liquidar",
  SETTLED: "Liquidada",
  RETURNED: "Devuelta",
  EXPIRED: "Vencida",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  PARTIALLY_SETTLED: "secondary",
  SETTLED: "outline",
  RETURNED: "destructive",
  EXPIRED: "destructive",
};

export default async function ConsignmentsPage() {
  const session = await requireSession();

  const consignments = await prisma.consignment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { inventoryUnit: { include: { product: true } }, ownerCustomer: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Consignacion</h1>
          <p className="text-sm text-muted-foreground">
            {consignments.length} consignacion{consignments.length === 1 ? "" : "es"}
          </p>
        </div>
        {can(session.role, "MANAGE_CONSIGNMENTS") && (
          <Link href="/consignments/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nueva consignacion
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {consignments.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <HandCoins className="size-8" />
            <p>Todavia no hay equipos en consignacion.</p>
          </div>
        ) : (
          consignments.map((consignment) => (
            <Link
              key={consignment.id}
              href={`/consignments/${consignment.id}`}
              className="rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {productTitle(consignment.inventoryUnit.product)}
                </span>
                <Badge variant={STATUS_VARIANT[consignment.status]} className="shrink-0">
                  {STATUS_LABEL[consignment.status]}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {customerName(consignment.ownerCustomer)} · {consignment.commissionPct.toNumber()}%
              </p>
              <div className="mt-2 flex items-center justify-end border-t pt-2 text-sm font-medium">
                {formatUsd(consignment.inventoryUnit.listPrice.toNumber())}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Consignante</TableHead>
              <TableHead>Comision</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Precio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <HandCoins className="size-8" />
                    <p>Todavia no hay equipos en consignacion.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              consignments.map((consignment) => (
                <TableRow key={consignment.id}>
                  <TableCell>
                    <Link href={`/consignments/${consignment.id}`} className="font-medium hover:underline">
                      {productTitle(consignment.inventoryUnit.product)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{customerName(consignment.ownerCustomer)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {consignment.commissionPct.toNumber()}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[consignment.status]}>{STATUS_LABEL[consignment.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatUsd(consignment.inventoryUnit.listPrice.toNumber())}
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
