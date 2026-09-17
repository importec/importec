import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { CustomerForm } from "../../customer-form";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_CUSTOMERS")) {
    redirect("/customers");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editar cliente</h1>
      </div>
      <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} submitLabel="Guardar cambios" />
    </div>
  );
}
