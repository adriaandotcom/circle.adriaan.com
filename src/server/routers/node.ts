import { router, publicProcedure } from "@/server/trpc";
import { createNodeInput } from "@/lib/schemas";
import { z } from "zod";

export const nodeRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.node.findMany({ orderBy: { createdAt: "desc" } });
  }),

  create: publicProcedure
    .input(createNodeInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.create({
        data: {
          label: input.label,
          type: input.type ?? null,
          color: input.color,
        },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades will delete links/events via schema
      return ctx.prisma.node.delete({ where: { id: input.id } });
    }),
});
