/**
 * Public Controller
 * Handles public-facing pages for the thesis repository
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Homepage - Public index
 * GET /
 */
const index = async (req, res, next) => {
  try {
    // Get statistics
    const totalTheses = await prisma.thesis.count({
      where: { status: 'APPROVED' },
    });

    const totalDownloads = await prisma.thesisFile.aggregate({
      _sum: {
        downloadCount: true,
      },
    });

    const facultiesCount = await prisma.faculty.count();

    // Get faculties with thesis count
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          include: {
            theses: {
              where: { status: 'APPROVED' },
              select: { id: true },
            },
          },
        },
      },
    });

    // Calculate thesis count per faculty
    const facultiesWithCount = faculties.map(faculty => ({
      id: faculty.id,
      name: faculty.name,
      code: faculty.code,
      thesisCount: faculty.departments.reduce(
        (sum, dept) => sum + dept.theses.length,
        0
      ),
    }));

    // Get recent theses (last 6 published)
    const recentTheses = await prisma.thesis.findMany({
      where: { status: 'APPROVED' },
      orderBy: { publishedAt: 'desc' },
      take: 6,
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
      },
    });

    // Get most viewed theses (top 6)
    const mostViewedTheses = await prisma.thesis.findMany({
      where: { status: 'APPROVED' },
      orderBy: { viewCount: 'desc' },
      take: 6,
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
      },
    });

    // Get graduation years for browse by year
    const graduationYears = await prisma.thesis.groupBy({
      by: ['graduationYear'],
      where: { status: 'APPROVED' },
      _count: {
        id: true,
      },
      orderBy: {
        graduationYear: 'desc',
      },
    });

    const yearsWithCount = graduationYears.map(year => ({
      year: year.graduationYear,
      count: year._count.id,
    }));

    res.render('public/index', {
      title: 'Thesis Repository',
      layout: 'layouts/main',
      stats: {
        totalTheses,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        facultiesCount,
      },
      faculties: facultiesWithCount,
      recentTheses,
      mostViewedTheses,
      graduationYears: yearsWithCount.slice(0, 10), // Last 10 years
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    next(error);
  }
};

module.exports = {
  index,
};
