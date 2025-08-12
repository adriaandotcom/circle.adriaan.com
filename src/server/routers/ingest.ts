import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { pickRandomColorPair } from "@/lib/colors";
import { fetchTwitterProfileWithEnvVars } from "@/lib/twitter";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { attachTwitterAssetsIfAny } from "@/server/routers/utils/twitter-import";

export const ingestRouter = router({
  process: publicProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const text = input.text.trim();

      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const Plan = z.object({
        twitterHandle: z.string().optional(),
        name: z.string().optional(),
      });

      // Load known org names to bias selection
      const orgs = await ctx.prisma.node.findMany({
        where: { OR: [{ type: "group" }, { type: "company" }] },
        select: { label: true },
        orderBy: { createdAt: "desc" },
      });
      const orgList = orgs.map((o) => o.label).join("\n- ");

      const { object: plan } = await generateObject({
        model: openai("gpt-5-nano"),
        schema: Plan,
        prompt: `Return strict JSON only. Fields: { name?, twitterHandle? }.
Rules
- If an X/Twitter URL is present, set twitterHandle (without @). You may omit name if unknown; we'll resolve it.
- If the text mentions any of the KnownOrganizations below (case-insensitive substring match), set name to that exact label from the list.
KnownOrganizations:\n- ${orgList}
Input: ${text}`,
      });

      let nodeLabel: string | null = null;
      if (plan.twitterHandle) {
        const profile = await fetchTwitterProfileWithEnvVars(
          plan.twitterHandle
        );
        nodeLabel = (profile?.name || plan.twitterHandle).trim();
      } else if (plan.name) {
        nodeLabel = plan.name.trim();
      }
      if (!nodeLabel) throw new Error("Could not determine a name");

      // Find or create node – try exact, then first+last tokens, then first-name prefix
      const tokens = nodeLabel
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      const searchOr: any[] = [
        { label: { equals: nodeLabel, mode: "insensitive" } },
      ];
      if (tokens.length >= 2) {
        searchOr.push({
          AND: [
            { label: { contains: tokens[0], mode: "insensitive" } },
            {
              label: {
                contains: tokens[tokens.length - 1],
                mode: "insensitive",
              },
            },
          ],
        });
      }
      if (tokens.length >= 1) {
        searchOr.push({
          label: { startsWith: tokens[0], mode: "insensitive" },
        });
      }
      const existing = await ctx.prisma.node.findFirst({
        where: { OR: searchOr },
      });
      let nodeId = existing?.id as string | undefined;
      let createdNode = false;
      if (!nodeId) {
        const { light, dark } = pickRandomColorPair();
        const created = await ctx.prisma.node.create({
          data: {
            label: nodeLabel,
            colorHexLight: light,
            colorHexDark: dark,
            addedBy: "ai",
          },
          select: { id: true },
        });
        nodeId = created.id;
        createdNode = true;
      }

      // Create event with original text
      const event = await ctx.prisma.event.create({
        data: {
          nodeId: nodeId!,
          type: "note",
          description: text,
          addedBy: "ai",
        },
        select: { id: true },
      });

      // Ensure twitter assets are attached for AI-created events too
      void attachTwitterAssetsIfAny(ctx.prisma as any, event.id, text);

      return { nodeId, eventId: event.id, createdNode };
    }),
});
