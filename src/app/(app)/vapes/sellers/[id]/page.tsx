import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AssignForm } from "./assign-form";
import { ReturnButton } from "./return-button";

export default async function VapeSellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [seller, products] = await Promise.all([
    prisma.vapeSeller.findUnique({
      where: { id },
      include: { stocks: { include: { product: true }, orderBy: { quantity: "desc" } } },
    }),
    prisma.vapeProduct.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!seller) notFound();

  const canManage = can(session.role, "MANAGE_VAPES");
  const total = seller.stocks.reduce((sum, s) => sum + s.quantity, 0);
  const stocksInHand = seller.stocks.filter((s) => s.quantity > 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/vapes/sellers" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2")}>
          <ArrowLeft className="size-4" />
          Volver a vendedores
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{seller.name}</h1>
        <p className="text-sm text-muted-foreground">
          {seller.phone ?? "Sin telefono"} · {total} unidades en su poder
        </p>
        {seller.notes && <p className="mt-2 text-sm text-muted-foreground">{seller.notes}</p>}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asignar stock</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignForm
              sellerId={seller.id}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                flavor: p.flavor,
                stockQuantity: p.stockQuantity,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock en su poder</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 p-3 md:hidden">
            {stocksInHand.length === 0 ? (
              <p className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground">
                Este vendedor no tiene stock asignado.
              </p>
            ) : (
              stocksInHand.map((stock) => (
                <div key={stock.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{stock.product.name}</p>
                      {stock.product.flavor && (
                        <p className="truncate text-xs text-muted-foreground">{stock.product.flavor}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-medium">{stock.quantity}</span>
                  </div>
                  {canManage && (
                    <div className="mt-2 flex justify-end border-t pt-2">
                      <ReturnButton sellerId={seller.id} productId={stock.productId} maxQuantity={stock.quantity} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  {canManage && <TableHead className="w-32" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocksInHand.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 3 : 2} className="h-24 text-center text-muted-foreground">
                      Este vendedor no tiene stock asignado.
                    </TableCell>
                  </TableRow>
                ) : (
                  stocksInHand.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <p className="font-medium">{stock.product.name}</p>
                        {stock.product.flavor && (
                          <p className="text-xs text-muted-foreground">{stock.product.flavor}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{stock.quantity}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <ReturnButton sellerId={seller.id} productId={stock.productId} maxQuantity={stock.quantity} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
