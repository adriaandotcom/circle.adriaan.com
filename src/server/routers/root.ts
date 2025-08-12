import { router } from "@/server/trpc";
import { linkRouter } from "@/server/routers/link";
import { nodeRouter } from "@/server/routers/node";
import { eventRouter } from "@/server/routers/event";
import { ingestRouter } from "@/server/routers/ingest";

export const appRouter = router({
  link: linkRouter,
  node: nodeRouter,
  event: eventRouter,
  ingest: ingestRouter,
});

export type AppRouter = typeof appRouter;
