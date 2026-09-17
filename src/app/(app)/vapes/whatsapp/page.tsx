import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { VapeWhatsappGenerator } from "./vape-whatsapp-generator";

export default async function VapeWhatsappPage() {
  await requireSession();

  const products = await prisma.vapeProduct.findMany({
    where: { stockQuantity: { gt: 0 } },
    orderBy: { name: "asc" },
  });

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    flavor: p.flavor,
    stockQuantity: p.stockQuantity,
    salePrice: p.salePrice.toNumber(),
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lista de vapes para WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Copia el texto listo para enviar con el stock propio.</p>
      </div>
      <VapeWhatsappGenerator items={items} />
    </div>
  );
}
