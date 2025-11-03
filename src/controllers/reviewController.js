/**
 * Review Controller
 * Handles admin review of thesis submissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { getFileMetadata } = require('../utils/fileHandler');

/**
 * Review Queue - List all pending theses
 * GET /admin/review
 */
const index = async (req, res, next) => {
  try {
    const { department, sort, status: statusFilter } = req.query;

    // Build query conditions
    const where = {
      status: statusFilter === 'approved' ? 'APPROVED' : 'PENDING',
    };

    if (department && department !== 'all') {
      where.departmentId = parseInt(department);
    }

    // Determine sort order
    const orderBy = sort === 'newest' ? { submittedAt: 'desc' } : { submittedAt: 'asc' };

    // Get pending theses
    const theses = await prisma.thesis.findMany({
      where,
      orderBy,
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        submitter: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        advisor1: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        advisor2: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        examiner1: {
          select: {
            id: true,
            name: true,
          },
        },
        examiner2: {
          select: {
            id: true,
            name: true,
          },
        },
        examiner3: {
          select: {
            id: true,
            name: true,
          },
        },
        files: {
          select: {
            id: true,
            fileType: true,
          },
        },
      },
    });

    // Get all departments for filter dropdown
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        faculty: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate statistics
    const stats = {
      total: theses.length,
      today: theses.filter((t) => {
        const submittedDate = new Date(t.submittedAt);
        const today = new Date();
        return (
          submittedDate.toDateString() === today.toDateString()
        );
      }).length,
    };

    res.renderWithLayout('admin/review/index', {
      title: statusFilter === 'approved' ? 'Approved Theses' : 'Review Queue',
      theses,
      departments,
      stats,
      selectedDepartment: department || 'all',
      selectedSort: sort || 'oldest',
      selectedStatus: statusFilter || 'pending',
      user: req.user,
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    next(error);
  }
};

/**
 * Detailed Review Page - Show thesis details
 * GET /admin/review/:id
 */
const show = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get thesis with all related data
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        submitter: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        advisor1: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        advisor2: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        examiner1: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        examiner2: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        examiner3: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
        files: {
          orderBy: {
            fileType: 'asc',
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!thesis) {
      req.flash('error', 'Thesis not found');
      return res.redirect('/admin/review');
    }

    // Format keywords as array
    const keywords = thesis.keywords ? thesis.keywords.split(',').map(k => k.trim()) : [];
    const keywordsEn = thesis.keywordsEn ? thesis.keywordsEn.split(',').map(k => k.trim()) : [];

    // Get file type labels
    const fileTypeLabels = {
      COVER: 'Cover',
      CHAPTER_1: 'Chapter 1',
      CHAPTER_2: 'Chapter 2',
      CHAPTER_3: 'Chapter 3',
      CHAPTER_4: 'Chapter 4',
      CHAPTER_5: 'Chapter 5',
      BIBLIOGRAPHY: 'Bibliography',
      APPENDIX: 'Appendix',
      OTHER: 'Other',
    };

    // Format file sizes
    const filesWithMeta = thesis.files.map(file => ({
      ...file,
      typeLabel: fileTypeLabels[file.fileType] || file.fileType,
      sizeFormatted: formatFileSize(file.fileSize),
    }));

    // Format dates
    const submittedDate = new Date(thesis.submittedAt);
    const formattedSubmittedDate = submittedDate.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    res.renderWithLayout('admin/review/show', {
      title: `Review: ${thesis.title}`,
      thesis,
      keywords,
      keywordsEn,
      files: filesWithMeta,
      formattedSubmittedDate,
      user: req.user,
    });
  } catch (error) {
    console.error('Error fetching thesis details:', error);
    next(error);
  }
};

/**
 * Download Thesis File
 * GET /admin/review/:thesisId/download/:fileId
 */
const downloadFile = async (req, res, next) => {
  try {
    const { thesisId, fileId } = req.params;

    // Get file record
    const file = await prisma.thesisFile.findUnique({
      where: { id: parseInt(fileId) },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Check if file belongs to thesis
    if (file.thesisId !== parseInt(thesisId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Build file path
    const filePath = path.join(__dirname, '../../public', file.filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
    }

    // Increment download count
    await prisma.thesisFile.update({
      where: { id: parseInt(fileId) },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    // Log download activity (optional - could be a separate statistics table)
    console.log(`File downloaded: ${file.filename} by admin ${req.user.username}`);

    // Set headers for download
    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file',
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download file',
      });
    }
  }
};

/**
 * Preview Thesis File (for modal)
 * GET /admin/review/:thesisId/preview/:fileId
 */
const previewFile = async (req, res, next) => {
  try {
    const { thesisId, fileId } = req.params;

    // Get file record
    const file = await prisma.thesisFile.findUnique({
      where: { id: parseInt(fileId) },
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Check if file belongs to thesis
    if (file.thesisId !== parseInt(thesisId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Build file path
    const filePath = path.join(__dirname, '../../public', file.filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
    }

    // Set headers for inline display
    res.setHeader('Content-Type', file.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error previewing file',
        });
      }
    });
  } catch (error) {
    console.error('Error previewing file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to preview file',
      });
    }
  }
};

/**
 * Approve Thesis - Publish to public
 * POST /admin/review/:id/approve
 */
const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get thesis and verify status
      const thesis = await tx.thesis.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          title: true,
          status: true,
          submitterId: true,
        },
      });

      if (!thesis) {
        throw new Error('Thesis not found');
      }

      if (thesis.status !== 'PENDING') {
        throw new Error('Only pending theses can be approved');
      }

      // Update thesis status to APPROVED (but not published yet)
      const updatedThesis = await tx.thesis.update({
        where: { id: parseInt(id) },
        data: {
          status: 'APPROVED',
          isPublished: false, // Requires manual publish action
          publishedAt: new Date(),
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewerNotes: null, // Clear any previous notes
        },
      });

      return updatedThesis;
    });

    console.log(`Thesis approved: ${result.id} by admin ${req.user.username}`);

    req.flash('success', 'Thesis approved successfully! You can now publish it to make it publicly visible.');
    res.redirect('/admin/review');
  } catch (error) {
    console.error('Error approving thesis:', error);
    req.flash('error', error.message || 'Failed to approve thesis');
    res.redirect(`/admin/review/${req.params.id}`);
  }
};

/**
 * Request Changes - Send thesis back to student for revision
 * POST /admin/review/:id/request-changes
 */
const requestChanges = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewerNotes } = req.body;
    const adminId = req.user.id;

    // Validate reviewer notes
    if (!reviewerNotes || reviewerNotes.trim().length < 50) {
      req.flash('error', 'Please provide detailed notes (minimum 50 characters)');
      return res.redirect(`/admin/review/${id}`);
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get thesis and verify status
      const thesis = await tx.thesis.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          title: true,
          status: true,
          submitterId: true,
        },
      });

      if (!thesis) {
        throw new Error('Thesis not found');
      }

      if (thesis.status !== 'PENDING') {
        throw new Error('Only pending theses can be sent back for changes');
      }

      // Update thesis status to DRAFT (student can edit and re-submit)
      const updatedThesis = await tx.thesis.update({
        where: { id: parseInt(id) },
        data: {
          status: 'DRAFT',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewerNotes: reviewerNotes.trim(),
        },
      });

      return updatedThesis;
    });

    console.log(`Changes requested for thesis: ${result.id} by admin ${req.user.username}`);

    req.flash('success', 'Changes requested. Student has been notified and can revise the submission.');
    res.redirect('/admin/review');
  } catch (error) {
    console.error('Error requesting changes:', error);
    req.flash('error', error.message || 'Failed to request changes');
    res.redirect(`/admin/review/${req.params.id}`);
  }
};

/**
 * Reject Thesis - Permanently reject the submission
 * POST /admin/review/:id/reject
 */
const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length < 50) {
      req.flash('error', 'Please provide a detailed rejection reason (minimum 50 characters)');
      return res.redirect(`/admin/review/${id}`);
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get thesis and verify status
      const thesis = await tx.thesis.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          title: true,
          status: true,
          submitterId: true,
        },
      });

      if (!thesis) {
        throw new Error('Thesis not found');
      }

      if (thesis.status !== 'PENDING') {
        throw new Error('Only pending theses can be rejected');
      }

      // Update thesis status to REJECTED
      const updatedThesis = await tx.thesis.update({
        where: { id: parseInt(id) },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewerNotes: rejectionReason.trim(),
        },
      });

      return updatedThesis;
    });

    console.log(`Thesis rejected: ${result.id} by admin ${req.user.username}`);

    req.flash('success', 'Thesis has been rejected.');
    res.redirect('/admin/review');
  } catch (error) {
    console.error('Error rejecting thesis:', error);
    req.flash('error', error.message || 'Failed to reject thesis');
    res.redirect(`/admin/review/${req.params.id}`);
  }
};

/**
 * Set File Embargo Settings
 * POST /admin/review/:thesisId/files/:fileId/embargo
 */
const setFileEmbargo = async (req, res, next) => {
  try {
    const { thesisId, fileId } = req.params;
    const { accessLevel, embargoUntil, embargoReason } = req.body;

    // Validate access level
    const validAccessLevels = ['PUBLIC', 'EMBARGOED', 'RESTRICTED'];
    if (!accessLevel || !validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access level',
      });
    }

    // Validate embargo date if EMBARGOED
    if (accessLevel === 'EMBARGOED') {
      if (!embargoUntil) {
        return res.status(400).json({
          success: false,
          message: 'Embargo date is required for embargoed files',
        });
      }

      const embargoDate = new Date(embargoUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (embargoDate <= today) {
        return res.status(400).json({
          success: false,
          message: 'Embargo date must be in the future',
        });
      }
    }

    // Get file and verify it belongs to thesis
    const file = await prisma.thesisFile.findUnique({
      where: { id: parseInt(fileId) },
      select: {
        id: true,
        thesisId: true,
        filename: true,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    if (file.thesisId !== parseInt(thesisId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update file embargo settings
    const updatedFile = await prisma.thesisFile.update({
      where: { id: parseInt(fileId) },
      data: {
        accessLevel: accessLevel,
        embargoUntil: accessLevel === 'EMBARGOED' ? new Date(embargoUntil) : null,
        embargoReason: accessLevel === 'EMBARGOED' ? embargoReason || null : null,
      },
    });

    console.log(
      `Embargo settings updated for file ${file.filename}: ${accessLevel} by admin ${req.user.username}`
    );

    res.json({
      success: true,
      message: 'Embargo settings updated successfully',
      file: {
        id: updatedFile.id,
        accessLevel: updatedFile.accessLevel,
        embargoUntil: updatedFile.embargoUntil,
        embargoReason: updatedFile.embargoReason,
      },
    });
  } catch (error) {
    console.error('Error setting file embargo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update embargo settings',
    });
  }
};

/**
 * Bulk Set Embargo for All Files in Thesis
 * POST /admin/review/:thesisId/files/bulk-embargo
 */
const bulkSetEmbargo = async (req, res, next) => {
  try {
    const { thesisId } = req.params;
    const { accessLevel, embargoUntil, embargoReason } = req.body;

    // Validate access level
    const validAccessLevels = ['PUBLIC', 'EMBARGOED', 'RESTRICTED'];
    if (!accessLevel || !validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access level',
      });
    }

    // Validate embargo date if EMBARGOED
    if (accessLevel === 'EMBARGOED') {
      if (!embargoUntil) {
        return res.status(400).json({
          success: false,
          message: 'Embargo date is required for embargoed files',
        });
      }

      const embargoDate = new Date(embargoUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (embargoDate <= today) {
        return res.status(400).json({
          success: false,
          message: 'Embargo date must be in the future',
        });
      }
    }

    // Verify thesis exists
    const thesis = await prisma.thesis.findUnique({
      where: { id: parseInt(thesisId) },
      select: {
        id: true,
        title: true,
      },
    });

    if (!thesis) {
      return res.status(404).json({
        success: false,
        message: 'Thesis not found',
      });
    }

    // Update all files for this thesis
    const updateResult = await prisma.thesisFile.updateMany({
      where: {
        thesisId: parseInt(thesisId),
      },
      data: {
        accessLevel: accessLevel,
        embargoUntil: accessLevel === 'EMBARGOED' ? new Date(embargoUntil) : null,
        embargoReason: accessLevel === 'EMBARGOED' ? embargoReason || null : null,
      },
    });

    console.log(
      `Bulk embargo applied to ${updateResult.count} files for thesis ${thesisId}: ${accessLevel} by admin ${req.user.username}`
    );

    res.json({
      success: true,
      message: `Embargo settings applied to ${updateResult.count} files`,
      count: updateResult.count,
    });
  } catch (error) {
    console.error('Error setting bulk embargo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply bulk embargo settings',
    });
  }
};

/**
 * Helper function to format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  index,
  show,
  downloadFile,
  previewFile,
  approve,
  requestChanges,
  reject,
  setFileEmbargo,
  bulkSetEmbargo,
};
