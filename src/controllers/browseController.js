const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /browse/faculties - Browse all faculties
 */
const browseFaculties = async (req, res, next) => {
  try {
    // Get all faculties with department and thesis counts
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          include: {
            _count: {
              select: {
                theses: {
                  where: { status: 'APPROVED', isPublished: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate thesis counts per faculty
    const facultiesWithStats = faculties.map(faculty => {
      const thesisCount = faculty.departments.reduce(
        (sum, dept) => sum + dept._count.theses,
        0
      );
      return {
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
        description: faculty.description,
        thesisCount,
        departmentCount: faculty.departments.length,
      };
    });

    res.render('public/browse-faculties', {
      title: 'Browse by Faculty',
      layout: 'layouts/main',
      faculties: facultiesWithStats,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading faculties:', error);
    next(error);
  }
};

/**
 * GET /browse/faculties/:id - Faculty detail with departments
 */
const facultyDetail = async (req, res, next) => {
  try {
    const facultyId = parseInt(req.params.id);

    // Get faculty with departments and thesis counts
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: {
        departments: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                theses: {
                  where: { status: 'APPROVED', isPublished: true },
                },
              },
            },
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).render('errors/404', {
        title: 'Faculty Not Found',
        layout: 'layouts/main',
        message: 'The requested faculty could not be found.',
        user: req.user || null,
      });
    }

    // Format departments with counts
    const departmentsWithStats = faculty.departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      thesisCount: dept._count.theses,
    }));

    // Calculate total theses
    const totalTheses = departmentsWithStats.reduce(
      (sum, dept) => sum + dept.thesisCount,
      0
    );

    res.render('public/faculty-detail', {
      title: `${faculty.name} - Browse by Department`,
      layout: 'layouts/main',
      faculty: {
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
        description: faculty.description,
        totalTheses,
        departmentCount: departmentsWithStats.length,
      },
      departments: departmentsWithStats,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading faculty detail:', error);
    next(error);
  }
};

/**
 * GET /browse/departments/:id - Department detail with theses
 */
const departmentDetail = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id);
    const {
      year: graduationYear,
      sort = 'year',
      page = 1,
    } = req.query;

    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    // Get department with faculty
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        faculty: true,
      },
    });

    if (!department) {
      return res.status(404).render('errors/404', {
        title: 'Department Not Found',
        layout: 'layouts/main',
        message: 'The requested department could not be found.',
        user: req.user || null,
      });
    }

    // Build where clause
    const whereClause = {
      departmentId,
      status: 'APPROVED',
      isPublished: true,
    };

    // Add year filter
    if (graduationYear) {
      whereClause.graduationYear = parseInt(graduationYear);
    }

    // Determine sort order
    let orderBy = {};
    switch (sort) {
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'year':
      default:
        orderBy = { graduationYear: 'desc' };
    }

    // Get total count
    const totalCount = await prisma.thesis.count({
      where: whereClause,
    });

    // Get theses
    const theses = await prisma.thesis.findMany({
      where: whereClause,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        submitter: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    // Get available years for filter
    const years = await prisma.thesis.groupBy({
      by: ['graduationYear'],
      where: {
        departmentId,
        status: 'APPROVED',
        isPublished: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        graduationYear: 'desc',
      },
    });

    const availableYears = years.map(y => ({
      year: y.graduationYear,
      count: y._count.id,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    res.render('public/department-detail', {
      title: `${department.name} - Browse Theses`,
      layout: 'layouts/main',
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
      },
      faculty: {
        id: department.faculty.id,
        name: department.faculty.name,
      },
      theses,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit,
      filters: {
        graduationYear: graduationYear ? parseInt(graduationYear) : null,
        sort,
      },
      availableYears,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading department detail:', error);
    next(error);
  }
};

/**
 * GET /browse/years - Browse all years
 */
const browseYears = async (req, res, next) => {
  try {
    // Get years with thesis counts
    const years = await prisma.thesis.groupBy({
      by: ['graduationYear'],
      where: { status: 'APPROVED', isPublished: true },
      _count: {
        id: true,
      },
      orderBy: {
        graduationYear: 'desc',
      },
    });

    // Format years with counts
    const yearsWithStats = years.map(year => ({
      year: year.graduationYear,
      thesisCount: year._count.id,
    }));

    res.render('public/browse-years', {
      title: 'Browse by Year',
      layout: 'layouts/main',
      years: yearsWithStats,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading years:', error);
    next(error);
  }
};

/**
 * GET /browse/years/:year - Year detail with theses
 */
const yearDetail = async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const {
      faculty: facultyId,
      department: departmentId,
      sort = 'title',
      page = 1,
    } = req.query;

    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    // Build where clause
    const whereClause = {
      status: 'APPROVED',
      isPublished: true,
      graduationYear: year,
    };

    // Add faculty filter (via department)
    if (facultyId) {
      whereClause.department = {
        facultyId: parseInt(facultyId),
      };
    }

    // Add department filter
    if (departmentId) {
      whereClause.departmentId = parseInt(departmentId);
    }

    // Determine sort order
    let orderBy = {};
    switch (sort) {
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      case 'author':
        orderBy = { submitter: { name: 'asc' } };
        break;
      case 'title':
      default:
        orderBy = { title: 'asc' };
    }

    // Get total count
    const totalCount = await prisma.thesis.count({
      where: whereClause,
    });

    // Get theses
    const theses = await prisma.thesis.findMany({
      where: whereClause,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        submitter: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    // Get all faculties for filter
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          orderBy: { name: 'asc' },
        },
      },
    });

    // Get statistics by faculty for this year
    const facultyStats = await prisma.thesis.groupBy({
      by: ['departmentId'],
      where: {
        status: 'APPROVED',
        isPublished: true,
        graduationYear: year,
      },
      _count: {
        id: true,
      },
    });

    // Map department IDs to faculties
    const statsByFaculty = {};
    for (const stat of facultyStats) {
      const dept = await prisma.department.findUnique({
        where: { id: stat.departmentId },
        include: { faculty: true },
      });
      if (dept) {
        const facultyName = dept.faculty.name;
        if (!statsByFaculty[facultyName]) {
          statsByFaculty[facultyName] = 0;
        }
        statsByFaculty[facultyName] += stat._count.id;
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    res.render('public/year-detail', {
      title: `Theses from ${year}`,
      layout: 'layouts/main',
      year,
      theses,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit,
      filters: {
        facultyId: facultyId ? parseInt(facultyId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        sort,
      },
      faculties,
      facultyStats: statsByFaculty,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading year detail:', error);
    next(error);
  }
};

module.exports = {
  browseFaculties,
  facultyDetail,
  departmentDetail,
  browseYears,
  yearDetail,
};
