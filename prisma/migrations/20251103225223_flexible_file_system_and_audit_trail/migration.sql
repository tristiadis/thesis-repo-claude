-- ============================================================================
-- Migration: Flexible File System and Audit Trail
-- Date: 2025-11-03
-- Description:
--   1. Make examiner1 optional
--   2. Change ThesisFile from fixed FileType enum to flexible fileLabel
--   3. Add ThesisEditHistory table for audit trail
-- ============================================================================

-- Step 1: Make examiner1Id nullable in theses table
ALTER TABLE "theses" ALTER COLUMN "examiner1Id" DROP NOT NULL;

-- Step 2: Create thesis_edit_history table for audit trail
CREATE TABLE "thesis_edit_history" (
    "id" SERIAL NOT NULL,
    "thesisId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "fieldName" VARCHAR(100),
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_edit_history_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add foreign keys for thesis_edit_history
ALTER TABLE "thesis_edit_history" ADD CONSTRAINT "thesis_edit_history_thesisId_fkey"
FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "thesis_edit_history" ADD CONSTRAINT "thesis_edit_history_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Create indexes for thesis_edit_history
CREATE INDEX "thesis_edit_history_thesisId_idx" ON "thesis_edit_history"("thesisId");
CREATE INDEX "thesis_edit_history_userId_idx" ON "thesis_edit_history"("userId");
CREATE INDEX "thesis_edit_history_editedAt_idx" ON "thesis_edit_history"("editedAt");
CREATE INDEX "thesis_edit_history_action_idx" ON "thesis_edit_history"("action");

-- Step 5: Transform thesis_files from enum fileType to flexible fileLabel
-- First, drop the index on fileType
DROP INDEX IF EXISTS "thesis_files_fileType_idx";

-- Add new fileLabel column
ALTER TABLE "thesis_files" ADD COLUMN "fileLabel" VARCHAR(200);

-- Migrate existing data: Convert enum values to readable labels
UPDATE "thesis_files" SET "fileLabel" =
  CASE "fileType"::text
    WHEN 'COVER' THEN 'Cover'
    WHEN 'CHAPTER_1' THEN 'Chapter 1'
    WHEN 'CHAPTER_2' THEN 'Chapter 2'
    WHEN 'CHAPTER_3' THEN 'Chapter 3'
    WHEN 'CHAPTER_4' THEN 'Chapter 4'
    WHEN 'CHAPTER_5' THEN 'Chapter 5'
    WHEN 'BIBLIOGRAPHY' THEN 'Bibliography'
    WHEN 'APPENDIX' THEN 'Appendix'
    WHEN 'OTHER' THEN 'Other'
    ELSE 'Unknown'
  END;

-- Make fileLabel NOT NULL after migration
ALTER TABLE "thesis_files" ALTER COLUMN "fileLabel" SET NOT NULL;

-- Drop the old fileType column
ALTER TABLE "thesis_files" DROP COLUMN "fileType";

-- Create index on fileLabel
CREATE INDEX "thesis_files_fileLabel_idx" ON "thesis_files"("fileLabel");

-- Step 6: Drop FileType enum (optional - keep commented out for safety)
-- Note: Only uncomment if you're sure no other code references this enum
-- DROP TYPE IF EXISTS "FileType";

-- ============================================================================
-- Migration Complete
-- ============================================================================
