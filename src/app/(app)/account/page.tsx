import { requireSession } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">
          {session.name} · {ROLE_LABELS[session.role]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cambiar mi contrasena</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
