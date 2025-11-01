/**
 * Rate Limiting Configuration
 * Prevents abuse and brute force attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * Applies to all requests
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).render('error', {
      statusCode: 429,
      title: 'Too Many Requests',
      message: 'Rate Limit Exceeded',
      details: 'You have made too many requests. Please try again in 15 minutes.',
      user: req.user || null,
    });
  },
});

/**
 * Authentication Rate Limiter (Stricter)
 * Protects against brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'Too many login attempts. Please try again in 15 minutes.');
    res.redirect('/auth/login');
  },
});

/**
 * Registration Rate Limiter
 * Prevents spam account creation
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash('error', 'Too many registration attempts. Please try again in 1 hour.');
    res.redirect('/auth/register');
  },
});

/**
 * API Rate Limiter (for JSON endpoints)
 * More lenient than general limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for API requests
  message: {
    error: 'API rate limit exceeded',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password Reset Rate Limiter
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Form Submission Rate Limiter
 * General protection for form submissions
 */
const formLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 form submissions per minute
  message: {
    error: 'Too many form submissions, please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create custom rate limiter with specific options
 */
function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  apiLimiter,
  passwordResetLimiter,
  formLimiter,
  createLimiter,
};
