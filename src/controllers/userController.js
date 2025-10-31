const prisma = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * User Controller
 * Handles user management (primarily for creating student accounts)
 */

const SALT_ROUNDS = 10;

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Generated password
 */
const generatePassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * GET /admin/users
 * List all users with optional role filter
 */
const index = async (req, res, next) => {
  try {
    const { role } = req.query; // Filter by role if provided

    // Build where clause
    const where = {};
    if (role && (role === 'ADMIN' || role === 'STUDENT')) {
      where.role = role;
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Count by role for tabs
    const [totalUsers, totalAdmins, totalStudents] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
    ]);

    res.renderWithLayout(
      'admin/users/index',
      {
        title: 'Manage Users',
        pageTitle: 'Users',
        users,
        currentFilter: role || 'all',
        totalUsers,
        totalAdmins,
        totalStudents,
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading users:', error);
    next(error);
  }
};

/**
 * GET /admin/users/create
 * Render form to create new student account
 */
const create = (req, res) => {
  res.renderWithLayout(
    'admin/users/create',
    {
      title: 'Create Student Account',
      pageTitle: 'Create Student Account',
    },
    'admin'
  );
};

/**
 * POST /admin/users
 * Create new student account
 */
const store = async (req, res, next) => {
  try {
    const { username, password, passwordOption, name, email } = req.body;

    // Validate username
    if (!username || username.trim() === '') {
      req.flash('error', 'Username is required');
      return res.redirect('/admin/users/create');
    }

    // Check for spaces in username
    if (username.includes(' ')) {
      req.flash('error', 'Username cannot contain spaces');
      return res.redirect('/admin/users/create');
    }

    // Check username uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (existingUser) {
      req.flash('error', `Username "${username}" is already taken`);
      return res.redirect('/admin/users/create');
    }

    // Determine password (auto-generate or manual)
    let plainPassword;
    if (passwordOption === 'auto') {
      plainPassword = generatePassword(12);
    } else {
      // Manual password
      if (!password || password.trim() === '') {
        req.flash('error', 'Password is required');
        return res.redirect('/admin/users/create');
      }

      if (password.length < 8) {
        req.flash('error', 'Password must be at least 8 characters long');
        return res.redirect('/admin/users/create');
      }

      plainPassword = password;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        name: name && name.trim() !== '' ? name.trim() : null,
        email: email && email.trim() !== '' ? email.trim() : null,
        role: 'STUDENT', // Fixed role
        isActive: true,
      },
    });

    // Store credentials in session for display (will be shown only once)
    req.session.newUserCredentials = {
      username: newUser.username,
      password: plainPassword,
      name: newUser.name,
      createdAt: new Date().toISOString(),
    };

    req.flash('success', `Student account "${newUser.username}" has been created successfully`);
    res.redirect('/admin/users?showCredentials=true');
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error', 'Failed to create student account. Please try again.');
    res.redirect('/admin/users/create');
  }
};

/**
 * POST /admin/users/:id/reset-password
 * Reset user password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    // Generate new password
    const newPassword = generatePassword(12);

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user password
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });

    // Store new credentials in session for display
    req.session.resetPasswordCredentials = {
      username: user.username,
      password: newPassword,
      name: user.name,
      resetAt: new Date().toISOString(),
    };

    req.flash('success', `Password for "${user.username}" has been reset successfully`);
    res.redirect('/admin/users?showResetCredentials=true');
  } catch (error) {
    console.error('Error resetting password:', error);
    req.flash('error', 'Failed to reset password. Please try again.');
    res.redirect('/admin/users');
  }
};

/**
 * POST /admin/users/:id/toggle-status
 * Activate or deactivate user
 */
const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    // Prevent deactivating yourself
    if (user.id === req.user.id) {
      req.flash('error', 'You cannot deactivate your own account');
      return res.redirect('/admin/users');
    }

    // Toggle status
    const newStatus = !user.isActive;
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: newStatus },
    });

    const statusText = newStatus ? 'activated' : 'deactivated';
    req.flash('success', `User "${user.username}" has been ${statusText} successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error toggling user status:', error);
    req.flash('error', 'Failed to update user status. Please try again.');
    res.redirect('/admin/users');
  }
};

module.exports = {
  index,
  create,
  store,
  resetPassword,
  toggleStatus,
  generatePassword, // Export for testing
};
