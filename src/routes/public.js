/**
 * Public Routes
 * Routes for public-facing pages (no authentication required)
 */

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const searchController = require('../controllers/searchController');
const browseController = require('../controllers/browseController');
const thesisController = require('../controllers/thesisController');

// GET / - Homepage
router.get('/', publicController.index);

// GET /search - Search theses
router.get('/search', searchController.search);

// Browse routes
// GET /browse/faculties - Browse all faculties
router.get('/browse/faculties', browseController.browseFaculties);

// GET /browse/faculties/:id - Faculty detail with departments
router.get('/browse/faculties/:id', browseController.facultyDetail);

// GET /browse/departments/:id - Department detail with theses
router.get('/browse/departments/:id', browseController.departmentDetail);

// GET /browse/years - Browse all years
router.get('/browse/years', browseController.browseYears);

// GET /browse/years/:year - Year detail with theses
router.get('/browse/years/:year', browseController.yearDetail);

// Thesis detail routes
// GET /thesis/:id/export/ris - Export thesis citation in RIS format
router.get('/thesis/:id/export/ris', thesisController.exportRIS);

// GET /thesis/:thesisId/files/:fileId/preview - Preview PDF file
router.get('/thesis/:thesisId/files/:fileId/preview', thesisController.previewFile);

// GET /thesis/:id or /thesis/:id/:slug - Thesis detail page
router.get('/thesis/:id/:slug?', thesisController.show);

module.exports = router;
