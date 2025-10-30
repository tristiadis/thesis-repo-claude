const prisma = require('../config/database');

/**
 * Admin Dashboard Controller
 * Displays statistics, recent submissions, and system overview
 */
const dashboard = async (req, res, next) => {
  try {
    // Run all queries in parallel for better performance
    const [
      totalFaculties,
      totalDepartments,
      totalLecturers,
      thesesByStatus,
      usersByRole,
      recentSubmissions,
      mostViewedTheses,
    ] = await Promise.all([
      // Count total faculties
      prisma.faculty.count(),

      // Count total departments
      prisma.department.count(),

      // Count total lecturers
      prisma.lecturer.count(),

      // Count theses by status
      prisma.thesis.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),

      // Count users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      }),

      // Get recent submissions (last 5 PENDING or APPROVED theses)
      prisma.thesis.findMany({
        where: {
          status: {
            in: ['PENDING', 'APPROVED'],
          },
        },
        select: {
          id: true,
          title: true,
          authorName: true,
          status: true,
          createdAt: true,
          submitter: {
            select: {
              name: true,
              username: true,
            },
          },
          department: {
            select: {
              name: true,
              faculty: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),

      // Get most viewed theses (top 5)
      // Calculate view count and download count from statistics_logs
      prisma.thesis.findMany({
        where: {
          status: 'APPROVED', // Only show approved theses
        },
        select: {
          id: true,
          title: true,
          authorName: true,
          graduationYear: true,
          department: {
            select: {
              name: true,
            },
          },
          statisticsLogs: {
            select: {
              eventType: true,
            },
          },
        },
        take: 100, // Get more to calculate stats, then filter top 5
      }),
    ]);

    // Transform theses by status into a more usable object
    const statusCounts = {
      DRAFT: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    thesesByStatus.forEach((group) => {
      statusCounts[group.status] = group._count.status;
    });

    // Calculate total theses
    const totalTheses =
      statusCounts.DRAFT +
      statusCounts.PENDING +
      statusCounts.APPROVED +
      statusCounts.REJECTED;

    // Transform users by role into a more usable object
    const roleCounts = {
      ADMIN: 0,
      STUDENT: 0,
    };

    usersByRole.forEach((group) => {
      roleCounts[group.role] = group._count.role;
    });

    // Calculate view and download counts for most viewed theses
    const thesesWithStats = mostViewedTheses.map((thesis) => {
      const viewCount = thesis.statisticsLogs.filter(
        (log) => log.eventType === 'VIEW'
      ).length;
      const downloadCount = thesis.statisticsLogs.filter(
        (log) => log.eventType === 'DOWNLOAD'
      ).length;

      return {
        id: thesis.id,
        title: thesis.title,
        authorName: thesis.authorName,
        graduationYear: thesis.graduationYear,
        departmentName: thesis.department.name,
        viewCount,
        downloadCount,
      };
    });

    // Sort by view count and take top 5
    const topViewedTheses = thesesWithStats
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Format recent submissions for display
    const formattedRecentSubmissions = recentSubmissions.map((thesis) => ({
      id: thesis.id,
      title: thesis.title,
      authorName: thesis.authorName,
      submitterName: thesis.submitter.name,
      submitterUsername: thesis.submitter.username,
      departmentName: thesis.department.name,
      facultyName: thesis.department.faculty.name,
      status: thesis.status,
      submittedAt: thesis.createdAt,
    }));

    // Prepare data for Chart.js
    const chartData = {
      labels: ['Draft', 'Pending', 'Approved', 'Rejected'],
      datasets: [
        {
          label: 'Theses by Status',
          data: [
            statusCounts.DRAFT,
            statusCounts.PENDING,
            statusCounts.APPROVED,
            statusCounts.REJECTED,
          ],
          backgroundColor: [
            'rgba(156, 163, 175, 0.8)', // Gray for DRAFT
            'rgba(251, 191, 36, 0.8)', // Yellow for PENDING
            'rgba(34, 197, 94, 0.8)', // Green for APPROVED
            'rgba(239, 68, 68, 0.8)', // Red for REJECTED
          ],
          borderColor: [
            'rgb(107, 114, 128)',
            'rgb(245, 158, 11)',
            'rgb(22, 163, 74)',
            'rgb(220, 38, 38)',
          ],
          borderWidth: 2,
        },
      ],
    };

    // Prepare stats object for view
    const stats = {
      totalFaculties,
      totalDepartments,
      totalLecturers,
      totalTheses,
      pendingTheses: statusCounts.PENDING,
      approvedTheses: statusCounts.APPROVED,
      draftTheses: statusCounts.DRAFT,
      rejectedTheses: statusCounts.REJECTED,
      totalStudents: roleCounts.STUDENT,
      totalAdmins: roleCounts.ADMIN,
    };

    // Render dashboard with all data
    res.renderWithLayout(
      'admin/dashboard',
      {
        title: 'Admin Dashboard',
        pageTitle: 'Dashboard',
        stats,
        chartData: JSON.stringify(chartData),
        recentSubmissions: formattedRecentSubmissions,
        mostViewedTheses: topViewedTheses,
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    next(error);
  }
};

module.exports = {
  dashboard,
};
