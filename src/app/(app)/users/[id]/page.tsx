import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { UserEditForm } from "./user-edit-form";
import { ResetPasswordForm } from "./reset-password-form";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const isSelf = user.id === session.userId;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link href="/users" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a usuarios
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{user.name}</h1>
          <StatusBadge tone={user.isActive ? "success" : "danger"}>
            {user.isActive ? "Activo" : "Inactivo"}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          {user.email} · {ROLE_LABELS[user.role]}
        </p>
      </div>

      {isSelf ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No podes editar tu propio rol o estado desde aca. Pedile a otro administrador que lo haga.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rol y estado</CardTitle>
            </CardHeader>
            <CardContent>
              <UserEditForm userId={user.id} role={user.role} isActive={user.isActive} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Restablecer contrasena</CardTitle>
            </CardHeader>
            <CardContent>
              <ResetPasswordForm userId={user.id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
