# API Documentation - Thesis Repository System

This document describes the API endpoints available in the Thesis Repository System.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Public Endpoints](#public-endpoints)
6. [Student Endpoints](#student-endpoints)
7. [Admin Endpoints](#admin-endpoints)
8. [Citation Export Endpoints](#citation-export-endpoints)
9. [Search & Browse Endpoints](#search--browse-endpoints)
10. [Future API Endpoints](#future-api-endpoints)

---

## Overview

### Base URL

```
http://localhost:3000
```

In production, replace with your actual domain:
```
https://thesis-repo.example.com
```

### API Versioning

Currently: **v1.0** (no version prefix in URLs)

Future versions will use:
```
/api/v2/*
```

### Response Format

All API responses (where applicable) return JSON:

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Content Types

- **Request**: `application/json` or `application/x-www-form-urlencoded`
- **Response**: `application/json`, `text/html`, or specific file types (PDF, etc.)
- **File Upload**: `multipart/form-data`

---

## Authentication

### Session-Based Authentication

The system uses cookie-based session authentication.

#### Login

**Endpoint**: `POST /auth/login`

**Request**:
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=student123&password=MyPassword123
```

**Success Response**:
```http
HTTP/1.1 302 Found
Location: /student
Set-Cookie: sessionId=...; HttpOnly; SameSite=Lax
```

**Error Response**:
```http
HTTP/1.1 302 Found
Location: /auth/login
```

Flash message: "Invalid username or password"

#### Logout

**Endpoint**: `POST /auth/logout`

**Request**:
```http
POST /auth/logout
```

**Response**:
```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

#### Checking Authentication

Include session cookie in all authenticated requests:

```http
GET /student/dashboard
Cookie: sessionId=abc123...
```

If not authenticated:
```http
HTTP/1.1 302 Found
Location: /auth/login
```

### Future: API Token Authentication

**Planned for v2.0**:

```http
GET /api/v2/theses
Authorization: Bearer YOUR_API_TOKEN
```

---

## Rate Limiting

### Global Rate Limit

**Limit**: 100 requests per 15 minutes per IP

**Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

**When Exceeded**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: text/html

<error page>
```

### Endpoint-Specific Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 attempts | 15 minutes |
| `POST /auth/register` | 3 attempts | 1 hour |
| `GET /thesis/*/download` | 20 downloads | 1 hour |
| `POST /auth/password/reset` | 3 attempts | 1 hour |
| Form submissions | 10 submissions | 1 minute |

### Bypassing Rate Limits

Rate limits can be disabled in development:

```env
RATE_LIMIT_ENABLED=false
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 302 | Found | Redirect (common for form submissions) |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 413 | Payload Too Large | File upload exceeds limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

**Validation Error**:
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must be at least 10 characters",
      "type": "string.min"
    }
  ]
}
```

**Not Found Error**:
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "The requested resource could not be found",
  "statusCode": 404
}
```

**Authentication Error**:
```json
{
  "success": false,
  "error": "AuthenticationError",
  "message": "Please login to access this resource",
  "statusCode": 401
}
```

---

## Public Endpoints

### Home Page

Get the homepage.

**Endpoint**: `GET /`

**Authentication**: None required

**Response**: HTML page

**Example**:
```http
GET / HTTP/1.1
Host: localhost:3000
Accept: text/html
```

### Search Theses

Search for theses by keyword.

**Endpoint**: `GET /search`

**Authentication**: None required

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `faculty` | int | No | Filter by faculty ID |
| `department` | int | No | Filter by department ID |
| `year` | int | No | Filter by graduation year |
| `page` | int | No | Page number (default: 1) |
| `limit` | int | No | Results per page (default: 10, max: 100) |

**Example Request**:
```http
GET /search?q=machine+learning&department=5&year=2023&page=1&limit=20
```

**Example Response**: HTML page with search results

**Future JSON API**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 123,
        "title": "Machine Learning for...",
        "author": "John Doe",
        "year": 2023,
        "abstract": "...",
        "url": "/thesis/123/machine-learning-for"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### View Thesis Details

Get detailed information about a specific thesis.

**Endpoint**: `GET /thesis/:id/:slug?`

**Authentication**: None required

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | int | Yes | Thesis ID |
| `slug` | string | No | URL-friendly thesis title (SEO) |

**Example Request**:
```http
GET /thesis/123/machine-learning-implementation
```

**Response**: HTML page with thesis details

**Statistics**: View is logged anonymously for analytics

### Preview File

Preview a thesis file (PDF) in browser.

**Endpoint**: `GET /thesis/:thesisId/files/:fileId/preview`

**Authentication**: None required (but subject to access control)

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thesisId` | int | Yes | Thesis ID |
| `fileId` | int | Yes | File ID |

**Example Request**:
```http
GET /thesis/123/files/456/preview
```

**Success Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="chapter1.pdf"

<PDF binary data>
```

**Access Control**:
- **PUBLIC**: Available to all
- **EMBARGOED**: Available only after embargo date
- **RESTRICTED**: Only available to admins

**Error Responses**:

403 Forbidden (Embargoed):
```html
<error page>
Message: "This file is embargoed until 2025-12-31"
```

403 Forbidden (Restricted):
```html
<error page>
Message: "Access to this file is restricted"
```

### Download File

Download a thesis file (PDF).

**Endpoint**: `GET /thesis/:thesisId/files/:fileId/download`

**Authentication**: None required (but subject to access control)

**Rate Limit**: 20 downloads per hour per IP

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thesisId` | int | Yes | Thesis ID |
| `fileId` | int | Yes | File ID |

**Example Request**:
```http
GET /thesis/123/files/456/download
```

**Success Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="chapter1.pdf"
Content-Length: 1048576

<PDF binary data>
```

**Rate Limit Response**:
```http
HTTP/1.1 429 Too Many Requests
Content-Type: text/html

Message: "Too many download requests. Please try again in X minutes."
```

**Statistics**: Download is logged anonymously

---

## Search & Browse Endpoints

### Browse Faculties

Get list of all faculties.

**Endpoint**: `GET /browse/faculties`

**Authentication**: None required

**Response**: HTML page listing faculties

**Future JSON API**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Fakultas Teknik",
      "nameEn": "Faculty of Engineering",
      "code": "FT",
      "thesisCount": 1234,
      "url": "/browse/faculties/1"
    }
  ]
}
```

### Faculty Detail

Get faculty details with departments.

**Endpoint**: `GET /browse/faculties/:id`

**URL Parameters**:
- `id` (int): Faculty ID

**Response**: HTML page with faculty details and departments

### Department Detail

Get department details with theses.

**Endpoint**: `GET /browse/departments/:id`

**URL Parameters**:
- `id` (int): Department ID

**Query Parameters**:
- `page` (int): Page number
- `limit` (int): Results per page

**Response**: HTML page with thesis list

### Browse Years

Get list of graduation years.

**Endpoint**: `GET /browse/years`

**Response**: HTML page listing years with thesis counts

### Year Detail

Get theses from specific year.

**Endpoint**: `GET /browse/years/:year`

**URL Parameters**:
- `year` (int): Graduation year

**Response**: HTML page with thesis list

---

## Citation Export Endpoints

### Export RIS Citation

Export thesis citation in RIS format.

**Endpoint**: `GET /thesis/:id/export/ris`

**Authentication**: None required

**URL Parameters**:
- `id` (int): Thesis ID

**Example Request**:
```http
GET /thesis/123/export/ris
```

**Success Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/x-research-info-systems
Content-Disposition: attachment; filename="thesis-123.ris"

TY  - THES
AU  - Doe, John
TI  - Machine Learning Implementation
PY  - 2023
DA  - 2023/06/15
AB  - This thesis explores...
KW  - machine learning
KW  - implementation
UR  - http://localhost:3000/thesis/123
ER  -
```

**Statistics**: Export is logged anonymously

### Export BibTeX Citation

Export thesis citation in BibTeX format.

**Endpoint**: `GET /thesis/:id/export/bibtex`

**Example Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/x-bibtex
Content-Disposition: attachment; filename="thesis-123.bib"

@thesis{Doe2023,
  author = {John Doe},
  title = {Machine Learning Implementation},
  year = {2023},
  school = {University Name},
  type = {Undergraduate Thesis}
}
```

### Export EndNote XML

**Endpoint**: `GET /thesis/:id/export/endnote`

**Response**: EndNote XML format

### Export JSON

**Endpoint**: `GET /thesis/:id/export/json`

**Response**:
```json
{
  "id": 123,
  "title": "Machine Learning Implementation",
  "titleEn": "Machine Learning Implementation",
  "author": {
    "name": "John Doe",
    "studentId": "123456"
  },
  "year": 2023,
  "defenseDate": "2023-06-15",
  "abstract": "...",
  "keywords": ["machine learning", "implementation"],
  "faculty": "Faculty of Engineering",
  "department": "Computer Science",
  "advisors": [
    { "name": "Smith, Prof.", "role": "primary" }
  ],
  "url": "http://localhost:3000/thesis/123"
}
```

---

## Student Endpoints

All student endpoints require authentication.

### Student Dashboard

**Endpoint**: `GET /student`

**Authentication**: Required (STUDENT role)

**Response**: HTML dashboard page

**Shows**:
- Student's thesis submissions
- Status of each submission
- Quick actions

### Create Thesis Submission

**Endpoint**: `GET /student/submit`

**Authentication**: Required (STUDENT role)

**Response**: HTML form for thesis submission

### Submit Thesis

**Endpoint**: `POST /student/submit`

**Authentication**: Required (STUDENT role)

**Content-Type**: `multipart/form-data`

**Request Body**:
```
title: "Thesis Title"
abstractId: "Abstract in Indonesian..."
keywords: "keyword1, keyword2, keyword3"
graduationYear: 2023
defenseDate: "2023-06-15"
advisor1Id: 5
departmentId: 3
... (additional fields)
files[]: <PDF file 1>
files[]: <PDF file 2>
```

**Validation**:
- Title: 10-500 characters
- Abstract: 100-5000 characters
- Keywords: 3-500 characters
- Files: PDF only, max 10MB each

**Success Response**:
```http
HTTP/1.1 302 Found
Location: /student
```

Flash message: "Thesis submitted successfully"

**Validation Error**:
```http
HTTP/1.1 400 Bad Request
Content-Type: text/html

<form with error messages>
```

### Edit Draft Thesis

**Endpoint**: `GET /student/thesis/:id/edit`

**Authentication**: Required (STUDENT role, must own thesis)

**Constraints**: Only DRAFT status theses can be edited

**Response**: HTML edit form

### Update Thesis

**Endpoint**: `POST /student/thesis/:id/update`

**Authentication**: Required (STUDENT role, must own thesis)

**Same validation as submit**

### Delete Draft

**Endpoint**: `POST /student/thesis/:id/delete`

**Authentication**: Required (STUDENT role, must own thesis)

**Constraints**: Only DRAFT status theses can be deleted

**Response**:
```http
HTTP/1.1 302 Found
Location: /student
```

Flash message: "Thesis deleted successfully"

---

## Admin Endpoints

All admin endpoints require ADMIN role.

### Admin Dashboard

**Endpoint**: `GET /admin`

**Authentication**: Required (ADMIN role)

**Response**: HTML admin dashboard

**Shows**:
- Statistics overview
- Pending reviews count
- Recent submissions
- System health

### Review Queue

**Endpoint**: `GET /admin/review`

**Authentication**: Required (ADMIN role)

**Response**: HTML page with pending theses

### Review Thesis

**Endpoint**: `GET /admin/review/:id`

**Authentication**: Required (ADMIN role)

**Response**: HTML review page with thesis details

### Approve Thesis

**Endpoint**: `POST /admin/review/:id/approve`

**Authentication**: Required (ADMIN role)

**Request Body**:
```json
{
  "notes": "Optional approval notes"
}
```

**Success Response**:
```http
HTTP/1.1 302 Found
Location: /admin/review
```

Flash message: "Thesis approved and published"

**Actions**:
- Status changes to APPROVED
- publishedAt timestamp set
- Student notified
- Thesis appears in public repository

### Reject Thesis

**Endpoint**: `POST /admin/review/:id/reject`

**Authentication**: Required (ADMIN role)

**Request Body**:
```json
{
  "notes": "Required rejection reason"
}
```

**Validation**: Notes required (min 10 characters)

**Success Response**:
```http
HTTP/1.1 302 Found
Location: /admin/review
```

Flash message: "Thesis rejected"

**Actions**:
- Status changes to REJECTED
- Student can edit and resubmit

### Manage Users

**Endpoint**: `GET /admin/users`

**Authentication**: Required (ADMIN role)

**Response**: HTML page with user list

### Create User

**Endpoint**: `POST /admin/users/create`

**Request Body**:
```json
{
  "username": "student123",
  "email": "student@university.edu",
  "password": "TempPass123",
  "name": "John Doe",
  "role": "STUDENT"
}
```

### Statistics API

**Endpoint**: `GET /admin/stats`

**Authentication**: Required (ADMIN role)

**Query Parameters**:
- `startDate` (date): Start of date range
- `endDate` (date): End of date range
- `department` (int): Filter by department

**Response**:
```json
{
  "success": true,
  "data": {
    "totalTheses": 1234,
    "pending": 15,
    "approved": 1200,
    "rejected": 19,
    "totalViews": 45678,
    "totalDownloads": 12345,
    "topTheses": [
      {
        "id": 123,
        "title": "...",
        "views": 567,
        "downloads": 123
      }
    ]
  }
}
```

---

## Future API Endpoints

### Planned for v2.0

#### RESTful JSON API

**Base URL**: `/api/v2`

**Authentication**: Bearer token

#### List Theses

```http
GET /api/v2/theses
Authorization: Bearer YOUR_TOKEN

Response:
{
  "data": [...],
  "pagination": {...}
}
```

#### Get Single Thesis

```http
GET /api/v2/theses/:id
Authorization: Bearer YOUR_TOKEN

Response:
{
  "data": {
    "id": 123,
    "title": "...",
    ...
  }
}
```

#### Create Thesis (API)

```http
POST /api/v2/theses
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "...",
  "abstract": "...",
  ...
}
```

#### Update Thesis (API)

```http
PUT /api/v2/theses/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

#### Delete Thesis (API)

```http
DELETE /api/v2/theses/:id
Authorization: Bearer YOUR_TOKEN
```

#### Search API

```http
GET /api/v2/search?q=keywords&faculty=1&year=2023
Authorization: Bearer YOUR_TOKEN
```

#### Statistics API

```http
GET /api/v2/stats/overview
GET /api/v2/stats/thesis/:id
GET /api/v2/stats/downloads
Authorization: Bearer YOUR_TOKEN
```

### Webhooks (Planned)

Subscribe to events:

```json
POST /api/v2/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["thesis.submitted", "thesis.approved", "thesis.downloaded"],
  "secret": "your_webhook_secret"
}
```

Events:
- `thesis.submitted`
- `thesis.approved`
- `thesis.rejected`
- `thesis.downloaded`
- `user.registered`

---

## Rate Limit Details

### Implementation

Rate limiting uses express-rate-limit with in-memory store.

**Production Recommendation**: Use Redis for distributed rate limiting:

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

const limiter = rateLimit({
  store: new RedisStore({
    client: client
  }),
  ...
});
```

### Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
Retry-After: 900
```

---

## Security Considerations

### HTTPS

Always use HTTPS in production:

```nginx
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ...
}
```

### CORS

If building separate frontend:

```javascript
app.use(cors({
  origin: 'https://your-frontend.com',
  credentials: true
}));
```

### Input Validation

All inputs are validated with Joi:

```javascript
const schema = Joi.object({
  title: Joi.string().min(10).max(500).required(),
  abstract: Joi.string().min(100).max(5000).required()
});
```

### XSS Prevention

All user inputs are sanitized:

```javascript
const xss = require('xss');
const clean = xss(userInput);
```

### SQL Injection Prevention

Prisma ORM prevents SQL injection automatically.

### File Upload Security

- Type validation (PDF only)
- Size limits (10MB)
- Filename sanitization
- Virus scanning (integrate ClamAV)

---

## Testing the API

### Using cURL

**Login**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -d "username=admin&password=admin123" \
  -c cookies.txt \
  -L
```

**Authenticated Request**:
```bash
curl http://localhost:3000/admin \
  -b cookies.txt
```

**Download File**:
```bash
curl http://localhost:3000/thesis/123/files/456/download \
  -o thesis.pdf
```

### Using Postman

1. Import endpoints as collection
2. Set up environment variables
3. Use cookie authentication
4. Test each endpoint

### Using JavaScript (fetch)

```javascript
// Login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'username=admin&password=admin123',
  credentials: 'include'
});

// Authenticated request
const data = await fetch('/admin', {
  credentials: 'include'
});
```

---

## Changelog

### v1.0.0 (2025-11-02)
- Initial API documentation
- Public endpoints for browsing and search
- Citation export endpoints (RIS, BibTeX, EndNote, JSON)
- Student submission endpoints
- Admin review endpoints
- Rate limiting on sensitive endpoints

### Future Versions

**v1.1.0** (Planned):
- JSON API endpoints alongside HTML
- Improved error responses
- More granular permissions

**v2.0.0** (Planned):
- Full RESTful JSON API
- Bearer token authentication
- Webhooks for events
- GraphQL endpoint (optional)
- Batch operations
- Advanced filtering and sorting

---

## Support

For API questions or issues:

- **Documentation**: Review this document
- **GitHub Issues**: Report bugs or request features
- **Email**: api-support@example.com

---

**Last Updated**: November 2025
**Version**: 1.0.0
**System**: Thesis Repository System
