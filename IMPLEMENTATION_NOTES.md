# Implementation Notes - Admin Upload Feature

## Overview

Implemented feature untuk memungkinkan admin upload skripsi dengan workflow berbeda dari student:

- **Student Upload**: Status PENDING → butuh approval admin → isPublished false → publish manual
- **Admin Upload**: Status APPROVED → isPublished false → publish manual

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

Added new fields to `Thesis` model:
```prisma
isPublished    Boolean       @default(false) // Published flag (approved but not yet public)
uploadedBy     Int?          // Who uploaded (admin or student who created)
```

Added relation:
```prisma
uploader       User?         @relation("ThesisUploader", fields: [uploadedBy], references: [id], onDelete: SetNull)
```

Added indexes:
```prisma
@@index([uploadedBy])
@@index([isPublished])
```

Updated `User` model:
```prisma
uploadedTheses  Thesis[] @relation("ThesisUploader")
```

### 2. Migration File

Created: `prisma/migrations/20251102230612_add_published_flag_and_uploader/migration.sql`

**⚠️ IMPORTANT**: Migration belum di-run. Jalankan manual:
```bash
psql -U postgres -d thesis_repo_db -f prisma/migrations/20251102230612_add_published_flag_and_uploader/migration.sql
```

Atau jika Prisma network sudah OK:
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Controller Updates (`src/controllers/studentController.js`)

Updated functions:
- ✅ `submitForm`: Handle admin dan student, skip existing thesis check untuk admin
- ✅ `submitThesis`:
  - Admin upload → status APPROVED, isPublished false, auto-set reviewedAt/reviewedBy
  - Student upload → status PENDING, isPublished false
  - Set uploadedBy field untuk tracking
- ✅ `saveDraft`: Set uploadedBy dan isPublished false

### 4. Routes Updates

**Upload Routes** (`src/routes/upload.js`):
- ✅ Removed `requireStudent` middleware
- ✅ Changed to `requireAuth` only (allow ADMIN and STUDENT)
- ✅ Updated all route comments

**Admin Routes** (`src/routes/admin.js`):
- ✅ Added `/admin/submit` routes:
  ```javascript
  router.get('/submit', requireAdmin, studentController.submitForm);
  router.post('/submit', requireAdmin, studentController.submitThesis);
  router.post('/submit/draft', requireAdmin, studentController.saveDraft);
  ```

## Remaining Implementation Tasks

### 1. Add Publish/Unpublish Actions

Create new controller function `src/controllers/adminController.js`:

```javascript
/**
 * Publish thesis - make it publicly visible
 */
const publishThesis = async (req, res) => {
  try {
    const thesisId = parseInt(req.params.id);

    await prisma.thesis.update({
      where: { id: thesisId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    req.flash('success', 'Thesis published successfully!');
    res.redirect('/admin/review');
  } catch (error) {
    console.error('Error publishing thesis:', error);
    req.flash('error', 'Failed to publish thesis');
    res.redirect('/admin/review');
  }
};

/**
 * Unpublish thesis - hide from public
 */
const unpublishThesis = async (req, res) => {
  try {
    const thesisId = parseInt(req.params.id);

    await prisma.thesis.update({
      where: { id: thesisId },
      data: {
        isPublished: false,
      },
    });

    req.flash('success', 'Thesis unpublished successfully');
    res.redirect('/admin/review');
  } catch (error) {
    console.error('Error unpublishing thesis:', error);
    req.flash('error', 'Failed to unpublish thesis');
    res.redirect('/admin/review');
  }
};

module.exports = {
  // ... existing exports
  publishThesis,
  unpublishThesis,
};
```

Add routes in `src/routes/admin.js`:

```javascript
// Publish thesis
router.post('/thesis/:id/publish', requireAdmin, adminController.publishThesis);

// Unpublish thesis
router.post('/thesis/:id/unpublish', requireAdmin, adminController.unpublishThesis);
```

### 2. Update Public Queries

All public-facing queries need to check `isPublished` flag. Update these files:

**`src/controllers/publicController.js`**:
```javascript
// Change from:
where: { status: 'APPROVED' }

// To:
where: {
  status: 'APPROVED',
  isPublished: true
}
```

**`src/controllers/browseController.js`**:
```javascript
// All thesis queries add:
where: {
  status: 'APPROVED',
  isPublished: true
}
```

**`src/controllers/searchController.js`**:
```javascript
// Search query add:
where: {
  status: 'APPROVED',
  isPublished: true,
  // ... other conditions
}
```

**`src/controllers/thesisController.js`** (for public views):
```javascript
// In show() function:
const thesis = await prisma.thesis.findFirst({
  where: {
    id: thesisId,
    status: 'APPROVED',
    isPublished: true  // ADD THIS
  },
  // ... includes
});
```

### 3. Update Review Workflow

**`src/controllers/reviewController.js`**:

When approving thesis dari student, set `isPublished: false`:

```javascript
// In approve function:
await prisma.thesis.update({
  where: { id: thesisId },
  data: {
    status: 'APPROVED',
    isPublished: false,  // ADD THIS - admin harus manual publish
    reviewedAt: new Date(),
    reviewedBy: req.user.id,
    // ... other fields
  },
});
```

### 4. Update Admin Review Page

**View**: `views/admin/review.ejs` or wherever thesis list is shown

Add publish button for APPROVED thesis:

```html
<% if (thesis.status === 'APPROVED') { %>
  <% if (thesis.isPublished) { %>
    <!-- Unpublish button -->
    <form method="POST" action="/admin/thesis/<%= thesis.id %>/unpublish" class="inline">
      <button type="submit" class="btn btn-warning">
        <i class="fas fa-eye-slash"></i> Unpublish
      </button>
    </form>
    <span class="badge badge-success">Published</span>
  <% } else { %>
    <!-- Publish button -->
    <form method="POST" action="/admin/thesis/<%= thesis.id %>/publish" class="inline">
      <button type="submit" class="btn btn-success">
        <i class="fas fa-eye"></i> Publish
      </button>
    </form>
    <span class="badge badge-warning">Approved (Not Published)</span>
  <% } %>
<% } %>
```

### 5. Update Admin Dashboard

Add "Upload Thesis" button prominently in admin dashboard:

```html
<!-- In views/admin/dashboard.ejs -->
<div class="quick-actions">
  <a href="/admin/submit" class="btn btn-primary btn-lg">
    <i class="fas fa-upload"></i> Upload Thesis
  </a>
  <a href="/admin/review" class="btn btn-secondary btn-lg">
    <i class="fas fa-check-circle"></i> Review Submissions
  </a>
  <!-- ... other buttons -->
</div>
```

### 6. Update Statistics Queries

**`src/controllers/adminController.js`** - statistics function:

Update counts to show:
- Total approved theses
- Total published theses
- Total unpublished (approved but not published)

```javascript
const statistics = await Promise.all([
  prisma.thesis.count({ where: { status: 'APPROVED' } }),
  prisma.thesis.count({ where: { status: 'APPROVED', isPublished: true } }),
  prisma.thesis.count({ where: { status: 'APPROVED', isPublished: false } }),
]);

const [approvedCount, publishedCount, unpublishedCount] = statistics;
```

## Testing Checklist

### As Student:
- [ ] Login as student
- [ ] Submit thesis → status PENDING, isPublished false
- [ ] Cannot see own thesis in public repository

### As Admin:
- [ ] Login as admin
- [ ] Access `/admin/submit`
- [ ] Upload thesis → status APPROVED, isPublished false
- [ ] Thesis appears in review queue with "Publish" button
- [ ] Cannot see thesis in public repository yet
- [ ] Click "Publish" → isPublished becomes true
- [ ] Thesis now appears in public repository
- [ ] Approve student thesis → status APPROVED, isPublished false
- [ ] Manual publish student thesis

### Public:
- [ ] Browse repository
- [ ] Only see theses with status APPROVED AND isPublished true
- [ ] Search only returns published theses

## Database Migration Steps

1. **Backup database first**:
   ```bash
   pg_dump -U postgres thesis_repo_db > backup_before_migration.sql
   ```

2. **Run migration**:
   ```bash
   psql -U postgres -d thesis_repo_db -f prisma/migrations/20251102230612_add_published_flag_and_uploader/migration.sql
   ```

3. **Verify**:
   ```sql
   \d theses  -- Check if new columns exist
   SELECT id, title, status, "isPublished", "uploadedBy" FROM theses LIMIT 5;
   ```

4. **Set existing theses as published** (if they should be public):
   ```sql
   UPDATE theses SET "isPublished" = true WHERE status = 'APPROVED';
   ```

## Workflow Diagram

```
STUDENT WORKFLOW:
Submit → PENDING (isPublished: false)
    ↓
Admin Review
    ↓
Approve → APPROVED (isPublished: false)
    ↓
Admin Publish → APPROVED (isPublished: true) → PUBLIC

ADMIN WORKFLOW:
Upload → APPROVED (isPublished: false)
    ↓
Admin Publish → APPROVED (isPublished: true) → PUBLIC
```

## Files Modified

### ✅ Completed:
- `prisma/schema.prisma`
- `prisma/migrations/20251102230612_add_published_flag_and_uploader/migration.sql`
- `src/controllers/studentController.js`
- `src/routes/upload.js`
- `src/routes/admin.js`

### ⏳ Need Updates:
- `src/controllers/adminController.js` - add publish/unpublish functions
- `src/controllers/publicController.js` - update queries
- `src/controllers/browseController.js` - update queries
- `src/controllers/searchController.js` - update queries
- `src/controllers/thesisController.js` - update queries
- `src/controllers/reviewController.js` - set isPublished false on approve
- `views/admin/dashboard.ejs` - add upload button
- `views/admin/review.ejs` - add publish/unpublish buttons
- Any other views showing thesis lists

## Notes

- **Konsep**: Form upload sama untuk admin dan student (input metadata saja, tidak terikat akun mahasiswa)
- **uploadedBy**: Tracking siapa yang upload (bisa admin atau student)
- **submitterId**: Tetap required (untuk compatibility), isi dengan user ID yang upload
- **isPublished**: Flag untuk control visibility di public
- **publishedAt**: Timestamp saat di-publish (bukan saat approve)

## Next Steps

1. Run migration
2. Implement remaining tasks (publish/unpublish actions)
3. Update all public queries
4. Update review workflow
5. Update views
6. Test thoroughly
7. Commit changes

---

**Created**: 2025-11-02
**Status**: In Progress
**Remaining Work**: Approximately 2-3 hours
