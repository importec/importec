import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import type { InventoryUnitStatus, OwnerType, ProductCategory } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_LABELS, productTitle } from "@/lib/format";
import { STATUS_TONE } from "@/lib/inventory/status";
import { InventoryFilters } from "./inventory-filters";
import { Plus, Package, MessageCircle } from "lucide-react";
import { EditableNumber } from "@/components/inventory/editable-number";
import { updateInventoryUnitPrice, updateStockLotCost, updateProductListPrice } from "./actions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const showCosts = can(session.role, "VIEW_COSTS");

  const where: Prisma.InventoryUnitWhereInput = {};

  if (params.category) {
    where.product = { category: params.category as ProductCategory };
  }
  if (params.status) {
    where.status = params.status as InventoryUnitStatus;
  }
  if (params.owner) {
    where.ownerType = params.owner as OwnerType;
  }
  if (params.q) {
    const q = params.q;
    where.AND = [
      {
        OR: [
          { imei: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { product: { is: { brand: { contains: q, mode: "insensitive" } } } },
          { product: { is: { model: { contains: q, mode: "insensitive" } } } },
          { product: { is: { variant: { contains: q, mode: "insensitive" } } } },
          { product: { is: { color: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ];
  }

  const units = await prisma.inventoryUnit.findMany({
    where,
    include: { product: true, location: true, consignment: { include: { ownerCustomer: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Los accesorios no serializados se llevan por cantidad (StockLot), no como InventoryUnit.
  // No tienen "estado" ni pueden estar consignados, asi que ese filtro los oculta.
  const showLots = !params.status && params.owner !== "CONSIGNMENT";
  const productFilter: Prisma.ProductWhereInput = {};
  if (params.category) {
    productFilter.category = params.category as ProductCategory;
  }
  if (params.q) {
    const q = params.q;
    productFilter.OR = [
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { variant: { contains: q, mode: "insensitive" } },
      { color: { contains: q, mode: "insensitive" } },
    ];
  }
  const stockLots = showLots
    ? await prisma.stockLot.findMany({
        where: { product: { is: productFilter } },
        include: { product: true, location: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {units.length} equipo{units.length === 1 ? "" : "s"} encontrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/whatsapp" className={buttonVariants({ variant: "outline" })}>
            <MessageCircle className="size-4" />
            Lista para WhatsApp
          </Link>
          {can(session.role, "MANAGE_INVENTORY") && (
            <Link href="/inventory/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Nuevo equipo
            </Link>
          )}
        </div>
      </div>

      <InventoryFilters />

      {units.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay equipos que coincidan"
          description="Probá ajustar los filtros o el termino de busqueda."
        />
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 md:hidden">
            {units.map((unit) => (
              <div key={unit.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/inventory/${unit.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                    {productTitle(unit.product)}
                  </Link>
                  <StatusBadge tone={STATUS_TONE[unit.status]} className="shrink-0">
                    {STATUS_LABELS[unit.status]}
                  </StatusBadge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[unit.product.color, unit.batteryPct ? `${unit.batteryPct}% bateria` : null, unit.imei ?? unit.serialNumber]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2 flex items-center gap-4 border-t pt-2 text-sm">
                  {showCosts && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Costo</span>
                      <EditableNumber
                        value={unit.cost.toNumber()}
                        onSave={updateInventoryUnitPrice.bind(null, unit.id, "cost")}
                        currency={unit.product.currency}
                        className="tabular-nums"
                      />
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Venta</span>
                    <EditableNumber
                      value={unit.listPrice.toNumber()}
                      onSave={updateInventoryUnitPrice.bind(null, unit.id, "listPrice")}
                      currency={unit.product.currency}
                      className="font-medium tabular-nums"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Estado</TableHead>
                  {showCosts && <TableHead className="text-right">Costo</TableHead>}
                  <TableHead className="text-right">Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <Link href={`/inventory/${unit.id}`} className="block font-medium hover:underline">
                        {productTitle(unit.product)}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {[
                          unit.product.color,
                          unit.batteryPct ? `${unit.batteryPct}% bateria` : null,
                          unit.imei ?? unit.serialNumber,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[unit.status]}>{STATUS_LABELS[unit.status]}</StatusBadge>
                    </TableCell>
                    {showCosts && (
                      <TableCell className="text-right text-sm tabular-nums">
                        <EditableNumber
                          value={unit.cost.toNumber()}
                          onSave={updateInventoryUnitPrice.bind(null, unit.id, "cost")}
                          currency={unit.product.currency}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      <EditableNumber
                        value={unit.listPrice.toNumber()}
                        onSave={updateInventoryUnitPrice.bind(null, unit.id, "listPrice")}
                        currency={unit.product.currency}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {showLots && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accesorios (stock por cantidad)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stockLots.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No hay accesorios en stock.</p>
            ) : (
              <>
                {/* Mobile: tarjetas */}
                <div className="flex flex-col gap-2 p-3 md:hidden">
                  {stockLots.map((lot) => (
                    <div key={lot.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{productTitle(lot.product)}</span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">x{lot.quantity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{lot.location.name}</p>
                      <div className="mt-2 flex items-center gap-4 border-t pt-2 text-sm">
                        {showCosts && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Costo prom.</span>
                            <EditableNumber
                              value={lot.avgCost.toNumber()}
                              onSave={updateStockLotCost.bind(null, lot.id)}
                              currency={lot.product.currency}
                              className="tabular-nums"
                            />
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Venta</span>
                          <EditableNumber
                            value={lot.product.listPrice?.toNumber() ?? null}
                            onSave={updateProductListPrice.bind(null, lot.product.id)}
                            currency={lot.product.currency}
                            className="font-medium tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: tabla */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Ubicacion</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        {showCosts && <TableHead className="text-right">Costo prom.</TableHead>}
                        <TableHead className="text-right">Venta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLots.map((lot) => (
                        <TableRow key={lot.id}>
                          <TableCell className="font-medium">{productTitle(lot.product)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{lot.location.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{lot.quantity}</TableCell>
                          {showCosts && (
                            <TableCell className="text-right text-sm tabular-nums">
                              <EditableNumber
                                value={lot.avgCost.toNumber()}
                                onSave={updateStockLotCost.bind(null, lot.id)}
                                currency={lot.product.currency}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            <EditableNumber
                              value={lot.product.listPrice?.toNumber() ?? null}
                              onSave={updateProductListPrice.bind(null, lot.product.id)}
                              currency={lot.product.currency}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
