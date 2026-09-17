import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { ExpenseForm } from "./expense-form";

export default async function NewExpensePage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    redirect("/expenses");
  }

  const [categories, cashAccounts] = await Promise.all([
    prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.cashAccount.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo gasto</h1>
      </div>
      <ExpenseForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        cashAccounts={cashAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
      />
    </div>
  );
}
