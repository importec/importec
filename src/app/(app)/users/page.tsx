import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function UsersPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_USERS")) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} usuario{users.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/users/new" className={buttonVariants()}>
          <Plus className="size-4" />
          Nuevo usuario
        </Link>
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {users.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <ShieldCheck className="size-8" />
            <p>No hay usuarios cargados.</p>
          </div>
        ) : (
          users.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {user.name}
                  {user.id === session.userId && (
                    <span className="ml-1 text-xs text-muted-foreground">(vos)</span>
                  )}
                </span>
                <Badge variant={user.isActive ? "default" : "destructive"} className="shrink-0">
                  {user.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="size-8" />
                    <p>No hay usuarios cargados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/users/${user.id}`} className="font-medium hover:underline">
                      {user.name}
                      {user.id === session.userId && (
                        <span className="ml-1 text-xs text-muted-foreground">(vos)</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-sm">{ROLE_LABELS[user.role]}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
