const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const adminController = require('../controllers/adminController');
const facultyController = require('../controllers/facultyController');
const departmentController = require('../controllers/departmentController');
const lecturerController = require('../controllers/lecturerController');
const userController = require('../controllers/userController');
const reviewRoutes = require('./review');

/**
 * GET /admin/dashboard
 * Admin dashboard with statistics and recent data
 */
router.get('/dashboard', requireAdmin, adminController.dashboard);

/**
 * GET /admin/statistics
 * Statistics dashboard with comprehensive charts and reports
 */
router.get('/statistics', requireAdmin, adminController.statistics);

/**
 * GET /admin/statistics/export
 * Export statistics report (CSV or JSON)
 */
router.get('/statistics/export', requireAdmin, adminController.exportStatistics);

/**
 * Review Routes
 * Mount review routes under /admin/review
 */
router.use('/review', reviewRoutes);

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

/**
 * Department Routes
 */
// List all departments
router.get('/departments', requireAdmin, departmentController.index);

// Show create form
router.get('/departments/create', requireAdmin, departmentController.create);

// Store new department
router.post('/departments', requireAdmin, departmentController.store);

// Show edit form
router.get('/departments/:id/edit', requireAdmin, departmentController.edit);

// Update department
router.post('/departments/:id/update', requireAdmin, departmentController.update);

// Delete department
router.post('/departments/:id/delete', requireAdmin, departmentController.destroy);

/**
 * Lecturer Routes
 */
// List all lecturers
router.get('/lecturers', requireAdmin, lecturerController.index);

// Show create form
router.get('/lecturers/create', requireAdmin, lecturerController.create);

// Store new lecturer
router.post('/lecturers', requireAdmin, lecturerController.store);

// Show edit form
router.get('/lecturers/:id/edit', requireAdmin, lecturerController.edit);

// Update lecturer
router.post('/lecturers/:id/update', requireAdmin, lecturerController.update);

// Delete lecturer
router.post('/lecturers/:id/delete', requireAdmin, lecturerController.destroy);

/**
 * User Routes
 */
// List all users
router.get('/users', requireAdmin, userController.index);

// Show create form
router.get('/users/create', requireAdmin, userController.create);

// Store new user (student)
router.post('/users', requireAdmin, userController.store);

// Reset user password
router.post('/users/:id/reset-password', requireAdmin, userController.resetPassword);

// Toggle user status (activate/deactivate)
router.post('/users/:id/toggle-status', requireAdmin, userController.toggleStatus);

module.exports = router;
