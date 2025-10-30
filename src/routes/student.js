const express = require('express');
const router = express.Router();
const { requireStudent } = require('../middleware/auth');

/**
 * GET /student/dashboard
 * Student dashboard (placeholder)
 */
router.get('/dashboard', requireStudent, (req, res) => {
  // Get flash message from session
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Student Dashboard - Thesis Repository System</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="bg-gray-100">
      <nav class="bg-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <i class="fas fa-graduation-cap text-blue-600 text-2xl mr-3"></i>
              <span class="text-xl font-bold text-gray-800">Thesis Repository</span>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">
                <i class="fas fa-user text-blue-600 mr-2"></i>
                ${req.user.name}
              </span>
              <a href="/auth/logout" class="text-red-600 hover:text-red-800">
                <i class="fas fa-sign-out-alt mr-1"></i> Logout
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        ${
          flashMessage
            ? `
          <div class="mb-6 ${
            flashMessage.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
          } border-l-4 p-4 rounded">
            <p class="${flashMessage.type === 'success' ? 'text-green-700' : 'text-red-700'} text-sm">
              ${flashMessage.message}
            </p>
          </div>
        `
            : ''
        }

        <div class="bg-white shadow rounded-lg p-6 mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            <i class="fas fa-tachometer-alt text-blue-600 mr-3"></i>Student Dashboard
          </h1>
          <p class="text-gray-600">Welcome to your student dashboard. This is a placeholder page.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <i class="fas fa-file-upload text-white text-2xl"></i>
              </div>
              <div class="ml-5">
                <p class="text-sm font-medium text-gray-500">My Submissions</p>
                <p class="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                <i class="fas fa-check-circle text-white text-2xl"></i>
              </div>
              <div class="ml-5">
                <p class="text-sm font-medium text-gray-500">Approved Theses</p>
                <p class="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            <i class="fas fa-list text-blue-600 mr-2"></i>Quick Actions
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <i class="fas fa-plus mr-2"></i> Submit New Thesis
            </button>
            <button class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
              <i class="fas fa-list mr-2"></i> View My Theses
            </button>
            <button class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200">
              <i class="fas fa-search mr-2"></i> Browse Repository
            </button>
          </div>
        </div>

        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <i class="fas fa-info-circle mr-2"></i>
            This is a placeholder dashboard. Full student functionality will be implemented in later phases.
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
