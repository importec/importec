import Link from "next/link";
import { Plus, Users2 } from "lucide-react";
import { prisma } from "@/server/db";
import { can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerName } from "@/lib/format";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { sales: true, consignments: true, repairs: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} cliente{customers.length === 1 ? "" : "s"}
          </p>
        </div>
        {can(session.role, "MANAGE_CUSTOMERS") && (
          <Link href="/customers/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo cliente
          </Link>
        )}
      </div>

      <form>
        <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre, telefono o email..." className="max-w-sm" />
      </form>

      {customers.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
          <Users2 className="size-8" />
          <p>No hay clientes que coincidan.</p>
        </div>
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="flex flex-col gap-2 md:hidden">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="rounded-lg border bg-card p-3"
              >
                <p className="font-medium">{customerName(customer)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                </p>
                <div className="mt-2 flex gap-4 border-t pt-2 text-xs text-muted-foreground">
                  <span>{customer._count.sales} compras</span>
                  <span>{customer._count.consignments} consig.</span>
                  <span>{customer._count.repairs} reparac.</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Consignaciones</TableHead>
                  <TableHead className="text-right">Reparaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                        {customerName(customer)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">{customer._count.sales}</TableCell>
                    <TableCell className="text-right">{customer._count.consignments}</TableCell>
                    <TableCell className="text-right">{customer._count.repairs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
