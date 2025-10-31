const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const path = require('path');
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

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    statusCode: 404,
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist',
    description: 'The requested URL was not found on this server.',
    user: req.user || null,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Handle JSON requests
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(statusCode).json({
      error: {
        message: message,
        status: statusCode,
      },
    });
  }

  // Render error page
  res.status(statusCode).render('error', {
    statusCode: statusCode,
    title: statusCode === 500 ? 'Server Error' : 'Error',
    message: message,
    description: statusCode === 500 ? 'Something went wrong on our end. Please try again later.' : null,
    user: req.user || null,
  });
});

module.exports = app;
