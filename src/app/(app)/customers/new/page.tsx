import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CUSTOMERS")) {
    redirect("/customers");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground">Carga los datos de contacto del cliente.</p>
      </div>
      <CustomerForm action={createCustomer} />
    </div>
  );
}
