# Database Migration & Seeding Guide

Complete guide for setting up, migrating, and seeding the Thesis Repository System database.

## Prerequisites

Before proceeding, ensure you have:

1. **PostgreSQL 15+** installed and running
2. **Node.js 18+** and npm installed
3. **Database created** (see setup instructions below)
4. **Environment variables** configured in `.env` file

---

## Quick Start

For those familiar with Prisma, here's the quick setup:

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Seed database
npm run seed
```

---

## Detailed Setup Instructions

### Step 1: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This will install:
- Prisma CLI and Client
- Database drivers
- Application dependencies (Express, bcrypt, etc.)

---

### Step 2: Set Up PostgreSQL Database

#### Create Database

Using PostgreSQL command line:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE thesis_repo_db;

# Verify database was created
\l

# Exit
\q
```

Or using a PostgreSQL GUI tool (pgAdmin, DBeaver, etc.):
1. Connect to PostgreSQL server
2. Create new database named `thesis_repo_db`
3. Set encoding to UTF-8

---

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the database connection string:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/thesis_repo_db?schema=public
```

**Replace:**
- `username` - Your PostgreSQL username (e.g., `postgres`)
- `password` - Your PostgreSQL password
- `localhost` - Database host (use `localhost` for local development)
- `5432` - PostgreSQL port (default is 5432)
- `thesis_repo_db` - Your database name

**Example:**
```env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/thesis_repo_db?schema=public
```

**Other important environment variables:**

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=Thesis Repository System

# Session
SESSION_SECRET=change-this-to-a-random-secret-key
SESSION_MAX_AGE=86400000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=public/uploads
```

---

### Step 4: Generate Prisma Client

Generate the Prisma Client based on your schema:

```bash
npm run prisma:generate
```

**What this does:**
- Reads `prisma/schema.prisma`
- Generates TypeScript/JavaScript client code
- Creates type-safe database access methods
- Installs the client in `node_modules/@prisma/client`

**You need to run this whenever:**
- Setting up the project for the first time
- After modifying `prisma/schema.prisma`
- After pulling schema changes from git

---

### Step 5: Run Database Migrations

Create and apply database migrations:

```bash
npm run prisma:migrate
```

**What this does:**
- Creates database tables based on Prisma schema
- Sets up relationships and constraints
- Creates indexes for performance
- Generates a migration file in `prisma/migrations/`

**During the migration, you'll be prompted to:**
1. Enter a migration name (e.g., "init", "initial_setup", "add_thesis_tables")
2. Confirm the migration

**Example output:**
```
✔ Enter a name for the new migration: … initial_setup
Applying migration `20241030120000_initial_setup`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20241030120000_initial_setup/
    └─ migration.sql

Your database is now in sync with your schema.
```

**Tables created:**
- `faculties` - Faculty/organizational units
- `departments` - Academic departments
- `lecturers` - Faculty members (advisors/examiners)
- `users` - System users (admins and students)
- `theses` - Thesis records with metadata
- `thesis_files` - Individual thesis files
- `statistics_logs` - Usage statistics
- `system_settings` - Configuration settings
- `session` - User sessions

---

### Step 6: Seed Database with Sample Data

Populate the database with initial data:

```bash
npm run seed
```

**Alternative commands:**
```bash
npm run prisma:seed  # Same as above
node prisma/seed.js  # Direct execution
```

**What gets seeded:**

| Data Type | Count | Details |
|-----------|-------|---------|
| **Faculties** | 3 | Teknik, Ekonomi & Bisnis, FISIP |
| **Departments** | 15 | 5 per faculty |
| **Lecturers** | 20 | With RIS format names ("Last, First") |
| **Users** | 6 | 1 admin + 5 students |
| **Sample Theses** | 3 | APPROVED status, various topics |
| **Thesis Files** | 21 | 7 files per thesis (COVER, CHAPTER_1-5, BIBLIOGRAPHY) |
| **System Settings** | 5 | Basic configuration |

**Sample output:**
```
🌱 Starting database seeding...

📚 Seeding Faculties...
✓ Faculty created: FT - Fakultas Teknik
✓ Faculty created: FEB - Fakultas Ekonomi dan Bisnis
✓ Faculty created: FISIP - Fakultas Ilmu Sosial dan Politik

🏢 Seeding Departments...
✓ Department created: TIF - Teknik Informatika
✓ Department created: TE - Teknik Elektro
...

👨‍🏫 Seeding Lecturers...
✓ Lecturer created: Susanto, Budi (0101088901)
✓ Lecturer created: Wijaya, Siti (0202089002)
...

👤 Seeding Users...
✓ Admin user created: admin (System Administrator)
✓ Student user created: student1 (Andi Saputra)
...

📄 Seeding Sample Theses...
✓ Thesis created: Implementasi Machine Learning untuk Prediksi Cuaca...
...

📁 Seeding Thesis Files...
  ✓ File created for Thesis #1: COVER
  ✓ File created for Thesis #1: CHAPTER_1
  ...

⚙️  Seeding System Settings...
✓ Setting created: site_name
...

═══════════════════════════════════════════════════════════════
✓ Database seeding completed successfully!
═══════════════════════════════════════════════════════════════

📊 Summary:
   Faculties: 3
   Departments: 15
   Lecturers: 20
   Users: 6 (1 admin + 5 students)
   Sample Theses: 3 (APPROVED)
   Thesis Files: 21 (7 files per thesis)
   System Settings: 5

🔐 Default Admin Credentials:
   Username: admin
   Password: admin123

🎓 Default Student Credentials:
   Username: student1, student2, student3, student4, student5
   Password: student123

⚠️  IMPORTANT: Change default passwords in production!
```

---

## Default Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** ADMIN
- **Permissions:** Full system access, can review and approve theses

### Student Accounts
- **Usernames:** `student1`, `student2`, `student3`, `student4`, `student5`
- **Password:** `student123` (same for all students)
- **Role:** STUDENT
- **Permissions:** Can submit theses, view approved theses

**⚠️ Security Warning:**
These are default credentials for development only. **ALWAYS change these passwords in production environments!**

---

## Verification

### Verify Database Tables

Using Prisma Studio (visual database browser):

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can:
- Browse all tables
- View seeded data
- Manually edit records
- Verify relationships

### Verify Using SQL

```bash
# Connect to database
psql -U postgres -d thesis_repo_db

# List all tables
\dt

# Check record counts
SELECT COUNT(*) FROM faculties;      -- Should be 3
SELECT COUNT(*) FROM departments;    -- Should be 15
SELECT COUNT(*) FROM lecturers;      -- Should be 20
SELECT COUNT(*) FROM users;          -- Should be 6
SELECT COUNT(*) FROM theses;         -- Should be 3
SELECT COUNT(*) FROM thesis_files;   -- Should be 21

# View sample data
SELECT id, username, role FROM users;
SELECT id, code, name FROM faculties;
SELECT id, title, status FROM theses;
```

---

## Common Migration Commands

### View Migration Status
```bash
npx prisma migrate status
```

### Create Migration Without Applying
```bash
npx prisma migrate dev --create-only
```

### Apply Pending Migrations
```bash
npx prisma migrate deploy
```

### Reset Database (⚠️ Deletes All Data)
```bash
npx prisma migrate reset
```
This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed script automatically

### Format Schema File
```bash
npx prisma format
```

---

## Troubleshooting

### Error: Can't reach database server

**Problem:** Prisma cannot connect to PostgreSQL

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql  # Linux
   brew services list                # macOS
   ```

2. Check DATABASE_URL in `.env`:
   - Verify username and password
   - Ensure database name is correct
   - Check host and port

3. Test connection manually:
   ```bash
   psql -U postgres -d thesis_repo_db
   ```

### Error: Database does not exist

**Problem:** Database not created yet

**Solution:**
```bash
psql -U postgres
CREATE DATABASE thesis_repo_db;
\q
```

### Error: P1001 - Can't reach database

**Problem:** PostgreSQL not accepting connections

**Solutions:**
1. Check PostgreSQL is running
2. Verify firewall settings
3. Check `pg_hba.conf` for connection permissions
4. Try connecting with psql to diagnose

### Error: Migration failed

**Problem:** Schema changes conflict with existing data

**Solutions:**
1. **Development environment:**
   ```bash
   npx prisma migrate reset  # ⚠️ Deletes all data
   ```

2. **Production environment:**
   - Review migration SQL in `prisma/migrations/`
   - Manually fix conflicts
   - Create custom migration

### Seeding Fails with Unique Constraint Error

**Problem:** Data already exists in database

**Solutions:**
1. The seed script is idempotent and should handle existing data
2. If issues persist, reset and re-seed:
   ```bash
   npx prisma migrate reset  # This also runs seed automatically
   ```

### Error: Prisma Client not generated

**Problem:** `@prisma/client` not up to date

**Solution:**
```bash
npm run prisma:generate
```

---

## Migration Workflow

### For Development

1. **Modify schema:**
   ```bash
   # Edit prisma/schema.prisma
   nano prisma/schema.prisma
   ```

2. **Create and apply migration:**
   ```bash
   npm run prisma:migrate
   ```

3. **Regenerate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Update seed script if needed:**
   ```bash
   nano prisma/seed.js
   ```

5. **Test migration:**
   ```bash
   npx prisma migrate reset  # Reset and re-seed
   npm run seed              # Or just re-seed
   ```

### For Production

1. **Review migration file:**
   ```bash
   cat prisma/migrations/*/migration.sql
   ```

2. **Backup database:**
   ```bash
   pg_dump thesis_repo_db > backup.sql
   ```

3. **Apply migration:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Verify application:**
   ```bash
   npm start
   ```

---

## Best Practices

### Migration Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in a staging environment first
3. **Review SQL** generated by Prisma before applying
4. **Use meaningful names** for migrations
5. **Never modify** existing migration files
6. **Commit migrations** to version control

### Schema Design Best Practices

1. **Use indexes** on foreign keys and frequently queried fields
2. **Set appropriate constraints** (unique, not null, etc.)
3. **Use enums** for fixed sets of values
4. **Document models** with JSDoc comments
5. **Follow naming conventions** (camelCase for fields, PascalCase for models)

### Seeding Best Practices

1. **Make seeds idempotent** (can run multiple times safely)
2. **Check for existing data** before inserting
3. **Use transactions** for related data
4. **Provide meaningful sample data**
5. **Don't seed sensitive data** in production

---

## Additional Resources

### Prisma Documentation
- Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Seeding: https://www.prisma.io/docs/guides/database/seed-database

### PostgreSQL Documentation
- Installation: https://www.postgresql.org/download/
- psql Commands: https://www.postgresql.org/docs/current/app-psql.html
- Connection Strings: https://www.postgresql.org/docs/current/libpq-connect.html

### Project Documentation
- Database Schema: `docs/database-schema.md`
- Main README: `README.md`

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Prisma logs: `npx prisma migrate status --preview-feature`
3. Check PostgreSQL logs
4. Verify environment variables in `.env`
5. Open an issue in the project repository

---

**Last Updated:** 2024-10-30
**Prisma Version:** 5.22.0
**PostgreSQL Version:** 15+
