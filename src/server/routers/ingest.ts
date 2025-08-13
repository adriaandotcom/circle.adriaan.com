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
        names: z.array(z.string()).optional(),
        twitterHandle: z.string().optional(),
      });

      // Load known org names to bias selection
      const orgs = await ctx.prisma.node.findMany({
        where: { OR: [{ type: "group" }, { type: "company" }] },
        select: { label: true },
        orderBy: { createdAt: "desc" },
      });
      const orgList = orgs
        .map((o) => o.label)
        .filter(Boolean)
        .slice(0, 200)
        .join("\n- ");

      // Load first names of people to bias person extraction
      const people = await ctx.prisma.node.findMany({
        where: { type: "person" },
        select: { label: true },
        orderBy: { createdAt: "desc" },
      });
      const firstNames = Array.from(
        new Set(
          people
            .map((p) => (p.label || "").trim().split(/\s+/)[0])
            .filter((n) => !!n && n.length >= 2)
        )
      ).slice(0, 200);
      const firstNameList = firstNames.join("\n- ");

      const data = await generateObject({
        model: openai("gpt-5-mini"),
        schema: Plan,
        prompt: `Return strict JSON only. Fields: { name?, twitterHandle? }.
Rules
- If the text mentions any of the company name, or a KnownOrganizations below (case-insensitive substring match), add that name to the names array.
- If the text likely refers to a person or their first name is in KnownFirstNames, add that name to the names array.
KnownOrganizations:\n- ${orgList}
KnownFirstNames:\n- ${firstNameList}
- If the text mentions a person, add that name to the names array.
- If an X/Twitter URL is present, set twitterHandle (without @).

Input: ${text}`,
      });

      const plan = data.object;

      console.log(JSON.stringify(data, null, 2));

      // Build candidate label list from handle/name array
      const candidateLabels: string[] = [];
      if (plan.twitterHandle) {
        const profile = await fetchTwitterProfileWithEnvVars(
          plan.twitterHandle
        );
        candidateLabels.push((profile?.name || plan.twitterHandle).trim());
      }
      if (Array.isArray(plan.names)) {
        for (const n of plan.names)
          if (n && n.trim()) candidateLabels.push(n.trim());
      }
      const uniqueLabels = Array.from(new Set(candidateLabels.filter(Boolean)));
      if (uniqueLabels.length === 0)
        throw new Error("Could not determine any names");

      // Helper to find/create a node by label
      const resolveNode = async (
        label: string
      ): Promise<{ id: string; created: boolean }> => {
        const tokens = label
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean);
        const or: any[] = [{ label: { equals: label, mode: "insensitive" } }];
        if (tokens.length >= 2)
          or.push({
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
        if (tokens.length >= 1)
          or.push({ label: { startsWith: tokens[0], mode: "insensitive" } });
        const found = await ctx.prisma.node.findFirst({ where: { OR: or } });
        if (found) return { id: found.id, created: false };
        const { light, dark } = pickRandomColorPair();
        const created = await ctx.prisma.node.create({
          data: {
            label,
            colorHexLight: light,
            colorHexDark: dark,
            addedBy: "ai",
          },
          select: { id: true },
        });
        return { id: created.id, created: true };
      };

      // Resolve all labels
      const resolved = [] as Array<{
        id: string;
        created: boolean;
        label: string;
      }>;
      for (const label of uniqueLabels) {
        const r = await resolveNode(label);
        resolved.push({ ...r, label });
      }

      // Create links for all pairs (sorted to honor unique constraint)
      for (let i = 0; i < resolved.length; i++) {
        for (let j = i + 1; j < resolved.length; j++) {
          const a =
            resolved[i].id < resolved[j].id ? resolved[i].id : resolved[j].id;
          const b =
            resolved[i].id < resolved[j].id ? resolved[j].id : resolved[i].id;
          await ctx.prisma.link.upsert({
            where: { nodeAId_nodeBId: { nodeAId: a, nodeBId: b } },
            update: {},
            create: { nodeAId: a, nodeBId: b },
          });
        }
      }

      // Create an event on each resolved node
      const eventIds: string[] = [];
      for (const r of resolved) {
        const event = await ctx.prisma.event.create({
          data: {
            nodeId: r.id,
            type: "note",
            description: text,
            addedBy: "ai",
          },
          select: { id: true },
        });
        eventIds.push(event.id);
        void attachTwitterAssetsIfAny(ctx.prisma as any, event.id, text);
      }

      return {
        nodeIds: resolved.map((r) => r.id),
        eventIds,
        createdNodes: resolved.filter((r) => r.created).map((r) => r.id),
      };
    }),
});
