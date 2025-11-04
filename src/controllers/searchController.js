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

/**
 * GET /search/advanced - Advanced search with multiple fields (like Scopus)
 */
const advancedSearch = async (req, res, next) => {
  try {
    const {
      title = '',
      author = '',
      abstract = '',
      keywords = '',
      department: departmentId,
      faculty: facultyId,
      researchMethod,
      yearFrom,
      yearTo,
      titleMatch = 'contains', // contains, exact
      authorMatch = 'contains',
      abstractMatch = 'contains',
      keywordsMatch = 'contains',
      fieldOperator = 'AND', // AND, OR
      sort = 'relevance',
      page = 1,
    } = req.query;

    const limit = 20;
    const offset = (parseInt(page) - 1) * limit;

    // Build where clause - start with base requirements
    const whereClause = {
      status: 'APPROVED',
      isPublished: true,
    };

    // Build field conditions array
    const fieldConditions = [];

    // Title search
    if (title && title.trim()) {
      if (titleMatch === 'exact') {
        fieldConditions.push({ title: { equals: title.trim(), mode: 'insensitive' } });
      } else {
        fieldConditions.push({ title: { contains: title.trim(), mode: 'insensitive' } });
      }
    }

    // Author search
    if (author && author.trim()) {
      if (authorMatch === 'exact') {
        fieldConditions.push({ authorName: { equals: author.trim(), mode: 'insensitive' } });
      } else {
        fieldConditions.push({ authorName: { contains: author.trim(), mode: 'insensitive' } });
      }
    }

    // Abstract search
    if (abstract && abstract.trim()) {
      if (abstractMatch === 'exact') {
        fieldConditions.push({
          OR: [
            { abstractId: { equals: abstract.trim(), mode: 'insensitive' } },
            { abstractEn: { equals: abstract.trim(), mode: 'insensitive' } },
          ],
        });
      } else {
        fieldConditions.push({
          OR: [
            { abstractId: { contains: abstract.trim(), mode: 'insensitive' } },
            { abstractEn: { contains: abstract.trim(), mode: 'insensitive' } },
          ],
        });
      }
    }

    // Keywords search
    if (keywords && keywords.trim()) {
      if (keywordsMatch === 'exact') {
        fieldConditions.push({
          OR: [
            { keywords: { equals: keywords.trim(), mode: 'insensitive' } },
            { keywordsEn: { equals: keywords.trim(), mode: 'insensitive' } },
          ],
        });
      } else {
        fieldConditions.push({
          OR: [
            { keywords: { contains: keywords.trim(), mode: 'insensitive' } },
            { keywordsEn: { contains: keywords.trim(), mode: 'insensitive' } },
          ],
        });
      }
    }

    // Apply field conditions with operator (AND/OR)
    if (fieldConditions.length > 0) {
      if (fieldOperator === 'OR') {
        whereClause.OR = fieldConditions;
      } else {
        whereClause.AND = fieldConditions;
      }
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

    // Add research method filter
    if (researchMethod) {
      whereClause.researchMethod = researchMethod;
    }

    // Add year range filter
    if (yearFrom || yearTo) {
      whereClause.graduationYear = {};
      if (yearFrom) {
        whereClause.graduationYear.gte = parseInt(yearFrom);
      }
      if (yearTo) {
        whereClause.graduationYear.lte = parseInt(yearTo);
      }
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
      case 'author':
        orderBy = { authorName: 'asc' };
        break;
      case 'year':
        orderBy = { graduationYear: 'desc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
      default:
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
        departments: {
          orderBy: { name: 'asc' },
        },
      },
    });

    // Get available years for filter
    const years = await prisma.thesis.groupBy({
      by: ['graduationYear'],
      where: { status: 'APPROVED', isPublished: true },
      orderBy: {
        graduationYear: 'desc',
      },
    });

    const availableYears = years.map(y => y.graduationYear);

    // Research methods for filter
    const researchMethods = [
      { value: 'QUALITATIVE', label: 'Kualitatif' },
      { value: 'QUANTITATIVE', label: 'Kuantitatif' },
      { value: 'MIXED_METHOD', label: 'Mix-method' },
      { value: 'OTHER', label: 'Lainnya' },
    ];

    // Prepare results with highlighting
    const searchTerms = [title, author, abstract, keywords].filter(t => t && t.trim()).join(' ');
    const highlightedResults = results.map(thesis => ({
      ...thesis,
      highlightedTitle: highlightText(thesis.title, searchTerms),
      highlightedAbstract: highlightText(
        thesis.abstractId ? thesis.abstractId.substring(0, 300) + '...' : '',
        searchTerms
      ),
      highlightedKeywords: thesis.keywords
        ? thesis.keywords.split(',').map(k => ({
            original: k.trim(),
            highlighted: highlightText(k.trim(), searchTerms),
          }))
        : [],
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    res.render('public/advanced-search', {
      title: 'Advanced Search',
      layout: 'layouts/main',
      searchParams: {
        title,
        author,
        abstract,
        keywords,
        titleMatch,
        authorMatch,
        abstractMatch,
        keywordsMatch,
        fieldOperator,
        departmentId: departmentId ? parseInt(departmentId) : null,
        facultyId: facultyId ? parseInt(facultyId) : null,
        researchMethod,
        yearFrom: yearFrom ? parseInt(yearFrom) : null,
        yearTo: yearTo ? parseInt(yearTo) : null,
        sort,
      },
      results: highlightedResults,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage,
      hasPrevPage,
      limit,
      faculties,
      availableYears,
      researchMethods,
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    next(error);
  }
};

module.exports = {
  search,
  advancedSearch,
};
