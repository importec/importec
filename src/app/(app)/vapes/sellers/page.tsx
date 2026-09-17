import Link from "next/link";
import { Plus, Users2 } from "lucide-react";
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

export default async function VapeSellersPage() {
  const session = await requireSession();

  const sellers = await prisma.vapeSeller.findMany({
    orderBy: { name: "asc" },
    include: { stocks: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vendedores de vapes</h1>
          <p className="text-sm text-muted-foreground">
            {sellers.length} vendedor{sellers.length === 1 ? "" : "es"}
          </p>
        </div>
        {can(session.role, "MANAGE_VAPES") && (
          <Link href="/vapes/sellers/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo vendedor
          </Link>
        )}
      </div>

      {/* Mobile: tarjetas */}
      <div className="flex flex-col gap-2 md:hidden">
        {sellers.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
            <Users2 className="size-8" />
            <p>Todavia no hay vendedores cargados.</p>
          </div>
        ) : (
          sellers.map((seller) => {
            const total = seller.stocks.reduce((sum, s) => sum + s.quantity, 0);
            return (
              <Link
                key={seller.id}
                href={`/vapes/sellers/${seller.id}`}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{seller.name}</span>
                  <span className="shrink-0 font-medium">{total}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{seller.phone ?? "—"}</p>
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
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Unidades en su poder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users2 className="size-8" />
                    <p>Todavia no hay vendedores cargados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => {
                const total = seller.stocks.reduce((sum, s) => sum + s.quantity, 0);
                return (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <Link href={`/vapes/sellers/${seller.id}`} className="font-medium hover:underline">
                        {seller.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{seller.phone ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{total}</TableCell>
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
