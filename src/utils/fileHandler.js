/**
 * File Handler Utilities
 * Provides helper functions for file operations including checksum,
 * validation, moving files, and deletion.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculate MD5 checksum for a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} MD5 checksum hash
 */
const calculateChecksum = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fsSync.createReadStream(filePath);

    stream.on('data', (data) => {
      hash.update(data);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
};

/**
 * Move file from temporary storage to permanent thesis storage
 * @param {string} tempPath - Current path of the file in temp directory
 * @param {number} thesisId - ID of the thesis
 * @param {string} fileType - Type of file (COVER, CHAPTER_1, etc.)
 * @returns {Promise<string>} New path of the moved file
 */
const moveFileToStorage = async (tempPath, thesisId, fileType) => {
  try {
    // Create thesis-specific directory
    const thesisDir = path.join(
      __dirname,
      '../../public/uploads/theses',
      thesisId.toString()
    );

    // Ensure directory exists
    await fs.mkdir(thesisDir, { recursive: true });

    // Generate new filename based on file type
    const ext = path.extname(tempPath);
    const filename = `${fileType.toLowerCase()}${ext}`;
    const newPath = path.join(thesisDir, filename);

    // Move file from temp to permanent storage
    await fs.rename(tempPath, newPath);

    // Return relative path for database storage
    return path.join('uploads/theses', thesisId.toString(), filename);
  } catch (error) {
    console.error('Error moving file to storage:', error);
    throw new Error('Failed to move file to permanent storage');
  }
};

/**
 * Delete a file safely with error handling
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
const deleteFile = async (filePath) => {
  try {
    // Check if file exists
    await fs.access(filePath);

    // Delete the file
    await fs.unlink(filePath);

    console.log(`File deleted successfully: ${filePath}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`File not found, already deleted: ${filePath}`);
      return true; // Consider it success if file doesn't exist
    }

    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Validate PDF file content (basic validation)
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<boolean>} True if valid PDF, false otherwise
 */
const validatePDF = async (filePath) => {
  try {
    // Read first few bytes to check PDF signature
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(5);
    await fileHandle.read(buffer, 0, 5, 0);
    await fileHandle.close();

    // PDF files start with %PDF- signature
    const signature = buffer.toString('utf-8');
    const isPDF = signature === '%PDF-';

    if (!isPDF) {
      console.warn(`Invalid PDF signature: ${signature}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
};

/**
 * Get file size in bytes
 * @param {string} filePath - Path to the file
 * @returns {Promise<number>} File size in bytes
 */
const getFileSize = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    throw new Error('Failed to get file size');
  }
};

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Clean up temporary files older than specified hours
 * @param {number} hoursOld - Delete files older than this many hours
 * @returns {Promise<number>} Number of files deleted
 */
const cleanupTempFiles = async (hoursOld = 24) => {
  try {
    const tempDir = path.join(__dirname, '../../public/uploads/theses/temp');

    // Check if temp directory exists
    try {
      await fs.access(tempDir);
    } catch {
      console.log('Temp directory does not exist, skipping cleanup');
      return 0;
    }

    const files = await fs.readdir(tempDir);
    const cutoffTime = Date.now() - hoursOld * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile() && stats.mtimeMs < cutoffTime) {
        await deleteFile(filePath);
        deletedCount++;
      }
    }

    console.log(`Cleaned up ${deletedCount} temporary files`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
    return 0;
  }
};

/**
 * Get file metadata
 * @param {string} filePath - Path to the file
 * @returns {Promise<object>} File metadata
 */
const getFileMetadata = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const checksum = await calculateChecksum(filePath);

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      checksum: checksum,
      filename: path.basename(filePath),
      extension: path.extname(filePath),
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
};

module.exports = {
  calculateChecksum,
  moveFileToStorage,
  deleteFile,
  validatePDF,
  getFileSize,
  formatFileSize,
  cleanupTempFiles,
  getFileMetadata,
};
