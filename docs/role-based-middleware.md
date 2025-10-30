# Role-Based Access Control Middleware

Complete guide for using role-based middleware to protect routes in the Thesis Repository System.

## Overview

The role-based middleware provides reusable functions to control access to routes based on user authentication status and role. It supports two user roles: `ADMIN` and `STUDENT`.

## Available Middleware Functions

### 1. `requireRole(allowedRoles)`

The main function that checks if a user has one of the specified roles.

**Parameters:**
- `allowedRoles` (string|string[]): Single role or array of roles allowed to access the route

**Behavior:**
- If user is not authenticated → redirects to `/auth/login`
- If user doesn't have required role → renders 403 error page
- If user has required role → allows access (calls `next()`)

**Example:**
```javascript
const { requireRole } = require('../middleware/role');

// Single role
router.get('/admin/settings', requireRole('ADMIN'), settingsController);

// Multiple roles
router.get('/profile', requireRole(['ADMIN', 'STUDENT']), profileController);
```

---

### 2. `requireAdmin`

Shortcut for requiring ADMIN role only.

**Usage:**
```javascript
const { requireAdmin } = require('../middleware/role');

router.get('/admin/dashboard', requireAdmin, adminDashboardController);
router.post('/admin/users', requireAdmin, createUserController);
router.delete('/admin/thesis/:id', requireAdmin, deleteThesisController);
```

---

### 3. `requireStudent`

Shortcut for requiring STUDENT role only.

**Usage:**
```javascript
const { requireStudent } = require('../middleware/role');

router.get('/student/dashboard', requireStudent, studentDashboardController);
router.post('/student/thesis/submit', requireStudent, submitThesisController);
router.get('/student/my-theses', requireStudent, myThesesController);
```

---

### 4. `requireAny`

Allows any authenticated user (both ADMIN and STUDENT).

**Usage:**
```javascript
const { requireAny } = require('../middleware/role');

router.get('/profile', requireAny, profileController);
router.put('/profile/update', requireAny, updateProfileController);
router.get('/notifications', requireAny, notificationsController);
```

---

### 5. `isAuthenticated`

Checks if user is logged in (any role). Redirects to login if not.

**Usage:**
```javascript
const { isAuthenticated } = require('../middleware/role');

router.get('/dashboard', isAuthenticated, dashboardController);
router.get('/settings', isAuthenticated, settingsController);
```

---

### 6. `isGuest`

Checks if user is NOT logged in. Redirects authenticated users to their dashboard.

**Usage:**
```javascript
const { isGuest } = require('../middleware/role');

router.get('/auth/login', isGuest, loginController);
router.get('/auth/register', isGuest, registerController);
router.get('/forgot-password', isGuest, forgotPasswordController);
```

---

## Complete Usage Examples

### Example 1: Admin Routes

```javascript
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const adminController = require('../controllers/admin.controller');

// All routes protected with requireAdmin
router.get('/dashboard', requireAdmin, adminController.dashboard);
router.get('/users', requireAdmin, adminController.listUsers);
router.post('/users', requireAdmin, adminController.createUser);
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

// Thesis management (admin only)
router.get('/theses/pending', requireAdmin, adminController.pendingTheses);
router.post('/theses/:id/approve', requireAdmin, adminController.approveThesis);
router.post('/theses/:id/reject', requireAdmin, adminController.rejectThesis);

module.exports = router;
```

---

### Example 2: Student Routes

```javascript
const express = require('express');
const router = express.Router();
const { requireStudent } = require('../middleware/role');
const studentController = require('../controllers/student.controller');

// All routes protected with requireStudent
router.get('/dashboard', requireStudent, studentController.dashboard);
router.get('/my-theses', requireStudent, studentController.myTheses);
router.get('/submit', requireStudent, studentController.submitForm);
router.post('/submit', requireStudent, studentController.handleSubmit);

// Thesis management (student only)
router.get('/thesis/:id/edit', requireStudent, studentController.editThesis);
router.put('/thesis/:id', requireStudent, studentController.updateThesis);
router.delete('/thesis/:id', requireStudent, studentController.deleteThesis);

module.exports = router;
```

---

### Example 3: Mixed Access Routes

```javascript
const express = require('express');
const router = express.Router();
const {
  requireAdmin,
  requireStudent,
  requireAny,
  isAuthenticated,
  isGuest,
} = require('../middleware/role');
const controller = require('../controllers/thesis.controller');

// Public routes (no authentication)
router.get('/browse', controller.browseTheses);
router.get('/thesis/:id', controller.viewThesis);
router.get('/search', controller.searchTheses);

// Authenticated users only (any role)
router.get('/profile', requireAny, controller.profile);
router.put('/profile', requireAny, controller.updateProfile);
router.get('/notifications', requireAny, controller.notifications);

// Role-specific routes
router.get('/admin/dashboard', requireAdmin, controller.adminDashboard);
router.get('/student/dashboard', requireStudent, controller.studentDashboard);

// Guest-only routes (redirect if logged in)
router.get('/auth/login', isGuest, controller.login);
router.get('/auth/register', isGuest, controller.register);

module.exports = router;
```

---

### Example 4: Using requireRole with Multiple Roles

```javascript
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/role');
const controller = require('../controllers/report.controller');

// Allow both ADMIN and STUDENT to view reports
router.get(
  '/reports',
  requireRole(['ADMIN', 'STUDENT']),
  controller.viewReports
);

// Only ADMIN can generate reports
router.post('/reports/generate', requireRole(['ADMIN']), controller.generateReport);

// Only ADMIN can export reports
router.get(
  '/reports/:id/export',
  requireRole(['ADMIN']),
  controller.exportReport
);

module.exports = router;
```

---

### Example 5: Chaining Multiple Middleware

```javascript
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const { validateThesis } = require('../middleware/validation');
const { uploadFile } = require('../middleware/upload');
const controller = require('../controllers/thesis.controller');

// Chain multiple middleware
router.post(
  '/thesis/submit',
  requireAdmin,           // Check role first
  uploadFile,             // Then handle file upload
  validateThesis,         // Then validate data
  controller.createThesis // Finally execute controller
);

module.exports = router;
```

---

## Error Handling

### 403 Forbidden Error

When a user doesn't have the required role, the middleware renders a beautiful 403 error page with:

- Large error icon and status code
- Clear error message
- Description of required role(s)
- Action buttons:
  - Go to Dashboard (for authenticated users)
  - Back to Home
  - Go Back (browser history)
- Contact support link
- Developer info (in development mode)

### Login Redirect

When an unauthenticated user tries to access a protected route:

1. Original URL is saved in `req.session.returnTo`
2. Flash message is set with error
3. User is redirected to `/auth/login`
4. After successful login, user is redirected back to original URL

---

## Flash Messages

The middleware automatically sets flash messages that can be displayed to users:

```javascript
req.session.flashMessage = {
  type: 'error',
  message: 'Please log in to access this page',
};
```

**Display flash messages in your views:**

```html
<% if (typeof flashMessage !== 'undefined' && flashMessage) { %>
  <div class="alert alert-<%= flashMessage.type %>">
    <%= flashMessage.message %>
  </div>
<% } %>
```

---

## Integration with App.js

Update your `src/app.js` to use the role middleware:

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const { requireAdmin, requireStudent } = require('./middleware/role');

const app = express();

// ... session and passport setup ...

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);  // Already protected with requireAdmin in routes
app.use('/student', studentRoutes);  // Already protected with requireStudent in routes

module.exports = app;
```

---

## Testing Access Control

### Test Scenario 1: Admin Access

```bash
# Login as admin
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Access admin dashboard (should succeed)
GET /admin/dashboard
Response: 200 OK

# Access student dashboard (should fail with 403)
GET /student/dashboard
Response: 403 Forbidden
```

---

### Test Scenario 2: Student Access

```bash
# Login as student
POST /auth/login
{
  "username": "student1",
  "password": "student123"
}

# Access student dashboard (should succeed)
GET /student/dashboard
Response: 200 OK

# Access admin dashboard (should fail with 403)
GET /admin/dashboard
Response: 403 Forbidden
```

---

### Test Scenario 3: Unauthenticated Access

```bash
# Try to access protected route without login
GET /admin/dashboard
Response: 302 Redirect to /auth/login

# Check that returnTo is set
Session: { returnTo: '/admin/dashboard' }

# After login, should redirect back
POST /auth/login
Response: 302 Redirect to /admin/dashboard
```

---

## Best Practices

### 1. Apply Middleware at Route Level

```javascript
// Good: Explicit protection
router.get('/admin/users', requireAdmin, controller);

// Not recommended: Protecting entire router
// (makes it harder to see which routes are protected)
router.use(requireAdmin);
router.get('/users', controller);
```

---

### 2. Use Specific Functions

```javascript
// Good: Clear intent
router.get('/admin/dashboard', requireAdmin, controller);

// Less clear: Generic function
router.get('/admin/dashboard', requireRole(['ADMIN']), controller);
```

---

### 3. Order Middleware Correctly

```javascript
// Good: Authentication first, then validation, then business logic
router.post(
  '/thesis/submit',
  requireStudent,        // 1. Check auth/role
  validateInput,         // 2. Validate input
  uploadFile,            // 3. Handle file upload
  processThesis,         // 4. Business logic
  controller.create      // 5. Controller
);
```

---

### 4. Handle Errors Gracefully

```javascript
// Good: Let middleware handle authentication
router.get('/protected', requireAdmin, controller);

// Not needed: Manual checking
router.get('/protected', (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).send('Forbidden');
  }
  next();
}, controller);
```

---

## Extending the Middleware

### Adding New Roles

If you need to add new roles (e.g., `MODERATOR`):

1. **Update Prisma Schema:**
```prisma
enum Role {
  ADMIN
  STUDENT
  MODERATOR
}
```

2. **Add Shortcut Function:**
```javascript
const requireModerator = requireRole(['MODERATOR']);

module.exports = {
  // ... existing exports
  requireModerator,
};
```

3. **Use in Routes:**
```javascript
router.get('/moderate', requireModerator, moderateController);
```

---

### Custom Access Control

For more complex scenarios:

```javascript
const requireOwnerOrAdmin = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  const thesisId = req.params.id;
  const thesis = await prisma.thesis.findUnique({
    where: { id: parseInt(thesisId) },
  });

  // Allow if admin OR owner of the thesis
  if (req.user.role === 'ADMIN' || thesis.submitterId === req.user.id) {
    return next();
  }

  res.status(403).render('error', {
    title: '403 - Forbidden',
    statusCode: 403,
    message: 'You can only edit your own theses',
  });
};

router.put('/thesis/:id', requireOwnerOrAdmin, updateController);
```

---

## Troubleshooting

### Issue: "Cannot read property 'role' of undefined"

**Cause:** User is not in session (deserializeUser failed)

**Solution:**
```javascript
// In passport config, ensure deserializeUser returns user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});
```

---

### Issue: Redirect loops

**Cause:** Middleware redirecting to a route that also requires authentication

**Solution:**
```javascript
// Don't protect auth routes
app.use('/auth', authRoutes);  // No middleware here

// Protect other routes
app.use('/admin', requireAdmin, adminRoutes);
```

---

### Issue: 403 Error not displaying

**Cause:** Error view not found or wrong parameters

**Solution:**
```javascript
// Ensure error.ejs exists in views/
res.status(403).render('error', {
  title: '403 - Forbidden',
  statusCode: 403,
  message: 'Your error message',
  user: req.user,
});
```

---

## Security Considerations

1. **Always check authentication first** before checking roles
2. **Use httpOnly cookies** for session storage
3. **Enable CSRF protection** for state-changing operations
4. **Log access attempts** for security auditing
5. **Rate limit authentication attempts** to prevent brute force
6. **Use HTTPS in production** to protect session cookies

---

## Summary

The role-based middleware provides:

- ✅ Easy-to-use functions for protecting routes
- ✅ Automatic authentication checking
- ✅ Beautiful error pages
- ✅ Flash message support
- ✅ Return URL preservation
- ✅ Flexible role configuration
- ✅ Clean, maintainable code

Use the shortcut functions (`requireAdmin`, `requireStudent`, `requireAny`) for 90% of use cases, and fall back to `requireRole()` for custom scenarios.

---

**Last Updated:** 2024-10-30
**Version:** 1.0.0
