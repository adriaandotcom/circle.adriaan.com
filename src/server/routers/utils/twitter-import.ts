import crypto from "node:crypto";
import imageSize from "image-size";
import {
  fetchTwitterProfileWithEnvVars,
  fetchTweetImageUrlsWithEnvVars,
} from "@/lib/twitter";
import type { PrismaClient } from "@prisma/client";

export const attachTwitterAssetsIfAny = async (
  prisma: PrismaClient,
  eventId: string,
  description: string | null | undefined
) => {
  const text = description ?? "";

  // Profile avatar
  try {
    const match = text.match(
      /@?https?:\/\/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:[\/?].*)?/i
    );
    const handle = match?.[1];
    if (handle) {
      const profile = await fetchTwitterProfileWithEnvVars(handle);
      if (profile?.avatar) {
        const res = await fetch(profile.avatar);
        if (res.ok) {
          const mimeType = res.headers.get("content-type") || "image/jpeg";
          const arrayBuf = await res.arrayBuffer();
          const bytes = Buffer.from(arrayBuf);
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
          const media = await prisma.media.upsert({
            where: { sha256 },
            update: {},
            create: {
              mimeType,
              kind: mimeType.startsWith("image/") ? "image" : "other",
              byteSize: bytes.length,
              sha256,
              imageWidth: imageWidth ?? undefined,
              imageHeight: imageHeight ?? undefined,
              data: bytes,
            },
          });
          await prisma.eventMedia.upsert({
            where: { eventId_mediaId: { eventId, mediaId: media.id } },
            update: { visible: true },
            create: { eventId, mediaId: media.id, visible: true },
          });
          await prisma.event.update({
            where: { id: eventId },
            data: { updatedAt: new Date() },
          });
        }
      }
    }
  } catch {}

  // Tweet photos
  try {
    const tweet = text.match(
      /https?:\/\/(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i
    );
    const tweetId = tweet?.[1];
    if (tweetId) {
      const urls = await fetchTweetImageUrlsWithEnvVars(tweetId);
      for (const u of urls) {
        const res = await fetch(u);
        if (!res.ok) continue;
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        const arrayBuf = await res.arrayBuffer();
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
        const media = await prisma.media.upsert({
          where: { sha256 },
          update: {},
          create: {
            mimeType,
            kind: "image",
            byteSize: bytes.length,
            sha256,
            imageWidth: imageWidth ?? undefined,
            imageHeight: imageHeight ?? undefined,
            data: bytes,
          },
        });
        await prisma.eventMedia.upsert({
          where: { eventId_mediaId: { eventId, mediaId: media.id } },
          update: { visible: true },
          create: { eventId, mediaId: media.id, visible: true },
        });
      }
    }
  } catch {}
};
