/**
 * Admin Thesis Controller
 * Handles admin-specific thesis operations: upload, edit, file management
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateChecksum, moveFileToStorage, deleteFile: deleteFileUtil } = require('../utils/fileHandler');
const auditTrail = require('../services/auditTrailService');
const {
  FILE_LABEL_SUGGESTIONS,
  ACCESS_LEVEL_OPTIONS,
  EMBARGO_REASON_SUGGESTIONS,
  MAX_FILES_PER_THESIS,
  MIN_FILES_PER_THESIS,
  MAX_LABEL_LENGTH,
} = require('../config/fileLabelConfig');

/**
 * Show Admin Upload Form
 * GET /admin/thesis/upload
 */
const showUploadForm = async (req, res, next) => {
  try {
    // Get departments and lecturers for dropdowns
    const [departments, lecturers] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.lecturer.findMany({
        where: { isActive: true },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    res.renderWithLayout('admin/thesis/upload', {
      pageTitle: 'Upload Thesis',
      pageSubtitle: 'Add new thesis to the repository',
      departments,
      lecturers,
      fileLabelSuggestions: FILE_LABEL_SUGGESTIONS,
      accessLevelOptions: ACCESS_LEVEL_OPTIONS,
      embargoReasons: EMBARGO_REASON_SUGGESTIONS,
      maxFiles: MAX_FILES_PER_THESIS,
      minFiles: MIN_FILES_PER_THESIS,
      user: req.user,
    });
  } catch (error) {
    console.error('Error loading upload form:', error);
    next(error);
  }
};

/**
 * Store New Thesis (Admin Upload)
 * POST /admin/thesis/upload
 */
const storeThesis = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const data = req.body;

    // Validation
    const errors = validateThesisData(data);
    if (errors.length > 0) {
      req.flash('error', errors.join(', '));
      return res.redirect('/admin/thesis/upload');
    }

    // Check files (should be uploaded first via AJAX)
    if (!req.session.uploadedFiles || req.session.uploadedFiles.length < MIN_FILES_PER_THESIS) {
      req.flash('error', `Please upload at least ${MIN_FILES_PER_THESIS} file(s)`);
      return res.redirect('/admin/thesis/upload');
    }

    if (req.session.uploadedFiles.length > MAX_FILES_PER_THESIS) {
      req.flash('error', `Maximum ${MAX_FILES_PER_THESIS} files allowed`);
      return res.redirect('/admin/thesis/upload');
    }

    // Create thesis with files
    const result = await prisma.$transaction(async (tx) => {
      // Create thesis
      const thesis = await tx.thesis.create({
        data: {
          departmentId: parseInt(data.departmentId),
          submitterId: adminId, // Admin is the submitter
          uploadedBy: adminId, // Admin uploaded it
          status: 'APPROVED', // Auto-approved for admin uploads
          isPublished: false, // Not published yet (requires manual publish)
          submittedAt: new Date(),
          reviewedAt: new Date(),
          reviewedBy: adminId,

          // Metadata
          title: data.title,
          titleEn: data.titleEn || null,
          authorName: data.authorName,
          studentId: data.studentId,
          graduationYear: parseInt(data.graduationYear),
          defenseDate: data.defenseDate ? new Date(data.defenseDate) : null,
          abstractId: data.abstractId,
          abstractEn: data.abstractEn || null,
          keywords: data.keywords,
          keywordsEn: data.keywordsEn || null,
          researchMethod: data.researchMethod,

          // Advisors and examiners
          advisor1Id: parseInt(data.advisor1Id),
          advisor2Id: data.advisor2Id ? parseInt(data.advisor2Id) : null,
          examiner1Id: data.examiner1Id ? parseInt(data.examiner1Id) : null,
          examiner2Id: data.examiner2Id ? parseInt(data.examiner2Id) : null,
          examiner3Id: data.examiner3Id ? parseInt(data.examiner3Id) : null,
        },
      });

      // Create file records from uploaded files
      const uploadedFiles = req.session.uploadedFiles || [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        // Move file to permanent storage
        const permanentPath = await moveFileToStorage(file.tempPath, thesis.id, file.fileLabel);

        // Calculate checksum
        const checksum = await calculateChecksum(permanentPath);

        await tx.thesisFile.create({
          data: {
            thesisId: thesis.id,
            fileLabel: file.fileLabel,
            filename: file.filename,
            originalFilename: file.originalFilename,
            filePath: permanentPath,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            checksum: checksum,
            accessLevel: file.accessLevel || 'PUBLIC',
            embargoUntil: file.embargoUntil ? new Date(file.embargoUntil) : null,
            embargoReason: file.embargoReason || null,
            sequenceOrder: i,
          },
        });

        // Log file addition to audit trail
        await auditTrail.logFileAdd(thesis.id, adminId, file.fileLabel, file.filename);
      }

      return thesis;
    });

    // Clear uploaded files from session
    delete req.session.uploadedFiles;

    req.flash('success', `Thesis uploaded successfully! ID: ${result.id}. You can now publish it to make it publicly visible.`);
    res.redirect(`/admin/review?status=approved`);
  } catch (error) {
    console.error('Error storing thesis:', error);
    req.flash('error', 'Failed to upload thesis. Please try again.');
    res.redirect('/admin/thesis/upload');
  }
};

/**
 * Validate thesis metadata
 */
function validateThesisData(data) {
  const errors = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!data.authorName || data.authorName.trim().length === 0) {
    errors.push('Author name is required');
  }
  if (!data.studentId || data.studentId.trim().length === 0) {
    errors.push('Student ID is required');
  }
  if (!data.departmentId) {
    errors.push('Department is required');
  }
  if (!data.graduationYear || isNaN(parseInt(data.graduationYear))) {
    errors.push('Valid graduation year is required');
  }
  if (!data.abstractId || data.abstractId.trim().length === 0) {
    errors.push('Abstract (Indonesian) is required');
  }
  if (!data.keywords || data.keywords.trim().length === 0) {
    errors.push('Keywords are required');
  }
  if (!data.advisor1Id) {
    errors.push('Main advisor is required');
  }

  return errors;
}

/**
 * Show Edit Form
 * GET /admin/thesis/:id/edit
 */
const showEditForm = async (req, res, next) => {
  try {
    const thesisId = parseInt(req.params.id);

    // Get thesis with all relations
    const thesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
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
        files: {
          orderBy: { sequenceOrder: 'asc' },
        },
        submitter: {
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

    // Get departments and lecturers for dropdowns
    const [departments, lecturers] = await Promise.all([
      prisma.department.findMany({
        where: { isActive: true },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.lecturer.findMany({
        where: { isActive: true },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    res.renderWithLayout('admin/thesis/edit', {
      pageTitle: 'Edit Thesis',
      pageSubtitle: `Edit thesis: ${thesis.title}`,
      thesis,
      departments,
      lecturers,
      fileLabelSuggestions: FILE_LABEL_SUGGESTIONS,
      accessLevelOptions: ACCESS_LEVEL_OPTIONS,
      embargoReasons: EMBARGO_REASON_SUGGESTIONS,
      maxFiles: MAX_FILES_PER_THESIS,
      user: req.user,
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    next(error);
  }
};

/**
 * Update Thesis Metadata
 * POST /admin/thesis/:id/update
 */
const updateThesis = async (req, res, next) => {
  try {
    const thesisId = parseInt(req.params.id);
    const adminId = req.user.id;
    const data = req.body;

    // Validation
    const errors = validateThesisData(data);
    if (errors.length > 0) {
      req.flash('error', errors.join(', '));
      return res.redirect(`/admin/thesis/${thesisId}/edit`);
    }

    // Get current thesis data for comparison
    const currentThesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
    });

    if (!currentThesis) {
      req.flash('error', 'Thesis not found');
      return res.redirect('/admin/review');
    }

    // Track changes for audit trail
    const changes = [];

    // Build update data
    const updateData = {
      title: data.title,
      titleEn: data.titleEn || null,
      authorName: data.authorName,
      studentId: data.studentId,
      departmentId: parseInt(data.departmentId),
      graduationYear: parseInt(data.graduationYear),
      defenseDate: data.defenseDate ? new Date(data.defenseDate) : null,
      abstractId: data.abstractId,
      abstractEn: data.abstractEn || null,
      keywords: data.keywords,
      keywordsEn: data.keywordsEn || null,
      researchMethod: data.researchMethod,
      advisor1Id: parseInt(data.advisor1Id),
      advisor2Id: data.advisor2Id ? parseInt(data.advisor2Id) : null,
      examiner1Id: data.examiner1Id ? parseInt(data.examiner1Id) : null,
      examiner2Id: data.examiner2Id ? parseInt(data.examiner2Id) : null,
      examiner3Id: data.examiner3Id ? parseInt(data.examiner3Id) : null,
    };

    // Compare and log changes
    Object.keys(updateData).forEach((key) => {
      if (currentThesis[key] !== updateData[key]) {
        changes.push({
          fieldName: key,
          oldValue: currentThesis[key],
          newValue: updateData[key],
        });
      }
    });

    // Update thesis
    await prisma.thesis.update({
      where: { id: thesisId },
      data: updateData,
    });

    // Log changes to audit trail
    if (changes.length > 0) {
      await auditTrail.logBulkEdit(thesisId, adminId, changes);
    }

    req.flash('success', 'Thesis updated successfully!');
    res.redirect(`/admin/thesis/${thesisId}/edit`);
  } catch (error) {
    console.error('Error updating thesis:', error);
    req.flash('error', 'Failed to update thesis. Please try again.');
    res.redirect(`/admin/thesis/${req.params.id}/edit`);
  }
};

/**
 * Upload File to Existing Thesis
 * POST /admin/thesis/:id/files/upload
 * Expects: multipart/form-data with file + metadata
 */
const uploadFileToThesis = async (req, res) => {
  try {
    const thesisId = parseInt(req.params.id);
    const adminId = req.user.id;

    // Check thesis exists
    const thesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        files: true,
      },
    });

    if (!thesis) {
      return res.status(404).json({ success: false, message: 'Thesis not found' });
    }

    // Check file count limit
    if (thesis.files.length >= MAX_FILES_PER_THESIS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_FILES_PER_THESIS} files allowed per thesis`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.file;
    const fileLabel = req.body.fileLabel || 'Unnamed File';
    const accessLevel = req.body.accessLevel || 'PUBLIC';
    const embargoUntil = req.body.embargoUntil || null;
    const embargoReason = req.body.embargoReason || null;

    // Validate file label length
    if (fileLabel.length > MAX_LABEL_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `File label too long (max ${MAX_LABEL_LENGTH} characters)`,
      });
    }

    // Move file to permanent storage
    const permanentPath = await moveFileToStorage(file.path, thesisId, fileLabel);

    // Calculate checksum
    const checksum = await calculateChecksum(permanentPath);

    // Get next sequence order
    const maxSequence = thesis.files.length > 0
      ? Math.max(...thesis.files.map(f => f.sequenceOrder))
      : -1;

    // Create file record
    const newFile = await prisma.thesisFile.create({
      data: {
        thesisId,
        fileLabel,
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: permanentPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        checksum,
        accessLevel,
        embargoUntil: embargoUntil ? new Date(embargoUntil) : null,
        embargoReason,
        sequenceOrder: maxSequence + 1,
      },
    });

    // Log to audit trail
    await auditTrail.logFileAdd(thesisId, adminId, fileLabel, file.filename);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: newFile.id,
        fileLabel: newFile.fileLabel,
        filename: newFile.filename,
        fileSize: newFile.fileSize,
        accessLevel: newFile.accessLevel,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};

/**
 * Delete File from Thesis
 * DELETE /admin/thesis/:id/files/:fileId
 */
const deleteFileFromThesis = async (req, res) => {
  try {
    const thesisId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);
    const adminId = req.user.id;

    // Get file
    const file = await prisma.thesisFile.findUnique({
      where: { id: fileId },
      include: {
        thesis: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!file || file.thesisId !== thesisId) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Check minimum files
    if (file.thesis.files.length <= MIN_FILES_PER_THESIS) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete file. Minimum ${MIN_FILES_PER_THESIS} file(s) required per thesis`,
      });
    }

    // Delete physical file
    await deleteFileUtil(file.filePath);

    // Delete database record
    await prisma.thesisFile.delete({
      where: { id: fileId },
    });

    // Log to audit trail
    await auditTrail.logFileDelete(thesisId, adminId, file.fileLabel, file.filename);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
};

/**
 * Update File Metadata
 * PATCH /admin/thesis/:id/files/:fileId
 */
const updateFileMetadata = async (req, res) => {
  try {
    const thesisId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);
    const adminId = req.user.id;
    const { fileLabel, accessLevel, embargoUntil, embargoReason } = req.body;

    // Get file
    const file = await prisma.thesisFile.findUnique({
      where: { id: fileId },
    });

    if (!file || file.thesisId !== thesisId) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Track changes
    const changes = {};
    if (fileLabel && fileLabel !== file.fileLabel) {
      changes.fileLabel = fileLabel;
      await auditTrail.logFileEdit(thesisId, adminId, fileId, 'fileLabel', file.fileLabel, fileLabel);
    }
    if (accessLevel && accessLevel !== file.accessLevel) {
      changes.accessLevel = accessLevel;
      await auditTrail.logFileEdit(thesisId, adminId, fileId, 'accessLevel', file.accessLevel, accessLevel);
    }
    if (embargoUntil !== undefined) {
      const newEmbargoDate = embargoUntil ? new Date(embargoUntil) : null;
      changes.embargoUntil = newEmbargoDate;
      await auditTrail.logFileEdit(thesisId, adminId, fileId, 'embargoUntil', file.embargoUntil, newEmbargoDate);
    }
    if (embargoReason !== undefined) {
      changes.embargoReason = embargoReason || null;
    }

    // Update file
    await prisma.thesisFile.update({
      where: { id: fileId },
      data: changes,
    });

    res.json({ success: true, message: 'File metadata updated successfully' });
  } catch (error) {
    console.error('Error updating file metadata:', error);
    res.status(500).json({ success: false, message: 'Failed to update file metadata' });
  }
};

module.exports = {
  showUploadForm,
  storeThesis,
  showEditForm,
  updateThesis,
  uploadFileToThesis,
  deleteFileFromThesis,
  updateFileMetadata,
};
