import Link from "next/link";
import { Plus, Truck } from "lucide-react";
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

export default async function SuppliersPage() {
  const session = await requireSession();

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchases: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            {suppliers.length} proveedor{suppliers.length === 1 ? "" : "es"}
          </p>
        </div>
        {can(session.role, "MANAGE_SUPPLIERS") && (
          <Link href="/suppliers/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo proveedor
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {suppliers.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Truck className="size-8" />
            <p>Todavia no hay proveedores cargados.</p>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <Link
              key={supplier.id}
              href={`/suppliers/${supplier.id}`}
              className="rounded-lg border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{supplier.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {supplier._count.purchases} compra{supplier._count.purchases === 1 ? "" : "s"}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}
              </p>
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
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Compras</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Truck className="size-8" />
                    <p>Todavia no hay proveedores cargados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link href={`/suppliers/${supplier.id}`} className="font-medium hover:underline">
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">{supplier._count.purchases}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
