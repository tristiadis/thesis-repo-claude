const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/role');
const adminController = require('../controllers/adminController');
const adminThesisController = require('../controllers/adminThesisController');
const facultyController = require('../controllers/facultyController');
const departmentController = require('../controllers/departmentController');
const lecturerController = require('../controllers/lecturerController');
const userController = require('../controllers/userController');
const studentController = require('../controllers/studentController');
const reviewRoutes = require('./review');
const multer = require('multer');
const path = require('path');

// Multer configuration for admin file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadAdmin = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

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
 * Thesis Submission Routes (Admin Upload)
 * Admin can upload thesis directly - status will be APPROVED but not published
 */
// Show submission form
router.get('/submit', requireAdmin, studentController.submitForm);

// Submit thesis (admin upload)
router.post('/submit', requireAdmin, studentController.submitThesis);

// Save as draft (optional for admin)
router.post('/submit/draft', requireAdmin, studentController.saveDraft);

/**
 * Publish/Unpublish Thesis Routes
 * Control public visibility of approved theses
 */
// Publish thesis (make publicly visible)
router.post('/thesis/:id/publish', requireAdmin, adminController.publishThesis);

// Unpublish thesis (hide from public view)
router.post('/thesis/:id/unpublish', requireAdmin, adminController.unpublishThesis);

/**
 * Thesis Management Routes (New Flexible System)
 * Admin upload with flexible file labels and edit functionality
 */
// Show admin upload form (single-page, flexible files)
router.get('/thesis/upload', requireAdmin, adminThesisController.showUploadForm);

// Store new thesis (admin upload)
router.post('/thesis/upload', requireAdmin, adminThesisController.storeThesis);

// Show edit form
router.get('/thesis/:id/edit', requireAdmin, adminThesisController.showEditForm);

// Update thesis metadata
router.post('/thesis/:id/update', requireAdmin, adminThesisController.updateThesis);

// File management for existing thesis
router.post('/thesis/:id/files/upload', requireAdmin, uploadAdmin.single('file'), adminThesisController.uploadFileToThesis);
router.delete('/thesis/:id/files/:fileId', requireAdmin, adminThesisController.deleteFileFromThesis);
router.patch('/thesis/:id/files/:fileId', requireAdmin, adminThesisController.updateFileMetadata);

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
