import { router, publicProcedure } from "@/server/trpc";
import { createNodeInput } from "@/lib/schemas";

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
          metadata: input.metadata ?? undefined,
        },
      });
    }),
});
