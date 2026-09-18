import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
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
import { PayInstallmentButton } from "./pay-installment-button";
import { DeletePlanButton } from "./delete-plan-button";

export default async function InstallmentPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const canManage = can(session.role, "MANAGE_FINANCE");

  const plan = await prisma.installmentPlan.findUnique({
    where: { id },
    include: {
      customer: true,
      installments: { orderBy: { seq: "asc" } },
    },
  });
  if (!plan) notFound();

  const cashAccounts = await prisma.cashAccount.findMany({
    where: { currency: plan.currency },
    orderBy: { name: "asc" },
  });

  const paidCount = plan.installments.filter((i) => i.paidAt).length;
  const allPaid = paidCount === plan.installments.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/finance/installments"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}
        >
          <ArrowLeft className="size-4" />
          Volver a cuotas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{customerName(plan.customer)}</h1>
          <StatusBadge tone={allPaid ? "success" : "info"}>
            {allPaid ? "Completado" : `${paidCount}/${plan.installments.length} cuotas`}
          </StatusBadge>
        </div>
        {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Monto total</p>
            <p className="font-medium">{formatCurrency(plan.totalAmount.toNumber(), plan.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cuotas</p>
            <p className="font-medium">{plan.installments.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cargado el</p>
            <p className="font-medium">{plan.createdAt.toLocaleDateString("es-AR")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuotas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {plan.installments.map((installment) => {
              const isOverdue = !installment.paidAt && installment.dueDate < new Date();
              const tone: StatusTone = installment.paidAt ? "success" : isOverdue ? "danger" : "info";
              return (
                <div key={installment.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">Cuota {installment.seq}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence {installment.dueDate.toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <StatusBadge tone={tone} className="shrink-0">
                      {installment.paidAt ? "Pagada" : isOverdue ? "Vencida" : "Pendiente"}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                    <span className="font-medium tabular-nums">
                      {formatCurrency(installment.amount.toNumber(), plan.currency)}
                    </span>
                    {canManage && !installment.paidAt && (
                      <PayInstallmentButton installmentId={installment.id} cashAccounts={cashAccounts} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuota</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  {canManage && <TableHead className="text-right">Accion</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.installments.map((installment) => {
                  const isOverdue = !installment.paidAt && installment.dueDate < new Date();
                  const tone: StatusTone = installment.paidAt ? "success" : isOverdue ? "danger" : "info";
                  return (
                    <TableRow key={installment.id}>
                      <TableCell className="font-medium">{installment.seq}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {installment.dueDate.toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={tone}>
                          {installment.paidAt ? "Pagada" : isOverdue ? "Vencida" : "Pendiente"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(installment.amount.toNumber(), plan.currency)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          {!installment.paidAt && (
                            <div className="flex justify-end">
                              <PayInstallmentButton installmentId={installment.id} cashAccounts={cashAccounts} />
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canManage && paidCount === 0 && (
        <div className="flex justify-end">
          <DeletePlanButton planId={plan.id} />
        </div>
      )}
    </div>
  );
}
