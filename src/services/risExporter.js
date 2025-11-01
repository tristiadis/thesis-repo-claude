/**
 * RIS Export Service
 * Generates RIS format citations compatible with major citation managers
 * (Mendeley, Zotero, EndNote)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate RIS format citation for a thesis
 * @param {number} thesisId - Thesis ID
 * @param {string} baseUrl - Base URL for thesis detail link
 * @returns {Promise<string>} RIS formatted citation
 */
async function generateRIS(thesisId, baseUrl) {
  // Fetch thesis with all relations
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
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

  if (!thesis) {
    throw new Error('Thesis not found');
  }

  if (thesis.status !== 'APPROVED') {
    throw new Error('Thesis is not approved');
  }

  // Validate required fields
  if (!thesis.title || !thesis.submitter.name || !thesis.graduationYear) {
    throw new Error('Missing required fields for RIS export');
  }

  // Build RIS content (CRLF line endings: \r\n)
  const lines = [];

  // TY - Type of reference (THES = Thesis)
  lines.push('TY  - THES');

  // AU - Author (student name)
  // Assuming name is already in "Last, First" format or we format it
  lines.push(`AU  - ${thesis.submitter.name}`);

  // A2 - Secondary Authors (Advisors)
  if (thesis.advisor) {
    lines.push(`A2  - ${thesis.advisor}`);
  }
  if (thesis.advisor2) {
    lines.push(`A2  - ${thesis.advisor2}`);
  }

  // A3 - Tertiary Authors (Examiners)
  if (thesis.examiner1) {
    lines.push(`A3  - ${thesis.examiner1}`);
  }
  if (thesis.examiner2) {
    lines.push(`A3  - ${thesis.examiner2}`);
  }
  if (thesis.examiner3) {
    lines.push(`A3  - ${thesis.examiner3}`);
  }

  // TI - Title
  lines.push(`TI  - ${thesis.title}`);

  // T2 - Secondary Title (English title if available)
  if (thesis.titleEn) {
    lines.push(`T2  - ${thesis.titleEn}`);
  }

  // AB - Abstract
  if (thesis.abstractId) {
    // RIS abstract should be on one line, replace newlines with spaces
    const abstract = thesis.abstractId.replace(/\r?\n/g, ' ').trim();
    lines.push(`AB  - ${abstract}`);
  }

  // KW - Keywords (each keyword on separate line)
  if (thesis.keywords) {
    const keywords = thesis.keywords.split(',').map(kw => kw.trim()).filter(kw => kw);
    keywords.forEach(keyword => {
      lines.push(`KW  - ${keyword}`);
    });
  }

  // PB - Publisher (Department, Faculty, University)
  const publisher = `${thesis.department.name}, ${thesis.department.faculty.name}, University`;
  lines.push(`PB  - ${publisher}`);

  // PY - Publication Year
  lines.push(`PY  - ${thesis.graduationYear}`);

  // DA - Date (Defense date in YYYY/MM/DD format)
  if (thesis.defenseDate) {
    const date = new Date(thesis.defenseDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    lines.push(`DA  - ${year}/${month}/${day}`);
  }

  // UR - URL (Public URL to thesis detail)
  const url = `${baseUrl}/thesis/${thesis.id}`;
  lines.push(`UR  - ${url}`);

  // ER - End of Reference (always the last line)
  lines.push('ER  - ');

  // Join with CRLF (\r\n) line endings
  const risContent = lines.join('\r\n');

  // Add UTF-8 BOM (Byte Order Mark) for better compatibility
  const BOM = '\uFEFF';
  return BOM + risContent;
}

/**
 * Validate thesis data for RIS export
 * @param {object} thesis - Thesis object
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
function validateThesisForExport(thesis) {
  const errors = [];

  if (!thesis) {
    errors.push('Thesis not found');
    return { valid: false, errors };
  }

  if (thesis.status !== 'APPROVED') {
    errors.push('Thesis is not approved for export');
  }

  if (!thesis.title || thesis.title.trim() === '') {
    errors.push('Thesis title is required');
  }

  if (!thesis.submitter || !thesis.submitter.name) {
    errors.push('Author name is required');
  }

  if (!thesis.graduationYear) {
    errors.push('Graduation year is required');
  }

  // Check advisor format (should contain comma for "Last, First" format)
  // This is optional but recommended
  if (thesis.advisor && !thesis.advisor.includes(',')) {
    // Just a warning, don't block export
    console.warn(`Advisor name may not be in RIS format (Last, First): ${thesis.advisor}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  generateRIS,
  validateThesisForExport,
};
