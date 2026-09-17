import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { PURCHASE_STATUS_LABELS } from "@/lib/purchases/status";

export default async function PurchasesPage() {
  await requireSession();

  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { supplier: true, items: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Compras</h1>
        <p className="text-sm text-muted-foreground">
          {purchases.length} compra{purchases.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {purchases.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <ShoppingBag className="size-8" />
            <p>Todavia no hay compras registradas.</p>
          </div>
        ) : (
          purchases.map((purchase) => {
            const total = purchase.items.reduce((sum, item) => sum + item.unitCost.toNumber() * item.quantity, 0);
            return (
              <Link
                key={purchase.id}
                href={`/purchases/${purchase.id}`}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{purchase.supplier.name}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {PURCHASE_STATUS_LABELS[purchase.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {purchase.createdAt.toLocaleDateString("es-AR")} · {purchase.items.length} item
                  {purchase.items.length === 1 ? "" : "s"}
                </p>
                <div className="mt-2 flex items-center justify-end border-t pt-2 text-sm font-medium">
                  {formatCurrency(total, purchase.currency)}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShoppingBag className="size-8" />
                    <p>Todavia no hay compras registradas.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => {
                const total = purchase.items.reduce((sum, item) => sum + item.unitCost.toNumber() * item.quantity, 0);
                return (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {purchase.createdAt.toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <Link href={`/purchases/${purchase.id}`} className="font-medium hover:underline">
                        {purchase.supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{purchase.items.length}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PURCHASE_STATUS_LABELS[purchase.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(total, purchase.currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
