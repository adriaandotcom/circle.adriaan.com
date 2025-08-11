-- AlterTable
ALTER TABLE "public"."Node" ADD COLUMN     "imageMediaId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Node" ADD CONSTRAINT "Node_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
