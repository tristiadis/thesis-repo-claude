/**
 * Security Utilities
 * Input sanitization, XSS prevention, and security helpers
 */

const xss = require('xss');
const crypto = require('crypto');

/**
 * XSS Configuration
 * Whitelist safe HTML tags and attributes
 */
const xssOptions = {
  whiteList: {
    // Allow basic formatting
    p: [],
    br: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    u: [],
    // Allow lists
    ul: [],
    ol: [],
    li: [],
    // Allow links (with safe attributes only)
    a: ['href', 'title', 'target'],
  },
  stripIgnoreTag: true, // Remove unsafe tags entirely
  stripIgnoreTagBody: ['script', 'style'], // Remove script and style tag content
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @param {object} options - XSS options (optional)
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }

  // Use custom options if provided
  const xssConfig = { ...xssOptions, ...options };

  return xss(input, xssConfig);
}

/**
 * Sanitize all string fields in an object
 * @param {object} obj - Object to sanitize
 * @param {array} excludeKeys - Keys to exclude from sanitization
 * @returns {object} Sanitized object
 */
function sanitizeObject(obj, excludeKeys = []) {
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      // Skip sanitization for excluded keys (e.g., passwords)
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, excludeKeys);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Strip all HTML tags from input
 * @param {string} input - Input with potential HTML
 * @returns {string} Plain text
 */
function stripHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 * @param {string} input - Input to escape
 * @returns {string} Escaped string
 */
function escapeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Generate secure random token
 * @param {number} length - Token length (default: 32)
 * @returns {string} Random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (e.g., IP addresses)
 * @param {string} data - Data to hash
 * @param {string} salt - Salt for hashing
 * @returns {string} Hashed data
 */
function hashData(data, salt = process.env.HASH_SALT || 'default-salt') {
  return crypto
    .createHash('sha256')
    .update(data + salt)
    .digest('hex');
}

/**
 * Validate file extension
 * @param {string} filename - File name to validate
 * @param {array} allowedExtensions - Allowed extensions (e.g., ['.pdf', '.jpg'])
 * @returns {boolean} True if valid
 */
function isValidFileExtension(filename, allowedExtensions = ['.pdf']) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
}

/**
 * Validate MIME type
 * @param {string} mimeType - MIME type to validate
 * @param {array} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid
 */
function isValidMimeType(mimeType, allowedTypes = ['application/pdf']) {
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Generate safe filename from user input
 * @param {string} originalFilename - Original filename
 * @returns {string} Safe filename
 */
function generateSafeFilename(originalFilename) {
  // Get extension
  const ext = originalFilename.substring(originalFilename.lastIndexOf('.'));

  // Generate random name
  const randomName = generateSecureToken(16);

  // Return safe filename
  return `${randomName}${ext}`;
}

/**
 * Sanitize filename (remove dangerous characters)
 * @param {string} filename - Filename to sanitize
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename) {
  // Remove path traversal attempts
  filename = filename.replace(/\.\./g, '');

  // Remove dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (filename.length > 255) {
    const ext = filename.substring(filename.lastIndexOf('.'));
    filename = filename.substring(0, 255 - ext.length) + ext;
  }

  return filename;
}

/**
 * Check if string contains SQL injection patterns
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious patterns found
 */
function containsSqlInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  // Trim and lowercase
  email = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(email)) {
    return null;
  }

  return email;
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @param {array} allowedProtocols - Allowed protocols (default: http, https)
 * @returns {boolean} True if valid
 */
function isValidUrl(url, allowedProtocols = ['http:', 'https:']) {
  try {
    const urlObj = new URL(url);
    return allowedProtocols.includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(excludeKeys = ['password', 'confirmPassword']) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, excludeKeys);
    }
    next();
  };
}

/**
 * Middleware to check for SQL injection in query parameters
 */
function checkSqlInjection() {
  return (req, res, next) => {
    const checkParams = (params) => {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' && containsSqlInjection(value)) {
          const error = new Error('Suspicious input detected');
          error.statusCode = 400;
          return next(error);
        }
      }
    };

    checkParams(req.query);
    checkParams(req.params);

    if (req.body && typeof req.body === 'object') {
      checkParams(req.body);
    }

    next();
  };
}

/**
 * Security headers middleware (additional to Helmet)
 */
function securityHeaders() {
  return (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS Protection (legacy but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()'
    );

    next();
  };
}

module.exports = {
  // XSS Prevention
  sanitizeInput,
  sanitizeObject,
  stripHtml,
  escapeHtml,

  // Token Generation
  generateSecureToken,
  hashData,

  // File Security
  isValidFileExtension,
  isValidMimeType,
  generateSafeFilename,
  sanitizeFilename,

  // SQL Injection Prevention
  containsSqlInjection,

  // Input Validation
  sanitizeEmail,
  isValidUrl,

  // Middleware
  sanitizeBody,
  checkSqlInjection,
  securityHeaders,
};
