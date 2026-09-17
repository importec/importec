import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { VapeProductForm } from "./vape-product-form";

export default async function NewVapeProductPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_VAPES")) {
    redirect("/vapes");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo producto de vape</h1>
      </div>
      <VapeProductForm />
    </div>
  );
}
