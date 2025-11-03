/**
 * File Label Configuration
 * Suggested labels for thesis files (admin can also use custom labels)
 */

const FILE_LABEL_SUGGESTIONS = [
  { value: 'Full Text', label: 'Full Text (Complete Thesis)' },
  { value: 'Cover', label: 'Cover' },
  { value: 'Abstract', label: 'Abstract' },
  { value: 'Chapter 1', label: 'Chapter 1 (Introduction)' },
  { value: 'Chapter 2', label: 'Chapter 2 (Literature Review)' },
  { value: 'Chapter 3', label: 'Chapter 3 (Methodology)' },
  { value: 'Chapter 4', label: 'Chapter 4 (Results & Discussion)' },
  { value: 'Chapter 5', label: 'Chapter 5 (Conclusion)' },
  { value: 'Bibliography', label: 'Bibliography (Daftar Pustaka)' },
  { value: 'Appendix', label: 'Appendix (Lampiran)' },
  { value: 'Source Code', label: 'Source Code' },
  { value: 'Dataset', label: 'Dataset' },
  { value: 'Supplementary Material', label: 'Supplementary Material' },
  { value: 'Presentation Slides', label: 'Presentation Slides' },
  { value: 'Other', label: 'Other' },
];

const ACCESS_LEVEL_OPTIONS = [
  { value: 'PUBLIC', label: 'Public (Immediately accessible)' },
  { value: 'EMBARGOED', label: 'Embargoed (Restricted until date)' },
  { value: 'RESTRICTED', label: 'Restricted (Permanently restricted)' },
];

const EMBARGO_REASON_SUGGESTIONS = [
  'Pending publication in journal',
  'Patent application in progress',
  'Confidential data',
  'Author request',
  'Third-party copyright restrictions',
  'Other (specify in notes)',
];

// Validation constants
const MAX_FILES_PER_THESIS = 10;
const MIN_FILES_PER_THESIS = 1;
const MAX_FILE_SIZE_MB = 50; // 50MB per file
const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_LABEL_LENGTH = 200;

module.exports = {
  FILE_LABEL_SUGGESTIONS,
  ACCESS_LEVEL_OPTIONS,
  EMBARGO_REASON_SUGGESTIONS,
  MAX_FILES_PER_THESIS,
  MIN_FILES_PER_THESIS,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  MAX_LABEL_LENGTH,
};
