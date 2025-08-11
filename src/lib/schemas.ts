import { z } from "zod";
import { NodeType as PrismaNodeType, type $Enums } from "@prisma/client";

export const nodeTypeEnum = z.enum(PrismaNodeType);
export type NodeType = $Enums.NodeType;

export const createNodeInput = z.object({
  label: z.string().min(1),
  type: nodeTypeEnum,
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});

export const updateNodeInput = z.object({
  id: z.string().cuid(),
  label: z.string().min(1).optional(),
  type: nodeTypeEnum,
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});

export const createLinkInput = z.object({
  nodeIds: z
    .tuple([z.string().cuid(), z.string().cuid()])
    .refine(([a, b]) => a !== b, { message: "nodeIds must differ" }),
  role: z.string().optional(),
});

export const createEventInput = z.object({
  nodeId: z.string().cuid(),
  description: z.string().optional(),
});

export const uploadEventMediaInput = z.object({
  eventId: z.string().cuid(),
  files: z
    .array(
      z.object({
        mimeType: z.string().min(1),
        /** base64 without data: prefix */
        base64: z.string().min(1),
        filename: z.string().min(1).optional(),
      })
    )
    .min(1),
});
