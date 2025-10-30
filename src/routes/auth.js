const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { isGuest } = require('../middleware/role');

/**
 * GET /auth/login
 * Display login page
 */
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
  });
});

/**
 * POST /auth/login
 * Process login
 */
router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/auth/login',
    failureFlash: true,
    failureMessage: 'Invalid username or password',
  }),
  (req, res) => {
    // Determine redirect path based on role
    let redirectPath;

    if (req.user.role === 'ADMIN') {
      redirectPath = '/admin/dashboard';
    } else if (req.user.role === 'STUDENT') {
      redirectPath = '/student/dashboard';
    } else {
      // Fallback
      redirectPath = '/';
    }

    // Check if there's a returnTo URL
    if (req.session.returnTo) {
      redirectPath = req.session.returnTo;
      delete req.session.returnTo;
    }

    // Set success message
    req.flash('success', `Welcome back, ${req.user.name}!`);

    res.redirect(redirectPath);
  }
);

/**
 * GET /auth/logout
 * Logout user
 */
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.flash('success', 'You have been logged out successfully');
    res.redirect('/auth/login');
  });
});

module.exports = router;
