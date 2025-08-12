import type { PrismaClient } from "@prisma/client";

export const maybeSetNodeAvatar = async (
  prisma: PrismaClient,
  eventId: string,
  mediaId: string
) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { nodeId: true },
    });
    if (!event?.nodeId) return;
    const node = await prisma.node.findUnique({
      where: { id: event.nodeId },
      select: { imageMediaId: true },
    });
    if (node?.imageMediaId) return;
    await prisma.node.update({
      where: { id: event.nodeId },
      data: { imageMediaId: mediaId },
      select: { id: true },
    });
  } catch {
    // ignore
  }
};
