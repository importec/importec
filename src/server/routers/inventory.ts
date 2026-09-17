import { z } from "zod";
import { protectedProcedure, router } from "@/server/trpc";
import { productTitle } from "@/lib/format";

/**
 * IMEI/serie solo entra en el matching para tokens largos (6+): un token corto
 * como "11" o "13" (modelo) no debe "matchear" por casualidad un IMEI que
 * contiene esos digitos en cualquier parte.
 */
function unitMatchesTokens(
  unit: {
    product: { brand: string; model: string; variant: string | null; storageGb: number | null; color: string | null };
    imei: string | null;
    serialNumber: string | null;
  },
  tokens: string[],
) {
  const productHaystack = [
    unit.product.brand,
    unit.product.model,
    unit.product.variant,
    unit.product.storageGb ? `${unit.product.storageGb}gb` : null,
    unit.product.color,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const identifierHaystack = [unit.imei, unit.serialNumber].filter(Boolean).join(" ").toLowerCase();

  return tokens.every((token) => {
    if (productHaystack.includes(token)) return true;
    return token.length >= 6 && identifierHaystack.includes(token);
  });
}

export const inventoryRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().max(80) }))
    .query(async ({ ctx, input }) => {
      const tokens = input.query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
      if (tokens.length === 0) return [];

      const candidates = await ctx.prisma.inventoryUnit.findMany({
        where: {
          status: { in: ["AVAILABLE", "RESERVED"] },
          OR: tokens.map((token) => ({
            product: {
              is: {
                OR: [
                  { brand: { contains: token, mode: "insensitive" } },
                  { model: { contains: token, mode: "insensitive" } },
                  { variant: { contains: token, mode: "insensitive" } },
                  { color: { contains: token, mode: "insensitive" } },
                ],
              },
            },
          })),
        },
        include: { product: true, location: true },
        take: 50,
      });

      const matches = candidates.filter((unit) => unitMatchesTokens(unit, tokens));

      return matches.slice(0, 8).map((unit) => ({
        id: unit.id,
        title: productTitle(unit.product),
        subtitle: [unit.condition, unit.batteryPct ? `${unit.batteryPct}% bateria` : null, unit.location.name]
          .filter(Boolean)
          .join(" · "),
        status: unit.status,
        listPrice: unit.listPrice.toString(),
      }));
    }),

  sellable: protectedProcedure
    .input(z.object({ query: z.string().max(80) }))
    .query(async ({ ctx, input }) => {
      const tokens = input.query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
      if (tokens.length === 0) return [];

      const productFilter = {
        OR: tokens.map((token) => ({
          product: {
            is: {
              OR: [
                { brand: { contains: token, mode: "insensitive" as const } },
                { model: { contains: token, mode: "insensitive" as const } },
                { variant: { contains: token, mode: "insensitive" as const } },
                { color: { contains: token, mode: "insensitive" as const } },
              ],
            },
          },
        })),
      };

      const [units, lots] = await Promise.all([
        ctx.prisma.inventoryUnit.findMany({
          where: { status: "AVAILABLE", ...productFilter },
          include: { product: true, location: true },
          take: 30,
        }),
        ctx.prisma.stockLot.findMany({
          where: { quantity: { gt: 0 }, ...productFilter },
          include: { product: true, location: true },
          take: 30,
        }),
      ]);

      const unitMatches = units
        .filter((unit) => unitMatchesTokens(unit, tokens))
        .map((unit) => ({
          kind: "unit" as const,
          id: unit.id,
          title: productTitle(unit.product),
          subtitle: [unit.condition, unit.batteryPct ? `${unit.batteryPct}% bateria` : null, unit.location.name]
            .filter(Boolean)
            .join(" · "),
          unitPrice: unit.listPrice.toNumber(),
          unitCost: unit.cost.toNumber(),
          currency: unit.product.currency,
          maxQuantity: 1,
        }));

      const lotMatches = lots
        .filter((lot) => {
          const haystack = [lot.product.brand, lot.product.model, lot.product.variant, lot.product.color]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return tokens.every((token) => haystack.includes(token));
        })
        .map((lot) => ({
          kind: "lot" as const,
          id: lot.id,
          title: productTitle(lot.product),
          subtitle: `${lot.quantity} en stock · ${lot.location.name}`,
          unitPrice: lot.product.listPrice?.toNumber() ?? 0,
          unitCost: lot.avgCost.toNumber(),
          currency: lot.product.currency,
          maxQuantity: lot.quantity,
        }));

      return [...unitMatches, ...lotMatches].slice(0, 8);
    }),
});
