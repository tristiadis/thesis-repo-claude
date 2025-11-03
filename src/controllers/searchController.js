const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Highlight search terms in text
 */
function highlightText(text, query) {
  if (!text || !query) return text;

  const terms = query.split(' ').filter(term => term.length > 2);
  let highlighted = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 px-1">$1</mark>');
  });

  return highlighted;
}

/**
 * GET /search - Search theses
 */
const search = async (req, res, next) => {
  try {
    const {
      q: query = '',
      faculty: facultyId,
      department: departmentId,
      year: graduationYear,
      sort = 'relevance',
      page = 1,
    } = req.query;

    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    // Build where clause
    const whereClause = {
      status: 'APPROVED',
      isPublished: true,
    };

    // Add search query filter
    if (query && query.trim()) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { abstractId: { contains: query, mode: 'insensitive' } },
        { keywords: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Add faculty filter
    if (facultyId) {
      whereClause.department = {
        facultyId: parseInt(facultyId),
      };
    }

    // Add department filter
    if (departmentId) {
      whereClause.departmentId = parseInt(departmentId);
    }

    // Add year filter
    if (graduationYear) {
      whereClause.graduationYear = parseInt(graduationYear);
    }

    // Determine sort order
    let orderBy = {};
    switch (sort) {
      case 'newest':
        orderBy = { publishedAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { publishedAt: 'asc' };
        break;
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      default:
        // For relevance, we'll sort by publishedAt desc as fallback
        // In production, use PostgreSQL full-text search ranking
        orderBy = { publishedAt: 'desc' };
    }

    // Get total count for pagination
    const totalCount = await prisma.thesis.count({
      where: whereClause,
    });

    // Get results
    const results = await prisma.thesis.findMany({
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
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    // Get available years for filter
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

    const availableYears = years.map(y => ({
      year: y.graduationYear,
      count: y._count.id,
    }));

    // Prepare results with highlighting
    const highlightedResults = results.map(thesis => ({
      ...thesis,
      highlightedTitle: highlightText(thesis.title, query),
      highlightedAbstract: highlightText(
        thesis.abstractId ? thesis.abstractId.substring(0, 200) + '...' : '',
        query
      ),
      highlightedKeywords: thesis.keywords
        ? thesis.keywords.split(',').map(k => ({
            original: k.trim(),
            highlighted: highlightText(k.trim(), query),
          }))
        : [],
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    res.render('public/search', {
      title: query ? `Search Results for "${query}"` : 'Search Theses',
      layout: 'layouts/main',
      query,
      results: highlightedResults,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit,
      filters: {
        facultyId: facultyId ? parseInt(facultyId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        graduationYear: graduationYear ? parseInt(graduationYear) : null,
        sort,
      },
      faculties,
      availableYears,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error performing search:', error);
    next(error);
  }
};

module.exports = {
  search,
};
