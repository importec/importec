import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { SupplierForm } from "../supplier-form";
import { createSupplier } from "../actions";

export default async function NewSupplierPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_SUPPLIERS")) {
    redirect("/suppliers");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo proveedor</h1>
      </div>
      <SupplierForm action={createSupplier} />
    </div>
  );
}
