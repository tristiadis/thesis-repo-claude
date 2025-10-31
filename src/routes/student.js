/**
 * Student Routes
 * Handles all student-specific routes (dashboard, submission, etc.)
 */

const express = require('express');
const router = express.Router();
const { requireStudent } = require('../middleware/role');
const studentController = require('../controllers/studentController');

// ============================================================================
// STUDENT DASHBOARD
// ============================================================================

/**
 * GET /student/dashboard
 * Student dashboard - shows thesis status or empty state
 */
router.get('/dashboard', requireStudent, studentController.dashboard);

// ============================================================================
// THESIS SUBMISSION (To be implemented in P3.2)
// ============================================================================

// router.get('/submit', requireStudent, studentController.submitForm);
// router.post('/submit', requireStudent, studentController.submitThesis);
// router.get('/thesis/:id/edit', requireStudent, studentController.editForm);
// router.post('/thesis/:id/update', requireStudent, studentController.updateThesis);

module.exports = router;
