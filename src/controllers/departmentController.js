const prisma = require('../config/database');

/**
 * Department Controller
 * Handles CRUD operations for departments
 */

/**
 * GET /admin/departments
 * List all departments grouped by faculty
 */
const index = async (req, res, next) => {
  try {
    // Fetch all faculties with their departments and counts
    const faculties = await prisma.faculty.findMany({
      include: {
        departments: {
          include: {
            _count: {
              select: {
                theses: true,
                lecturers: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/departments/index',
      {
        title: 'Manage Departments',
        pageTitle: 'Departments',
        faculties,
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading departments:', error);
    next(error);
  }
};

/**
 * GET /admin/departments/create
 * Render form to create new department
 */
const create = async (req, res, next) => {
  try {
    // Load all faculties for dropdown
    const faculties = await prisma.faculty.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/departments/form',
      {
        title: 'Add New Department',
        pageTitle: 'Add New Department',
        department: null, // null indicates create mode
        faculties,
        action: '/admin/departments',
        method: 'POST',
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading create department form:', error);
    next(error);
  }
};

/**
 * POST /admin/departments
 * Save new department
 */
const store = async (req, res, next) => {
  try {
    const { facultyId, name, nameEn, code, description } = req.body;

    // Validate required fields
    if (!facultyId || facultyId === '') {
      req.flash('error', 'Faculty selection is required');
      return res.redirect('/admin/departments/create');
    }

    if (!name || name.trim() === '') {
      req.flash('error', 'Department name (Indonesian) is required');
      return res.redirect('/admin/departments/create');
    }

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(facultyId) },
    });

    if (!faculty) {
      req.flash('error', 'Selected faculty does not exist');
      return res.redirect('/admin/departments/create');
    }

    // Check for duplicate name within same faculty
    const existingDepartment = await prisma.department.findFirst({
      where: {
        facultyId: parseInt(facultyId),
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (existingDepartment) {
      req.flash('error', `Department "${name}" already exists in ${faculty.name}`);
      return res.redirect('/admin/departments/create');
    }

    // Check for duplicate code if provided
    if (code && code.trim() !== '') {
      const existingCode = await prisma.department.findFirst({
        where: {
          code: {
            equals: code.trim(),
            mode: 'insensitive',
          },
        },
      });

      if (existingCode) {
        req.flash('error', `Department code "${code}" is already in use`);
        return res.redirect('/admin/departments/create');
      }
    }

    // Create new department
    const newDepartment = await prisma.department.create({
      data: {
        facultyId: parseInt(facultyId),
        name: name.trim(),
        nameEn: nameEn && nameEn.trim() !== '' ? nameEn.trim() : null,
        code: code && code.trim() !== '' ? code.trim() : null,
        description: description && description.trim() !== '' ? description.trim() : null,
      },
    });

    req.flash('success', `Department "${newDepartment.name}" has been created successfully in ${faculty.name}`);
    res.redirect('/admin/departments');
  } catch (error) {
    console.error('Error creating department:', error);
    req.flash('error', 'Failed to create department. Please try again.');
    res.redirect('/admin/departments/create');
  }
};

/**
 * GET /admin/departments/:id/edit
 * Render form to edit department
 */
const edit = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find department by ID with faculty
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        faculty: true,
      },
    });

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/admin/departments');
    }

    // Load all faculties for dropdown
    const faculties = await prisma.faculty.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.renderWithLayout(
      'admin/departments/form',
      {
        title: 'Edit Department',
        pageTitle: 'Edit Department',
        department, // department object for edit mode
        faculties,
        action: `/admin/departments/${id}`,
        method: 'PUT',
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading department for edit:', error);
    next(error);
  }
};

/**
 * PUT /admin/departments/:id
 * Update department
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { facultyId, name, nameEn, code, description } = req.body;

    // Validate required fields
    if (!facultyId || facultyId === '') {
      req.flash('error', 'Faculty selection is required');
      return res.redirect(`/admin/departments/${id}/edit`);
    }

    if (!name || name.trim() === '') {
      req.flash('error', 'Department name (Indonesian) is required');
      return res.redirect(`/admin/departments/${id}/edit`);
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
    });

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/admin/departments');
    }

    // Check if faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(facultyId) },
    });

    if (!faculty) {
      req.flash('error', 'Selected faculty does not exist');
      return res.redirect(`/admin/departments/${id}/edit`);
    }

    // Check for duplicate name within same faculty (excluding current department)
    const existingDepartment = await prisma.department.findFirst({
      where: {
        facultyId: parseInt(facultyId),
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
        id: {
          not: parseInt(id),
        },
      },
    });

    if (existingDepartment) {
      req.flash('error', `Department "${name}" already exists in ${faculty.name}`);
      return res.redirect(`/admin/departments/${id}/edit`);
    }

    // Check for duplicate code if provided (excluding current department)
    if (code && code.trim() !== '') {
      const existingCode = await prisma.department.findFirst({
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
        req.flash('error', `Department code "${code}" is already in use`);
        return res.redirect(`/admin/departments/${id}/edit`);
      }
    }

    // Update department
    const updatedDepartment = await prisma.department.update({
      where: { id: parseInt(id) },
      data: {
        facultyId: parseInt(facultyId),
        name: name.trim(),
        nameEn: nameEn && nameEn.trim() !== '' ? nameEn.trim() : null,
        code: code && code.trim() !== '' ? code.trim() : null,
        description: description && description.trim() !== '' ? description.trim() : null,
      },
    });

    req.flash('success', `Department "${updatedDepartment.name}" has been updated successfully`);
    res.redirect('/admin/departments');
  } catch (error) {
    console.error('Error updating department:', error);
    req.flash('error', 'Failed to update department. Please try again.');
    res.redirect(`/admin/departments/${req.params.id}/edit`);
  }
};

/**
 * DELETE /admin/departments/:id
 * Delete department
 */
const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if department exists with counts
    const department = await prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            theses: true,
            lecturers: true,
          },
        },
      },
    });

    if (!department) {
      req.flash('error', 'Department not found');
      return res.redirect('/admin/departments');
    }

    // Check if department has theses
    if (department._count.theses > 0) {
      req.flash(
        'error',
        `Cannot delete department "${department.name}" because it has ${department._count.theses} thesis/theses. Please delete or reassign the theses first.`
      );
      return res.redirect('/admin/departments');
    }

    // Check if department has lecturers
    if (department._count.lecturers > 0) {
      req.flash(
        'error',
        `Cannot delete department "${department.name}" because it has ${department._count.lecturers} lecturer(s). Please delete or reassign the lecturers first.`
      );
      return res.redirect('/admin/departments');
    }

    // Delete department
    await prisma.department.delete({
      where: { id: parseInt(id) },
    });

    req.flash('success', `Department "${department.name}" has been deleted successfully`);
    res.redirect('/admin/departments');
  } catch (error) {
    console.error('Error deleting department:', error);
    req.flash('error', 'Failed to delete department. Please try again.');
    res.redirect('/admin/departments');
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
