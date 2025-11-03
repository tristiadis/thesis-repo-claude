/**
 * Rate Limiter Middleware
 *
 * Simple in-memory rate limiter for download requests
 * Prevents abuse by limiting downloads per IP address
 */

// Store for tracking download attempts
// Structure: { ipAddress: { count: number, resetTime: timestamp } }
const downloadAttempts = new Map();

// Configuration
const MAX_DOWNLOADS = 20; // Maximum downloads per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of downloadAttempts.entries()) {
    if (now > data.resetTime) {
      downloadAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Download Rate Limiter Middleware
 *
 * Limits downloads to MAX_DOWNLOADS per IP per hour
 */
const downloadRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Get or create entry for this IP
  let attempt = downloadAttempts.get(ip);

  if (!attempt) {
    // First request from this IP
    attempt = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    downloadAttempts.set(ip, attempt);
    return next();
  }

  // Check if window has expired
  if (now > attempt.resetTime) {
    // Reset the counter
    attempt.count = 1;
    attempt.resetTime = now + WINDOW_MS;
    downloadAttempts.set(ip, attempt);
    return next();
  }

  // Check if limit exceeded
  if (attempt.count >= MAX_DOWNLOADS) {
    const resetIn = Math.ceil((attempt.resetTime - now) / 1000 / 60); // minutes

    return res.status(429).render('error', {
      title: 'Too Many Requests',
      message: 'Too Many Download Requests',
      details: `You have exceeded the maximum number of downloads (${MAX_DOWNLOADS} per hour). Please try again in ${resetIn} minutes.`,
      statusCode: 429
    });
  }

  // Increment counter
  attempt.count++;
  downloadAttempts.set(ip, attempt);

  next();
};

module.exports = downloadRateLimiter;
