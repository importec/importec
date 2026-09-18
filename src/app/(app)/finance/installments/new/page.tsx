import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PlanForm } from "./plan-form";

export default async function NewInstallmentPlanPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_FINANCE")) {
    redirect("/finance/installments");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo plan de cuotas</h1>
        <p className="text-sm text-muted-foreground">
          Cargá el total y la cantidad de cuotas: se generan los vencimientos automaticamente, uno por mes.
        </p>
      </div>
      <PlanForm />
    </div>
  );
}
