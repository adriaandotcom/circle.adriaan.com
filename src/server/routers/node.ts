import { router, publicProcedure } from "@/server/trpc";
import { createNodeInput } from "@/lib/schemas";
import { pickRandomColorPair } from "@/lib/colors";
import { z } from "zod";
import crypto from "node:crypto";
import imageSize from "image-size";
import Replicate from "replicate";

export const nodeRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.node.findMany({ orderBy: { createdAt: "desc" } });
  }),

  recentAi: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.prisma.node.findMany({
      where: { addedBy: "ai" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, label: true, type: true, createdAt: true },
    });
    return items;
  }),

  search: publicProcedure
    .input(
      z.object({
        q: z.string().optional(),
        tags: z.array(z.string()).optional(),
        roles: z.array(z.string()).optional(),
        archived: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const normalizedTags = (input.tags ?? [])
        .map((t) =>
          t
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        )
        .filter(Boolean);
      const normalizedRoles = (input.roles ?? [])
        .map((r) => r.trim())
        .filter(Boolean);

      const where: any = {};
      if (typeof input.archived === "boolean") where.archived = input.archived;

      const or: any[] = [];
      if (input.q && input.q.trim()) {
        or.push({ label: { contains: input.q, mode: "insensitive" } });
        or.push({
          events: {
            some: { description: { contains: input.q, mode: "insensitive" } },
          },
        });
      }
      if (or.length) where.OR = or;

      const and: any[] = [];
      if (normalizedTags.length) {
        and.push({
          events: {
            some: { tags: { some: { name: { in: normalizedTags } } } },
          },
        });
      }
      if (normalizedRoles.length) {
        and.push({
          OR: [
            {
              linksA: {
                some: { roles: { some: { name: { in: normalizedRoles } } } },
              },
            },
            {
              linksB: {
                some: { roles: { some: { name: { in: normalizedRoles } } } },
              },
            },
          ],
        });
      }
      if (and.length) where.AND = and;

      return ctx.prisma.node.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }),

  create: publicProcedure
    .input(createNodeInput)
    .mutation(async ({ ctx, input }) => {
      const { light, dark } = pickRandomColorPair();
      return ctx.prisma.node.create({
        data: {
          label: input.label,
          type: input.type ?? null,
          colorHexLight: input.color ?? light,
          colorHexDark: dark,
        },
      });
    }),

  setImage: publicProcedure
    .input(
      z.object({
        nodeId: z.string().cuid(),
        mediaId: z.string().cuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.mediaId) {
        return ctx.prisma.node.update({
          where: { id: input.nodeId },
          data: { imageMediaId: null },
          select: { id: true, imageMediaId: true },
        });
      }

      // Fetch original media bytes
      const original = await ctx.prisma.media.findUnique({
        where: { id: input.mediaId },
      });
      if (!original) throw new Error("Media not found");

      // Set original immediately so user sees it right away
      const updated = await ctx.prisma.node.update({
        where: { id: input.nodeId },
        data: { imageMediaId: original.id },
        select: { id: true, imageMediaId: true },
      });

      // Fire-and-forget: try to crop face and replace avatar if successful
      void (async () => {
        try {
          const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
          });
          const originalBlob = new Blob([original.data], {
            type: original.mimeType,
          });

          const normalizeUrl = (v: any): string | null => {
            if (!v) return null;
            if (typeof v === "string") return v;
            if (typeof v.url === "function") return v.url();
            if (typeof v.url === "string") return v.url;
            if (Array.isArray(v)) {
              for (const it of v) {
                const u = normalizeUrl(it);
                if (u) return u;
              }
            }
            return null;
          };

          const faceOutput: any = await replicate.run(
            "ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d",
            { input: { image: originalBlob, padding: 0.6 } }
          );
          const faceUrl = normalizeUrl(faceOutput);
          if (!faceUrl) return;

          const r = await fetch(faceUrl);
          if (!r.ok) return;
          const bytes = Buffer.from(await r.arrayBuffer());
          if (bytes.length === 0) return;

          const sha256 = crypto
            .createHash("sha256")
            .update(bytes)
            .digest("hex");

          let imageWidth: number | null = null;
          let imageHeight: number | null = null;
          try {
            const dim = imageSize(bytes);
            if (dim.width && dim.height) {
              imageWidth = dim.width;
              imageHeight = dim.height;
            }
          } catch {}

          const processed = await ctx.prisma.media.upsert({
            where: { sha256 },
            update: {},
            create: {
              mimeType: original.mimeType,
              kind: "image",
              byteSize: bytes.length,
              sha256,
              imageWidth: imageWidth ?? undefined,
              imageHeight: imageHeight ?? undefined,
              data: bytes,
            },
          });

          await ctx.prisma.node.update({
            where: { id: input.nodeId },
            data: { imageMediaId: processed.id },
            select: { id: true },
          });
        } catch {
          // ignore background crop failures
        }
      })();

      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades will delete links/events via schema
      return ctx.prisma.node.delete({ where: { id: input.id } });
    }),

  archive: publicProcedure
    .input(z.object({ id: z.string().cuid(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.update({
        where: { id: input.id },
        data: { archived: input.archived },
      });
    }),

  updateColors: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        colorHexLight: z
          .string()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
          .optional(),
        colorHexDark: z
          .string()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.update({
        where: { id: input.id },
        data: {
          colorHexLight: input.colorHexLight ?? undefined,
          colorHexDark: input.colorHexDark ?? undefined,
        },
        select: { id: true, colorHexLight: true, colorHexDark: true },
      });
    }),
});
