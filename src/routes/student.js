const express = require('express');
const router = express.Router();
const { requireStudent } = require('../middleware/role');

/**
 * GET /student/dashboard
 * Student dashboard (placeholder)
 */
router.get('/dashboard', requireStudent, (req, res) => {
  // Placeholder statistics - TODO: Implement actual statistics queries
  const stats = {
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
  };

  // Placeholder recent submissions - TODO: Implement actual queries
  const recentSubmissions = [];

  res.renderWithLayout(
    'student/dashboard',
    {
      title: 'Dashboard',
      stats,
      recentSubmissions,
    },
    'student'
  );
});

module.exports = router;
