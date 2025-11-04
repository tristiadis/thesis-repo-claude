-- CreateEnum
CREATE TYPE "ResearchMethod" AS ENUM ('QUALITATIVE', 'QUANTITATIVE', 'MIXED_METHOD', 'OTHER');

-- AlterTable
-- Add researchMethod column with default value OTHER for existing records
ALTER TABLE "theses" ADD COLUMN "researchMethod" "ResearchMethod" NOT NULL DEFAULT 'OTHER';

-- CreateIndex (optional, for query performance)
CREATE INDEX "theses_researchMethod_idx" ON "theses"("researchMethod");
