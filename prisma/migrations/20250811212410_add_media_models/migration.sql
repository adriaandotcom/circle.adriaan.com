-- CreateEnum
CREATE TYPE "public"."MediaKind" AS ENUM ('image', 'video', 'audio', 'document', 'other');

-- CreateEnum
CREATE TYPE "public"."StorageProvider" AS ENUM ('database');

-- CreateEnum
CREATE TYPE "public"."AddedBy" AS ENUM ('user', 'system');

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "kind" "public"."MediaKind",
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "imageWidth" INTEGER,
    "imageHeight" INTEGER,
    "provider" "public"."StorageProvider" NOT NULL DEFAULT 'database',
    "addedBy" "public"."AddedBy" NOT NULL DEFAULT 'user',
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventMedia" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_sha256_key" ON "public"."Media"("sha256");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_idx" ON "public"."EventMedia"("eventId");

-- CreateIndex
CREATE INDEX "EventMedia_mediaId_idx" ON "public"."EventMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMedia_eventId_mediaId_key" ON "public"."EventMedia"("eventId", "mediaId");

-- AddForeignKey
ALTER TABLE "public"."EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMedia" ADD CONSTRAINT "EventMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
