/*
  Warnings:

  - The `type` column on the `Node` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."NodeType" AS ENUM ('company', 'person', 'group');

-- AlterTable
ALTER TABLE "public"."Node" DROP COLUMN "type",
ADD COLUMN     "type" "public"."NodeType";
