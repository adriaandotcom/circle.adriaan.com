import { initTRPC } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type TRPCContext = {
  prisma: PrismaClient;
};

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const createTRPCContext = async (): Promise<TRPCContext> => ({ prisma });
