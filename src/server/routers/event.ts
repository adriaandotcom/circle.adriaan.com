import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { uploadEventMediaInput, createEventInput } from "@/lib/schemas";
import { fetchTweetImageUrlsWithEnvVars } from "@/lib/twitter";
import { attachTwitterAssetsIfAny } from "@/server/routers/utils/twitter-import";
import { maybeSetNodeAvatar } from "@/server/routers/utils/node-avatar";
import crypto from "node:crypto";
import imageSize from "image-size";
import { fetchTwitterProfileWithEnvVars } from "@/lib/twitter";

export const eventRouter = router({
  tags: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }),

  recentAi: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.prisma.event.findMany({
      where: { addedBy: "ai" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        description: true,
        node: { select: { id: true, label: true } },
      },
    });
    return items.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      description: e.description,
      nodeId: e.node?.id ?? null,
      nodeLabel: e.node?.label ?? null,
    }));
  }),

  list: publicProcedure
    .input(z.object({ nodeId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.event.findMany({
        where: { nodeId: input.nodeId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          description: true,
          createdAt: true,
          type: true,
          tags: { select: { id: true, name: true } },
        },
      });
    }),

  create: publicProcedure
    .input(createEventInput)
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.prisma.event.create({
        data: {
          nodeId: input.nodeId,
          type: "note",
          description: input.description ?? null,
          addedBy: "user",
        },
        select: { id: true, description: true },
      });

      // Fire-and-forget: attach any Twitter assets (avatar/tweet photos)
      void attachTwitterAssetsIfAny(
        ctx.prisma as any,
        created.id,
        created.description
      );

      // Tweet photos handled inside attachTwitterAssetsIfAny

      return { id: created.id };
    }),

  addTags: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        tags: z.array(z.string().min(1)).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const uniqueNames = Array.from(
        new Set(input.tags.map((t) => normalize(t)).filter(Boolean))
      );
      const tagIds: string[] = [];
      for (const name of uniqueNames) {
        const slug = name; // already normalized
        const tag = await ctx.prisma.tag.upsert({
          where: { slug },
          update: { name },
          create: { slug, name },
          select: { id: true },
        });
        tagIds.push(tag.id);
      }
      await ctx.prisma.event.update({
        where: { id: input.eventId },
        data: { tags: { connect: tagIds.map((id) => ({ id })) } },
      });
      return { ok: true };
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

        const link = await ctx.prisma.eventMedia.upsert({
          where: {
            eventId_mediaId: { eventId: input.eventId, mediaId: media.id },
          },
          update: { visible: true },
          create: { eventId: input.eventId, mediaId: media.id, visible: true },
        });

        // Auto-set avatar if node has none yet
        if (file.mimeType.startsWith("image/")) {
          void maybeSetNodeAvatar(ctx.prisma as any, input.eventId, media.id);
        }

        createdMedias.push({ id: media.id });
      }

      return { medias: createdMedias };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Collect media linked to this event so we can garbage collect unreferenced media after deletion
      const links = await ctx.prisma.eventMedia.findMany({
        where: { eventId: input.id },
        select: { mediaId: true },
      });
      const mediaIds = links.map((l) => l.mediaId);

      await ctx.prisma.$transaction(async (tx) => {
        await tx.event.delete({ where: { id: input.id } });
        if (mediaIds.length) {
          // Delete media that are no longer linked to any event
          await tx.media.deleteMany({
            where: { id: { in: mediaIds }, events: { none: {} } },
          });
        }
      });

      return { ok: true };
    }),

  deleteMedia: publicProcedure
    .input(z.object({ eventId: z.string().cuid(), mediaId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.eventMedia.delete({
        where: {
          eventId_mediaId: { eventId: input.eventId, mediaId: input.mediaId },
        },
      });
      const remaining = await ctx.prisma.eventMedia.count({
        where: { mediaId: input.mediaId },
      });
      if (remaining === 0)
        await ctx.prisma.media.delete({ where: { id: input.mediaId } });
      return { ok: true };
    }),
});
