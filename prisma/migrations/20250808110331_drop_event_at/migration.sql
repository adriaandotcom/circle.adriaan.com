/*
  Warnings:

  - You are about to drop the column `at` on the `Event` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Event_nodeId_at_idx";

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "at";

-- CreateIndex
CREATE INDEX "Event_nodeId_createdAt_idx" ON "public"."Event"("nodeId", "createdAt");
