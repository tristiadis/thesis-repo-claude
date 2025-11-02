-- AlterTable
ALTER TABLE "theses" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "theses" ADD COLUMN "uploadedBy" INTEGER;

-- CreateIndex
CREATE INDEX "theses_uploadedBy_idx" ON "theses"("uploadedBy");
CREATE INDEX "theses_isPublished_idx" ON "theses"("isPublished");

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
