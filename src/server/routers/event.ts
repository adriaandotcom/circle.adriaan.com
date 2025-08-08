import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";

export const eventRouter = router({
  list: publicProcedure
    .input(z.object({ nodeId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.event.findMany({
        where: { nodeId: input.nodeId },
        orderBy: { createdAt: "desc" },
        select: { id: true, description: true, createdAt: true, type: true },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        nodeId: z.string().cuid(),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({
        data: {
          nodeId: input.nodeId,
          type: "note",
          description: input.description,
        },
      });
    }),
});
