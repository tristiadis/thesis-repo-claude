const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');

/**
 * GET /admin/dashboard
 * Admin dashboard (placeholder)
 */
router.get('/dashboard', requireAdmin, (req, res) => {
  // Placeholder statistics - TODO: Implement actual statistics queries
  const stats = {
    totalUsers: 0,
    totalTheses: 0,
    pendingTheses: 0,
    approvedThisMonth: 0,
  };

  // Placeholder recent activities - TODO: Implement actual activity tracking
  const recentActivities = [];

  res.renderWithLayout(
    'admin/dashboard',
    {
      title: 'Dashboard',
      pageTitle: 'Dashboard',
      stats,
      recentActivities,
    },
    'admin'
  );
});

module.exports = router;
