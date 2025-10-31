/**
 * Upload Routes
 * Handles file upload and deletion operations for thesis submissions
 */

const express = require('express');
const router = express.Router();
const {
  uploadThesis,
  validateFileSize,
  handleMulterError,
} = require('../config/multer');
const {
  calculateChecksum,
  deleteFile,
  validatePDF,
  getFileMetadata,
} = require('../utils/fileHandler');
const { requireAuth, requireStudent } = require('../middleware/auth');

/**
 * POST /upload/thesis-file
 * Upload a single thesis file to temporary storage
 *
 * Request body:
 * - file: PDF file (multipart/form-data)
 * - fileType: Type of file (COVER, CHAPTER_1, etc.)
 *
 * Response:
 * - success: boolean
 * - message: string
 * - file: object with file details including checksum
 */
router.post(
  '/thesis-file',
  requireAuth,
  requireStudent,
  uploadThesis.single('file'),
  validateFileSize,
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
          errorCode: 'NO_FILE',
        });
      }

      const file = req.file;
      const fileType = req.body.fileType || req.headers['x-file-type'];

      // Validate file type parameter
      const validFileTypes = [
        'COVER',
        'CHAPTER_1',
        'CHAPTER_2',
        'CHAPTER_3',
        'CHAPTER_4',
        'CHAPTER_5',
        'BIBLIOGRAPHY',
        'APPENDIX',
        'OTHER',
      ];

      if (!fileType || !validFileTypes.includes(fileType)) {
        // Delete uploaded file since validation failed
        await deleteFile(file.path);

        return res.status(400).json({
          success: false,
          message: 'Invalid file type specified',
          errorCode: 'INVALID_FILE_TYPE',
        });
      }

      // Validate PDF content (not just extension)
      const isPDF = await validatePDF(file.path);
      if (!isPDF) {
        await deleteFile(file.path);

        return res.status(400).json({
          success: false,
          message: 'File is not a valid PDF document',
          errorCode: 'INVALID_PDF_CONTENT',
        });
      }

      // Calculate checksum for file integrity
      const checksum = await calculateChecksum(file.path);

      // Initialize session storage for uploaded files
      if (!req.session.uploadedFiles) {
        req.session.uploadedFiles = [];
      }

      // Remove existing file of same type if any
      const existingFileIndex = req.session.uploadedFiles.findIndex(
        (f) => f.type === fileType
      );

      if (existingFileIndex !== -1) {
        const existingFile = req.session.uploadedFiles[existingFileIndex];
        // Delete old file from filesystem
        await deleteFile(existingFile.path);
        // Remove from session
        req.session.uploadedFiles.splice(existingFileIndex, 1);
      }

      // Store file information in session
      const fileData = {
        type: fileType,
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        checksum: checksum,
        uploadedAt: new Date().toISOString(),
      };

      req.session.uploadedFiles.push(fileData);

      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to save file information',
            errorCode: 'SESSION_ERROR',
          });
        }

        res.json({
          success: true,
          message: 'File uploaded successfully',
          file: {
            type: fileType,
            filename: file.originalname,
            size: file.size,
            checksum: checksum,
            uploadedAt: fileData.uploadedAt,
          },
        });
      });
    } catch (error) {
      console.error('Error uploading file:', error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        await deleteFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        errorCode: 'UPLOAD_ERROR',
      });
    }
  }
);

/**
 * DELETE /upload/thesis-file/:fileType
 * Delete a previously uploaded file from temporary storage
 *
 * URL params:
 * - fileType: Type of file to delete (COVER, CHAPTER_1, etc.)
 *
 * Response:
 * - success: boolean
 * - message: string
 */
router.delete(
  '/thesis-file/:fileType',
  requireAuth,
  requireStudent,
  async (req, res) => {
    try {
      const { fileType } = req.params;

      if (!req.session.uploadedFiles || req.session.uploadedFiles.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No files found in session',
          errorCode: 'NO_FILES',
        });
      }

      // Find file in session
      const fileIndex = req.session.uploadedFiles.findIndex(
        (f) => f.type === fileType
      );

      if (fileIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          errorCode: 'FILE_NOT_FOUND',
        });
      }

      const file = req.session.uploadedFiles[fileIndex];

      // Delete file from filesystem
      const deleted = await deleteFile(file.path);

      if (!deleted) {
        console.warn('Failed to delete file from filesystem, but continuing...');
      }

      // Remove from session
      req.session.uploadedFiles.splice(fileIndex, 1);

      // Save session
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to update file information',
            errorCode: 'SESSION_ERROR',
          });
        }

        res.json({
          success: true,
          message: 'File deleted successfully',
        });
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        errorCode: 'DELETE_ERROR',
      });
    }
  }
);

/**
 * GET /upload/session-files
 * Get list of all files in current session
 *
 * Response:
 * - success: boolean
 * - files: array of file objects
 */
router.get('/session-files', requireAuth, requireStudent, (req, res) => {
  try {
    const files = req.session.uploadedFiles || [];

    // Return file information without full paths
    const fileList = files.map((file) => ({
      type: file.type,
      filename: file.originalname,
      size: file.size,
      checksum: file.checksum,
      uploadedAt: file.uploadedAt,
    }));

    res.json({
      success: true,
      files: fileList,
    });
  } catch (error) {
    console.error('Error getting session files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file list',
      errorCode: 'SESSION_ERROR',
    });
  }
});

/**
 * POST /upload/clear-session
 * Clear all files from session (cleanup)
 *
 * Response:
 * - success: boolean
 * - message: string
 */
router.post('/clear-session', requireAuth, requireStudent, async (req, res) => {
  try {
    const files = req.session.uploadedFiles || [];

    // Delete all files from filesystem
    for (const file of files) {
      await deleteFile(file.path);
    }

    // Clear session
    req.session.uploadedFiles = [];

    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to clear session',
          errorCode: 'SESSION_ERROR',
        });
      }

      res.json({
        success: true,
        message: 'Session cleared successfully',
      });
    });
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear session',
      errorCode: 'CLEAR_ERROR',
    });
  }
});

module.exports = router;
