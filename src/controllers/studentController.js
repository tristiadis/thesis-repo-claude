/**
 * Student Controller
 * Handles student dashboard and thesis submission
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

module.exports = {
  dashboard,
};
