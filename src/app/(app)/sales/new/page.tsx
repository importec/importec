import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { SaleWizard } from "./sale-wizard";

export default async function NewSalePage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SALES")) {
    redirect("/sales");
  }

  const [cashAccounts, locations, latestRate] = await Promise.all([
    prisma.cashAccount.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nueva venta</h1>
        <p className="text-sm text-muted-foreground">
          Cliente, equipos, plan canje (opcional) y medios de pago.
        </p>
      </div>
      <SaleWizard
        cashAccounts={cashAccounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        usdToArs={latestRate?.usdToArs.toNumber() ?? null}
      />
    </div>
  );
}
