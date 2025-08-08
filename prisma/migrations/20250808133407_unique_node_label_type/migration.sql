/*
  Warnings:

  - A unique constraint covering the columns `[label,type]` on the table `Node` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Node_label_type_key" ON "public"."Node"("label", "type");
