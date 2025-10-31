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
    const { department, sort } = req.query;

    // Build query conditions
    const where = {
      status: 'PENDING',
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
      title: 'Review Queue',
      theses,
      departments,
      stats,
      selectedDepartment: department || 'all',
      selectedSort: sort || 'oldest',
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
};
