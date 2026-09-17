import { prisma } from "@/server/db";

export async function getCashAccountBalances() {
  const accounts = await prisma.cashAccount.findMany({ orderBy: { name: "asc" } });

  const balances = await Promise.all(
    accounts.map(async (account) => {
      const [inSum, outSum] = await Promise.all([
        prisma.cashMovement.aggregate({
          where: { cashAccountId: account.id, type: "IN" },
          _sum: { amount: true },
        }),
        prisma.cashMovement.aggregate({
          where: { cashAccountId: account.id, type: "OUT" },
          _sum: { amount: true },
        }),
      ]);
      const balance = (inSum._sum.amount?.toNumber() ?? 0) - (outSum._sum.amount?.toNumber() ?? 0);
      return { id: account.id, name: account.name, currency: account.currency, kind: account.kind, balance };
    }),
  );

  return balances;
}
