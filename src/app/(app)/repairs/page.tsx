import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName } from "@/lib/format";
import { REPAIR_STATUS_LABELS } from "@/lib/repairs/status";

const OPEN_STATUSES = ["RECEIVED", "DIAGNOSING", "QUOTE_SENT", "AWAITING_APPROVAL", "APPROVED", "IN_PROGRESS", "AWAITING_PART"];

const STATUS_TONE: Record<string, StatusTone> = {
  RECEIVED: "info",
  DIAGNOSING: "warning",
  QUOTE_SENT: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  IN_PROGRESS: "warning",
  AWAITING_PART: "warning",
  DONE: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export default async function RepairsPage() {
  const session = await requireSession();

  const repairs = await prisma.repair.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true, assignedTechUser: true },
  });

  const openCount = repairs.filter((r) => OPEN_STATUSES.includes(r.status)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Servicio tecnico</h1>
          <p className="text-sm text-muted-foreground">{openCount} reparaciones abiertas</p>
        </div>
        {can(session.role, "MANAGE_REPAIRS") && (
          <Link href="/repairs/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nueva reparacion
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {repairs.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Wrench className="size-8" />
            <p>Todavia no hay reparaciones registradas.</p>
          </div>
        ) : (
          repairs.map((repair) => (
            <Link
              key={repair.id}
              href={`/repairs/${repair.id}`}
              className="rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{customerName(repair.customer)}</span>
                <StatusBadge tone={STATUS_TONE[repair.status]} className="shrink-0">
                  {REPAIR_STATUS_LABELS[repair.status]}
                </StatusBadge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{repair.deviceDescription}</p>
              <p className="truncate text-xs text-muted-foreground">{repair.reportedIssue}</p>
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                <span>{repair.createdAt.toLocaleDateString("es-AR")}</span>
                <span>{repair.assignedTechUser?.name ?? "Sin asignar"}</span>
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
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Falla</TableHead>
              <TableHead>Tecnico</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Wrench className="size-8" />
                    <p>Todavia no hay reparaciones registradas.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              repairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {repair.createdAt.toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/repairs/${repair.id}`} className="font-medium hover:underline">
                      {customerName(repair.customer)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{repair.deviceDescription}</TableCell>
                  <TableCell className="max-w-52 truncate text-sm text-muted-foreground">
                    {repair.reportedIssue}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {repair.assignedTechUser?.name ?? "Sin asignar"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONE[repair.status]}>{REPAIR_STATUS_LABELS[repair.status]}</StatusBadge>
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
