const prisma = require('../config/database');

/**
 * Lecturer Controller
 * Handles CRUD operations for lecturers
 * IMPORTANT: Names must be in RIS format (Last, First)
 */

/**
 * RIS Name Format Validation
 * Format: Last, First (e.g., "Santoso, Budi")
 * Regex: Must have comma with text on both sides
 */
const RIS_NAME_REGEX = /^[^,]+,\s*[^,]+$/;

const validateRISName = (name) => {
  if (!name || name.trim() === '') {
    return { valid: false, message: 'Name is required' };
  }

  if (!RIS_NAME_REGEX.test(name.trim())) {
    return {
      valid: false,
      message: 'Name must be in RIS format: Last, First (example: Santoso, Budi)'
    };
  }

  return { valid: true };
};

/**
 * GET /admin/lecturers
 * List all lecturers with department name
 */
const index = async (req, res, next) => {
  try {
    // Fetch all lecturers with department
    const lecturers = await prisma.lecturer.findMany({
      include: {
        department: {
          select: {
            name: true,
            faculty: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc', // Alphabetical order by name
      },
    });

    res.renderWithLayout(
      'admin/lecturers/index',
      {
        title: 'Manage Lecturers',
        pageTitle: 'Lecturers',
        lecturers,
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading lecturers:', error);
    next(error);
  }
};

/**
 * GET /admin/lecturers/create
 * Render form to create new lecturer
 */
const create = async (req, res, next) => {
  try {
    // Load all departments with faculties for dropdown
    const departments = await prisma.department.findMany({
      include: {
        faculty: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/lecturers/form',
      {
        title: 'Add New Lecturer',
        pageTitle: 'Add New Lecturer',
        lecturer: null, // null indicates create mode
        departments,
        action: '/admin/lecturers',
        method: 'POST',
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading create lecturer form:', error);
    next(error);
  }
};

/**
 * POST /admin/lecturers
 * Save new lecturer
 */
const store = async (req, res, next) => {
  try {
    const { nidn, name, email, departmentId } = req.body;

    // Validate RIS name format (CRITICAL)
    const nameValidation = validateRISName(name);
    if (!nameValidation.valid) {
      req.flash('error', nameValidation.message);
      return res.redirect('/admin/lecturers/create');
    }

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        req.flash('error', 'Invalid email format');
        return res.redirect('/admin/lecturers/create');
      }
    }

    // Check for duplicate NIDN if provided
    if (nidn && nidn.trim() !== '') {
      const existingNIDN = await prisma.lecturer.findFirst({
        where: {
          nidn: {
            equals: nidn.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingNIDN) {
        req.flash('error', `NIDN "${nidn}" is already in use`);
        return res.redirect('/admin/lecturers/create');
      }
    }

    // Check for duplicate email if provided
    if (email && email.trim() !== '') {
      const existingEmail = await prisma.lecturer.findFirst({
        where: {
          email: {
            equals: email.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingEmail) {
        req.flash('error', `Email "${email}" is already in use`);
        return res.redirect('/admin/lecturers/create');
      }
    }

    // Validate department if provided
    if (departmentId && departmentId !== '') {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(departmentId) },
      });

      if (!department) {
        req.flash('error', 'Selected department does not exist');
        return res.redirect('/admin/lecturers/create');
      }
    }

    // Create new lecturer
    const newLecturer = await prisma.lecturer.create({
      data: {
        nidn: nidn && nidn.trim() !== '' ? nidn.trim() : null,
        name: name.trim(),
        email: email && email.trim() !== '' ? email.trim() : null,
        departmentId: departmentId && departmentId !== '' ? parseInt(departmentId) : null,
      },
    });

    req.flash('success', `Lecturer "${newLecturer.name}" has been created successfully`);
    res.redirect('/admin/lecturers');
  } catch (error) {
    console.error('Error creating lecturer:', error);
    req.flash('error', 'Failed to create lecturer. Please try again.');
    res.redirect('/admin/lecturers/create');
  }
};

/**
 * GET /admin/lecturers/:id/edit
 * Render form to edit lecturer
 */
const edit = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find lecturer by ID with department
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
      },
    });

    if (!lecturer) {
      req.flash('error', 'Lecturer not found');
      return res.redirect('/admin/lecturers');
    }

    // Load all departments with faculties for dropdown
    const departments = await prisma.department.findMany({
      include: {
        faculty: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/lecturers/form',
      {
        title: 'Edit Lecturer',
        pageTitle: 'Edit Lecturer',
        lecturer, // lecturer object for edit mode
        departments,
        action: `/admin/lecturers/${id}`,
        method: 'PUT',
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading lecturer for edit:', error);
    next(error);
  }
};

/**
 * PUT /admin/lecturers/:id
 * Update lecturer
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nidn, name, email, departmentId } = req.body;

    // Check if lecturer exists
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: parseInt(id) },
    });

    if (!lecturer) {
      req.flash('error', 'Lecturer not found');
      return res.redirect('/admin/lecturers');
    }

    // Validate RIS name format (CRITICAL)
    const nameValidation = validateRISName(name);
    if (!nameValidation.valid) {
      req.flash('error', nameValidation.message);
      return res.redirect(`/admin/lecturers/${id}/edit`);
    }

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        req.flash('error', 'Invalid email format');
        return res.redirect(`/admin/lecturers/${id}/edit`);
      }
    }

    // Check for duplicate NIDN if provided (excluding current lecturer)
    if (nidn && nidn.trim() !== '') {
      const existingNIDN = await prisma.lecturer.findFirst({
        where: {
          nidn: {
            equals: nidn.trim(),
            mode: 'insensitive',
          },
          id: {
            not: parseInt(id),
          },
        },
      });

      if (existingNIDN) {
        req.flash('error', `NIDN "${nidn}" is already in use`);
        return res.redirect(`/admin/lecturers/${id}/edit`);
      }
    }

    // Check for duplicate email if provided (excluding current lecturer)
    if (email && email.trim() !== '') {
      const existingEmail = await prisma.lecturer.findFirst({
        where: {
          email: {
            equals: email.trim(),
            mode: 'insensitive',
          },
          id: {
            not: parseInt(id),
          },
        },
      });

      if (existingEmail) {
        req.flash('error', `Email "${email}" is already in use`);
        return res.redirect(`/admin/lecturers/${id}/edit`);
      }
    }

    // Validate department if provided
    if (departmentId && departmentId !== '') {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(departmentId) },
      });

      if (!department) {
        req.flash('error', 'Selected department does not exist');
        return res.redirect(`/admin/lecturers/${id}/edit`);
      }
    }

    // Update lecturer
    const updatedLecturer = await prisma.lecturer.update({
      where: { id: parseInt(id) },
      data: {
        nidn: nidn && nidn.trim() !== '' ? nidn.trim() : null,
        name: name.trim(),
        email: email && email.trim() !== '' ? email.trim() : null,
        departmentId: departmentId && departmentId !== '' ? parseInt(departmentId) : null,
      },
    });

    req.flash('success', `Lecturer "${updatedLecturer.name}" has been updated successfully`);
    res.redirect('/admin/lecturers');
  } catch (error) {
    console.error('Error updating lecturer:', error);
    req.flash('error', 'Failed to update lecturer. Please try again.');
    res.redirect(`/admin/lecturers/${req.params.id}/edit`);
  }
};

/**
 * DELETE /admin/lecturers/:id
 * Delete lecturer
 */
const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if lecturer exists
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            thesesAsAdvisor1: true,
            thesesAsAdvisor2: true,
            thesesAsExaminer1: true,
            thesesAsExaminer2: true,
            thesesAsExaminer3: true,
          },
        },
      },
    });

    if (!lecturer) {
      req.flash('error', 'Lecturer not found');
      return res.redirect('/admin/lecturers');
    }

    // Calculate total thesis references
    const totalReferences =
      lecturer._count.thesesAsAdvisor1 +
      lecturer._count.thesesAsAdvisor2 +
      lecturer._count.thesesAsExaminer1 +
      lecturer._count.thesesAsExaminer2 +
      lecturer._count.thesesAsExaminer3;

    // Check if lecturer is referenced in any thesis
    if (totalReferences > 0) {
      const roles = [];
      if (lecturer._count.thesesAsAdvisor1 > 0) roles.push('Advisor 1');
      if (lecturer._count.thesesAsAdvisor2 > 0) roles.push('Advisor 2');
      if (lecturer._count.thesesAsExaminer1 > 0) roles.push('Examiner 1');
      if (lecturer._count.thesesAsExaminer2 > 0) roles.push('Examiner 2');
      if (lecturer._count.thesesAsExaminer3 > 0) roles.push('Examiner 3');

      req.flash(
        'error',
        `Cannot delete lecturer "${lecturer.name}" because they are referenced in ${totalReferences} thesis/theses as: ${roles.join(', ')}. Please reassign or remove these references first.`
      );
      return res.redirect('/admin/lecturers');
    }

    // Delete lecturer
    await prisma.lecturer.delete({
      where: { id: parseInt(id) },
    });

    req.flash('success', `Lecturer "${lecturer.name}" has been deleted successfully`);
    res.redirect('/admin/lecturers');
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    req.flash('error', 'Failed to delete lecturer. Please try again.');
    res.redirect('/admin/lecturers');
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
