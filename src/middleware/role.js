/**
 * Role-Based Access Control Middleware
 * Provides reusable middleware functions for protecting routes by user role
 */

/**
 * Require specific role(s) to access a route
 * @param {string|string[]} allowedRoles - Role or array of roles allowed to access
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/admin/dashboard', requireRole(['ADMIN']), dashboardController);
 * router.get('/profile', requireRole(['ADMIN', 'STUDENT']), profileController);
 */
const requireRole = (allowedRoles) => {
  // Convert single role to array for consistent handling
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      // Store the original URL to redirect after login
      req.session.returnTo = req.originalUrl;

      // Set flash message
      req.session.flashMessage = {
        type: 'error',
        message: 'Please log in to access this page',
      };

      return res.redirect('/auth/login');
    }

    // Check if user has one of the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }

    // User is authenticated but doesn't have required role
    // Render 403 Forbidden error page
    return res.status(403).render('error', {
      title: '403 - Forbidden',
      statusCode: 403,
      message: "You don't have permission to access this page",
      description: `This page requires ${roles.length > 1 ? 'one of the following roles' : 'the following role'}: ${roles.join(', ')}`,
      user: req.user,
    });
  };
};

/**
 * Require ADMIN role
 * Shortcut for requireRole(['ADMIN'])
 *
 * @example
 * router.get('/admin/users', requireAdmin, getUsersController);
 */
const requireAdmin = requireRole(['ADMIN']);

/**
 * Require STUDENT role
 * Shortcut for requireRole(['STUDENT'])
 *
 * @example
 * router.get('/student/submit', requireStudent, submitController);
 */
const requireStudent = requireRole(['STUDENT']);

/**
 * Allow any authenticated user (ADMIN or STUDENT)
 * Shortcut for requireRole(['ADMIN', 'STUDENT'])
 *
 * @example
 * router.get('/profile', requireAny, profileController);
 */
const requireAny = requireRole(['ADMIN', 'STUDENT']);

/**
 * Check if user is authenticated (any role)
 * Redirects to login if not authenticated
 *
 * @example
 * router.get('/dashboard', isAuthenticated, dashboardController);
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  req.session.flashMessage = {
    type: 'error',
    message: 'Please log in to access this page',
  };

  res.redirect('/auth/login');
};

/**
 * Check if user is guest (not authenticated)
 * Redirects authenticated users to their dashboard
 *
 * @example
 * router.get('/login', isGuest, loginController);
 */
const isGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }

  // Redirect to appropriate dashboard based on role
  const redirectPath =
    req.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';

  res.redirect(redirectPath);
};

module.exports = {
  requireRole,
  requireAdmin,
  requireStudent,
  requireAny,
  isAuthenticated,
  isGuest,
};
