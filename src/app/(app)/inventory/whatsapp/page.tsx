import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { WhatsappGenerator } from "./whatsapp-generator";

export default async function WhatsappStockPage() {
  await requireSession();

  const units = await prisma.inventoryUnit.findMany({
    where: { status: "AVAILABLE" },
    include: { product: true },
    orderBy: [{ product: { category: "asc" } }, { listPrice: "asc" }],
  });

  const items = units.map((unit) => ({
    id: unit.id,
    category: unit.product.category,
    brand: unit.product.brand,
    model: unit.product.model,
    variant: unit.product.variant,
    storageGb: unit.product.storageGb,
    color: unit.product.color,
    batteryPct: unit.batteryPct,
    isNew: unit.isNew,
    listPrice: unit.listPrice.toNumber(),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lista de stock para WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Elegi que mostrar y copia el texto listo para enviar.
        </p>
      </div>
      <WhatsappGenerator items={items} />
    </div>
  );
}
