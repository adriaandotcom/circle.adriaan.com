import { router } from "@/server/trpc";
import { linkRouter } from "@/server/routers/link";
import { nodeRouter } from "@/server/routers/node";

export const appRouter = router({
  link: linkRouter,
  node: nodeRouter,
});

export type AppRouter = typeof appRouter;
