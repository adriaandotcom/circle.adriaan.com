import { router } from "@/server/trpc";
import { linkRouter } from "@/server/routers/link";

export const appRouter = router({
  link: linkRouter,
});

export type AppRouter = typeof appRouter;
