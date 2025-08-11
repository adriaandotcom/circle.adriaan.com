import { z } from "zod";
import { NodeType as PrismaNodeType, type $Enums } from "@prisma/client";

export const nodeTypeEnum = z.enum(PrismaNodeType);
export type NodeType = $Enums.NodeType;

export const createNodeInput = z.object({
  label: z.string().min(1),
  type: nodeTypeEnum,
});

export const updateNodeInput = z.object({
  id: z.string().cuid(),
  label: z.string().min(1).optional(),
  type: nodeTypeEnum,
});

export const createLinkInput = z.object({
  nodeIds: z
    .tuple([z.string().cuid(), z.string().cuid()])
    .refine(([a, b]) => a !== b, { message: "nodeIds must differ" }),
  role: z.string().optional(),
});

export const createEventInput = z.object({
  nodeId: z.string().cuid(),
  type: z.string().min(1),
  description: z.string().min(1).optional(),
});
