import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { SellerForm } from "./seller-form";

export default async function NewVapeSellerPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    redirect("/vapes/sellers");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo vendedor</h1>
      </div>
      <SellerForm />
    </div>
  );
}
