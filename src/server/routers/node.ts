import { router, publicProcedure } from "@/server/trpc";
import { createNodeInput } from "@/lib/schemas";
import { z } from "zod";
import crypto from "node:crypto";
import imageSize from "image-size";
import Replicate from "replicate";

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

      // Call Replicate to remove background using a duplicate of the original
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
      const blob = new Blob([original.data], { type: original.mimeType });
      const url = await (async () => {
        const output: any = await replicate.run(
          "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
          { input: { image: blob } }
        );
        const normalize = (v: any): string | null => {
          if (!v) return null;
          if (typeof v === "string") return v;
          if (typeof v.url === "function") return v.url();
          if (typeof v.url === "string") return v.url;
          return null;
        };
        const direct = normalize(output);
        if (direct) return direct;
        if (Array.isArray(output)) {
          for (const it of output) {
            const u = normalize(it);
            if (u) return u;
          }
        }
        throw new Error("Unexpected Replicate output");
      })();

      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Failed to download processed image");
      const arrayBuf = await resp.arrayBuffer();
      const bytes = Buffer.from(arrayBuf);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

      let imageWidth: number | null = null;
      let imageHeight: number | null = null;
      try {
        const dim = imageSize(bytes);
        if (dim.width && dim.height) {
          imageWidth = dim.width;
          imageHeight = dim.height;
        }
      } catch {}

      // Store as a new Media record (duplicate with background removed)
      const processed = await ctx.prisma.media.upsert({
        where: { sha256 },
        update: {},
        create: {
          mimeType: "image/png", // rembg returns PNG
          kind: "image",
          byteSize: bytes.length,
          sha256,
          imageWidth: imageWidth ?? undefined,
          imageHeight: imageHeight ?? undefined,
          data: bytes,
        },
      });

      return ctx.prisma.node.update({
        where: { id: input.nodeId },
        data: { imageMediaId: processed.id },
        select: { id: true, imageMediaId: true },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Cascades will delete links/events via schema
      return ctx.prisma.node.delete({ where: { id: input.id } });
    }),
});
