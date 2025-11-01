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

/**
 * Statistics Dashboard
 * Comprehensive statistics with charts and reports
 */
const statistics = async (req, res, next) => {
  try {
    const statsService = require('../services/statsService');

    // Get global statistics
    const globalStats = await statsService.getGlobalStats();

    // Get faculty statistics
    const facultyStats = await statsService.getStatsByFaculty();

    // Get monthly stats for current year
    const monthlyStats = await statsService.getMonthlyStats();

    // Get recent activity
    const recentActivity = await statsService.getRecentActivity(50);

    // Calculate this month stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthLogs = await statsService.getStatsByDateRange(startOfMonth, endOfMonth);
    const viewsThisMonth = thisMonthLogs.filter(log => log.eventType === 'VIEW').length;
    const downloadsThisMonth = thisMonthLogs.filter(log => log.eventType === 'DOWNLOAD').length;

    // Prepare chart data
    const chartData = {
      dailyStats: globalStats.dailyStats,
      facultyStats: facultyStats.map(f => ({
        name: f.name,
        thesisCount: f.thesisCount,
      })),
      monthlyStats: monthlyStats,
    };

    res.renderWithLayout(
      'admin/statistics',
      {
        title: 'Statistics Dashboard',
        pageTitle: 'Statistics',
        stats: {
          totalTheses: globalStats.totalTheses,
          totalViews: globalStats.totalViews,
          totalDownloads: globalStats.totalDownloads,
          viewsThisMonth,
          downloadsThisMonth,
        },
        mostViewed: globalStats.mostViewed,
        mostDownloaded: globalStats.mostDownloaded,
        facultyStats,
        recentActivity,
        chartData: JSON.stringify(chartData),
      },
      'admin'
    );
  } catch (error) {
    console.error('Error loading statistics:', error);
    next(error);
  }
};

/**
 * Export Statistics Report
 * Export statistics in CSV or JSON format
 */
const exportStatistics = async (req, res, next) => {
  try {
    const { format = 'csv', start, end, eventType } = req.query;
    const statsService = require('../services/statsService');

    // Parse dates
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    // Get statistics for date range
    const logs = await statsService.getStatsByDateRange(startDate, endDate, eventType || null);

    if (format === 'json') {
      // Export as JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="statistics-${Date.now()}.json"`);
      res.json(logs);
    } else {
      // Export as CSV
      const csvRows = [];

      // Header
      csvRows.push('Timestamp,Event Type,Thesis ID,Thesis Title,Author,IP Hash,User Agent,Referer');

      // Data rows
      logs.forEach(log => {
        const row = [
          log.createdAt.toISOString(),
          log.eventType,
          log.thesisId,
          log.thesis ? `"${log.thesis.title.replace(/"/g, '""')}"` : '',
          log.thesis && log.thesis.submitter ? `"${log.thesis.submitter.name.replace(/"/g, '""')}"` : '',
          log.ipHash,
          log.userAgent ? `"${log.userAgent.replace(/"/g, '""')}"` : '',
          log.referer ? `"${log.referer.replace(/"/g, '""')}"` : '',
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="statistics-${Date.now()}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Error exporting statistics:', error);
    next(error);
  }
};

module.exports = {
  dashboard,
  statistics,
  exportStatistics,
};
