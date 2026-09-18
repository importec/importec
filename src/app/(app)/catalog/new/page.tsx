import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { CatalogForm } from "./catalog-form";

export default async function NewCatalogEntryPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_INVENTORY")) {
    redirect("/catalog");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo modelo</h1>
        <p className="text-sm text-muted-foreground">
          Cargá cuanto pagas por este modelo segun su condicion. Dejá vacio lo que no ofrezcas.
        </p>
      </div>
      <CatalogForm />
    </div>
  );
}
