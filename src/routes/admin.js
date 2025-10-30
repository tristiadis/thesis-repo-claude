const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const adminController = require('../controllers/adminController');
const facultyController = require('../controllers/facultyController');

/**
 * GET /admin/dashboard
 * Admin dashboard with statistics and recent data
 */
router.get('/dashboard', requireAdmin, adminController.dashboard);

/**
 * Faculty Routes
 */
// List all faculties
router.get('/faculties', requireAdmin, facultyController.index);

// Show create form
router.get('/faculties/create', requireAdmin, facultyController.create);

// Store new faculty
router.post('/faculties', requireAdmin, facultyController.store);

// Show edit form
router.get('/faculties/:id/edit', requireAdmin, facultyController.edit);

// Update faculty
router.post('/faculties/:id/update', requireAdmin, facultyController.update);

// Delete faculty
router.post('/faculties/:id/delete', requireAdmin, facultyController.destroy);

module.exports = router;
