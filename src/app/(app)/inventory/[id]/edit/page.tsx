import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { EditUnitForm } from "./edit-unit-form";

export default async function EditInventoryUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  if (!can(session.role, "MANAGE_INVENTORY")) {
    redirect(`/inventory/${id}`);
  }

  const [unit, locations] = await Promise.all([
    prisma.inventoryUnit.findUnique({ where: { id }, include: { product: true } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!unit) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editar equipo</h1>
        <p className="text-sm text-muted-foreground">
          {unit.product.brand} {unit.product.model}
          {unit.product.variant ? ` ${unit.product.variant}` : ""}
          {unit.product.storageGb ? ` ${unit.product.storageGb}GB` : ""}
        </p>
      </div>
      <EditUnitForm
        unitId={unit.id}
        locations={locations}
        defaultValues={{
          locationId: unit.locationId,
          condition: unit.condition,
          imei: unit.imei ?? "",
          serialNumber: unit.serialNumber ?? "",
          batteryPct: unit.batteryPct,
          isNew: unit.isNew,
          minPrice: unit.minPrice?.toNumber() ?? null,
          notes: unit.notes ?? "",
        }}
      />
    </div>
  );
}
