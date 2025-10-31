/**
 * Public Routes
 * Routes for public-facing pages (no authentication required)
 */

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// GET / - Homepage
router.get('/', publicController.index);

module.exports = router;
