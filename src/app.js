const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const path = require('path');
const i18n = require('./config/i18n');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { layoutMiddleware, setLayoutDefaults } = require('./middleware/layout');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours (7200000 ms)
  },
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
