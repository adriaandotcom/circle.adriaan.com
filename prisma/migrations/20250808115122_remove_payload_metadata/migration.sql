/*
  Warnings:

  - You are about to drop the column `payload` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Node` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "payload";

-- AlterTable
ALTER TABLE "public"."Node" DROP COLUMN "metadata";
