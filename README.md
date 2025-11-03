# Thesis Repository System

A comprehensive, production-ready thesis repository management system built with Node.js, Express.js, Prisma ORM, and PostgreSQL. This system provides a complete solution for managing academic theses with advanced features including multi-language support, responsive design, comprehensive security, and detailed analytics.

## ✨ Features

### Core Features
- **User Authentication & Authorization** - Role-based access control (Admin, Student)
- **Thesis Submission & Management** - Complete workflow from draft to publication
- **File Upload & Management** - Secure file handling with multiple file types support
- **Advanced Search & Browse** - Full-text search with faceted filtering
- **Public Repository** - Public-facing thesis repository with detailed views

### Advanced Features (Phase 4 & 5)
- **Citation Export** - BibTeX, RIS, Endnote, and JSON formats (P4.5, P4.6, P4.7)
- **Usage Statistics** - Comprehensive tracking of views, downloads, and exports (P4.8)
- **Download with Access Control** - Three-tier access control (PUBLIC, EMBARGOED, RESTRICTED) with rate limiting (P4.9)
- **Multi-language Support** - Indonesian (default) and English with complete translations (P5.1)
- **Responsive Design** - Mobile-first design optimized for all devices (P5.2)
- **Error Handling & Validation** - Comprehensive error handling with Winston logging and Joi validation (P5.3)
- **Security Hardening** - Production-ready security with Helmet.js, rate limiting, XSS prevention, CSRF protection (P5.4)

### Access Control & Security
- **Three-tier Access Control**:
  - PUBLIC - Freely accessible to all users
  - EMBARGOED - Temporarily restricted until embargo date expires
  - RESTRICTED - Permanently restricted, admin-only access
- **Rate Limiting**:
  - General requests: 100 requests per 15 minutes
  - Login attempts: 5 attempts per 15 minutes
  - Downloads: 20 downloads per hour per IP
  - Registration: 3 attempts per hour
- **Security Headers**: Helmet.js with CSP, HSTS, X-Frame-Options, etc.
- **Input Sanitization**: XSS prevention and SQL injection detection
- **Session Security**: httpOnly, secure cookies with rolling expiration

### Analytics & Statistics
- Privacy-respecting analytics with hashed IP addresses
- Track views, downloads, and metadata exports
- Real-time statistics on thesis detail pages
- Admin dashboard with comprehensive metrics

### Internationalization (i18n)
- Full support for Indonesian (Bahasa Indonesia) and English
- 400+ translation keys covering entire application
- Language switcher in navigation (desktop dropdown, mobile toggle)
- Cookie-based language persistence
- Support for database content localization

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.x
- **Authentication**: Passport.js with bcrypt
- **Session**: express-session with PostgreSQL store
- **File Upload**: Multer
- **Validation**: Joi + express-validator
- **Logging**: Winston
- **Security**: Helmet.js, express-rate-limit, xss, csurf

### Frontend
- **Template Engine**: EJS with layouts
- **CSS Framework**: Tailwind CSS (via CDN)
- **JavaScript Framework**: Alpine.js (reactive components)
- **Icons**: Font Awesome 6
- **PDF Preview**: PDF.js

### Development Tools
- **Code Formatting**: Prettier
- **Dev Server**: Nodemon
- **Database GUI**: Prisma Studio

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **PostgreSQL** (v15 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### System Requirements

**Minimum**:
- RAM: 2GB
- Storage: 10GB free space
- CPU: 2 cores

**Recommended**:
- RAM: 4GB+
- Storage: 20GB+ free space
- CPU: 4 cores+

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd thesis-repo-claude
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Express, Prisma, Passport, Winston, Helmet, and more.

### 3. Set Up PostgreSQL Database

#### Option A: Using psql command line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE thesis_repo_db;

# Create user (optional, for production)
CREATE USER thesis_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE thesis_repo_db TO thesis_user;

# Exit psql
\q
```

#### Option B: Using pgAdmin or other GUI tools

Create a new database named `thesis_repo_db` using your preferred PostgreSQL GUI tool.

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/thesis_repo_db?schema=public

# Session & Authentication
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters-required
SESSION_MAX_AGE=7200000

# Security
STATS_SALT=your-statistics-salt-for-ip-hashing-minimum-32-chars
HASH_SALT=your-general-hashing-salt-minimum-32-characters

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
DOWNLOAD_RATE_LIMIT_MAX=20

# Logging
LOG_LEVEL=info
LOG_DIR=logs
```

**⚠️ IMPORTANT**:
- Replace `username` and `password` with your PostgreSQL credentials
- Generate strong random values for all secrets using:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Never commit `.env` file to version control

### 5. Set Up Prisma

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

When prompted, enter a name for the migration (e.g., "init").

### 6. Seed the Database (Optional but Recommended)

Seed initial data (faculties, departments, lecturers, admin user):

```bash
npm run prisma:seed
```

Default admin credentials after seeding:
- Username: `admin`
- Password: `admin123`

**⚠️ Change the admin password immediately after first login!**

### 7. Create Upload Directories

```bash
mkdir -p uploads/thesis
mkdir -p uploads/temp
mkdir -p logs
```

### 8. Start the Application

#### Development Mode (with auto-reload):

```bash
npm run dev
```

#### Production Mode:

```bash
npm start
```

The application will be available at `http://localhost:3000`

### 9. Verify Installation

1. Open browser and navigate to `http://localhost:3000`
2. You should see the homepage
3. Click "Login" and use the admin credentials from seeding
4. Access admin dashboard at `http://localhost:3000/admin`

## 📁 Project Structure

```
thesis-repo-claude/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Prisma client initialization
│   │   ├── passport.js      # Passport authentication config
│   │   ├── multer.js        # File upload configuration
│   │   ├── i18n.js          # Internationalization config
│   │   ├── logger.js        # Winston logging config
│   │   └── rateLimits.js    # Rate limiting configurations
│   ├── controllers/         # Route controllers
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── thesisController.js
│   │   └── ...
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js          # Authentication middleware
│   │   ├── errorHandler.js  # Global error handler
│   │   ├── rateLimiter.js   # Download rate limiter
│   │   └── ...
│   ├── routes/              # Route definitions
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── student.js
│   │   ├── public.js
│   │   └── api.js
│   ├── services/            # Business logic
│   │   ├── citationService.js
│   │   ├── statsService.js
│   │   └── ...
│   ├── utils/               # Utility functions
│   │   ├── validators.js    # Joi validation schemas
│   │   ├── security.js      # Security utilities
│   │   └── helpers.js
│   └── app.js               # Express app configuration
├── views/                   # EJS templates
│   ├── layouts/             # Layout templates
│   │   └── main.ejs         # Main layout with nav
│   ├── partials/            # Reusable components
│   ├── admin/               # Admin views
│   ├── student/             # Student views
│   ├── public/              # Public views
│   └── errors/              # Error pages (404, 403, 500)
├── public/                  # Static files
│   ├── css/                 # Stylesheets
│   │   ├── main.css
│   │   └── responsive.css
│   ├── js/                  # Client-side scripts
│   │   ├── main.js
│   │   ├── pdf-preview.js
│   │   └── responsive-utils.js
│   └── images/              # Static images
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.js              # Database seeding script
├── uploads/                 # Uploaded files (gitignored)
│   └── thesis/              # Thesis files
├── logs/                    # Application logs (gitignored)
│   ├── error.log
│   ├── combined.log
│   └── application.log
├── docs/                    # Documentation
│   ├── user-manual.md
│   ├── api.md
│   ├── database.md
│   ├── deployment.md
│   └── maintenance.md
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── server.js                # Application entry point
├── package.json             # Dependencies and scripts
├── CHANGELOG.md             # Version history
└── README.md                # This file
```

## 📜 Available Scripts

```bash
# Development
npm run dev                  # Start development server with auto-reload
npm start                    # Start production server

# Database
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Run database migrations
npm run prisma:studio        # Open Prisma Studio (database GUI)
npm run prisma:seed          # Seed database with initial data
npm run seed                 # Alias for prisma:seed

# Code Quality
npm run format               # Format code with Prettier
npm run format:check         # Check code formatting
```

## 🔧 Development Workflow

1. **Start PostgreSQL** - Make sure PostgreSQL is running
   ```bash
   # Check status (Linux)
   sudo systemctl status postgresql

   # Start if not running
   sudo systemctl start postgresql
   ```

2. **Run Migrations** - Apply latest database schema
   ```bash
   npm run prisma:migrate
   ```

3. **Start Dev Server** - Start application with auto-reload
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Homepage: `http://localhost:3000`
   - Admin Dashboard: `http://localhost:3000/admin` (login required)
   - Prisma Studio: `http://localhost:5555` (run `npm run prisma:studio`)

5. **Make Changes** - Edit files, server auto-reloads

6. **View Logs** - Check `logs/` directory or console output

## 🗄 Database Management

### Viewing Data

Use Prisma Studio for a visual interface:

```bash
npm run prisma:studio
```

Access at `http://localhost:5555`

### Creating Migrations

After modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

### Resetting Database

⚠️ **Warning: This will delete all data!**

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Recreate it
3. Run all migrations
4. Run seed script

### Backup & Restore

See [docs/maintenance.md](docs/maintenance.md) for detailed backup instructions.

## 🔐 Security

This application implements comprehensive security measures:

### Authentication & Authorization
- Bcrypt password hashing (salt rounds: 10+)
- Session-based authentication with secure cookies
- Role-based access control (RBAC)
- Login rate limiting (5 attempts per 15 minutes)

### Input Validation & Sanitization
- Server-side validation with Joi
- XSS prevention with xss library
- SQL injection detection
- File upload validation (type, size, content)

### Security Headers (Helmet.js)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (prevent clickjacking)
- X-Content-Type-Options (prevent MIME sniffing)
- X-XSS-Protection

### Rate Limiting
- General requests: 100 per 15 minutes
- Login attempts: 5 per 15 minutes
- Registration: 3 per hour
- Downloads: 20 per hour
- Password reset: 3 per hour
- Form submissions: 10 per minute

### Session Security
- HttpOnly cookies (prevent XSS)
- Secure flag (HTTPS only in production)
- SameSite attribute (CSRF protection)
- Rolling expiration (auto-refresh)
- Session timeout: 2 hours (configurable)

### File Security
- File type validation (whitelist)
- File size limits (10MB default)
- Virus scanning ready (integrate ClamAV)
- Secure file storage outside web root

### Privacy
- IP address hashing for analytics
- GDPR-compliant logging
- No PII in logs

## 🌍 Internationalization

The system supports multiple languages:

- **Indonesian (Bahasa Indonesia)** - Default language
- **English** - Secondary language

### Switching Languages

Users can switch languages using:
- Desktop: Language dropdown in top navigation
- Mobile: Language toggle in mobile menu
- URL parameter: `?lang=en` or `?lang=id`

Language preference is stored in a cookie and persists across sessions.

### Adding New Translations

1. Edit `src/locales/id.json` and `src/locales/en.json`
2. Add new translation keys
3. Use in templates: `<%= __('key.path') %>`
4. Use in code: `req.__('key.path')`

## 🧪 Testing

### Manual Testing

1. **User Registration & Login**
   - Register a new student account
   - Login with credentials
   - Test password validation

2. **Thesis Submission**
   - Submit a new thesis as student
   - Upload files with different types
   - Test validation errors

3. **Admin Review**
   - Login as admin
   - Review pending theses
   - Approve/reject submissions

4. **Public Access**
   - Browse published theses
   - Search with keywords
   - Download files (test rate limiting)
   - Export citations (BibTeX, RIS)

5. **Access Control**
   - Test embargoed file access
   - Test restricted file access
   - Verify admin override

### Automated Testing

(To be implemented)

```bash
npm test                  # Run all tests
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
```

## 📊 Monitoring & Logs

### Log Files

Located in `logs/` directory:

- **error.log** - Error level logs only
- **combined.log** - All logs (info, warn, error)
- **application.log** - Application-specific logs

### Log Rotation

Logs automatically rotate when they reach 5MB, keeping up to 5 backups.

### Monitoring Metrics

- Request rate and response time
- Error rates by endpoint
- Database query performance
- File upload/download metrics
- User activity (views, downloads, exports)

See [docs/maintenance.md](docs/maintenance.md) for monitoring setup.

## 🚀 Deployment

### Quick Deploy Options

- **Railway** - Easy deployment with automatic HTTPS ([Guide](docs/deployment.md#railway))
- **Render** - Free tier available ([Guide](docs/deployment.md#render))
- **Heroku** - Simple git-based deployment ([Guide](docs/deployment.md#heroku))

### Advanced Deploy Options

- **VPS** - DigitalOcean, Linode, Vultr ([Guide](docs/deployment.md#vps))
- **AWS** - EC2 + RDS ([Guide](docs/deployment.md#aws))
- **GCP** - Cloud Run + Cloud SQL ([Guide](docs/deployment.md#gcp))
- **Docker** - Containerized deployment ([Guide](docs/deployment.md#docker))

See detailed deployment guides in [docs/deployment.md](docs/deployment.md)

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production` in environment
- [ ] Generate strong `SESSION_SECRET` (32+ characters)
- [ ] Generate strong `STATS_SALT` and `HASH_SALT`
- [ ] Configure production database URL
- [ ] Set up SSL/TLS certificate
- [ ] Configure domain and DNS
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Test rate limiting
- [ ] Review security headers
- [ ] Set up monitoring/alerts
- [ ] Change default admin password

## 🐛 Troubleshooting

### Database Connection Errors

**Error**: `Can't reach database server at localhost:5432`

**Solutions**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql -U postgres -d thesis_repo_db
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

### Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm run prisma:generate
```

### Module Not Found Errors

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### File Upload Errors

**Error**: File upload fails or returns 413

**Solutions**:
- Check `MAX_FILE_SIZE` in `.env`
- Verify `uploads/` directory exists and is writable
- Check disk space: `df -h`
- Check Nginx/Apache max body size (if using reverse proxy)

### Session Errors

**Error**: Sessions not persisting

**Solutions**:
- Check `session` table exists in database
- Verify `SESSION_SECRET` is set in `.env`
- Clear browser cookies
- Check session table: `SELECT * FROM session;`

### Migration Errors

**Error**: Migration fails or database out of sync

**Solutions**:
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or fix manually
npx prisma db push
```

### Rate Limiting Too Strict

**Issue**: Getting rate limited during testing

**Solution**:
- Set `RATE_LIMIT_ENABLED=false` in development `.env`
- Or increase limits temporarily
- Clear rate limit: Restart server (in-memory store)

### i18n Translation Missing

**Error**: Translation key not found

**Solutions**:
- Add key to `src/locales/id.json` and `src/locales/en.json`
- Restart server to reload translations
- Check for typos in translation key

For more troubleshooting help, see [docs/maintenance.md](docs/maintenance.md#troubleshooting)

## 📚 Documentation

- **[User Manual](docs/user-manual.md)** - Guide for students and administrators
- **[API Documentation](docs/api.md)** - API endpoints and usage
- **[Database Schema](docs/database.md)** - Database structure and relationships
- **[Deployment Guide](docs/deployment.md)** - Production deployment instructions
- **[Maintenance Guide](docs/maintenance.md)** - Backup, monitoring, and troubleshooting

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/thesis-repo-claude.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add JSDoc comments to functions
   - Test your changes thoroughly

4. **Format code**
   ```bash
   npm run format
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Include screenshots if UI changes

### Commit Message Convention

We follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example: `feat: add BibTeX citation export`

## 📄 License

This project is licensed under the ISC License.

```
ISC License

Copyright (c) 2025

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 🙏 Acknowledgments

- **Tailwind CSS** - Utility-first CSS framework
- **Alpine.js** - Lightweight JavaScript framework
- **Prisma** - Next-generation ORM
- **Express.js** - Fast, unopinionated web framework
- **Passport.js** - Authentication middleware
- **Winston** - Logging library
- **Helmet.js** - Security middleware
- **Font Awesome** - Icon library

## 📞 Support

For issues, questions, or suggestions:

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Email**: support@example.com
- **Documentation**: [docs/](docs/)

## 🗺 Roadmap

### Completed ✅
- [x] User authentication and authorization
- [x] Thesis submission workflow
- [x] Public repository and search
- [x] Citation export (BibTeX, RIS, Endnote, JSON)
- [x] Usage statistics tracking
- [x] Download with access control
- [x] Multi-language support (ID/EN)
- [x] Responsive design
- [x] Comprehensive error handling
- [x] Production security hardening

### Planned 🚧
- [ ] Advanced search with filters
- [ ] Email notifications
- [ ] PDF full-text search
- [ ] Thesis versioning
- [ ] Public API with rate limiting
- [ ] Export reports (CSV, Excel)
- [ ] Admin analytics dashboard
- [ ] Batch import/export
- [ ] Integration with institutional repositories
- [ ] ORCID integration
- [ ] DOI minting
- [ ] Automated testing suite

---

**Built with ❤️ for academic excellence**
