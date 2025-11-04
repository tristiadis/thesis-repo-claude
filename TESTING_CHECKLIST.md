# Testing Checklist - Flexible File System & Edit Feature

## Overview
This document provides comprehensive testing steps for the newly implemented flexible file upload system and thesis editing features.

---

## Phase 1: Database Migration

### Prerequisites
- Backup database before migration
- Ensure PostgreSQL is running
- Have admin access to database

### Migration Steps

1. **Backup Current Database**
   ```bash
   pg_dump -U postgres -d thesis_db > backup_before_migration.sql
   ```

2. **Review Migration File**
   - File: `prisma/migrations/20251103225223_flexible_file_system_and_audit_trail/migration.sql`
   - Verify all SQL statements are correct

3. **Run Migration**
   ```bash
   npx prisma migrate deploy
   ```

4. **Verify Migration Success**
   ```bash
   npx prisma migrate status
   ```

5. **Check Database Schema**
   ```sql
   -- Check examiner1Id is now nullable
   \d theses

   -- Check thesis_edit_history table exists
   \d thesis_edit_history

   -- Check thesis_files has fileLabel instead of fileType
   \d thesis_files

   -- Verify existing data migrated correctly
   SELECT id, fileLabel FROM thesis_files LIMIT 10;
   ```

### Expected Results
- ✅ `examiner1Id` column is nullable
- ✅ `thesis_edit_history` table created with all indexes
- ✅ `thesis_files.fileLabel` exists and populated
- ✅ `thesis_files.fileType` column removed
- ✅ Existing data converted (e.g., CHAPTER_1 → "Chapter 1")

---

## Phase 2: Delete Old Dummy Data (Optional)

If you have dummy thesis data that used the old file system, delete it:

```sql
-- Delete all thesis files
DELETE FROM thesis_files;

-- Delete all theses
DELETE FROM theses WHERE id > 0;

-- Reset sequences
ALTER SEQUENCE theses_id_seq RESTART WITH 1;
ALTER SEQUENCE thesis_files_id_seq RESTART WITH 1;
```

---

## Phase 3: Admin Upload Testing

### Test Case 1: Single File Upload (Full Text)

**Steps:**
1. Login as admin
2. Navigate to `/admin/thesis/upload`
3. Fill basic information:
   - Title (ID): "Sistem Manajemen Basis Data Terdistribusi"
   - Title (EN): "Distributed Database Management System"
   - Author Name: "Budi Santoso"
   - Student ID: "2019001"
   - Graduation Year: 2023
   - Department: Select any
   - Abstract (ID): [Fill with sample text]
   - Keywords (ID): "database, distributed, management"
4. Select advisors:
   - Main Advisor: Select one
   - Examiner 1: Leave empty (test optional)
5. Upload single file:
   - File: Upload test PDF
   - File Label: "Full Text" (from suggestions)
   - Access Level: PUBLIC
6. Click "Create Thesis"

**Expected Results:**
- ✅ Form validates (min 1 file satisfied)
- ✅ Thesis created with status APPROVED
- ✅ isPublished = false
- ✅ File stored with label "Full Text"
- ✅ File accessLevel = PUBLIC
- ✅ examiner1Id = null (optional field)
- ✅ Audit trail created (logFileAdd)

**Verification Queries:**
```sql
SELECT id, title, status, isPublished, examiner1Id FROM theses ORDER BY id DESC LIMIT 1;
SELECT id, fileLabel, accessLevel, thesisId FROM thesis_files ORDER BY id DESC LIMIT 1;
SELECT * FROM thesis_edit_history ORDER BY id DESC LIMIT 5;
```

---

### Test Case 2: Multiple Files Upload (Separate Chapters)

**Steps:**
1. Navigate to `/admin/thesis/upload`
2. Fill basic information (similar to Test Case 1)
3. Select advisors (include examiner1 this time)
4. Upload multiple files:
   - File 1: Label "Cover", Access: PUBLIC
   - File 2: Label "Chapter 1", Access: PUBLIC
   - File 3: Label "Chapter 2", Access: EMBARGOED
     - Embargo Until: 2026-01-01
     - Embargo Reason: "Pending publication in journal"
   - File 4: Label "Chapter 3", Access: PUBLIC
   - File 5: Custom label "Additional Materials", Access: RESTRICTED
5. Click "Create Thesis"

**Expected Results:**
- ✅ Thesis created with 5 files
- ✅ Each file has correct label
- ✅ Access levels stored correctly
- ✅ Embargo date and reason saved for File 3
- ✅ sequenceOrder set correctly (0, 1, 2, 3, 4)
- ✅ All files logged in audit trail

---

### Test Case 3: Custom File Label

**Steps:**
1. Navigate to `/admin/thesis/upload`
2. Fill basic information
3. Upload file with custom label:
   - File Label: Type custom text "Ringkasan Eksekutif" (not from suggestions)
   - Access Level: PUBLIC
4. Submit

**Expected Results:**
- ✅ Custom label accepted
- ✅ File stored with label "Ringkasan Eksekutif"

---

### Test Case 4: Max Files Validation

**Steps:**
1. Navigate to `/admin/thesis/upload`
2. Try to add 11 files

**Expected Results:**
- ✅ "Add File" button disabled at 10 files
- ✅ UI shows "(10/10)"
- ✅ Cannot add more files

---

### Test Case 5: Min Files Validation

**Steps:**
1. Navigate to `/admin/thesis/upload`
2. Try to submit without any files

**Expected Results:**
- ✅ Form validation prevents submission
- ✅ Error message shown: "At least 1 file required"

---

## Phase 4: Thesis Edit Testing

### Test Case 6: Edit Metadata (All Fields)

**Steps:**
1. Navigate to `/admin/review?status=approved`
2. Find a thesis and click "Edit" button
3. Modify all fields:
   - Change title
   - Change author name
   - Change student ID
   - Change graduation year
   - Change department
   - Change abstract
   - Change keywords
   - Change defense date
   - Change advisors
   - Change examiners
4. Click "Save Changes"

**Expected Results:**
- ✅ All fields updated successfully
- ✅ Redirected to review page with success message
- ✅ Audit trail logged for each changed field
- ✅ ThesisEditHistory entries created

**Verification:**
```sql
-- Check updated thesis
SELECT * FROM theses WHERE id = [thesis_id];

-- Check audit trail
SELECT action, fieldName, oldValue, newValue, description, editedAt
FROM thesis_edit_history
WHERE thesisId = [thesis_id]
ORDER BY editedAt DESC;
```

---

### Test Case 7: Edit - Remove Examiner1 (Make Null)

**Steps:**
1. Edit a thesis that has examiner1
2. Change examiner1 dropdown to "None (Optional)"
3. Save

**Expected Results:**
- ✅ examiner1Id set to null
- ✅ Audit trail logged: oldValue = [old_id], newValue = null

---

### Test Case 8: View Published Thesis

**Steps:**
1. Select a thesis in review page
2. Click "Publish" button
3. Open public thesis page: `/thesis/[id]`
4. Verify files displayed correctly

**Expected Results:**
- ✅ PUBLIC files visible to all users
- ✅ EMBARGOED files hidden until embargo date
- ✅ RESTRICTED files only visible to admin/authorized users
- ✅ File labels displayed correctly

---

## Phase 5: File Management API Testing

### Test Case 9: Add File to Existing Thesis (API)

**Steps:**
1. Use Postman or curl to test endpoint:
   ```bash
   curl -X POST http://localhost:3000/admin/thesis/[id]/files/upload \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test.pdf" \
     -F "fileLabel=Additional Appendix" \
     -F "accessLevel=PUBLIC" \
     -b cookies.txt
   ```

**Expected Results:**
- ✅ File uploaded successfully
- ✅ New ThesisFile record created
- ✅ Audit trail logged (ADD_FILE)
- ✅ Max 10 files validation enforced

---

### Test Case 10: Delete File from Thesis (API)

**Steps:**
1. Delete a file (ensure thesis has > 1 file):
   ```bash
   curl -X DELETE http://localhost:3000/admin/thesis/[id]/files/[fileId] \
     -b cookies.txt
   ```

**Expected Results:**
- ✅ File deleted from database
- ✅ Physical file deleted from uploads/
- ✅ Audit trail logged (DELETE_FILE)
- ✅ Min 1 file validation enforced (cannot delete last file)

---

### Test Case 11: Update File Metadata (API)

**Steps:**
1. Update file label and access level:
   ```bash
   curl -X PATCH http://localhost:3000/admin/thesis/[id]/files/[fileId] \
     -H "Content-Type: application/json" \
     -d '{
       "fileLabel": "Updated Chapter 1",
       "accessLevel": "EMBARGOED",
       "embargoUntil": "2026-06-01",
       "embargoReason": "Patent pending"
     }' \
     -b cookies.txt
   ```

**Expected Results:**
- ✅ File metadata updated
- ✅ Each changed field logged in audit trail (EDIT_FILE)

---

## Phase 6: Student Submit Testing (Backward Compatibility)

### Test Case 12: Student Submit with Optional Examiner1

**Steps:**
1. Login as student
2. Navigate to `/submit`
3. Fill form but leave examiner1 empty
4. Upload required files (old system: Cover, Chapter 1, etc.)
5. Submit

**Expected Results:**
- ✅ Form accepts submission without examiner1
- ✅ Thesis created with examiner1Id = null
- ✅ Files stored with converted labels (fileTypeToLabel)
- ✅ Status = PENDING_REVIEW

**Verification:**
```sql
SELECT id, authorName, studentId, status, examiner1Id FROM theses WHERE uploadedBy = [student_user_id] ORDER BY id DESC LIMIT 1;
SELECT id, fileLabel FROM thesis_files WHERE thesisId = [thesis_id];
```

---

## Phase 7: Audit Trail Verification

### Test Case 13: View Thesis Edit History

**Steps:**
1. Use audit trail service:
   ```javascript
   const auditTrail = require('./src/services/auditTrailService');

   // Get history for specific thesis
   const history = await auditTrail.getThesisHistory(thesisId, 50);
   console.log(history);
   ```

**Expected Results:**
- ✅ All edits listed chronologically
- ✅ Each entry shows: action, fieldName, oldValue, newValue, user, timestamp
- ✅ Actions include: EDIT_METADATA, ADD_FILE, DELETE_FILE, EDIT_FILE

---

### Test Case 14: View User Edit History

**Steps:**
1. Get all edits by admin user:
   ```javascript
   const history = await auditTrail.getUserEditHistory(adminUserId, 100);
   console.log(history);
   ```

**Expected Results:**
- ✅ All edits by specific user listed
- ✅ Includes thesis information (title, studentId)

---

## Phase 8: Edge Cases & Error Handling

### Test Case 15: Upload with Invalid File Type

**Steps:**
1. Try to upload .docx or .jpg file

**Expected Results:**
- ✅ Multer rejects file
- ✅ Error message: "Only PDF files are allowed"

---

### Test Case 16: Upload File Exceeding 50MB

**Steps:**
1. Try to upload PDF > 50MB

**Expected Results:**
- ✅ Multer rejects file
- ✅ Error message about file size limit

---

### Test Case 17: Try to Delete Last File

**Steps:**
1. Navigate to thesis with only 1 file
2. Try to delete via API

**Expected Results:**
- ✅ Deletion blocked
- ✅ Error: "Cannot delete last file. Thesis must have at least 1 file."

---

### Test Case 18: Concurrent Edit by Multiple Admins

**Steps:**
1. Open edit form in two browser sessions
2. Edit same thesis simultaneously
3. Submit both

**Expected Results:**
- ✅ Both edits saved
- ✅ Audit trail shows both edit sequences with timestamps

---

## Phase 9: UI/UX Testing

### Test Case 19: File Upload Progress & Feedback

**Steps:**
1. Upload large PDF files (10-20MB)
2. Observe UI during upload

**Expected Results:**
- ✅ Progress indicator visible
- ✅ Success/error feedback shown
- ✅ No page refresh during file upload

---

### Test Case 20: Embargo Date Picker

**Steps:**
1. Select EMBARGOED access level
2. Test date picker functionality

**Expected Results:**
- ✅ Date picker appears when EMBARGOED selected
- ✅ Date picker hidden for PUBLIC/RESTRICTED
- ✅ Cannot select past dates

---

## Phase 10: Integration Testing

### Test Case 21: Complete Workflow - Upload → Edit → Publish

**Steps:**
1. Admin uploads thesis with multiple files
2. Admin edits metadata and changes advisor
3. Admin publishes thesis
4. Public user views thesis
5. Check audit trail

**Expected Results:**
- ✅ Complete workflow functions smoothly
- ✅ All actions logged in audit trail
- ✅ Public page displays correctly
- ✅ Access levels enforced

---

## Phase 11: Performance Testing

### Test Case 22: Upload 10 Files Simultaneously

**Steps:**
1. Upload thesis with 10 PDF files (each ~5MB)

**Expected Results:**
- ✅ All files uploaded successfully
- ✅ Reasonable upload time
- ✅ No memory issues
- ✅ All audit trail entries created

---

## Known Limitations

1. **Edit Form File Management**:
   - Currently displays files as read-only
   - File add/delete/edit requires API endpoints
   - Future enhancement: Add file management UI in edit form

2. **File Upload AJAX**:
   - Upload form uses AJAX for files
   - May need endpoint adjustment based on session handling

---

## Success Criteria

Implementation is successful if:
- ✅ All 22 test cases pass
- ✅ Migration completes without errors
- ✅ Backward compatibility maintained (student system unchanged)
- ✅ Audit trail logs all modifications
- ✅ File count validation enforced (min 1, max 10)
- ✅ Access levels work correctly
- ✅ examiner1 is optional
- ✅ No breaking changes to existing features

---

## Rollback Plan

If critical issues are found:

1. **Restore Database Backup**
   ```bash
   psql -U postgres -d thesis_db < backup_before_migration.sql
   ```

2. **Revert Git Commits**
   ```bash
   git revert [commit_hash]
   git push
   ```

3. **Specific Issue Fixes**
   - Document issues found
   - Create hotfix branch
   - Test fix thoroughly
   - Deploy fix

---

## Post-Testing Tasks

After all tests pass:
1. Update documentation
2. Train admin users on new features
3. Monitor system for issues
4. Collect user feedback
5. Plan future enhancements (file management UI in edit form)

---

**Document Version**: 1.0
**Date**: 2025-11-03
**Status**: Ready for Testing
