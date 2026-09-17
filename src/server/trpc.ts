import { initTRPC, TRPCError } from "@trpc/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/server/db";

export async function createTRPCContext() {
  const session = await getSession();
  return { session, prisma };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
