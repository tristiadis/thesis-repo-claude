/**
 * Layout Middleware
 *
 * Provides res.renderWithLayout() function to render views with layouts
 *
 * Usage:
 *   res.renderWithLayout('admin/dashboard', { pageTitle: 'Dashboard' }, 'admin');
 *
 * Available Layouts:
 *   - 'main'    : Public pages layout (views/layouts/main.ejs)
 *   - 'admin'   : Admin panel layout (views/layouts/admin.ejs)
 *   - 'student' : Student portal layout (views/layouts/student.ejs)
 */

const path = require('path');

/**
 * Layout middleware - Injects res.renderWithLayout() function
 */
const layoutMiddleware = (req, res, next) => {
  /**
   * Render a view with a layout
   *
   * @param {string} view - View path (e.g., 'admin/dashboard')
   * @param {object} data - Data to pass to the view
   * @param {string} layoutName - Layout name ('main', 'admin', 'student')
   * @param {function} callback - Optional callback(err, html)
   */
  res.renderWithLayout = function(view, data = {}, layoutName = 'main', callback) {
    // Validate layout name
    const validLayouts = ['main', 'admin', 'student'];
    if (!validLayouts.includes(layoutName)) {
      const err = new Error(`Invalid layout name: ${layoutName}. Valid layouts: ${validLayouts.join(', ')}`);
      if (callback) return callback(err);
      throw err;
    }

    // Default data that should be available in all views
    const defaultData = {
      // User context
      user: req.user || null,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,

      // Flash message (if exists)
      flashMessage: req.flash ? (req.flash('success')[0] ? { type: 'success', message: req.flash('success')[0] } :
                                req.flash('error')[0] ? { type: 'error', message: req.flash('error')[0] } :
                                req.flash('warning')[0] ? { type: 'warning', message: req.flash('warning')[0] } :
                                req.flash('info')[0] ? { type: 'info', message: req.flash('info')[0] } : null) : null,

      // Current URL path (for active menu highlighting)
      currentPath: req.path,

      // Query parameters
      query: req.query,
    };

    // Merge default data with provided data
    const viewData = { ...defaultData, ...data };

    // First, render the view content
    res.render(view, viewData, (err, html) => {
      if (err) {
        if (callback) return callback(err);
        return next(err);
      }

      // Prepare layout data
      const layoutData = {
        ...viewData,
        body: html, // Inject rendered view as 'body' variable
      };

      // Render the layout with the view content
      const layoutPath = path.join('layouts', layoutName);
      res.render(layoutPath, layoutData, (err, finalHtml) => {
        if (err) {
          if (callback) return callback(err);
          return next(err);
        }

        if (callback) {
          callback(null, finalHtml);
        } else {
          res.send(finalHtml);
        }
      });
    });
  };

  next();
};

/**
 * Helper function to set flash message and redirect
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {string} type - Flash type ('success', 'error', 'warning', 'info')
 * @param {string} message - Flash message
 * @param {string} redirectPath - Path to redirect to
 */
const flashAndRedirect = (req, res, type, message, redirectPath) => {
  if (req.flash) {
    req.flash(type, message);
  }
  res.redirect(redirectPath);
};

/**
 * Helper middleware to set common layout variables based on user role
 */
const setLayoutDefaults = (req, res, next) => {
  // Set common variables for admin layout
  if (req.user && req.user.role === 'ADMIN') {
    res.locals.notificationCount = 0; // TODO: Implement actual notification count
    res.locals.pendingCount = 0;      // TODO: Implement actual pending thesis count
  }

  // Set common variables for student layout
  if (req.user && req.user.role === 'STUDENT') {
    res.locals.canSubmit = true; // TODO: Implement actual submission eligibility check
  }

  next();
};

module.exports = {
  layoutMiddleware,
  flashAndRedirect,
  setLayoutDefaults,
};
