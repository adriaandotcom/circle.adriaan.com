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

      // Optionally detect/crop face first; if it fails, fall back to original
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
        return null;
      };

      let inputBytes: Buffer = Buffer.from(original.data);
      let faceDetected = false;
      try {
        const faceOutput: any = await replicate.run(
          "ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d",
          { input: { image: originalBlob, padding: 0.6 } }
        );
        let faceUrl: string | null = normalizeUrl(faceOutput);
        if (!faceUrl && Array.isArray(faceOutput)) {
          for (const it of faceOutput) {
            const u = normalizeUrl(it);
            if (u) {
              faceUrl = u;
              break;
            }
          }
        }
        if (faceUrl) {
          const r = await fetch(faceUrl);
          if (r.ok) {
            const buf = Buffer.from(await r.arrayBuffer());
            if (buf.length > 0) {
              inputBytes = buf;
              faceDetected = true;
            }
          }
        }
      } catch {
        // ignore face detection failures
      }

      // If no face was detected, do not remove background either; just use the original media as avatar
      if (!faceDetected) {
        return ctx.prisma.node.update({
          where: { id: input.nodeId },
          data: { imageMediaId: original.id },
          select: { id: true, imageMediaId: true },
        });
      }

      // Call Replicate BiRefNet to remove background using the face-cropped (or original) image
      const blob = new Blob([inputBytes], { type: original.mimeType });
      const url = await (async () => {
        const output: any = await replicate.run(
          "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
          { input: { image: blob } }
        );
        const direct = normalizeUrl(output);
        if (direct) return direct;
        if (Array.isArray(output)) {
          for (const it of output) {
            const u = normalizeUrl(it);
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
