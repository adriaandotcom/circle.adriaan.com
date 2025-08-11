import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { uploadEventMediaInput } from "@/lib/schemas";
import crypto from "node:crypto";
import imageSize from "image-size";

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
        select: { id: true },
      });
    }),

  mediaForEvent: publicProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.eventMedia.findMany({
        where: { eventId: input.eventId, visible: true },
        orderBy: { createdAt: "asc" },
        include: {
          media: {
            select: {
              id: true,
              mimeType: true,
              byteSize: true,
              imageWidth: true,
              imageHeight: true,
            },
          },
        },
      });
      return items.map((i) => ({
        id: i.media.id,
        mimeType: i.media.mimeType,
        byteSize: i.media.byteSize,
        imageWidth: i.media.imageWidth,
        imageHeight: i.media.imageHeight,
      }));
    }),

  uploadMedia: publicProcedure
    .input(uploadEventMediaInput)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: { id: input.eventId },
      });
      if (!event) throw new Error("Event not found");

      const createdMedias = [] as Array<{ id: string }>;

      for (const file of input.files) {
        const bytes = Buffer.from(file.base64, "base64");
        const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

        // Try to detect dimensions if image
        let imageWidth: number | null = null;
        let imageHeight: number | null = null;
        if (file.mimeType.startsWith("image/")) {
          try {
            const dim = imageSize(bytes);
            if (dim.width && dim.height) {
              imageWidth = dim.width;
              imageHeight = dim.height;
            }
          } catch {}
        }

        const media = await ctx.prisma.media.upsert({
          where: { sha256 },
          update: {},
          create: {
            mimeType: file.mimeType,
            kind: file.mimeType.startsWith("image/")
              ? "image"
              : file.mimeType.startsWith("video/")
              ? "video"
              : file.mimeType.startsWith("audio/")
              ? "audio"
              : "other",
            byteSize: bytes.length,
            sha256,
            imageWidth: imageWidth ?? undefined,
            imageHeight: imageHeight ?? undefined,
            data: bytes,
          },
        });

        await ctx.prisma.eventMedia.upsert({
          where: {
            eventId_mediaId: { eventId: input.eventId, mediaId: media.id },
          },
          update: { visible: true },
          create: { eventId: input.eventId, mediaId: media.id, visible: true },
        });

        createdMedias.push({ id: media.id });
      }

      return { medias: createdMedias };
    }),
});
