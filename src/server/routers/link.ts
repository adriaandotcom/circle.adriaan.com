import { router, publicProcedure } from "@/server/trpc";
import { createLinkInput } from "@/lib/schemas";
import { z } from "zod";

export const linkRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      include: { nodeA: true, nodeB: true },
    });
  }),

  create: publicProcedure
    .input(createLinkInput)
    .mutation(async ({ ctx, input }) => {
      const [a, b] = [...input.nodeIds].sort();
      return ctx.prisma.link.upsert({
        where: { nodeAId_nodeBId: { nodeAId: a, nodeBId: b } },
        update: { type: input.type ?? undefined },
        create: { nodeAId: a, nodeBId: b, type: input.type },
      });
    }),

  forNode: publicProcedure
    .input(z.object({ nodeId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.link.findMany({
        where: { OR: [{ nodeAId: input.nodeId }, { nodeBId: input.nodeId }] },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.link.delete({ where: { id: input.id } });
    }),
});
