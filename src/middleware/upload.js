/**
 * File Upload Middleware Configuration
 * Uses multer for handling multipart/form-data file uploads
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in temp directory initially
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomhash-originalname
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const filename = `${timestamp}-${randomHash}-${basename}${ext}`;
    cb(null, filename);
  },
});

// File filter - only allow PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
});

// Single file upload
const uploadSingle = upload.single('file');

// Multiple files upload
const uploadMultiple = upload.array('files', 10);

module.exports = {
  uploadSingle,
  uploadMultiple,
  upload,
};
