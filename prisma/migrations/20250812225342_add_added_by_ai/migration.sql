-- AlterEnum
ALTER TYPE "public"."AddedBy" ADD VALUE 'ai';

-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "addedBy" "public"."AddedBy" NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "public"."Node" ADD COLUMN     "addedBy" "public"."AddedBy" NOT NULL DEFAULT 'user';
