/*
  Warnings:

  - You are about to drop the column `color` on the `Node` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Node" DROP COLUMN "color",
ADD COLUMN     "colorHexDark" TEXT,
ADD COLUMN     "colorHexLight" TEXT;
