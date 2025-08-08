import { router, publicProcedure } from "@/server/trpc";
import { createLinkInput } from "@/lib/schemas";
import { z } from "zod";

export const linkRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      include: { nodeA: true, nodeB: true, role: true },
    });
  }),

  create: publicProcedure
    .input(createLinkInput)
    .mutation(async ({ ctx, input }) => {
      const [a, b] = [...input.nodeIds].sort();

      let roleId;

      if (input.role) {
        const role = await ctx.prisma.role.findFirst({
          where: {
            name: input.role,
          },
        });
        if (role) roleId = role.id;
        else {
          const newRole = await ctx.prisma.role.create({
            data: {
              slug: input.role
                .toLocaleLowerCase()
                .replace(/[^a-z0-9]+/, "-")
                .replace(/(^-+|-+$)/, ""),
              name: input.role,
            },
          });
          roleId = newRole.id;
        }
      }

      return ctx.prisma.link.upsert({
        where: { nodeAId_nodeBId: { nodeAId: a, nodeBId: b } },
        update: {},
        create: { roleId, nodeAId: a, nodeBId: b },
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
