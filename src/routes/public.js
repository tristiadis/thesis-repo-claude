/**
 * Public Routes
 * Routes for public-facing pages (no authentication required)
 */

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const searchController = require('../controllers/searchController');

// GET / - Homepage
router.get('/', publicController.index);

// GET /search - Search theses
router.get('/search', searchController.search);

module.exports = router;
