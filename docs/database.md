# Database Schema Documentation

Complete database schema documentation for the Thesis Repository System.

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Database Models](#database-models)
4. [Relationships](#relationships)
5. [Indexes](#indexes)
6. [Enumerations](#enumerations)
7. [Sample Queries](#sample-queries)
8. [Migration Guide](#migration-guide)
9. [Backup and Restore](#backup-and-restore)

---

## Overview

### Database Information

- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Schema Name**: public (default)
- **Character Set**: UTF-8
- **Collation**: en_US.UTF-8

### Tables Summary

| Table | Records (Est.) | Purpose |
|-------|----------------|---------|
| faculties | 5-20 | University faculties |
| departments | 20-100 | Academic departments |
| lecturers | 100-1000 | Faculty members (advisors/examiners) |
| users | 1000-50000 | System users (students and admins) |
| theses | 5000-100000 | Thesis submissions |
| thesis_files | 10000-500000 | PDF files for theses |
| statistics_logs | 100000-1000000+ | Usage analytics |
| system_settings | 10-50 | System configuration |
| session | 100-1000 | Active user sessions |

### Database Size Estimates

**Small University** (1000 students, 5 years):
- Database: ~5 GB
- Files: ~50 GB
- Total: ~55 GB

**Medium University** (10000 students, 10 years):
- Database: ~20 GB
- Files: ~500 GB
- Total: ~520 GB

**Large University** (50000 students, 20 years):
- Database: ~100 GB
- Files: ~5 TB
- Total: ~5.1 TB

---

## Entity Relationship Diagram

### Text-Based ERD

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Faculty    │──────<│  Department  │──────<│  Lecturer   │
│             │1     *│              │1     *│             │
│ id (PK)     │       │ id (PK)      │       │ id (PK)     │
│ name        │       │ facultyId(FK)│       │ nidn (UK)   │
│ code (UK)   │       │ name         │       │ name        │
└─────────────┘       │ code (UK)    │       │ email (UK)  │
                      └──────────────┘       │ departmentId│
                             │               └─────────────┘
                             │                    │ │ │ │ │
                            1│                    │ │ │ │ │
                             │                   *│ │ │ │ │
                             ▼                    │ │ │ │ │
┌─────────────┐       ┌──────────────┐           │ │ │ │ │
│    User     │───────│    Thesis    │◄──────────┘ │ │ │ │
│             │1     *│              │   advisor1   │ │ │ │
│ id (PK)     │       │ id (PK)      │◄─────────────┘ │ │ │
│ username(UK)│       │ departmentId │   advisor2     │ │ │
│ password    │       │ submitterId  │◄───────────────┘ │ │
│ role (ENUM) │       │ reviewedBy   │   examiner1      │ │
└─────────────┘       │ status (ENUM)│◄─────────────────┘ │
   │      ▲           │ title        │   examiner2        │
   │      │           │ abstract     │◄───────────────────┘
  1│      │1          │ graduationYr │   examiner3
submitter │reviewer   └──────────────┘
   │      │                  │1
   ▼      │                  │
┌──────────┴───┐            *│
│ submittedBy  │             ▼
│ reviewedBy   │       ┌──────────────┐
└──────────────┘       │ ThesisFile   │
                       │              │
                       │ id (PK)      │
                       │ thesisId(FK) │
                       │ fileType     │
                       │ filePath     │
                       │ accessLevel  │
                       └──────────────┘
                              │1
                              │
                             *│
                              ▼
                       ┌──────────────┐
                       │StatisticsLog │
                       │              │
                       │ id (PK)      │
                       │ thesisId(FK) │
                       │ fileId (FK)  │
                       │ eventType    │
                       └──────────────┘
```

### Relationship Summary

- Faculty (1) ─< (N) Department
- Department (1) ─< (N) Lecturer
- Department (1) ─< (N) Thesis
- Lecturer (1) ─< (N) Thesis (as advisor1, advisor2, examiner1/2/3)
- User (1) ─< (N) Thesis (as submitter)
- User (1) ─< (N) Thesis (as reviewer)
- Thesis (1) ─< (N) ThesisFile
- Thesis (1) ─< (N) StatisticsLog
- ThesisFile (1) ─< (N) StatisticsLog

---

## Database Models

### 1. Faculty

Academic faculty (top-level organizational unit).

**Table**: `faculties`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| name | VARCHAR(255) | No | - | Indonesian name |
| nameEn | VARCHAR(255) | Yes | NULL | English name |
| code | VARCHAR(10) | No | - | Short code (e.g., "FT") |
| description | TEXT | Yes | NULL | Description |
| isActive | BOOLEAN | No | true | Active status |
| createdAt | TIMESTAMP | No | now() | Creation timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `code`
- INDEX: `code`, `isActive`

**Sample Data**:
```sql
INSERT INTO faculties (name, nameEn, code, description) VALUES
('Fakultas Teknik', 'Faculty of Engineering', 'FT', 'Engineering programs'),
('Fakultas Ilmu Komputer', 'Faculty of Computer Science', 'FIKOM', 'CS programs'),
('Fakultas Ekonomi', 'Faculty of Economics', 'FE', 'Economics programs');
```

---

### 2. Department

Academic department within a faculty.

**Table**: `departments`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| facultyId | INT | No | - | Foreign key to faculties |
| name | VARCHAR(255) | No | - | Indonesian name |
| nameEn | VARCHAR(255) | Yes | NULL | English name |
| code | VARCHAR(10) | No | - | Short code (e.g., "TI") |
| isActive | BOOLEAN | No | true | Active status |
| createdAt | TIMESTAMP | No | now() | Creation timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `facultyId` REFERENCES `faculties(id)` ON DELETE RESTRICT
- UNIQUE: `code`
- INDEX: `facultyId`, `code`, `isActive`

**Sample Data**:
```sql
INSERT INTO departments (facultyId, name, nameEn, code) VALUES
(1, 'Teknik Informatika', 'Informatics Engineering', 'TI'),
(1, 'Teknik Elektro', 'Electrical Engineering', 'TE'),
(2, 'Sistem Informasi', 'Information Systems', 'SI');
```

---

### 3. Lecturer

Faculty members (advisors and examiners).

**Table**: `lecturers`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| nidn | VARCHAR(20) | No | - | National Lecturer ID Number |
| name | VARCHAR(255) | No | - | Lecturer name (format: "Last, First") |
| email | VARCHAR(255) | Yes | NULL | Email address |
| departmentId | INT | No | - | Foreign key to departments |
| isActive | BOOLEAN | No | true | Active status |
| createdAt | TIMESTAMP | No | now() | Creation timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `departmentId` REFERENCES `departments(id)` ON DELETE RESTRICT
- UNIQUE: `nidn`, `email`
- INDEX: `departmentId`, `nidn`, `email`, `isActive`

**Important**: Name format must be "Last, First" for proper RIS citation export.

**Sample Data**:
```sql
INSERT INTO lecturers (nidn, name, email, departmentId) VALUES
('1234567890', 'Smith, John', 'john.smith@university.edu', 1),
('0987654321', 'Doe, Jane', 'jane.doe@university.edu', 1);
```

---

### 4. User

System users (students and administrators).

**Table**: `users`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| username | VARCHAR(50) | No | - | Unique username |
| password | VARCHAR(255) | No | - | Hashed password (bcrypt) |
| role | ENUM | No | STUDENT | User role |
| name | VARCHAR(255) | No | - | Full name |
| email | VARCHAR(255) | Yes | NULL | Email address |
| isActive | BOOLEAN | No | true | Active status |
| lastLogin | TIMESTAMP | Yes | NULL | Last login timestamp |
| createdAt | TIMESTAMP | No | now() | Creation timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `username`, `email`
- INDEX: `username`, `email`, `role`, `isActive`

**Role Values**: `ADMIN`, `STUDENT`

**Password**: Hashed with bcrypt (salt rounds >= 10)

**Sample Data**:
```sql
-- Note: Password should be hashed with bcrypt
INSERT INTO users (username, password, role, name, email) VALUES
('admin', '$2b$10$...', 'ADMIN', 'System Administrator', 'admin@university.edu'),
('john.doe', '$2b$10$...', 'STUDENT', 'John Doe', 'john.doe@student.university.edu');
```

---

### 5. Thesis

Main thesis documents with metadata.

**Table**: `theses`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| departmentId | INT | No | - | Foreign key to departments |
| submitterId | INT | No | - | Foreign key to users (student) |
| status | ENUM | No | DRAFT | Thesis status |
| submittedAt | TIMESTAMP | Yes | NULL | Submission timestamp |
| reviewedAt | TIMESTAMP | Yes | NULL | Review completion timestamp |
| reviewedBy | INT | Yes | NULL | Foreign key to users (admin) |
| reviewerNotes | TEXT | Yes | NULL | Reviewer's notes |
| title | VARCHAR(500) | No | - | Indonesian title |
| titleEn | VARCHAR(500) | Yes | NULL | English title |
| authorName | VARCHAR(255) | No | - | Student's full name |
| studentId | VARCHAR(50) | No | - | Student ID (NIM) |
| graduationYear | INT | No | - | Graduation year |
| defenseDate | DATE | Yes | NULL | Defense date |
| abstractId | TEXT | No | - | Indonesian abstract |
| abstractEn | TEXT | Yes | NULL | English abstract |
| keywords | VARCHAR(500) | No | - | Indonesian keywords (comma-separated) |
| keywordsEn | VARCHAR(500) | Yes | NULL | English keywords (comma-separated) |
| advisor1Id | INT | No | - | Foreign key to lecturers (primary advisor) |
| advisor2Id | INT | Yes | NULL | Foreign key to lecturers (co-advisor) |
| examiner1Id | INT | No | - | Foreign key to lecturers |
| examiner2Id | INT | Yes | NULL | Foreign key to lecturers |
| examiner3Id | INT | Yes | NULL | Foreign key to lecturers |
| viewCount | INT | No | 0 | Total views |
| downloadCount | INT | No | 0 | Total downloads |
| publishedAt | TIMESTAMP | Yes | NULL | Publication timestamp (when approved) |
| createdAt | TIMESTAMP | No | now() | Creation timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `departmentId` REFERENCES `departments(id)` ON DELETE RESTRICT
- FOREIGN KEY: `submitterId` REFERENCES `users(id)` ON DELETE RESTRICT
- FOREIGN KEY: `reviewedBy` REFERENCES `users(id)` ON DELETE SET NULL
- FOREIGN KEY: `advisor1Id` REFERENCES `lecturers(id)` ON DELETE RESTRICT
- FOREIGN KEY: `advisor2Id` REFERENCES `lecturers(id)` ON DELETE RESTRICT
- FOREIGN KEY: `examiner1Id` REFERENCES `lecturers(id)` ON DELETE RESTRICT
- FOREIGN KEY: `examiner2Id` REFERENCES `lecturers(id)` ON DELETE RESTRICT
- FOREIGN KEY: `examiner3Id` REFERENCES `lecturers(id)` ON DELETE RESTRICT
- INDEX: `departmentId`, `submitterId`, `reviewedBy`, `status`, `graduationYear`, `publishedAt`

**Status Values**: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`

---

### 6. ThesisFile

Individual PDF files for thesis chapters.

**Table**: `thesis_files`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| thesisId | INT | No | - | Foreign key to theses |
| fileType | ENUM | No | - | File type |
| filename | VARCHAR(255) | No | - | Stored filename (UUID) |
| originalFilename | VARCHAR(255) | No | - | Original upload filename |
| filePath | VARCHAR(500) | No | - | Relative path from upload root |
| fileSize | INT | No | - | File size in bytes |
| mimeType | VARCHAR(100) | No | - | MIME type (application/pdf) |
| checksum | VARCHAR(64) | Yes | NULL | SHA-256 hash for integrity |
| accessLevel | ENUM | No | PUBLIC | Access control level |
| embargoUntil | TIMESTAMP | Yes | NULL | Embargo expiration date |
| embargoReason | TEXT | Yes | NULL | Reason for embargo |
| downloadCount | INT | No | 0 | Individual file download count |
| sequenceOrder | INT | No | 0 | Display order |
| createdAt | TIMESTAMP | No | now() | Upload timestamp |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `thesisId` REFERENCES `theses(id)` ON DELETE CASCADE
- INDEX: `thesisId`, `fileType`, `accessLevel`, `embargoUntil`

**FileType Values**:
- `COVER`, `CHAPTER_1`, `CHAPTER_2`, `CHAPTER_3`, `CHAPTER_4`, `CHAPTER_5`
- `BIBLIOGRAPHY`, `APPENDIX`, `OTHER`

**AccessLevel Values**: `PUBLIC`, `EMBARGOED`, `RESTRICTED`

---

### 7. StatisticsLog

Usage analytics and tracking.

**Table**: `statistics_logs`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| thesisId | INT | No | - | Foreign key to theses |
| fileId | INT | Yes | NULL | Foreign key to thesis_files (NULL for views) |
| eventType | ENUM | No | - | Event type |
| ipHash | VARCHAR(64) | Yes | NULL | SHA-256 hash of IP (for privacy) |
| userAgent | TEXT | Yes | NULL | Browser user agent |
| referer | TEXT | Yes | NULL | HTTP referer |
| createdAt | TIMESTAMP | No | now() | Event timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `thesisId` REFERENCES `theses(id)` ON DELETE CASCADE
- FOREIGN KEY: `fileId` REFERENCES `thesis_files(id)` ON DELETE CASCADE
- INDEX: `thesisId`, `fileId`, `eventType`, `createdAt`

**EventType Values**: `VIEW`, `DOWNLOAD`, `METADATA_EXPORT`

**Privacy**: IP addresses are hashed with salt before storage. Raw IPs are never stored.

---

### 8. SystemSetting

System configuration key-value store.

**Table**: `system_settings`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT | No | AUTO_INCREMENT | Primary key |
| settingKey | VARCHAR(100) | No | - | Setting key |
| settingValue | TEXT | No | - | Setting value |
| settingType | ENUM | No | STRING | Value type |
| description | TEXT | Yes | NULL | Setting description |
| updatedAt | TIMESTAMP | No | now() | Last update timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `settingKey`
- INDEX: `settingKey`

**SettingType Values**: `STRING`, `INTEGER`, `BOOLEAN`, `JSON`

**Sample Data**:
```sql
INSERT INTO system_settings (settingKey, settingValue, settingType, description) VALUES
('site_name', 'University Thesis Repository', 'STRING', 'Site name'),
('max_file_size', '10485760', 'INTEGER', 'Max file size in bytes'),
('allow_registration', 'false', 'BOOLEAN', 'Allow student self-registration');
```

---

### 9. Session

User session storage for express-session.

**Table**: `session`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | VARCHAR(255) | No | - | Primary key |
| sid | VARCHAR(255) | No | - | Session ID |
| data | TEXT | No | - | Serialized session data |
| expiresAt | TIMESTAMP | No | - | Expiration timestamp |

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `sid`
- INDEX: `expiresAt`

**Note**: Managed automatically by connect-pg-simple. Do not modify manually.

---

## Enumerations

### Role

User roles in the system.

```sql
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT');
```

| Value | Description |
|-------|-------------|
| ADMIN | System administrator (full access) |
| STUDENT | Student user (can submit theses) |

### ThesisStatus

Workflow status of a thesis.

```sql
CREATE TYPE "ThesisStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
```

| Value | Description | Student Actions | Admin Actions |
|-------|-------------|-----------------|---------------|
| DRAFT | Not submitted | Edit, Submit, Delete | - |
| PENDING | Under review | View only | Approve, Reject |
| APPROVED | Published | View, Download | Modify access control |
| REJECTED | Needs revision | Edit, Resubmit | - |

### FileType

Type of thesis file/chapter.

```sql
CREATE TYPE "FileType" AS ENUM (
  'COVER', 'CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5',
  'BIBLIOGRAPHY', 'APPENDIX', 'OTHER'
);
```

### AccessLevel

File access control level.

```sql
CREATE TYPE "AccessLevel" AS ENUM ('PUBLIC', 'EMBARGOED', 'RESTRICTED');
```

| Value | Description | Public Access | Admin Access |
|-------|-------------|---------------|--------------|
| PUBLIC | Freely accessible | ✅ Yes | ✅ Yes |
| EMBARGOED | Restricted until date | ❌ No (until expiry) | ✅ Yes |
| RESTRICTED | Permanently restricted | ❌ No | ✅ Yes |

### EventType

Types of tracked events.

```sql
CREATE TYPE "EventType" AS ENUM ('VIEW', 'DOWNLOAD', 'METADATA_EXPORT');
```

| Value | Description | Logged Data |
|-------|-------------|-------------|
| VIEW | Thesis page view | thesisId, ipHash, userAgent, referer |
| DOWNLOAD | File download | thesisId, fileId, ipHash, userAgent |
| METADATA_EXPORT | Citation export | thesisId, ipHash, format (in referer) |

### SettingType

Data type of system settings.

```sql
CREATE TYPE "SettingType" AS ENUM ('STRING', 'INTEGER', 'BOOLEAN', 'JSON');
```

---

## Relationships

### Faculty → Department (One-to-Many)

```sql
-- One faculty has many departments
SELECT f.name as faculty, d.name as department
FROM faculties f
JOIN departments d ON d.facultyId = f.id
WHERE f.id = 1;
```

**Delete Behavior**: RESTRICT (cannot delete faculty with departments)

### Department → Lecturer (One-to-Many)

```sql
-- One department has many lecturers
SELECT d.name as department, l.name as lecturer
FROM departments d
JOIN lecturers l ON l.departmentId = d.id
WHERE d.id = 1;
```

**Delete Behavior**: RESTRICT (cannot delete department with lecturers)

### Department → Thesis (One-to-Many)

```sql
-- One department has many theses
SELECT d.name as department, COUNT(t.id) as thesis_count
FROM departments d
LEFT JOIN theses t ON t.departmentId = d.id
GROUP BY d.id, d.name;
```

**Delete Behavior**: RESTRICT (cannot delete department with theses)

### User → Thesis (One-to-Many as Submitter)

```sql
-- One student can submit many theses
SELECT u.name as student, COUNT(t.id) as submissions
FROM users u
LEFT JOIN theses t ON t.submitterId = u.id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.name;
```

**Delete Behavior**: RESTRICT (cannot delete user who has submitted theses)

### User → Thesis (One-to-Many as Reviewer)

```sql
-- One admin can review many theses
SELECT u.name as reviewer, COUNT(t.id) as reviewed_count
FROM users u
LEFT JOIN theses t ON t.reviewedBy = u.id
WHERE u.role = 'ADMIN'
GROUP BY u.id, u.name;
```

**Delete Behavior**: SET NULL (if admin deleted, reviewedBy becomes NULL)

### Lecturer → Thesis (Multiple One-to-Many)

A single lecturer can be related to a thesis as:
- Primary Advisor (advisor1)
- Co-Advisor (advisor2)
- Primary Examiner (examiner1)
- Second Examiner (examiner2)
- Third Examiner (examiner3)

```sql
-- Count theses where lecturer is primary advisor
SELECT l.name, COUNT(t.id) as advised_count
FROM lecturers l
LEFT JOIN theses t ON t.advisor1Id = l.id
GROUP BY l.id, l.name;

-- All roles for a lecturer
SELECT
  l.name,
  COUNT(DISTINCT t1.id) as as_advisor1,
  COUNT(DISTINCT t2.id) as as_advisor2,
  COUNT(DISTINCT t3.id) as as_examiner1
FROM lecturers l
LEFT JOIN theses t1 ON t1.advisor1Id = l.id
LEFT JOIN theses t2 ON t2.advisor2Id = l.id
LEFT JOIN theses t3 ON t3.examiner1Id = l.id
WHERE l.id = 1
GROUP BY l.id, l.name;
```

**Delete Behavior**: RESTRICT (cannot delete lecturer referenced in any thesis)

### Thesis → ThesisFile (One-to-Many)

```sql
-- One thesis has many files
SELECT t.title, tf.fileType, tf.fileSize
FROM theses t
JOIN thesis_files tf ON tf.thesisId = t.id
WHERE t.id = 1
ORDER BY tf.sequenceOrder;
```

**Delete Behavior**: CASCADE (deleting thesis deletes all its files)

### Thesis → StatisticsLog (One-to-Many)

```sql
-- One thesis has many statistics entries
SELECT t.title, sl.eventType, COUNT(*) as event_count
FROM theses t
JOIN statistics_logs sl ON sl.thesisId = t.id
WHERE t.id = 1
GROUP BY t.title, sl.eventType;
```

**Delete Behavior**: CASCADE (deleting thesis deletes its statistics)

### ThesisFile → StatisticsLog (One-to-Many)

```sql
-- One file has many download logs
SELECT tf.originalFilename, COUNT(sl.id) as downloads
FROM thesis_files tf
LEFT JOIN statistics_logs sl ON sl.fileId = tf.id AND sl.eventType = 'DOWNLOAD'
WHERE tf.id = 1
GROUP BY tf.id, tf.originalFilename;
```

**Delete Behavior**: CASCADE (deleting file deletes its download logs)

---

## Indexes

### Primary Keys

All tables have auto-increment integer primary keys:
```sql
CREATE INDEX IF NOT EXISTS idx_table_id ON table(id);
```

### Unique Indexes

```sql
-- Faculties
CREATE UNIQUE INDEX faculties_code_key ON faculties(code);

-- Departments
CREATE UNIQUE INDEX departments_code_key ON departments(code);

-- Lecturers
CREATE UNIQUE INDEX lecturers_nidn_key ON lecturers(nidn);
CREATE UNIQUE INDEX lecturers_email_key ON lecturers(email);

-- Users
CREATE UNIQUE INDEX users_username_key ON users(username);
CREATE UNIQUE INDEX users_email_key ON users(email);

-- SystemSettings
CREATE UNIQUE INDEX system_settings_settingKey_key ON system_settings(settingKey);

-- Session
CREATE UNIQUE INDEX session_sid_key ON session(sid);
```

### Foreign Key Indexes

```sql
-- Departments
CREATE INDEX idx_departments_facultyId ON departments(facultyId);

-- Lecturers
CREATE INDEX idx_lecturers_departmentId ON lecturers(departmentId);

-- Theses
CREATE INDEX idx_theses_departmentId ON theses(departmentId);
CREATE INDEX idx_theses_submitterId ON theses(submitterId);
CREATE INDEX idx_theses_reviewedBy ON theses(reviewedBy);
CREATE INDEX idx_theses_advisor1Id ON theses(advisor1Id);
CREATE INDEX idx_theses_examiner1Id ON theses(examiner1Id);

-- ThesisFiles
CREATE INDEX idx_thesis_files_thesisId ON thesis_files(thesisId);

-- StatisticsLogs
CREATE INDEX idx_statistics_logs_thesisId ON statistics_logs(thesisId);
CREATE INDEX idx_statistics_logs_fileId ON statistics_logs(fileId);
```

### Query Optimization Indexes

```sql
-- Faculties
CREATE INDEX idx_faculties_isActive ON faculties(isActive);

-- Departments
CREATE INDEX idx_departments_isActive ON departments(isActive);

-- Lecturers
CREATE INDEX idx_lecturers_isActive ON lecturers(isActive);

-- Users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_isActive ON users(isActive);

-- Theses (important for search and browse)
CREATE INDEX idx_theses_status ON theses(status);
CREATE INDEX idx_theses_graduationYear ON theses(graduationYear);
CREATE INDEX idx_theses_publishedAt ON theses(publishedAt);

-- ThesisFiles
CREATE INDEX idx_thesis_files_fileType ON thesis_files(fileType);
CREATE INDEX idx_thesis_files_accessLevel ON thesis_files(accessLevel);
CREATE INDEX idx_thesis_files_embargoUntil ON thesis_files(embargoUntil);

-- StatisticsLogs
CREATE INDEX idx_statistics_logs_eventType ON statistics_logs(eventType);
CREATE INDEX idx_statistics_logs_createdAt ON statistics_logs(createdAt);

-- Session
CREATE INDEX idx_session_expiresAt ON session(expiresAt);
```

### Composite Indexes (Future Optimization)

For high-traffic deployments, consider:

```sql
-- Theses: Status + Published Date (for homepage)
CREATE INDEX idx_theses_status_published ON theses(status, publishedAt DESC);

-- Theses: Department + Year (for browse)
CREATE INDEX idx_theses_dept_year ON theses(departmentId, graduationYear DESC);

-- Statistics: Thesis + Event Type (for analytics)
CREATE INDEX idx_stats_thesis_event ON statistics_logs(thesisId, eventType, createdAt DESC);
```

---

## Sample Queries

### Common Queries

#### 1. Get All Published Theses

```sql
SELECT
  t.id,
  t.title,
  t.authorName,
  t.studentId,
  t.graduationYear,
  t.publishedAt,
  d.name as department,
  f.name as faculty
FROM theses t
JOIN departments d ON d.id = t.departmentId
JOIN faculties f ON f.id = d.facultyId
WHERE t.status = 'APPROVED'
ORDER BY t.publishedAt DESC
LIMIT 10;
```

#### 2. Search Theses by Keyword

```sql
SELECT
  t.id,
  t.title,
  t.authorName,
  t.graduationYear,
  ts_rank(
    to_tsvector('indonesian', t.title || ' ' || t.abstractId),
    to_tsquery('indonesian', 'machine & learning')
  ) as rank
FROM theses t
WHERE t.status = 'APPROVED'
  AND (
    to_tsvector('indonesian', t.title || ' ' || t.abstractId) @@
    to_tsquery('indonesian', 'machine & learning')
  )
ORDER BY rank DESC
LIMIT 20;
```

#### 3. Get Thesis with All Related Data

```sql
SELECT
  t.*,
  d.name as department_name,
  f.name as faculty_name,
  u.name as submitter_name,
  a1.name as advisor1_name,
  a2.name as advisor2_name,
  e1.name as examiner1_name,
  e2.name as examiner2_name,
  e3.name as examiner3_name,
  json_agg(json_build_object(
    'id', tf.id,
    'fileType', tf.fileType,
    'filename', tf.originalFilename,
    'size', tf.fileSize,
    'accessLevel', tf.accessLevel
  )) as files
FROM theses t
JOIN departments d ON d.id = t.departmentId
JOIN faculties f ON f.id = d.facultyId
JOIN users u ON u.id = t.submitterId
JOIN lecturers a1 ON a1.id = t.advisor1Id
LEFT JOIN lecturers a2 ON a2.id = t.advisor2Id
JOIN lecturers e1 ON e1.id = t.examiner1Id
LEFT JOIN lecturers e2 ON e2.id = t.examiner2Id
LEFT JOIN lecturers e3 ON e3.id = t.examiner3Id
LEFT JOIN thesis_files tf ON tf.thesisId = t.id
WHERE t.id = 123
GROUP BY t.id, d.name, f.name, u.name, a1.name, a2.name, e1.name, e2.name, e3.name;
```

#### 4. Get Pending Reviews

```sql
SELECT
  t.id,
  t.title,
  t.authorName,
  t.submittedAt,
  EXTRACT(DAY FROM (NOW() - t.submittedAt)) as days_waiting,
  u.name as student_name,
  d.name as department
FROM theses t
JOIN users u ON u.id = t.submitterId
JOIN departments d ON d.id = t.departmentId
WHERE t.status = 'PENDING'
ORDER BY t.submittedAt ASC;
```

#### 5. Get Most Viewed Theses

```sql
SELECT
  t.id,
  t.title,
  t.authorName,
  t.graduationYear,
  t.viewCount,
  COUNT(sl.id) as actual_views
FROM theses t
LEFT JOIN statistics_logs sl ON sl.thesisId = t.id AND sl.eventType = 'VIEW'
WHERE t.status = 'APPROVED'
GROUP BY t.id
ORDER BY t.viewCount DESC
LIMIT 10;
```

#### 6. Get Download Statistics by Month

```sql
SELECT
  DATE_TRUNC('month', sl.createdAt) as month,
  COUNT(*) as downloads,
  COUNT(DISTINCT sl.thesisId) as unique_theses,
  COUNT(DISTINCT sl.ipHash) as unique_users
FROM statistics_logs sl
WHERE sl.eventType = 'DOWNLOAD'
  AND sl.createdAt >= NOW() - INTERVAL '1 year'
GROUP BY month
ORDER BY month DESC;
```

#### 7. Get Embargoed Files Expiring Soon

```sql
SELECT
  t.id as thesis_id,
  t.title,
  tf.id as file_id,
  tf.originalFilename,
  tf.embargoUntil,
  EXTRACT(DAY FROM (tf.embargoUntil - NOW())) as days_until_expiry
FROM thesis_files tf
JOIN theses t ON t.id = tf.thesisId
WHERE tf.accessLevel = 'EMBARGOED'
  AND tf.embargoUntil IS NOT NULL
  AND tf.embargoUntil > NOW()
  AND tf.embargoUntil < NOW() + INTERVAL '30 days'
ORDER BY tf.embargoUntil ASC;
```

#### 8. Get Thesis Count by Faculty and Year

```sql
SELECT
  f.name as faculty,
  t.graduationYear,
  COUNT(t.id) as thesis_count
FROM faculties f
JOIN departments d ON d.facultyId = f.id
LEFT JOIN theses t ON t.departmentId = d.id AND t.status = 'APPROVED'
WHERE t.graduationYear >= 2020
GROUP BY f.id, f.name, t.graduationYear
ORDER BY f.name, t.graduationYear DESC;
```

---

## Migration Guide

### Creating Migrations

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name descriptive_migration_name
```

Example:
```bash
npx prisma migrate dev --name add_embargo_fields
```

### Applying Migrations

Development:
```bash
npm run prisma:migrate
```

Production:
```bash
npx prisma migrate deploy
```

### Resetting Database

⚠️ **Warning**: Deletes all data!

```bash
npx prisma migrate reset
```

### Rolling Back Migrations

Prisma doesn't support automatic rollback. Manual steps:

1. Identify migration to rollback
2. Manually write down SQL to revert changes
3. Execute revert SQL
4. Update `_prisma_migrations` table

Better approach: Create a new migration that reverts changes.

---

## Backup and Restore

### Backup Database

Full backup:
```bash
pg_dump -U postgres -d thesis_repo_db -F c -f backup_$(date +%Y%m%d).dump
```

Schema only:
```bash
pg_dump -U postgres -d thesis_repo_db -s -F p -f schema_$(date +%Y%m%d).sql
```

Data only:
```bash
pg_dump -U postgres -d thesis_repo_db -a -F p -f data_$(date +%Y%m%d).sql
```

Specific table:
```bash
pg_dump -U postgres -d thesis_repo_db -t theses -F c -f theses_$(date +%Y%m%d).dump
```

### Restore Database

Full restore:
```bash
pg_restore -U postgres -d thesis_repo_db -c backup_20251102.dump
```

Schema only:
```bash
psql -U postgres -d thesis_repo_db -f schema_20251102.sql
```

### Automated Backups

Create cron job:
```bash
0 2 * * * /usr/bin/pg_dump -U postgres thesis_repo_db -F c -f /backups/db_$(date +\%Y\%m\%d).dump
```

See [maintenance.md](maintenance.md) for detailed backup strategies.

---

## Performance Optimization

### Query Optimization

1. **Use EXPLAIN ANALYZE**:
```sql
EXPLAIN ANALYZE
SELECT * FROM theses WHERE status = 'APPROVED';
```

2. **Add missing indexes** based on slow queries

3. **Use appropriate JOIN types**

4. **Limit result sets** with LIMIT and OFFSET

### Connection Pooling

Configure Prisma connection pool:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=20&pool_timeout=20"
```

### Maintenance

Regular maintenance tasks:

```sql
-- Analyze tables (update statistics)
ANALYZE theses;
ANALYZE thesis_files;
ANALYZE statistics_logs;

-- Vacuum (reclaim storage)
VACUUM theses;

-- Vacuum with analyze
VACUUM ANALYZE;

-- Reindex
REINDEX TABLE theses;
```

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Database Version**: PostgreSQL 15+
**ORM Version**: Prisma 5.x
