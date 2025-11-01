/**
 * Global Error Handler Middleware
 * Handles all errors in the application with appropriate responses
 */

const logger = require('../config/logger');

/**
 * Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logError(err, req);

  // Determine if request expects JSON
  const expectsJson = req.xhr || req.headers.accept?.indexOf('json') > -1;

  // Prisma Database Errors
  if (err.code && err.code.startsWith('P')) {
    return handlePrismaError(err, req, res, expectsJson);
  }

  // Multer File Upload Errors
  if (err.name === 'MulterError') {
    return handleMulterError(err, req, res, expectsJson);
  }

  // Validation Errors (from Joi or custom validation)
  if (err.name === 'ValidationError') {
    return handleValidationError(err, req, res, expectsJson);
  }

  // Authentication Errors
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return handleAuthError(err, req, res, expectsJson);
  }

  // Not Found Errors
  if (err.statusCode === 404) {
    return handleNotFoundError(err, req, res, expectsJson);
  }

  // Forbidden Errors
  if (err.statusCode === 403) {
    return handleForbiddenError(err, req, res, expectsJson);
  }

  // Default Server Error
  handleServerError(err, req, res, expectsJson);
};

/**
 * Handle Prisma Database Errors
 */
function handlePrismaError(err, req, res, expectsJson) {
  let statusCode = 500;
  let message = req.__('messages.error.general');
  let details = null;

  switch (err.code) {
    case 'P2002':
      // Unique constraint violation
      statusCode = 400;
      message = req.__('messages.error.validation');
      details = `Duplicate entry for ${err.meta?.target?.join(', ') || 'field'}`;
      logger.logDatabaseError(err, 'Unique constraint violation');
      break;

    case 'P2003':
      // Foreign key constraint violation
      statusCode = 400;
      message = 'Related record not found';
      details = err.meta?.field_name || 'Invalid reference';
      logger.logDatabaseError(err, 'Foreign key constraint');
      break;

    case 'P2025':
      // Record not found
      statusCode = 404;
      message = req.__('messages.error.not_found');
      details = 'The requested record does not exist';
      logger.logDatabaseError(err, 'Record not found');
      break;

    case 'P2014':
      // Required relation violation
      statusCode = 400;
      message = 'Invalid data relationship';
      details = err.meta?.relation_name || 'Missing required relation';
      logger.logDatabaseError(err, 'Required relation violation');
      break;

    default:
      logger.logDatabaseError(err, 'Unknown Prisma error');
      statusCode = 500;
      message = req.__('messages.error.server');
      details = process.env.NODE_ENV === 'development' ? err.message : null;
  }

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
      details: details,
      code: err.code,
    });
  }

  return res.status(statusCode).render('error', {
    statusCode,
    title: 'Database Error',
    message,
    details,
    user: req.user || null,
  });
}

/**
 * Handle Multer File Upload Errors
 */
function handleMulterError(err, req, res, expectsJson) {
  let statusCode = 400;
  let message = 'File upload error';
  let details = err.message;

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = req.__('upload.file_too_large', 10);
      details = `Maximum file size is ${(err.limit / 1024 / 1024).toFixed(2)} MB`;
      break;

    case 'LIMIT_FILE_COUNT':
      message = 'Too many files';
      details = `Maximum ${err.limit} files allowed`;
      break;

    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected file field';
      details = `Unexpected field: ${err.field}`;
      break;

    default:
      message = req.__('messages.error.upload_failed');
      details = err.message;
  }

  logger.warn('File upload error', {
    code: err.code,
    message: err.message,
    field: err.field,
  });

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
      details,
      code: err.code,
    });
  }

  return res.status(statusCode).render('error', {
    statusCode,
    title: 'File Upload Error',
    message,
    details,
    user: req.user || null,
  });
}

/**
 * Handle Validation Errors
 */
function handleValidationError(err, req, res, expectsJson) {
  const statusCode = 400;
  const message = err.message || req.__('messages.error.validation');
  const details = err.details || [];

  logger.logValidationError(details, req);

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
      details: details.map((d) => ({
        field: d.path ? d.path.join('.') : d.field || 'unknown',
        message: d.message,
      })),
    });
  }

  // For HTML responses, redirect back with flash message
  req.flash('error', message);
  if (details.length > 0) {
    details.forEach((d) => {
      req.flash('error', `${d.path ? d.path.join('.') : d.field}: ${d.message}`);
    });
  }

  return res.redirect('back');
}

/**
 * Handle Authentication Errors
 */
function handleAuthError(err, req, res, expectsJson) {
  const statusCode = 401;
  const message = err.message || req.__('auth.unauthorized');

  logger.info('Authentication error', {
    url: req.originalUrl,
    message,
  });

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
      redirectTo: '/auth/login',
    });
  }

  req.flash('error', message);
  return res.redirect('/auth/login');
}

/**
 * Handle Not Found Errors
 */
function handleNotFoundError(err, req, res, expectsJson) {
  const statusCode = 404;
  const message = err.message || req.__('errors.404.message');

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
    });
  }

  return res.status(statusCode).render('errors/404', {
    title: req.__('errors.404.title'),
    message,
    user: req.user || null,
  });
}

/**
 * Handle Forbidden Errors
 */
function handleForbiddenError(err, req, res, expectsJson) {
  const statusCode = 403;
  const message = err.message || req.__('errors.403.message');

  logger.info('Forbidden access attempt', {
    url: req.originalUrl,
    user: req.user?.id,
  });

  if (expectsJson) {
    return res.status(statusCode).json({
      error: message,
    });
  }

  return res.status(statusCode).render('errors/403', {
    title: req.__('errors.403.title'),
    message,
    details: err.details || null,
    user: req.user || null,
  });
}

/**
 * Handle General Server Errors
 */
function handleServerError(err, req, res, expectsJson) {
  const statusCode = err.statusCode || 500;
  const message = err.message || req.__('errors.500.message');

  logger.error('Server error', {
    statusCode,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
  });

  if (expectsJson) {
    return res.status(statusCode).json({
      error: statusCode === 500 ? req.__('messages.error.server') : message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  return res.status(statusCode).render('errors/500', {
    title: req.__('errors.500.title'),
    message: statusCode === 500 ? req.__('errors.500.message') : message,
    details: process.env.NODE_ENV === 'development' ? err.stack : null,
    statusCode,
    user: req.user || null,
  });
}

module.exports = errorHandler;
