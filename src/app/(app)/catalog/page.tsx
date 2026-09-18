import Link from "next/link";
import { Plus, Tags } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import type { ProductCategory } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableNumber } from "@/components/inventory/editable-number";
import { CATEGORY_LABELS, productTitle } from "@/lib/format";
import { updateCatalogPrice } from "./actions";
import { DeleteCatalogButton } from "./delete-button";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const canManage = can(session.role, "MANAGE_INVENTORY");

  const where: Prisma.BuyPriceCatalogWhereInput = {};
  if (params.q) {
    const q = params.q;
    where.OR = [
      { brand: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { variant: { contains: q, mode: "insensitive" } },
    ];
  }

  const entries = await prisma.buyPriceCatalog.findMany({
    where,
    orderBy: [{ category: "asc" }, { model: "asc" }, { storageGb: "asc" }],
  });

  const grouped = new Map<ProductCategory, typeof entries>();
  for (const entry of entries) {
    grouped.set(entry.category, [...(grouped.get(entry.category) ?? []), entry]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Catalogo de compra</h1>
          <p className="text-sm text-muted-foreground">
            Cuanto pagamos por cada modelo segun su condicion. Referencia para plan canje y compras.
          </p>
        </div>
        {canManage && (
          <Link href="/catalog/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo modelo
          </Link>
        )}
      </div>

      <form>
        <Input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por modelo o variante..."
          className="max-w-sm"
        />
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No hay modelos cargados"
          description="Cargá los modelos que mas te ofrecen en plan canje con el precio que pagas por cada condicion."
        />
      ) : (
        Array.from(grouped.entries()).map(([category, categoryEntries]) => (
          <div key={category} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {CATEGORY_LABELS[category] ?? category}
            </h2>

            {/* Mobile: tarjetas */}
            <div className="flex flex-col gap-2 md:hidden">
              {categoryEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{productTitle(entry)}</p>
                    {canManage && <DeleteCatalogButton entryId={entry.id} />}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-2 text-sm">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs text-muted-foreground">Sellado</span>
                      <EditableNumber
                        value={entry.sealedPrice?.toNumber() ?? null}
                        onSave={updateCatalogPrice.bind(null, entry.id, "sealedPrice")}
                        currency={entry.currency}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs text-muted-foreground">Como nuevo</span>
                      <EditableNumber
                        value={entry.likeNewPrice?.toNumber() ?? null}
                        onSave={updateCatalogPrice.bind(null, entry.id, "likeNewPrice")}
                        currency={entry.currency}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs text-muted-foreground">Bueno</span>
                      <EditableNumber
                        value={entry.goodPrice?.toNumber() ?? null}
                        onSave={updateCatalogPrice.bind(null, entry.id, "goodPrice")}
                        currency={entry.currency}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs text-muted-foreground">Regular</span>
                      <EditableNumber
                        value={entry.fairPrice?.toNumber() ?? null}
                        onSave={updateCatalogPrice.bind(null, entry.id, "fairPrice")}
                        currency={entry.currency}
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
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Sellado</TableHead>
                    <TableHead className="text-right">Como nuevo</TableHead>
                    <TableHead className="text-right">Bueno</TableHead>
                    <TableHead className="text-right">Regular</TableHead>
                    {canManage && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{productTitle(entry)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <EditableNumber
                          value={entry.sealedPrice?.toNumber() ?? null}
                          onSave={updateCatalogPrice.bind(null, entry.id, "sealedPrice")}
                          currency={entry.currency}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <EditableNumber
                          value={entry.likeNewPrice?.toNumber() ?? null}
                          onSave={updateCatalogPrice.bind(null, entry.id, "likeNewPrice")}
                          currency={entry.currency}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <EditableNumber
                          value={entry.goodPrice?.toNumber() ?? null}
                          onSave={updateCatalogPrice.bind(null, entry.id, "goodPrice")}
                          currency={entry.currency}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <EditableNumber
                          value={entry.fairPrice?.toNumber() ?? null}
                          onSave={updateCatalogPrice.bind(null, entry.id, "fairPrice")}
                          currency={entry.currency}
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <DeleteCatalogButton entryId={entry.id} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
