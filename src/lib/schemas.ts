import { z } from "zod";

export const createNodeInput = z.object({
  label: z.string().min(1),
  type: z.string().min(1).optional(),
  metadata: z.any().optional(),
});

export const updateNodeInput = z.object({
  id: z.string().cuid(),
  label: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  metadata: z.any().optional(),
});

export const createLinkInput = z.object({
  nodeIds: z.tuple([z.string().cuid(), z.string().cuid()]).refine(([a, b]) => a !== b, { message: "nodeIds must differ" }),
  type: z.string().min(1).optional(),
});

export const createEventInput = z.object({
  nodeId: z.string().cuid(),
  type: z.string().min(1),
  payload: z.any().optional(),
  at: z.date().optional(),
});
