/**
 * Audit Trail Service
 * Logs all thesis modifications for compliance and tracking
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log metadata edit
 * @param {number} thesisId - Thesis ID
 * @param {number} userId - Admin user ID who made the change
 * @param {string} fieldName - Field that was changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {string} description - Optional description
 */
async function logMetadataEdit(thesisId, userId, fieldName, oldValue, newValue, description = null) {
  try {
    await prisma.thesisEditHistory.create({
      data: {
        thesisId,
        userId,
        action: 'EDIT_METADATA',
        fieldName,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        description: description || `Updated ${fieldName}`,
      },
    });
  } catch (error) {
    console.error('Error logging metadata edit:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Log file addition
 * @param {number} thesisId - Thesis ID
 * @param {number} userId - Admin user ID
 * @param {string} fileLabel - Label of the file added
 * @param {string} filename - Filename
 */
async function logFileAdd(thesisId, userId, fileLabel, filename) {
  try {
    await prisma.thesisEditHistory.create({
      data: {
        thesisId,
        userId,
        action: 'ADD_FILE',
        fieldName: 'files',
        newValue: filename,
        description: `Added file: ${fileLabel} (${filename})`,
      },
    });
  } catch (error) {
    console.error('Error logging file addition:', error);
  }
}

/**
 * Log file deletion
 * @param {number} thesisId - Thesis ID
 * @param {number} userId - Admin user ID
 * @param {string} fileLabel - Label of the file deleted
 * @param {string} filename - Filename
 */
async function logFileDelete(thesisId, userId, fileLabel, filename) {
  try {
    await prisma.thesisEditHistory.create({
      data: {
        thesisId,
        userId,
        action: 'DELETE_FILE',
        fieldName: 'files',
        oldValue: filename,
        description: `Deleted file: ${fileLabel} (${filename})`,
      },
    });
  } catch (error) {
    console.error('Error logging file deletion:', error);
  }
}

/**
 * Log file metadata edit
 * @param {number} thesisId - Thesis ID
 * @param {number} userId - Admin user ID
 * @param {number} fileId - File ID
 * @param {string} fieldName - Field that was changed (label, accessLevel, etc)
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 */
async function logFileEdit(thesisId, userId, fileId, fieldName, oldValue, newValue) {
  try {
    await prisma.thesisEditHistory.create({
      data: {
        thesisId,
        userId,
        action: 'EDIT_FILE',
        fieldName: `file_${fileId}_${fieldName}`,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        description: `Updated file #${fileId} ${fieldName}: ${oldValue} → ${newValue}`,
      },
    });
  } catch (error) {
    console.error('Error logging file edit:', error);
  }
}

/**
 * Log bulk changes (for multiple field updates)
 * @param {number} thesisId - Thesis ID
 * @param {number} userId - Admin user ID
 * @param {Array} changes - Array of {fieldName, oldValue, newValue}
 */
async function logBulkEdit(thesisId, userId, changes) {
  try {
    const entries = changes.map(change => ({
      thesisId,
      userId,
      action: 'EDIT_METADATA',
      fieldName: change.fieldName,
      oldValue: change.oldValue ? String(change.oldValue) : null,
      newValue: change.newValue ? String(change.newValue) : null,
      description: change.description || `Updated ${change.fieldName}`,
    }));

    await prisma.thesisEditHistory.createMany({
      data: entries,
    });
  } catch (error) {
    console.error('Error logging bulk edit:', error);
  }
}

/**
 * Get edit history for a thesis
 * @param {number} thesisId - Thesis ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of edit history records
 */
async function getThesisHistory(thesisId, limit = 50) {
  try {
    return await prisma.thesisEditHistory.findMany({
      where: { thesisId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Error fetching thesis history:', error);
    return [];
  }
}

/**
 * Get all edits by a specific user
 * @param {number} userId - User ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Array of edit history records
 */
async function getUserEditHistory(userId, limit = 100) {
  try {
    return await prisma.thesisEditHistory.findMany({
      where: { userId },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            studentId: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Error fetching user edit history:', error);
    return [];
  }
}

module.exports = {
  logMetadataEdit,
  logFileAdd,
  logFileDelete,
  logFileEdit,
  logBulkEdit,
  getThesisHistory,
  getUserEditHistory,
};
