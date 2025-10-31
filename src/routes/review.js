/**
 * Review Routes
 * Routes for admin review of thesis submissions
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All review routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// GET /admin/review - Review queue (list of pending theses)
router.get('/', reviewController.index);

// GET /admin/review/:id - Detailed review page
router.get('/:id', reviewController.show);

// GET /admin/review/:thesisId/download/:fileId - Download file
router.get('/:thesisId/download/:fileId', reviewController.downloadFile);

// GET /admin/review/:thesisId/preview/:fileId - Preview file (for modal)
router.get('/:thesisId/preview/:fileId', reviewController.previewFile);

// POST /admin/review/:id/approve - Approve and publish thesis
router.post('/:id/approve', reviewController.approve);

// POST /admin/review/:id/request-changes - Request changes from student
router.post('/:id/request-changes', reviewController.requestChanges);

// POST /admin/review/:id/reject - Reject thesis
router.post('/:id/reject', reviewController.reject);

module.exports = router;
