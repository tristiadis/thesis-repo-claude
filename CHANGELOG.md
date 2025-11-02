# Changelog

All notable changes to the Thesis Repository System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-02

### Initial Release

Complete thesis repository system with advanced features for academic institutions.

### Added

#### Core Features (Phase 1-3)
- User authentication and authorization (Admin and Student roles)
- Passport.js local strategy with bcrypt password hashing
- Session-based authentication with PostgreSQL store
- Role-based access control (RBAC) middleware
- Complete thesis submission workflow (Draft → Pending → Approved/Rejected)
- Multi-file upload support with PDF validation
- Public thesis repository with detailed thesis pages
- Browse by faculty, department, and graduation year
- Basic search functionality for theses
- Thesis metadata management (title, abstract, keywords, advisors, examiners)
- File type categorization (Cover, Chapters, Bibliography, Appendix)
- Admin review workflow with approval/rejection notes
- Student dashboard with submission management
- Admin dashboard with pending review queue
- EJS templating with layouts and partials
- Tailwind CSS styling
- Alpine.js for reactive components
- Prisma ORM with PostgreSQL database
- Complete database schema with migrations

#### Citation Export (P4.5, P4.6, P4.7)
- RIS format export for EndNote, Mendeley, Zotero
- BibTeX format export for LaTeX documents
- EndNote XML format export
- JSON format export for developers
- Proper citation formatting with all metadata
- Author name formatting (Last, First) for citations
- Direct download of citation files

#### Usage Statistics (P4.8)
- Comprehensive statistics tracking system
- View count tracking for thesis pages
- Download count tracking for files
- Citation export tracking
- Privacy-respecting analytics with IP address hashing
- Statistics display on thesis detail pages
- Admin analytics dashboard
- Real-time statistics updates
- Anonymous event logging with user agent and referer

#### Download with Access Control (P4.9)
- Three-tier access control system:
  - PUBLIC: Freely accessible to all users
  - EMBARGOED: Temporarily restricted until specified date
  - RESTRICTED: Permanently restricted, admin-only access
- Embargo date management with automatic expiration
- Embargo reason documentation
- Rate limiting for downloads (20 downloads per hour per IP)
- Custom rate limiter middleware (in-memory)
- File streaming for efficient delivery
- Download statistics logging
- Access control enforcement in preview and download
- Admin override for restricted/embargoed content

#### Multi-language Support (P5.1)
- Full internationalization (i18n) with Indonesian and English
- 400+ translation keys covering entire application
- Language switcher in navigation (desktop dropdown, mobile toggle)
- Cookie-based language persistence
- URL parameter language switching (?lang=id or ?lang=en)
- Indonesian as default language
- Support for database content localization (title, abstract, keywords)
- Translation files: src/locales/id.json and src/locales/en.json
- Comprehensive translations for:
  - Navigation and menus
  - Forms and validation messages
  - Error pages and messages
  - Dashboard and statistics
  - Admin interface
  - Footer and common elements

#### Responsive Design (P5.2)
- Mobile-first responsive design
- Breakpoint support: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- Touch-friendly tap targets (44x44px minimum)
- Animated hamburger menu for mobile navigation
- Optimized mobile navigation with smooth transitions
- Responsive tables with horizontal scroll
- Responsive grid layouts for thesis cards
- Mobile-optimized forms and inputs
- iOS Safari zoom prevention (16px minimum font size)
- Viewport height fixes for mobile browsers
- Lazy loading for images
- Device detection utilities
- Breakpoint management utilities
- Responsive utility CSS classes

#### Error Handling & Validation (P5.3)
- Winston logging system with multiple log levels
- Log files: error.log, combined.log, application.log
- Automatic log rotation (5MB max size, 5 file retention)
- Global error handler middleware
- Specialized error handling for:
  - Prisma database errors (P2002, P2025, etc.)
  - Multer file upload errors
  - Joi validation errors
  - Authentication errors
  - Authorization (403 Forbidden) errors
  - Not Found (404) errors
- Joi validation schemas for:
  - Thesis submission
  - User registration
  - User login
  - File uploads
  - Search queries
- Server-side validation with detailed error messages
- Custom error pages:
  - 404 Not Found with helpful navigation
  - 403 Forbidden with context-specific messages
  - 500 Internal Server Error with details (dev mode)
- Validation utilities and middleware
- Error logging with request context
- Environment-based error verbosity

#### Security Hardening (P5.4)
- Helmet.js security headers:
  - Content Security Policy (CSP) with allowed CDNs
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options (prevent clickjacking)
  - X-Content-Type-Options (prevent MIME sniffing)
  - X-XSS-Protection
- Comprehensive rate limiting:
  - General requests: 100 per 15 minutes
  - Login attempts: 5 per 15 minutes (with skipSuccessfulRequests)
  - Registration: 3 per hour
  - Password reset: 3 per hour
  - Form submissions: 10 per minute
  - Downloads: 20 per hour (custom limiter)
- XSS prevention with xss library:
  - Input sanitization utilities
  - Object sanitization (recursive)
  - Configurable whitelist for allowed HTML
- SQL injection detection:
  - Pattern-based detection
  - Middleware for checking query parameters
  - Middleware for checking request body
- CSRF protection setup (csurf package installed, ready for implementation)
- Enhanced session security:
  - HttpOnly cookies (prevent XSS access)
  - Secure flag for HTTPS in production
  - SameSite attribute (CSRF mitigation)
  - Rolling expiration (auto-refresh sessions)
  - Configurable session timeout (default: 2 hours)
  - Session stored in PostgreSQL
- File security:
  - File type validation (PDF whitelist)
  - File extension validation utility
  - File size limits (10MB default, configurable)
  - Future-ready for virus scanning integration (ClamAV)
- Security utilities:
  - Secure token generation (crypto.randomBytes)
  - Input sanitization functions
  - SQL injection detection patterns
  - Security headers middleware
- Environment variable documentation (.env.example):
  - Security best practices documented
  - Strong secret generation instructions
  - Configuration examples with security notes
- Trust proxy configuration for rate limiting behind load balancers
- Cookie parser for secure cookie handling

#### Documentation (P5.6)
- Comprehensive README.md with:
  - Complete feature list
  - Technology stack details
  - Installation instructions
  - Configuration guide
  - Development workflow
  - Troubleshooting guide
  - Security considerations
- User Manual (docs/user-manual.md):
  - Student guide with step-by-step instructions
  - Admin guide with complete workflows
  - Public user guide
  - FAQ sections
  - Screenshots and examples
- API Documentation (docs/api.md):
  - All public endpoints documented
  - Authentication guide
  - Rate limiting details
  - Request/response examples
  - Error code reference
  - Future API roadmap
- Database Documentation (docs/database.md):
  - Complete schema documentation
  - Entity Relationship Diagram (text-based)
  - Table descriptions with all fields
  - Relationship explanations
  - Index documentation
  - Sample SQL queries
  - Migration guide
  - Backup and restore procedures
- Deployment Guide (docs/deployment.md):
  - Railway deployment
  - Render deployment
  - Heroku deployment
  - VPS deployment (DigitalOcean, Linode)
  - AWS deployment (EC2 + RDS)
  - Google Cloud Platform deployment
  - Docker deployment
  - Domain and SSL setup
  - Post-deployment checklist
- Maintenance Guide (docs/maintenance.md):
  - Backup strategies (database and files)
  - Automated backup scripts
  - Log management and rotation
  - Monitoring setup (uptime, server, database)
  - Security update procedures
  - Performance optimization tips
  - Troubleshooting guide
  - Disaster recovery plan
  - Maintenance checklists
- CHANGELOG.md (this file)

### Technical Stack

**Backend**:
- Node.js 18+ LTS
- Express.js 4.x
- Prisma ORM 5.x
- PostgreSQL 15+
- Passport.js (authentication)
- bcrypt (password hashing)
- Winston (logging)
- Joi (validation)
- Helmet.js (security headers)
- express-rate-limit (rate limiting)
- xss (XSS prevention)
- cookie-parser (cookie handling)
- i18n (internationalization)
- Multer (file uploads)

**Frontend**:
- EJS (templating)
- Tailwind CSS (styling)
- Alpine.js (reactivity)
- Font Awesome 6 (icons)
- PDF.js (PDF preview)

**Development Tools**:
- Nodemon (dev server)
- Prettier (code formatting)
- Prisma Studio (database GUI)

### Database Schema

**Models**:
- Faculty
- Department
- Lecturer
- User
- Thesis
- ThesisFile
- StatisticsLog
- SystemSetting
- Session

**Enums**:
- Role: ADMIN, STUDENT
- ThesisStatus: DRAFT, PENDING, APPROVED, REJECTED
- FileType: COVER, CHAPTER_1-5, BIBLIOGRAPHY, APPENDIX, OTHER
- AccessLevel: PUBLIC, EMBARGOED, RESTRICTED
- EventType: VIEW, DOWNLOAD, METADATA_EXPORT
- SettingType: STRING, INTEGER, BOOLEAN, JSON

### Security Features

- Bcrypt password hashing (salt rounds: 10+)
- Session-based authentication
- Role-based access control
- Rate limiting on sensitive endpoints
- XSS prevention
- SQL injection detection
- CSRF protection ready
- Security headers (Helmet.js)
- Input validation (Joi)
- File upload validation
- IP address hashing for privacy
- Secure session cookies
- HTTPS enforcement in production

### Performance Features

- Database indexing on frequently queried fields
- Connection pooling (Prisma)
- File streaming for downloads
- Static asset caching
- Log rotation
- Efficient query design
- Lazy loading for images
- Responsive design optimization

---

## [Unreleased]

### Planned Features

#### Email Notifications
- Student notification on thesis approval/rejection
- Admin notification on new submissions
- Embargo expiration notifications
- Password reset emails

#### Advanced Search
- Full-text search with PostgreSQL
- Faceted search with filters
- Search suggestions/autocomplete
- Advanced search form with multiple criteria

#### PDF Full-Text Search
- Extract text from PDF files
- Index PDF content in database
- Search within thesis content
- Highlight search terms in PDF viewer

#### Public API (v2.0)
- RESTful JSON API endpoints
- Bearer token authentication
- API rate limiting
- API documentation (OpenAPI/Swagger)
- Webhooks for events

#### Admin Analytics Dashboard
- Visual charts and graphs
- Thesis submission trends
- Popular theses and keywords
- User activity metrics
- Download statistics by period
- Export reports (CSV, Excel, PDF)

#### Thesis Versioning
- Upload revised versions of theses
- Version history tracking
- Compare versions
- Download specific versions

#### Batch Operations
- Bulk import theses (CSV/Excel)
- Bulk approve/reject
- Bulk export metadata
- Bulk user creation

#### Institutional Repository Integration
- OAI-PMH protocol support
- DSpace integration
- EPrints integration
- Fedora integration

#### Enhanced Features
- ORCID integration for author identification
- DOI minting for theses
- Altmetrics tracking
- Social media sharing
- Citation tracking (Google Scholar, etc.)
- Plagiarism checking integration
- PDF watermarking
- Automated email reminders
- Scheduled thesis publication
- Multi-department thesis support
- Co-author support
- Thesis collections/series

#### Testing
- Unit tests (Jest)
- Integration tests
- End-to-end tests (Playwright/Cypress)
- Load testing
- Security testing

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2025-11-02 | Initial release with complete feature set |

---

## Migration Guide

### Upgrading to 1.0.0

First installation - no migration needed.

### Future Upgrades

Upgrade instructions will be provided for each major and minor version.

General upgrade process:
1. Backup database and files
2. Pull latest code: `git pull`
3. Install dependencies: `npm install`
4. Run migrations: `npx prisma migrate deploy`
5. Regenerate Prisma client: `npx prisma generate`
6. Restart application: `pm2 restart thesis-repo`
7. Verify functionality
8. Review changelog for breaking changes

---

## Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Email**: support@example.com
- **Documentation**: [docs/](docs/)

---

## Contributors

- Initial Development: Claude Code Session 2025-11
- Maintained by: University IT Department

---

## License

ISC License - See [LICENSE](LICENSE) file for details.

---

**Last Updated**: 2025-11-02
**Current Version**: 1.0.0
