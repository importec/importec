import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { UserForm } from "./user-form";

export default async function NewUserPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo usuario</h1>
      </div>
      <UserForm />
    </div>
  );
}
