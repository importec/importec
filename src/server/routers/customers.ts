import { z } from "zod";
import { protectedProcedure, router } from "@/server/trpc";
import { customerName } from "@/lib/format";

export const customersRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().max(80) }))
    .query(async ({ ctx, input }) => {
      const query = input.query.trim();
      if (query.length === 0) {
        const recent = await ctx.prisma.customer.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
        });
        return recent.map((c) => ({ id: c.id, name: customerName(c), phone: c.phone }));
      }

      const matches = await ctx.prisma.customer.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 8,
      });

      return matches.map((c) => ({ id: c.id, name: customerName(c), phone: c.phone }));
    }),

  quickCreate: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.create({ data: input });
      return { id: customer.id, name: customerName(customer), phone: customer.phone };
    }),
});
