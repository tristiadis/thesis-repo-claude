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
// THESIS SUBMISSION
// ============================================================================

/**
 * GET /student/submit
 * Show thesis submission form
 */
router.get('/submit', requireStudent, studentController.submitForm);

/**
 * POST /student/submit/draft
 * Save thesis as draft
 */
router.post('/submit/draft', requireStudent, studentController.saveDraft);

/**
 * POST /student/submit
 * Submit thesis for review
 */
router.post('/submit', requireStudent, studentController.submitThesis);

module.exports = router;
