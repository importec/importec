import Link from "next/link";
import { ArrowLeft, CalendarClock, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function planStatus(installments: { paidAt: Date | null; dueDate: Date }[]) {
  const pending = installments.filter((i) => !i.paidAt);
  if (pending.length === 0) return { label: "Completado", tone: "success" as StatusTone };
  const overdue = pending.some((i) => i.dueDate < new Date());
  if (overdue) return { label: "Vencido", tone: "danger" as StatusTone };
  return { label: "Al dia", tone: "info" as StatusTone };
}

export default async function InstallmentsPage() {
  const session = await requireSession();
  const canManage = can(session.role, "MANAGE_FINANCE");

  const plans = await prisma.installmentPlan.findMany({
    include: { customer: true, installments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/finance" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a caja y finanzas
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Cuotas</h1>
            <p className="text-sm text-muted-foreground">
              {plans.length} plan{plans.length === 1 ? "" : "es"} de pago
            </p>
          </div>
          {canManage && (
            <Link href="/finance/installments/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Nuevo plan
            </Link>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No hay planes de cuotas cargados"
          description="Cuando un cliente pague en cuotas, cargalo aca para hacer seguimiento de los vencimientos."
        />
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 md:hidden">
            {plans.map((plan) => {
              const status = planStatus(plan.installments);
              const paidCount = plan.installments.filter((i) => i.paidAt).length;
              const nextDue = plan.installments
                .filter((i) => !i.paidAt)
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
              return (
                <Link
                  key={plan.id}
                  href={`/finance/installments/${plan.id}`}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{customerName(plan.customer)}</span>
                    <StatusBadge tone={status.tone} className="shrink-0">
                      {status.label}
                    </StatusBadge>
                  </div>
                  {plan.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{plan.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {paidCount}/{plan.installments.length} cuotas
                      {nextDue && ` · vence ${nextDue.dueDate.toLocaleDateString("es-AR")}`}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(plan.totalAmount.toNumber(), plan.currency)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Cuotas</TableHead>
                  <TableHead>Proximo vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const status = planStatus(plan.installments);
                  const paidCount = plan.installments.filter((i) => i.paidAt).length;
                  const nextDue = plan.installments
                    .filter((i) => !i.paidAt)
                    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <Link href={`/finance/installments/${plan.id}`} className="font-medium hover:underline">
                          {customerName(plan.customer)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{plan.description || "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {paidCount}/{plan.installments.length}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {nextDue ? nextDue.dueDate.toLocaleDateString("es-AR") : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(plan.totalAmount.toNumber(), plan.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
