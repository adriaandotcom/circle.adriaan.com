/*
  Warnings:

  - You are about to drop the column `roleId` on the `Link` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Link" DROP CONSTRAINT "Link_roleId_fkey";

-- AlterTable
ALTER TABLE "public"."Link" DROP COLUMN "roleId";

-- CreateTable
CREATE TABLE "public"."_LinkToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LinkToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LinkToRole_B_index" ON "public"."_LinkToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Role_slug_key" ON "public"."Role"("slug");

-- AddForeignKey
ALTER TABLE "public"."_LinkToRole" ADD CONSTRAINT "_LinkToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_LinkToRole" ADD CONSTRAINT "_LinkToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
