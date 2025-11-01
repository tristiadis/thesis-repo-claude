const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const i18n = require('./config/i18n');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./config/rateLimits');
const { securityHeaders, checkSqlInjection } = require('./utils/security');
const { layoutMiddleware, setLayoutDefaults } = require('./middleware/layout');

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Security: Helmet - Must be one of the first middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Tailwind inline styles
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Alpine.js inline scripts
          'https://cdn.tailwindcss.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for CDN resources
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Security: Additional security headers
app.use(securityHeaders());

// Security: SQL Injection detection (basic)
app.use(checkSqlInjection());

// Security: General rate limiting (applied to all routes)
if (process.env.RATE_LIMIT_ENABLED !== 'false') {
  app.use(generalLimiter);
  logger.info('Rate limiting enabled');
}

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded payload size
app.use(cookieParser()); // Required for CSRF protection
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration with security best practices
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Don't use default 'connect.sid' name
  cookie: {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 2 * 60 * 60 * 1000, // 2 hours default
    domain: process.env.COOKIE_DOMAIN || undefined, // Set domain for subdomain support
  },
  proxy: true, // Trust proxy for secure cookies
  rolling: true, // Reset cookie maxAge on every request
};

// Use PostgreSQL session store in production
if (process.env.NODE_ENV === 'production') {
  const pgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new pgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
  });
}

app.use(session(sessionConfig));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// i18n initialization
app.use(i18n.init);

// Make locale and translation functions available in all views
app.use((req, res, next) => {
  res.locals.locale = req.getLocale();
  res.locals.__ = req.__;
  res.locals.__n = req.__n;
  next();
});

// Layout middleware - adds res.renderWithLayout()
app.use(layoutMiddleware);

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// Set layout defaults (notification counts, etc.)
app.use(setLayoutDefaults);

// Routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const uploadRoutes = require('./routes/upload');

// Public routes (homepage and browse pages)
app.use('/', publicRoutes);

// Authentication and protected routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/upload', uploadRoutes);

// 404 handler - must be after all routes
app.use((req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).render('errors/404', {
    title: req.__('errors.404.title'),
    message: req.__('errors.404.message'),
    user: req.user || null,
  });
});

// Global error handler - must be last middleware
app.use(errorHandler);

module.exports = app;
