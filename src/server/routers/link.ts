import { router, publicProcedure } from "@/server/trpc";
import { createLinkInput } from "@/lib/schemas";
import { z } from "zod";

export const linkRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      include: { nodeA: true, nodeB: true, roles: true },
    });
  }),

  create: publicProcedure
    .input(createLinkInput)
    .mutation(async ({ ctx, input }) => {
      const [a, b] = [...input.nodeIds].sort();

      let roleConnect: { id: string } | undefined;
      if (input.role) {
        const slug = input.role
          .toLocaleLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+|-+$)/g, "");
        const role = await ctx.prisma.role.upsert({
          where: { slug },
          update: { name: input.role },
          create: { slug, name: input.role },
        });
        roleConnect = { id: role.id };
      }

      const existing = await ctx.prisma.link.findUnique({
        where: { nodeAId_nodeBId: { nodeAId: a, nodeBId: b } },
        include: { roles: true },
      });

      if (existing) {
        if (roleConnect) {
          const already = existing.roles.some((r) => r.id === roleConnect!.id);
          if (!already) {
            await ctx.prisma.link.update({
              where: { id: existing.id },
              data: { roles: { connect: [roleConnect] } },
            });
          }
        }
        return existing;
      }

      return ctx.prisma.link.create({
        data: {
          nodeAId: a,
          nodeBId: b,
          ...(roleConnect ? { roles: { connect: [roleConnect] } } : {}),
        },
        include: { roles: true, nodeA: true, nodeB: true },
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
