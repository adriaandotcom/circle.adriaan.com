import { createTRPCContext } from "@/server/trpc";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctxParams: Promise<{ params: { id: string } }> | { params: { id: string } }
) {
  const { params } = await ctxParams;
  const ctx = await createTRPCContext();
  const media = await ctx.prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", media.mimeType);
  headers.set("Content-Length", String(media.byteSize));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(media.data, { status: 200, headers });
}
