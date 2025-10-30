const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');

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

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);

// Home route - Redirect to login
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    // Redirect authenticated users to their dashboard
    const redirectPath =
      req.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';
    return res.redirect(redirectPath);
  }
  res.redirect('/auth/login');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 100px;
          }
          h1 { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/">Go back home</a>
      </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    res.status(statusCode).json({
      error: {
        message: message,
        status: statusCode,
      },
    });
  } else {
    res.status(statusCode).send(`
      <html>
        <head>
          <title>Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 100px;
            }
            h1 { color: #dc3545; }
          </style>
        </head>
        <body>
          <h1>Error ${statusCode}</h1>
          <p>${message}</p>
          <a href="/">Go back home</a>
        </body>
      </html>
    `);
  }
});

module.exports = app;
