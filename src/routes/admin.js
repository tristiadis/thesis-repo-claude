const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

/**
 * GET /admin/dashboard
 * Admin dashboard (placeholder)
 */
router.get('/dashboard', requireAdmin, (req, res) => {
  // Get flash message from session
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard - Thesis Repository System</title>
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
                <i class="fas fa-user-shield text-blue-600 mr-2"></i>
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
            <i class="fas fa-tachometer-alt text-blue-600 mr-3"></i>Admin Dashboard
          </h1>
          <p class="text-gray-600">Welcome to the admin dashboard. This is a placeholder page.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <i class="fas fa-users text-white text-2xl"></i>
              </div>
              <div class="ml-5">
                <p class="text-sm font-medium text-gray-500">Total Users</p>
                <p class="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                <i class="fas fa-file-alt text-white text-2xl"></i>
              </div>
              <div class="ml-5">
                <p class="text-sm font-medium text-gray-500">Total Theses</p>
                <p class="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <i class="fas fa-clock text-white text-2xl"></i>
              </div>
              <div class="ml-5">
                <p class="text-sm font-medium text-gray-500">Pending Review</p>
                <p class="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <i class="fas fa-info-circle mr-2"></i>
            This is a placeholder dashboard. Full admin functionality will be implemented in later phases.
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
