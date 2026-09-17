import Link from "next/link";
import { Plus, Users2, MessageCircle, Cigarette } from "lucide-react";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableNumber } from "@/components/inventory/editable-number";
import { updateVapeProductField } from "./actions";
import { AddStockButton } from "./add-stock-button";
import { RemoveStockButton } from "./remove-stock-button";
import { DeleteProductButton } from "./delete-product-button";
import { VapeCurrencySelect } from "./vape-currency-select";

export default async function VapesPage() {
  const session = await requireSession();
  const showCosts = can(session.role, "VIEW_COSTS");
  const canManage = can(session.role, "MANAGE_VAPES");

  const products = await prisma.vapeProduct.findMany({
    orderBy: { name: "asc" },
    include: { sellerStocks: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vapes</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} producto{products.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vapes/sellers" className={buttonVariants({ variant: "outline" })}>
            <Users2 className="size-4" />
            Vendedores
          </Link>
          <Link href="/vapes/whatsapp" className={buttonVariants({ variant: "outline" })}>
            <MessageCircle className="size-4" />
            Lista para WhatsApp
          </Link>
          {canManage && (
            <Link href="/vapes/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Nuevo producto
            </Link>
          )}
        </div>
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {products.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Cigarette className="size-8" />
            <p>Todavia no hay productos de vapes cargados.</p>
          </div>
        ) : (
          products.map((product) => {
            const withSellers = product.sellerStocks.reduce((sum, s) => sum + s.quantity, 0);
            return (
              <div key={product.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    {product.flavor && <p className="truncate text-xs text-muted-foreground">{product.flavor}</p>}
                  </div>
                  <EditableNumber
                    value={product.salePrice.toNumber()}
                    onSave={updateVapeProductField.bind(null, product.id, "salePrice")}
                    currency={product.currency}
                    className="shrink-0 font-medium"
                  />
                </div>
                <div className="mt-2 flex items-center gap-4 border-t pt-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Stock</span>
                    <span className="font-medium">{product.stockQuantity}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Vendedores</span>
                    <span className="text-muted-foreground">{withSellers}</span>
                  </div>
                  {showCosts && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Costo</span>
                      <EditableNumber
                        value={product.cost.toNumber()}
                        onSave={updateVapeProductField.bind(null, product.id, "cost")}
                        currency={product.currency}
                      />
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <VapeCurrencySelect productId={product.id} currency={product.currency} />
                    <div className="flex items-center gap-1">
                      <AddStockButton productId={product.id} />
                      <RemoveStockButton productId={product.id} />
                      <DeleteProductButton productId={product.id} productName={product.name} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: tabla */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              {canManage && <TableHead>Moneda</TableHead>}
              <TableHead className="text-right">Stock propio</TableHead>
              <TableHead className="text-right">En manos de vendedores</TableHead>
              {showCosts && <TableHead className="text-right">Costo</TableHead>}
              <TableHead className="text-right">Venta</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + (canManage ? 2 : 0) + (showCosts ? 1 : 0)}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Cigarette className="size-8" />
                    <p>Todavia no hay productos de vapes cargados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const withSellers = product.sellerStocks.reduce((sum, s) => sum + s.quantity, 0);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <p className="font-medium">{product.name}</p>
                      {product.flavor && <p className="text-xs text-muted-foreground">{product.flavor}</p>}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <VapeCurrencySelect productId={product.id} currency={product.currency} />
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium">{product.stockQuantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{withSellers}</TableCell>
                    {showCosts && (
                      <TableCell className="text-right text-sm">
                        <EditableNumber
                          value={product.cost.toNumber()}
                          onSave={updateVapeProductField.bind(null, product.id, "cost")}
                          currency={product.currency}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-right text-sm font-medium">
                      <EditableNumber
                        value={product.salePrice.toNumber()}
                        onSave={updateVapeProductField.bind(null, product.id, "salePrice")}
                        currency={product.currency}
                      />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AddStockButton productId={product.id} />
                          <RemoveStockButton productId={product.id} />
                          <DeleteProductButton productId={product.id} productName={product.name} />
                        </div>
                      </TableCell>
                    )}
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
