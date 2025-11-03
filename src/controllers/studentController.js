/**
 * Student Controller
 * Handles student dashboard and thesis submission
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs').promises;
const path = require('path');
const {
  calculateChecksum,
  moveFileToStorage,
  validatePDF,
  deleteFile: deleteFileUtil,
} = require('../utils/fileHandler');

/**
 * Convert old fileType enum to readable file label
 * For backward compatibility with student upload system
 */
function fileTypeToLabel(fileType) {
  const mapping = {
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
  return mapping[fileType] || fileType;
}

/**
 * Student Dashboard
 * Shows thesis status or empty state if no thesis submitted
 */
const dashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Check if student has submitted a thesis
    const thesis = await prisma.thesis.findFirst({
      where: {
        submitterId: studentId,
      },
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
        reviewer: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        files: {
          select: {
            id: true,
            fileType: true,
            filename: true,
            fileSize: true,
            downloadCount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Determine status information
    let statusInfo = null;
    if (thesis) {
      statusInfo = {
        status: thesis.status,
        label: getStatusLabel(thesis.status),
        color: getStatusColor(thesis.status),
        icon: getStatusIcon(thesis.status),
        message: getStatusMessage(thesis.status),
        canEdit: thesis.status === 'DRAFT',
        showRejectionReason: thesis.status === 'REJECTED' && thesis.reviewerNotes,
      };
    }

    // Render dashboard
    res.renderWithLayout(
      'student/dashboard',
      {
        pageTitle: 'Dashboard',
        pageSubtitle: `Welcome back, ${req.user.name}`,
        thesis,
        statusInfo,
        hasThesis: !!thesis,
        user: req.user,
        currentPath: req.path,
      },
      'student'
    );
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    next(error);
  }
};

/**
 * Show Submit Form (Step 5 - Review & Submit)
 * Display all entered data for review before submission
 */
const submitForm = async (req, res, next) => {
  try {
    // Get submission data from session
    const submissionData = req.session.submissionData || {};

    // Check if student already has a pending or approved thesis (skip for admin)
    if (req.user.role === 'STUDENT') {
      const existingThesis = await prisma.thesis.findFirst({
        where: {
          submitterId: req.user.id,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      if (existingThesis) {
        req.flash('error', 'You already have a thesis that is pending or approved');
        return res.redirect('/student/dashboard');
      }
    }

    // Load departments for Step 1
    const departments = await prisma.department.findMany({
      include: {
        faculty: true,
      },
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Load lecturers for Step 3
    const lecturers = await prisma.lecturer.findMany({
      where: {
        isActive: true,
      },
      include: {
        department: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Validate all required data
    const validation = validateSubmissionData(submissionData);

    // Determine layout and page title based on role
    const isAdmin = req.user.role === 'ADMIN';
    const layout = isAdmin ? 'admin' : 'student';
    const pageTitle = isAdmin ? 'Upload Thesis' : 'Submit Thesis';
    const pageSubtitle = isAdmin
      ? 'Upload thesis metadata and files'
      : 'Review and submit your thesis for approval';

    res.renderWithLayout(
      'student/submit',
      {
        pageTitle,
        pageSubtitle,
        submissionData,
        departments,
        lecturers,
        validation,
        user: req.user,
        currentPath: req.path,
      },
      layout
    );
  } catch (error) {
    console.error('Error loading submit form:', error);
    next(error);
  }
};

/**
 * Save as Draft
 * Save thesis with DRAFT status
 */
const saveDraft = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const data = req.body;

    // Check if student already has a thesis
    let existingThesis = await prisma.thesis.findFirst({
      where: {
        submitterId: studentId,
      },
    });

    // Use Prisma transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      let thesis;

      if (existingThesis && existingThesis.status === 'DRAFT') {
        // Update existing draft
        thesis = await tx.thesis.update({
          where: { id: existingThesis.id },
          data: {
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
            advisor1Id: parseInt(data.advisor1Id),
            advisor2Id: data.advisor2Id ? parseInt(data.advisor2Id) : null,
            examiner1Id: parseInt(data.examiner1Id),
            examiner2Id: data.examiner2Id ? parseInt(data.examiner2Id) : null,
            examiner3Id: data.examiner3Id ? parseInt(data.examiner3Id) : null,
            status: 'DRAFT',
          },
        });
      } else {
        // Create new draft
        thesis = await tx.thesis.create({
          data: {
            submitterId: studentId,
            uploadedBy: studentId,
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
            advisor1Id: parseInt(data.advisor1Id),
            advisor2Id: data.advisor2Id ? parseInt(data.advisor2Id) : null,
            examiner1Id: parseInt(data.examiner1Id),
            examiner2Id: data.examiner2Id ? parseInt(data.examiner2Id) : null,
            examiner3Id: data.examiner3Id ? parseInt(data.examiner3Id) : null,
            status: 'DRAFT',
            isPublished: false,
          },
        });
      }

      // Handle file uploads if any
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        // Delete existing files for this thesis
        await tx.thesisFile.deleteMany({
          where: { thesisId: thesis.id },
        });

        // Create file records
        for (const file of data.uploadedFiles) {
          const checksum = await calculateChecksum(file.path);

          await tx.thesisFile.create({
            data: {
              thesisId: thesis.id,
              fileLabel: fileTypeToLabel(file.type), // Convert enum to label
              filename: file.filename,
              originalFilename: file.originalname,
              filePath: file.path,
              fileSize: file.size,
              mimeType: file.mimetype,
              checksum: checksum,
              accessLevel: 'PUBLIC',
            },
          });
        }
      }

      return thesis;
    });

    // Clear session data
    delete req.session.submissionData;

    req.flash('success', 'Your thesis has been saved as a draft');
    res.redirect('/student/dashboard');
  } catch (error) {
    console.error('Error saving draft:', error);
    req.flash('error', 'Failed to save draft. Please try again.');
    res.redirect('/student/submit');
  }
};

/**
 * Submit for Review
 * Submit thesis with PENDING status
 */
const submitThesis = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const data = req.body;

    // Validate all required fields
    const validation = validateSubmissionData(data);
    if (!validation.isValid) {
      req.flash('error', 'Please fill in all required fields and upload all required files');
      const redirectUrl = userRole === 'ADMIN' ? '/admin/submit' : '/student/submit';
      return res.redirect(redirectUrl);
    }

    // For students, check if they already have a pending or approved thesis
    if (userRole === 'STUDENT') {
      const existingThesis = await prisma.thesis.findFirst({
        where: {
          submitterId: userId,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
      });

      if (existingThesis) {
        req.flash('error', 'You already have a thesis that is pending or approved');
        return res.redirect('/student/dashboard');
      }
    }

    // Determine status and timestamps based on role
    const isAdmin = userRole === 'ADMIN';
    const thesisStatus = isAdmin ? 'APPROVED' : 'PENDING';
    const submittedAt = new Date();
    const reviewedAt = isAdmin ? new Date() : null;
    const reviewedBy = isAdmin ? userId : null;

    // Use Prisma transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create thesis record
      const thesis = await tx.thesis.create({
        data: {
          submitterId: userId,
          uploadedBy: userId,
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
          advisor1Id: parseInt(data.advisor1Id),
          advisor2Id: data.advisor2Id ? parseInt(data.advisor2Id) : null,
          examiner1Id: data.examiner1Id ? parseInt(data.examiner1Id) : null, // Optional
          examiner2Id: data.examiner2Id ? parseInt(data.examiner2Id) : null,
          examiner3Id: data.examiner3Id ? parseInt(data.examiner3Id) : null,
          status: thesisStatus,
          isPublished: false,
          submittedAt: submittedAt,
          reviewedAt: reviewedAt,
          reviewedBy: reviewedBy,
        },
      });

      // Create file records
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        for (const file of data.uploadedFiles) {
          // Calculate checksum
          const checksum = await calculateChecksum(file.path);

          // Move file from temp to permanent storage
          const permanentPath = await moveFileToStorage(file.path, thesis.id, file.type);

          await tx.thesisFile.create({
            data: {
              thesisId: thesis.id,
              fileLabel: fileTypeToLabel(file.type), // Convert enum to label
              filename: file.filename,
              originalFilename: file.originalname,
              filePath: permanentPath,
              fileSize: file.size,
              mimeType: file.mimetype,
              checksum: checksum,
              accessLevel: 'PUBLIC',
            },
          });
        }
      }

      return thesis;
    });

    // Clear session data
    delete req.session.submissionData;

    // Success message based on role
    if (req.user.role === 'ADMIN') {
      req.flash('success', 'Thesis uploaded successfully and marked as APPROVED. You can now publish it.');
      res.redirect('/admin/review');
    } else {
      req.flash('success', 'Your thesis has been submitted for review successfully!');
      res.redirect('/student/dashboard');
    }
  } catch (error) {
    console.error('Error submitting thesis:', error);
    req.flash('error', 'Failed to submit thesis. Please try again.');
    const redirectUrl = req.user.role === 'ADMIN' ? '/admin/submit' : '/student/submit';
    res.redirect(redirectUrl);
  }
};

/**
 * Validate submission data
 */
function validateSubmissionData(data) {
  const errors = [];
  const checks = {
    hasTitle: false,
    hasAuthor: false,
    hasStudentId: false,
    hasDepartment: false,
    hasGraduationYear: false,
    hasAbstract: false,
    hasKeywords: false,
    hasAdvisor1: false,
    hasExaminer1: false,
    hasRequiredFiles: false,
  };

  // Check required fields
  if (data.title && data.title.trim() !== '') {
    checks.hasTitle = true;
  } else {
    errors.push('Title is required');
  }

  if (data.authorName && data.authorName.trim() !== '') {
    checks.hasAuthor = true;
  } else {
    errors.push('Author name is required');
  }

  if (data.studentId && data.studentId.trim() !== '') {
    checks.hasStudentId = true;
  } else {
    errors.push('Student ID is required');
  }

  if (data.departmentId) {
    checks.hasDepartment = true;
  } else {
    errors.push('Department is required');
  }

  if (data.graduationYear) {
    checks.hasGraduationYear = true;
  } else {
    errors.push('Graduation year is required');
  }

  if (data.abstractId && data.abstractId.trim() !== '') {
    checks.hasAbstract = true;
  } else {
    errors.push('Abstract is required');
  }

  if (data.keywords && data.keywords.trim() !== '') {
    checks.hasKeywords = true;
  } else {
    errors.push('Keywords are required');
  }

  if (data.advisor1Id) {
    checks.hasAdvisor1 = true;
  } else {
    errors.push('Main advisor is required');
  }

  if (data.examiner1Id) {
    checks.hasExaminer1 = true;
  } else {
    errors.push('At least one examiner is required');
  }

  // Check required files
  const requiredFileTypes = ['COVER', 'CHAPTER_1', 'CHAPTER_2', 'CHAPTER_3', 'CHAPTER_4', 'CHAPTER_5', 'BIBLIOGRAPHY'];
  if (data.uploadedFiles && data.uploadedFiles.length > 0) {
    const uploadedTypes = data.uploadedFiles.map(f => f.type);
    const missingFiles = requiredFileTypes.filter(type => !uploadedTypes.includes(type));

    if (missingFiles.length === 0) {
      checks.hasRequiredFiles = true;
    } else {
      errors.push(`Missing required files: ${missingFiles.join(', ')}`);
    }
  } else {
    errors.push('All required files must be uploaded');
  }

  const isValid = Object.values(checks).every(check => check === true);

  return {
    isValid,
    checks,
    errors,
  };
}

/**
 * Calculate file checksum (MD5)
 */
// calculateChecksum and moveFileToStorage are now imported from fileHandler utility

/**
 * Helper function to get status label
 */
function getStatusLabel(status) {
  const labels = {
    DRAFT: 'Draft',
    PENDING: 'Under Review',
    APPROVED: 'Approved & Published',
    REJECTED: 'Rejected',
  };
  return labels[status] || status;
}

/**
 * Helper function to get status color
 */
function getStatusColor(status) {
  const colors = {
    DRAFT: 'yellow',
    PENDING: 'blue',
    APPROVED: 'green',
    REJECTED: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * Helper function to get status icon
 */
function getStatusIcon(status) {
  const icons = {
    DRAFT: 'file-edit',
    PENDING: 'clock',
    APPROVED: 'check-circle',
    REJECTED: 'x-circle',
  };
  return icons[status] || 'file';
}

/**
 * Helper function to get status message
 */
function getStatusMessage(status) {
  const messages = {
    DRAFT: 'Your thesis is saved as a draft. Continue editing or submit for review when ready.',
    PENDING: 'Your thesis is currently under review by the library staff. You will be notified once the review is complete.',
    APPROVED: 'Congratulations! Your thesis has been approved and is now publicly available in the repository.',
    REJECTED: 'Your thesis submission has been rejected. Please review the feedback below and contact the library staff for further assistance.',
  };
  return messages[status] || '';
}

/**
 * Upload File Handler
 * Handles individual file uploads via AJAX/Dropzone
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get file info
    const file = req.file;
    const fileType = req.body.fileType; // COVER, CHAPTER_1, etc.

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
      // Delete uploaded file
      await deleteFileUtil(file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
      });
    }

    // Validate PDF content
    const isPDF = await validatePDF(file.path);
    if (!isPDF) {
      await deleteFileUtil(file.path);
      return res.status(400).json({
        success: false,
        message: 'File is not a valid PDF document',
      });
    }

    // Calculate checksum for file integrity
    const checksum = await calculateChecksum(file.path);

    // Initialize session uploaded files array if not exists
    if (!req.session.uploadedFiles) {
      req.session.uploadedFiles = [];
    }

    // Remove any existing file of the same type
    const existingFileIndex = req.session.uploadedFiles.findIndex(
      (f) => f.type === fileType
    );
    if (existingFileIndex !== -1) {
      const existingFile = req.session.uploadedFiles[existingFileIndex];
      await deleteFileUtil(existingFile.path);
      req.session.uploadedFiles.splice(existingFileIndex, 1);
    }

    // Add new file to session
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
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to save file information',
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
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
    });
  }
};

/**
 * Delete Uploaded File
 * Remove file from session and filesystem
 */
const deleteFile = async (req, res) => {
  try {
    const { fileType } = req.params;

    if (!req.session.uploadedFiles) {
      return res.status(404).json({
        success: false,
        message: 'No files found',
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
      });
    }

    // Get file info and delete from filesystem
    const file = req.session.uploadedFiles[fileIndex];
    await deleteFileUtil(file.path);

    // Remove from session
    req.session.uploadedFiles.splice(fileIndex, 1);

    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to update file information',
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
    });
  }
};

module.exports = {
  dashboard,
  submitForm,
  saveDraft,
  submitThesis,
  uploadFile,
  deleteFile,
};
