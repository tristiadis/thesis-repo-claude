const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Thesis Export Service
 * Handles exporting thesis data to CSV format with filters
 */

/**
 * Build where clause for Prisma query based on filters
 * @param {Object} filters - Filter parameters
 * @returns {Object} Prisma where clause
 */
function buildWhereClause(filters) {
  const where = {};

  // Status filter
  if (filters.status && filters.status !== 'all') {
    where.status = filters.status.toUpperCase();
  }

  // Department filter
  if (filters.department && filters.department !== 'all') {
    where.departmentId = parseInt(filters.department);
  }

  // Graduation year filter
  if (filters.year && filters.year !== 'all') {
    where.graduationYear = parseInt(filters.year);
  }

  // Research method filter
  if (filters.researchMethod && filters.researchMethod !== 'all') {
    where.researchMethod = filters.researchMethod;
  }

  // Published status filter
  if (filters.published === 'true') {
    where.isPublished = true;
  } else if (filters.published === 'false') {
    where.isPublished = false;
  }

  // Date range filter (submitted date)
  if (filters.startDate || filters.endDate) {
    where.submittedAt = {};
    if (filters.startDate) {
      where.submittedAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      where.submittedAt.lte = endDate;
    }
  }

  return where;
}

/**
 * Get filtered thesis data for export
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Array>} Array of thesis records
 */
async function getFilteredTheses(filters) {
  const where = buildWhereClause(filters);

  const theses = await prisma.thesis.findMany({
    where,
    include: {
      department: {
        include: {
          faculty: true,
        },
      },
      advisor1: true,
      advisor2: true,
      examiner1: true,
      examiner2: true,
      examiner3: true,
      submitter: true,
      reviewer: true,
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });

  return theses;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 * @param {string|null} value - Field value
 * @returns {string} Escaped CSV value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format date for CSV export
 * @param {Date|null} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format research method label
 * @param {string} method - Research method enum value
 * @returns {string} Human-readable label
 */
function formatResearchMethod(method) {
  const labels = {
    QUALITATIVE: 'Kualitatif',
    QUANTITATIVE: 'Kuantitatif',
    MIXED_METHOD: 'Mix-method',
    OTHER: 'Lainnya',
  };
  return labels[method] || method;
}

/**
 * Format status label
 * @param {string} status - Status enum value
 * @returns {string} Human-readable label
 */
function formatStatus(status) {
  const labels = {
    DRAFT: 'Draft',
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  return labels[status] || status;
}

/**
 * Generate CSV content from thesis data
 * @param {Array} theses - Array of thesis records
 * @param {Object} options - Export options
 * @returns {string} CSV content
 */
function generateCSV(theses, options = {}) {
  const {
    includeAbstract = false,
    includeFiles = false,
    includeStats = true,
  } = options;

  // CSV Headers
  const headers = [
    'ID',
    'Title (ID)',
    'Title (EN)',
    'Author Name',
    'Student ID',
    'Department',
    'Faculty',
    'Graduation Year',
    'Defense Date',
    'Keywords (ID)',
    'Keywords (EN)',
    'Research Method',
    'Status',
    'Published',
    'Main Advisor',
    'Co-Advisor',
    'Examiner 1',
    'Examiner 2',
    'Examiner 3',
    'Submitted Date',
    'Reviewed Date',
    'Reviewer',
  ];

  if (includeAbstract) {
    headers.push('Abstract (ID)', 'Abstract (EN)');
  }

  if (includeStats) {
    headers.push('View Count', 'Download Count');
  }

  if (includeFiles) {
    headers.push('Total Files');
  }

  // Build CSV rows
  const rows = [headers.join(',')];

  theses.forEach((thesis) => {
    const row = [
      escapeCSV(thesis.id),
      escapeCSV(thesis.title),
      escapeCSV(thesis.titleEn),
      escapeCSV(thesis.authorName),
      escapeCSV(thesis.studentId),
      escapeCSV(thesis.department.name),
      escapeCSV(thesis.department.faculty.name),
      escapeCSV(thesis.graduationYear),
      escapeCSV(formatDate(thesis.defenseDate)),
      escapeCSV(thesis.keywords),
      escapeCSV(thesis.keywordsEn),
      escapeCSV(formatResearchMethod(thesis.researchMethod)),
      escapeCSV(formatStatus(thesis.status)),
      escapeCSV(thesis.isPublished ? 'Yes' : 'No'),
      escapeCSV(thesis.advisor1?.name),
      escapeCSV(thesis.advisor2?.name),
      escapeCSV(thesis.examiner1?.name),
      escapeCSV(thesis.examiner2?.name),
      escapeCSV(thesis.examiner3?.name),
      escapeCSV(formatDate(thesis.submittedAt)),
      escapeCSV(formatDate(thesis.reviewedAt)),
      escapeCSV(thesis.reviewer?.name),
    ];

    if (includeAbstract) {
      row.push(escapeCSV(thesis.abstractId), escapeCSV(thesis.abstractEn));
    }

    if (includeStats) {
      row.push(escapeCSV(thesis.viewCount), escapeCSV(thesis.downloadCount));
    }

    if (includeFiles) {
      // Note: Would need to include files relation to get count
      row.push(escapeCSV(thesis.files?.length || 0));
    }

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Export thesis data to CSV
 * @param {Object} filters - Filter parameters
 * @param {Object} options - Export options
 * @returns {Promise<string>} CSV content
 */
async function exportToCSV(filters = {}, options = {}) {
  const theses = await getFilteredTheses(filters);
  return generateCSV(theses, options);
}

/**
 * Get available filter options for UI
 * @returns {Promise<Object>} Filter options
 */
async function getFilterOptions() {
  const [departments, years, statuses] = await Promise.all([
    prisma.department.findMany({
      include: { faculty: true },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.thesis.findMany({
      select: { graduationYear: true },
      distinct: ['graduationYear'],
      orderBy: { graduationYear: 'desc' },
    }),
    prisma.thesis.groupBy({
      by: ['status'],
    }),
  ]);

  const researchMethods = [
    { value: 'QUALITATIVE', label: 'Kualitatif' },
    { value: 'QUANTITATIVE', label: 'Kuantitatif' },
    { value: 'MIXED_METHOD', label: 'Mix-method' },
    { value: 'OTHER', label: 'Lainnya' },
  ];

  return {
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      faculty: d.faculty.name,
    })),
    years: years.map((y) => y.graduationYear).sort((a, b) => b - a),
    statuses: statuses.map((s) => s.status),
    researchMethods,
  };
}

module.exports = {
  exportToCSV,
  getFilteredTheses,
  getFilterOptions,
  buildWhereClause,
};
