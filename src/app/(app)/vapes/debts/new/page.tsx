import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { DebtForm } from "./debt-form";

export default async function NewVapeDebtPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    redirect("/vapes/debts");
  }

  const products = await prisma.vapeProduct.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nueva deuda</h1>
        <p className="text-sm text-muted-foreground">
          Cargá a quién le diste vapes y todavía no te pagó.
        </p>
      </div>
      <DebtForm
        products={products.map((p) => ({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, currency: p.currency }))}
      />
    </div>
  );
}
