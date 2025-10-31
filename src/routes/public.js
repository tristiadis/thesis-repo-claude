/**
 * Public Routes
 * Routes for public-facing pages (no authentication required)
 */

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const searchController = require('../controllers/searchController');
const browseController = require('../controllers/browseController');

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

module.exports = router;
