const express = require('express');
const session = require('express-session');
const passport = require('passport');
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
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
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

// Routes will be added here
// Example:
// const authRoutes = require('./routes/auth.routes');
// const adminRoutes = require('./routes/admin.routes');
// const studentRoutes = require('./routes/student.routes');

// app.use('/auth', authRoutes);
// app.use('/admin', adminRoutes);
// app.use('/student', studentRoutes);

// Home route (temporary)
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>${process.env.APP_NAME || 'Thesis Repository System'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          h1 { color: #333; }
          .status { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>🎓 ${process.env.APP_NAME || 'Thesis Repository System'}</h1>
        <p class="status">✓ Server is running successfully!</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <hr>
        <p><small>Configure your routes in src/app.js to get started</small></p>
      </body>
    </html>
  `);
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
