# Database Schema Documentation

## Overview

This document describes the database schema for the Thesis Repository System. The schema is designed to support a comprehensive institutional repository for academic theses with multilingual support (Indonesian/English), access control, and detailed statistics tracking.

## Technology

- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 15+
- **Schema Version**: 1.0.0

## Schema Structure

### Organizational Hierarchy

```
Faculty (Fakultas)
  └── Department (Program Studi)
       ├── Lecturer (Dosen)
       └── Thesis (Skripsi)
```

## Models

### 1. Faculty (Fakultas)

Top-level organizational unit representing faculties in the university.

**Fields:**
- `id` - Primary key (auto-increment)
- `name` - Faculty name in Indonesian
- `nameEn` - Faculty name in English (optional)
- `code` - Unique faculty code (max 10 chars)
- `description` - Detailed description (optional)
- `isActive` - Active status flag
- `createdAt`, `updatedAt` - Timestamps

**Relationships:**
- One-to-Many with Department

**Indexes:**
- `code`, `isActive`

**Example:**
```json
{
  "code": "FMIPA",
  "name": "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "nameEn": "Faculty of Mathematics and Natural Sciences"
}
```

---

### 2. Department (Program Studi / Jurusan)

Academic departments or study programs within faculties.

**Fields:**
- `id` - Primary key
- `facultyId` - Foreign key to Faculty
- `name` - Department name in Indonesian
- `nameEn` - Department name in English (optional)
- `code` - Unique department code (max 10 chars)
- `isActive` - Active status flag
- `createdAt`, `updatedAt` - Timestamps

**Relationships:**
- Many-to-One with Faculty
- One-to-Many with Lecturer
- One-to-Many with Thesis

**Indexes:**
- `facultyId`, `code`, `isActive`

**Delete Behavior:**
- Restrict (cannot delete if has lecturers or theses)

---

### 3. Lecturer (Dosen)

Faculty members who can serve as thesis advisors or examiners.

**Fields:**
- `id` - Primary key
- `nidn` - National Lecturer ID Number (unique, max 20 chars)
- `name` - Full name in RIS format: **"Last, First"**
- `email` - Email address (unique, optional)
- `departmentId` - Foreign key to Department
- `isActive` - Active status flag
- `createdAt`, `updatedAt` - Timestamps

**Name Format (RIS Standard):**
```
✓ Correct: "Susanto, Budi"
✗ Wrong:   "Budi Susanto"
```

**Relationships:**
- Many-to-One with Department
- One-to-Many with Thesis as:
  - Advisor 1 (Pembimbing 1)
  - Advisor 2 (Pembimbing 2)
  - Examiner 1 (Penguji 1)
  - Examiner 2 (Penguji 2)
  - Examiner 3 (Penguji 3)

**Indexes:**
- `departmentId`, `nidn`, `email`, `isActive`

**Delete Behavior:**
- Restrict (cannot delete if assigned to theses)

---

### 4. User (System Users)

User accounts for system access (Admins and Students).

**Fields:**
- `id` - Primary key
- `username` - Unique username (max 50 chars)
- `password` - Hashed password (bcrypt)
- `role` - User role (ADMIN or STUDENT)
- `name` - Full name
- `email` - Email address (unique, optional)
- `isActive` - Active status flag
- `lastLogin` - Last login timestamp (optional)
- `createdAt`, `updatedAt` - Timestamps

**Roles:**
- `ADMIN` - System administrator (review and manage theses)
- `STUDENT` - Student user (submit theses)

**Relationships:**
- One-to-Many with Thesis as Submitter
- One-to-Many with Thesis as Reviewer

**Indexes:**
- `username`, `email`, `role`, `isActive`

**Security:**
- Passwords are hashed using bcrypt with configurable rounds
- Email is optional to allow username-only authentication

---

### 5. Thesis (Skripsi / Tugas Akhir)

Main thesis entity containing metadata and relationships.

**Fields:**

*Management:*
- `id` - Primary key
- `departmentId` - Foreign key to Department
- `submitterId` - Foreign key to User (student)
- `status` - Thesis status (DRAFT/PENDING/APPROVED/REJECTED)
- `submittedAt` - Submission timestamp
- `reviewedAt` - Review completion timestamp
- `reviewedBy` - Foreign key to User (admin reviewer)
- `reviewerNotes` - Review notes/feedback

*Metadata:*
- `title` - Thesis title (Indonesian, max 500 chars)
- `titleEn` - Thesis title (English, optional)
- `authorName` - Student's full name
- `studentId` - Student ID/NIM (max 50 chars)
- `graduationYear` - Year of graduation
- `defenseDate` - Thesis defense date (optional)
- `abstractId` - Abstract in Indonesian
- `abstractEn` - Abstract in English (optional)
- `keywords` - Comma-separated keywords (Indonesian)
- `keywordsEn` - Comma-separated keywords (English, optional)

*Academic Committee:*
- `advisor1Id` - Primary advisor (required)
- `advisor2Id` - Secondary advisor (optional)
- `examiner1Id` - Primary examiner (required)
- `examiner2Id` - Secondary examiner (optional)
- `examiner3Id` - Tertiary examiner (optional)

*Statistics:*
- `viewCount` - Number of views
- `downloadCount` - Total download count
- `publishedAt` - Publication timestamp

*Timestamps:*
- `createdAt`, `updatedAt`

**Status Flow:**
```
DRAFT → PENDING → APPROVED (published)
                ↓
             REJECTED (with reviewerNotes)
```

**Relationships:**
- Many-to-One with Department
- Many-to-One with User (Submitter)
- Many-to-One with User (Reviewer, optional)
- Many-to-One with Lecturer (Advisor 1, Advisor 2, Examiner 1-3)
- One-to-Many with ThesisFile
- One-to-Many with StatisticsLog

**Indexes:**
- `departmentId`, `submitterId`, `reviewedBy`
- `status`, `graduationYear`, `publishedAt`
- `advisor1Id`, `examiner1Id`

**Delete Behavior:**
- Restrict for Department, Submitter, Advisors, Examiners
- Set Null for Reviewer
- Cascade for Files and Logs

---

### 6. ThesisFile (File-file Skripsi)

Individual file components of a thesis (chapters, appendices, etc.).

**Fields:**

*Identification:*
- `id` - Primary key
- `thesisId` - Foreign key to Thesis
- `fileType` - Type of file (COVER, CHAPTER_1, etc.)
- `filename` - Stored filename (sanitized)
- `originalFilename` - Original upload filename
- `filePath` - Relative path from upload root
- `fileSize` - Size in bytes
- `mimeType` - MIME type (max 100 chars)
- `checksum` - SHA-256 hash for integrity (optional)

*Access Control:*
- `accessLevel` - PUBLIC/EMBARGOED/RESTRICTED
- `embargoUntil` - Embargo expiry date (optional)
- `embargoReason` - Reason for embargo (optional)

*Organization:*
- `downloadCount` - Download counter
- `sequenceOrder` - Display order

*Timestamps:*
- `createdAt`, `updatedAt`

**File Types:**
- `COVER` - Cover/title page
- `CHAPTER_1` to `CHAPTER_5` - Main chapters
- `BIBLIOGRAPHY` - References
- `APPENDIX` - Appendices
- `OTHER` - Other files

**Access Levels:**
- `PUBLIC` - Openly accessible
- `EMBARGOED` - Temporarily restricted until `embargoUntil`
- `RESTRICTED` - Permanently restricted

**Relationships:**
- Many-to-One with Thesis
- One-to-Many with StatisticsLog

**Indexes:**
- `thesisId`, `fileType`, `accessLevel`, `embargoUntil`

**Delete Behavior:**
- Cascade (deleted when thesis is deleted)

---

### 7. StatisticsLog (Log Statistik)

Tracks user interactions (views, downloads, exports) for analytics.

**Fields:**
- `id` - Primary key
- `thesisId` - Foreign key to Thesis
- `fileId` - Foreign key to ThesisFile (optional)
- `eventType` - VIEW/DOWNLOAD/METADATA_EXPORT
- `ipHash` - SHA-256 hash of IP address (privacy)
- `userAgent` - Browser user agent
- `referer` - HTTP referer
- `createdAt` - Event timestamp

**Event Types:**
- `VIEW` - Thesis detail page viewed (fileId = null)
- `DOWNLOAD` - File downloaded (fileId required)
- `METADATA_EXPORT` - Metadata exported (BibTeX, RIS, etc., fileId = null)

**Privacy:**
- IP addresses are hashed using SHA-256 for privacy compliance
- Personal information is not stored

**Relationships:**
- Many-to-One with Thesis
- Many-to-One with ThesisFile (optional)

**Indexes:**
- `thesisId`, `fileId`, `eventType`, `createdAt`

**Delete Behavior:**
- Cascade (deleted when thesis or file is deleted)

---

### 8. SystemSetting (Pengaturan Sistem)

Key-value store for system-wide configuration.

**Fields:**
- `id` - Primary key
- `settingKey` - Unique setting identifier (max 100 chars)
- `settingValue` - Setting value (stored as text)
- `settingType` - Data type (STRING/INTEGER/BOOLEAN/JSON)
- `description` - Human-readable description
- `updatedAt` - Last update timestamp

**Setting Types:**
- `STRING` - Text value
- `INTEGER` - Numeric value
- `BOOLEAN` - True/false value
- `JSON` - JSON object/array

**Example Settings:**
```json
{
  "settingKey": "max_file_size",
  "settingValue": "10485760",
  "settingType": "INTEGER",
  "description": "Maximum file upload size in bytes"
}
```

**Indexes:**
- `settingKey` (unique)

---

### 9. Session

Stores user sessions for express-session with PostgreSQL.

**Fields:**
- `id` - Primary key
- `sid` - Session ID (unique)
- `data` - Serialized session data
- `expiresAt` - Session expiry timestamp

**Indexes:**
- `expiresAt` (for cleanup queries)

---

## Enums

### Role
- `ADMIN` - System administrator
- `STUDENT` - Student user

### ThesisStatus
- `DRAFT` - Initial draft, not submitted
- `PENDING` - Submitted, awaiting review
- `APPROVED` - Approved and published
- `REJECTED` - Rejected with feedback

### FileType
- `COVER` - Cover page
- `CHAPTER_1` to `CHAPTER_5` - Chapters
- `BIBLIOGRAPHY` - References
- `APPENDIX` - Appendices
- `OTHER` - Other files

### AccessLevel
- `PUBLIC` - Freely accessible
- `EMBARGOED` - Temporarily restricted
- `RESTRICTED` - Permanently restricted

### EventType
- `VIEW` - Page view
- `DOWNLOAD` - File download
- `METADATA_EXPORT` - Metadata export

### SettingType
- `STRING` - Text value
- `INTEGER` - Integer value
- `BOOLEAN` - Boolean value
- `JSON` - JSON value

---

## Relationships Summary

### Faculty
```
Faculty (1) ──< (N) Department
```

### Department
```
Faculty (1) >── (N) Department
Department (1) ──< (N) Lecturer
Department (1) ──< (N) Thesis
```

### Lecturer
```
Department (1) >── (N) Lecturer
Lecturer (1) ──< (N) Thesis [as advisor1, advisor2, examiner1, examiner2, examiner3]
```

### User
```
User (1) ──< (N) Thesis [as submitter]
User (1) ──< (N) Thesis [as reviewer]
```

### Thesis
```
Department (1) >── (N) Thesis
User (1) >── (N) Thesis [submitter]
User (1) >── (N) Thesis [reviewer, optional]
Lecturer (1) >── (N) Thesis [advisor1]
Lecturer (1) >── (N) Thesis [advisor2, optional]
Lecturer (1) >── (N) Thesis [examiner1]
Lecturer (1) >── (N) Thesis [examiner2, optional]
Lecturer (1) >── (N) Thesis [examiner3, optional]
Thesis (1) ──< (N) ThesisFile
Thesis (1) ──< (N) StatisticsLog
```

### ThesisFile
```
Thesis (1) >── (N) ThesisFile
ThesisFile (1) ──< (N) StatisticsLog
```

---

## Indexes Strategy

### Purpose
Indexes are added to optimize common query patterns:

1. **Foreign Keys** - All FK columns indexed for join performance
2. **Status Fields** - `status`, `isActive` for filtering
3. **Temporal Queries** - `createdAt`, `graduationYear`, `publishedAt` for time-based queries
4. **Unique Constraints** - `username`, `email`, `code`, `nidn` for uniqueness
5. **Access Control** - `accessLevel`, `embargoUntil` for permission checks

### Index List
```sql
-- Faculty
CREATE INDEX idx_faculties_code ON faculties(code);
CREATE INDEX idx_faculties_is_active ON faculties(isActive);

-- Department
CREATE INDEX idx_departments_faculty_id ON departments(facultyId);
CREATE INDEX idx_departments_code ON departments(code);
CREATE INDEX idx_departments_is_active ON departments(isActive);

-- Lecturer
CREATE INDEX idx_lecturers_department_id ON lecturers(departmentId);
CREATE INDEX idx_lecturers_nidn ON lecturers(nidn);
CREATE INDEX idx_lecturers_email ON lecturers(email);
CREATE INDEX idx_lecturers_is_active ON lecturers(isActive);

-- User
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(isActive);

-- Thesis
CREATE INDEX idx_theses_department_id ON theses(departmentId);
CREATE INDEX idx_theses_submitter_id ON theses(submitterId);
CREATE INDEX idx_theses_reviewed_by ON theses(reviewedBy);
CREATE INDEX idx_theses_status ON theses(status);
CREATE INDEX idx_theses_graduation_year ON theses(graduationYear);
CREATE INDEX idx_theses_published_at ON theses(publishedAt);
CREATE INDEX idx_theses_advisor1_id ON theses(advisor1Id);
CREATE INDEX idx_theses_examiner1_id ON theses(examiner1Id);

-- ThesisFile
CREATE INDEX idx_thesis_files_thesis_id ON thesis_files(thesisId);
CREATE INDEX idx_thesis_files_file_type ON thesis_files(fileType);
CREATE INDEX idx_thesis_files_access_level ON thesis_files(accessLevel);
CREATE INDEX idx_thesis_files_embargo_until ON thesis_files(embargoUntil);

-- StatisticsLog
CREATE INDEX idx_statistics_logs_thesis_id ON statistics_logs(thesisId);
CREATE INDEX idx_statistics_logs_file_id ON statistics_logs(fileId);
CREATE INDEX idx_statistics_logs_event_type ON statistics_logs(eventType);
CREATE INDEX idx_statistics_logs_created_at ON statistics_logs(createdAt);

-- SystemSetting
CREATE INDEX idx_system_settings_setting_key ON system_settings(settingKey);

-- Session
CREATE INDEX idx_session_expires_at ON session(expiresAt);
```

---

## Data Integrity Rules

### Cascade Deletes
- Thesis → ThesisFile (CASCADE)
- Thesis → StatisticsLog (CASCADE)
- ThesisFile → StatisticsLog (CASCADE)
- Faculty → Department (RESTRICT - protected)

### Restricted Deletes
- Faculty with Departments (RESTRICT)
- Department with Lecturers or Theses (RESTRICT)
- Lecturer assigned to Theses (RESTRICT)
- User (Submitter) with Theses (RESTRICT)

### Set Null on Delete
- User (Reviewer) → Thesis.reviewedBy (SET NULL)

---

## Migration Strategy

### Initial Setup
```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

### Schema Changes
```bash
# After modifying schema.prisma
npx prisma migrate dev --name descriptive_migration_name

# Regenerate client
npm run prisma:generate
```

---

## Best Practices

### 1. Lecturer Names (RIS Format)
Always store lecturer names in "Last, First" format:
```javascript
// Correct
name: "Susanto, Budi"

// Wrong
name: "Budi Susanto"
```

### 2. Keywords
Store keywords as comma-separated strings:
```javascript
keywords: "machine learning, neural networks, deep learning"
```

### 3. File Checksums
Calculate SHA-256 checksums for uploaded files:
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256');
hash.update(fileBuffer);
const checksum = hash.digest('hex');
```

### 4. IP Hashing
Hash IP addresses before storing in statistics:
```javascript
const crypto = require('crypto');
const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');
```

### 5. Thesis Status Transitions
Enforce valid status transitions in application logic:
```
DRAFT → PENDING only
PENDING → APPROVED or REJECTED only
APPROVED/REJECTED → (no changes allowed)
```

---

## Performance Considerations

1. **Use Pagination** - Always paginate thesis listings
2. **Selective Includes** - Only include related data when needed
3. **Index Usage** - Ensure queries use appropriate indexes
4. **Statistics Archival** - Consider archiving old statistics logs
5. **File Storage** - Store files on filesystem, not in database

---

## Security Considerations

1. **Password Hashing** - Use bcrypt with appropriate rounds
2. **IP Privacy** - Hash IP addresses in logs
3. **Access Control** - Check `accessLevel` and `embargoUntil` before serving files
4. **SQL Injection** - Prisma prevents this automatically
5. **Input Validation** - Validate all inputs before database operations

---

## Future Enhancements

Potential schema extensions:

1. **Tags System** - Add Tag model for better categorization
2. **Comments/Reviews** - Add Comment model for peer reviews
3. **Version History** - Add ThesisVersion for tracking changes
4. **DOI Integration** - Add DOI field to Thesis model
5. **Citation Tracking** - Add Citation model for academic impact
6. **Full-text Search** - Integrate PostgreSQL full-text search

---

## Support

For questions or issues with the database schema:
- Check Prisma documentation: https://www.prisma.io/docs
- Review migration files in `prisma/migrations/`
- Use Prisma Studio for visual inspection: `npm run prisma:studio`
