/**
 * Authentication Middleware
 * Provides authentication and authorization checks for routes
 */

/**
 * Check if user is authenticated
 * Redirects to login page if not authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // Store the original URL to redirect after login
  req.session.returnTo = req.originalUrl;

  // Flash message for unauthenticated access
  req.session.flashMessage = {
    type: 'error',
    message: 'Please log in to access this page',
  };

  res.redirect('/auth/login');
};

/**
 * Check if user is a guest (not authenticated)
 * Redirects authenticated users to their dashboard
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

/**
 * Role-based access control
 * Checks if user has required role(s)
 * @param {string|string[]} roles - Role or array of roles allowed to access
 */
const requireRole = (roles) => {
  // Convert single role to array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl;
      req.session.flashMessage = {
        type: 'error',
        message: 'Please log in to access this page',
      };
      return res.redirect('/auth/login');
    }

    // Check if user has required role
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // User doesn't have required role
    req.session.flashMessage = {
      type: 'error',
      message: 'You do not have permission to access this page',
    };

    // Redirect to appropriate dashboard
    const redirectPath =
      req.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';

    res.redirect(redirectPath);
  };
};

/**
 * Admin only access
 * Shorthand for requireRole('ADMIN')
 */
const requireAdmin = requireRole('ADMIN');

/**
 * Student only access
 * Shorthand for requireRole('STUDENT')
 */
const requireStudent = requireRole('STUDENT');

module.exports = {
  isAuthenticated,
  isGuest,
  requireRole,
  requireAdmin,
  requireStudent,
};
