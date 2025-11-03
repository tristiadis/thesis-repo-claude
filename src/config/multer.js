const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// File size limits per file type (in bytes)
const FILE_SIZE_LIMITS = {
  COVER: 5 * 1024 * 1024, // 5MB
  CHAPTER_1: 10 * 1024 * 1024, // 10MB
  CHAPTER_2: 10 * 1024 * 1024, // 10MB
  CHAPTER_3: 10 * 1024 * 1024, // 10MB
  CHAPTER_4: 10 * 1024 * 1024, // 10MB
  CHAPTER_5: 10 * 1024 * 1024, // 10MB
  BIBLIOGRAPHY: 5 * 1024 * 1024, // 5MB
  APPENDIX: 20 * 1024 * 1024, // 20MB
  OTHER: 10 * 1024 * 1024, // 10MB
};

// Ensure upload directories exist
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Sanitize filename to prevent directory traversal and security issues
const sanitizeFilename = (filename) => {
  // Remove path separators
  let sanitized = filename.replace(/[/\\]/g, '');

  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '-');

  // Remove leading dots to prevent hidden files
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length
  if (sanitized.length > 200) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = path.basename(sanitized, ext);
    sanitized = nameWithoutExt.substring(0, 200 - ext.length) + ext;
  }

  return sanitized || 'unnamed';
};

// Generate unique filename with timestamp and random hash
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  const basename = path.basename(originalname, ext);
  const sanitizedBasename = sanitizeFilename(basename);

  return `${timestamp}-${randomHash}-${sanitizedBasename}${ext}`;
};

// Storage configuration for thesis files (temporary storage)
const thesisStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.THESIS_TEMP_DIR || 'public/uploads/theses/temp';
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = generateUniqueFilename(file.originalname);
    cb(null, filename);
  },
});

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.PROFILE_UPLOAD_DIR || 'public/uploads/profiles';
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${ext}`);
  },
});

// File filter for thesis files (PDF only with MIME type check)
const thesisFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Check both extension and MIME type for PDF
  if (ext === '.pdf' && mimeType === 'application/pdf') {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only PDF files are allowed. Please upload a valid PDF document.'
      ),
      false
    );
  }
};

// File filter for profile images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// Multer upload configurations
const uploadThesis = multer({
  storage: thesisStorage,
  fileFilter: thesisFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max (for Appendix, largest file type)
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile images
  },
});

// Custom error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the maximum allowed limit.',
          errorCode: 'FILE_TOO_LARGE',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded.',
          errorCode: 'TOO_MANY_FILES',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
          errorCode: 'UNEXPECTED_FIELD',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message,
          errorCode: 'UPLOAD_ERROR',
        });
    }
  } else if (err) {
    // Other errors (e.g., file filter errors)
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed.',
      errorCode: 'INVALID_FILE',
    });
  }

  next();
};

// Middleware to validate file size against specific file type limits
const validateFileSize = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const fileType = req.body.fileType || req.headers['x-file-type'];
  const fileSize = req.file.size;

  if (fileType && FILE_SIZE_LIMITS[fileType]) {
    const maxSize = FILE_SIZE_LIMITS[fileType];

    if (fileSize > maxSize) {
      // Delete the uploaded file since it exceeds limits
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting oversized file:', unlinkErr);
        }
      });

      return res.status(400).json({
        success: false,
        message: `File size exceeds the maximum allowed for ${fileType} (${Math.round(maxSize / (1024 * 1024))}MB).`,
        errorCode: 'FILE_SIZE_EXCEEDED',
      });
    }
  }

  next();
};

// Check disk space before upload (optional middleware)
const checkDiskSpace = async (req, res, next) => {
  // This is a placeholder for disk space checking
  // In production, you might want to use a library like 'check-disk-space'
  // For now, we'll just pass through
  next();
};

module.exports = {
  uploadThesis,
  uploadProfile,
  handleMulterError,
  validateFileSize,
  checkDiskSpace,
  FILE_SIZE_LIMITS,
  sanitizeFilename,
  generateUniqueFilename,
  ensureDirectoryExists,
};
