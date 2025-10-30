const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const adminController = require('../controllers/adminController');

/**
 * GET /admin/dashboard
 * Admin dashboard with statistics and recent data
 */
router.get('/dashboard', requireAdmin, adminController.dashboard);

module.exports = router;
