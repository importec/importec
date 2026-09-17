import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { RepairForm } from "./repair-form";

export default async function NewRepairPage() {
  const session = await requireSession();
  if (!can(session.role, "MANAGE_REPAIRS")) {
    redirect("/repairs");
  }

  const techs = await prisma.user.findMany({
    where: { role: { in: ["TECH", "ADMIN", "SUPERVISOR"] }, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nueva reparacion</h1>
        <p className="text-sm text-muted-foreground">Registra el ingreso de un equipo a servicio tecnico.</p>
      </div>
      <RepairForm techs={techs.map((t) => ({ id: t.id, name: t.name }))} />
    </div>
  );
}
