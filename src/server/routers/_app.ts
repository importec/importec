import { router } from "@/server/trpc";
import { inventoryRouter } from "./inventory";
import { customersRouter } from "./customers";
import { salesRouter } from "./sales";

export const appRouter = router({
  inventory: inventoryRouter,
  customers: customersRouter,
  sales: salesRouter,
});

export type AppRouter = typeof appRouter;
