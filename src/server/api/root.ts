import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { transactionRouter } from "~/server/api/routers/transaction";
import { authRouter } from "./routers/auth-router";
import { memberRouter } from "./routers/member";
import { settingsRouter } from "./routers/settings";
import { reportsRouter } from "./routers/reports";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  transaction: transactionRouter,
  auth: authRouter,
  member: memberRouter,
  settings: settingsRouter,
  reports: reportsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
