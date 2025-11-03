const prisma = require('../config/database');

/**
 * Faculty Controller
 * Handles CRUD operations for faculties
 */

/**
 * GET /admin/faculties
 * List all faculties with department count
 */
const index = async (req, res, next) => {
  try {
    // Fetch all faculties with department count
    const faculties = await prisma.faculty.findMany({
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/faculties/index',
      {
        title: 'Manage Faculties',
        pageTitle: 'Faculties',
        faculties,
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading faculties:', error);
    next(error);
  }
};

/**
 * GET /admin/faculties/create
 * Render form to create new faculty
 */
const create = (req, res) => {
  res.renderWithLayout(
    'admin/faculties/form',
    {
      title: 'Add New Faculty',
      pageTitle: 'Add New Faculty',
      faculty: null, // null indicates create mode
      action: '/admin/faculties',
      method: 'POST',
    },
    'admin'
  );
};

/**
 * POST /admin/faculties
 * Save new faculty
 */
const store = async (req, res, next) => {
  try {
    const { name, nameEn, code, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      req.flash('error', 'Faculty name (Indonesian) is required');
      return res.redirect('/admin/faculties/create');
    }

    // Check for duplicate name
    const existingFaculty = await prisma.faculty.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingFaculty) {
      req.flash('error', `Faculty "${name}" already exists`);
      return res.redirect('/admin/faculties/create');
    }

    // Check for duplicate code if provided
    if (code && code.trim() !== '') {
      const existingCode = await prisma.faculty.findFirst({
        where: {
          code: {
            equals: code.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingCode) {
        req.flash('error', `Faculty code "${code}" is already in use`);
        return res.redirect('/admin/faculties/create');
      }
    }

    // Create new faculty
    const newFaculty = await prisma.faculty.create({
      data: {
        name: name.trim(),
        nameEn: nameEn && nameEn.trim() !== '' ? nameEn.trim() : null,
        code: code && code.trim() !== '' ? code.trim() : null,
        description: description && description.trim() !== '' ? description.trim() : null,
      },
    });

    req.flash('success', `Faculty "${newFaculty.name}" has been created successfully`);
    res.redirect('/admin/faculties');
  } catch (error) {
    console.error('Error creating faculty:', error);
    req.flash('error', 'Failed to create faculty. Please try again.');
    res.redirect('/admin/faculties/create');
  }
};

/**
 * GET /admin/faculties/:id/edit
 * Render form to edit faculty
 */
const edit = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find faculty by ID
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!faculty) {
      req.flash('error', 'Faculty not found');
      return res.redirect('/admin/faculties');
    }

    res.renderWithLayout(
      'admin/faculties/form',
      {
        title: 'Edit Faculty',
        pageTitle: 'Edit Faculty',
        faculty, // faculty object for edit mode
        action: `/admin/faculties/${id}`,
        method: 'PUT',
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading faculty for edit:', error);
    next(error);
  }
};

/**
 * PUT /admin/faculties/:id
 * Update faculty
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, nameEn, code, description } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      req.flash('error', 'Faculty name (Indonesian) is required');
      return res.redirect(`/admin/faculties/${id}/edit`);
    }

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
    });

    if (!faculty) {
      req.flash('error', 'Faculty not found');
      return res.redirect('/admin/faculties');
    }

    // Check for duplicate name (excluding current faculty)
    const existingFaculty = await prisma.faculty.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        id: {
          not: parseInt(id),
        },
      },
    });

    if (existingFaculty) {
      req.flash('error', `Faculty "${name}" already exists`);
      return res.redirect(`/admin/faculties/${id}/edit`);
    }

    // Check for duplicate code if provided (excluding current faculty)
    if (code && code.trim() !== '') {
      const existingCode = await prisma.faculty.findFirst({
        where: {
          code: {
            equals: code.trim(),
            mode: 'insensitive',
          },
          id: {
            not: parseInt(id),
          },
        },
      });

      if (existingCode) {
        req.flash('error', `Faculty code "${code}" is already in use`);
        return res.redirect(`/admin/faculties/${id}/edit`);
      }
    }

    // Update faculty
    const updatedFaculty = await prisma.faculty.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        nameEn: nameEn && nameEn.trim() !== '' ? nameEn.trim() : null,
        code: code && code.trim() !== '' ? code.trim() : null,
        description: description && description.trim() !== '' ? description.trim() : null,
      },
    });

    req.flash('success', `Faculty "${updatedFaculty.name}" has been updated successfully`);
    res.redirect('/admin/faculties');
  } catch (error) {
    console.error('Error updating faculty:', error);
    req.flash('error', 'Failed to update faculty. Please try again.');
    res.redirect(`/admin/faculties/${req.params.id}/edit`);
  }
};

/**
 * DELETE /admin/faculties/:id
 * Delete faculty
 */
const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    if (!faculty) {
      req.flash('error', 'Faculty not found');
      return res.redirect('/admin/faculties');
    }

    // Check if faculty has departments
    if (faculty._count.departments > 0) {
      req.flash(
        'error',
        `Cannot delete faculty "${faculty.name}" because it has ${faculty._count.departments} department(s). Please delete or reassign the departments first.`
      );
      return res.redirect('/admin/faculties');
    }

    // Delete faculty
    await prisma.faculty.delete({
      where: { id: parseInt(id) },
    });

    req.flash('success', `Faculty "${faculty.name}" has been deleted successfully`);
    res.redirect('/admin/faculties');
  } catch (error) {
    console.error('Error deleting faculty:', error);
    req.flash('error', 'Failed to delete faculty. Please try again.');
    res.redirect('/admin/faculties');
  }
};

module.exports = {
  index,
  create,
  store,
  edit,
  update,
  destroy,
};
