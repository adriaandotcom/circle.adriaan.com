-- CreateTable
CREATE TABLE "public"."Node" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Link" (
    "id" TEXT NOT NULL,
    "nodeAId" TEXT NOT NULL,
    "nodeBId" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Link_nodeAId_idx" ON "public"."Link"("nodeAId");

-- CreateIndex
CREATE INDEX "Link_nodeBId_idx" ON "public"."Link"("nodeBId");

-- CreateIndex
CREATE UNIQUE INDEX "Link_nodeAId_nodeBId_key" ON "public"."Link"("nodeAId", "nodeBId");

-- CreateIndex
CREATE INDEX "Event_nodeId_at_idx" ON "public"."Event"("nodeId", "at");

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_nodeAId_fkey" FOREIGN KEY ("nodeAId") REFERENCES "public"."Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_nodeBId_fkey" FOREIGN KEY ("nodeBId") REFERENCES "public"."Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
