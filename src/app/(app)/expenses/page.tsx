import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export default async function ExpensesPage() {
  const session = await requireSession();

  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { category: true, cashAccount: true, createdByUser: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-sm text-muted-foreground">
            {expenses.length} gasto{expenses.length === 1 ? "" : "s"} registrados
          </p>
        </div>
        {can(session.role, "MANAGE_FINANCE") && (
          <Link href="/expenses/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo gasto
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {expenses.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Receipt className="size-8" />
            <p>Todavia no hay gastos registrados.</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {expense.createdAt.toLocaleDateString("es-AR")}
                </span>
                <span className="shrink-0 font-medium">
                  {formatCurrency(expense.amount.toNumber(), expense.currency)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {expense.category.name} · {expense.cashAccount?.name ?? "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{expense.description ?? "—"}</p>
            </div>
          ))
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="size-8" />
                    <p>Todavia no hay gastos registrados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {expense.createdAt.toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell className="text-sm">{expense.category.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.description ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.cashAccount?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount.toNumber(), expense.currency)}
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
