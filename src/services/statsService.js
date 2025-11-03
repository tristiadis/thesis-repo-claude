/**
 * Statistics Service
 * Handles comprehensive statistics tracking with privacy compliance
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

/**
 * Anonymize IP address using SHA256 with salt
 * @param {string} ip - IP address
 * @returns {string} Hashed IP
 */
function anonymizeIP(ip) {
  const salt = process.env.STATS_SALT || 'default-salt-change-in-production';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}

/**
 * Log thesis view
 * @param {number} thesisId - Thesis ID
 * @param {object} req - Express request object
 */
async function logView(thesisId, req) {
  try {
    // Increment view count
    await prisma.thesis.update({
      where: { id: thesisId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // Log event
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = anonymizeIP(ip);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'VIEW',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });
  } catch (error) {
    console.error('Error logging view:', error);
    // Don't throw - statistics shouldn't break the app
  }
}

/**
 * Log file download
 * @param {number} thesisId - Thesis ID
 * @param {number} fileId - File ID
 * @param {object} req - Express request object
 */
async function logDownload(thesisId, fileId, req) {
  try {
    // Increment download counts
    await Promise.all([
      prisma.thesis.update({
        where: { id: thesisId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      }),
      prisma.thesisFile.update({
        where: { id: fileId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      }),
    ]);

    // Log event
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = anonymizeIP(ip);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'DOWNLOAD',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });
  } catch (error) {
    console.error('Error logging download:', error);
  }
}

/**
 * Log metadata export
 * @param {number} thesisId - Thesis ID
 * @param {object} req - Express request object
 */
async function logMetadataExport(thesisId, req) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = anonymizeIP(ip);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'METADATA_EXPORT',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });
  } catch (error) {
    console.error('Error logging metadata export:', error);
  }
}

/**
 * Log preview event
 * @param {number} thesisId - Thesis ID
 * @param {object} req - Express request object
 */
async function logPreview(thesisId, req) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = anonymizeIP(ip);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'PREVIEW',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });
  } catch (error) {
    console.error('Error logging preview:', error);
  }
}

/**
 * Get statistics for a specific thesis
 * @param {number} thesisId - Thesis ID
 * @returns {object} Thesis statistics
 */
async function getThesisStats(thesisId) {
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: {
      viewCount: true,
      downloadCount: true,
    },
  });

  if (!thesis) {
    throw new Error('Thesis not found');
  }

  // Get download counts by file
  const files = await prisma.thesisFile.findMany({
    where: { thesisId },
    select: {
      id: true,
      fileType: true,
      downloadCount: true,
    },
  });

  return {
    viewCount: thesis.viewCount || 0,
    downloadCount: thesis.downloadCount || 0,
    fileDownloads: files,
  };
}

/**
 * Get global statistics
 * @returns {object} Global statistics
 */
async function getGlobalStats() {
  // Total theses
  const totalTheses = await prisma.thesis.count({
    where: { status: 'APPROVED' },
  });

  // Total views and downloads
  const viewDownloadStats = await prisma.thesis.aggregate({
    _sum: {
      viewCount: true,
      downloadCount: true,
    },
    where: { status: 'APPROVED' },
  });

  // Most viewed theses (top 10)
  const mostViewed = await prisma.thesis.findMany({
    where: { status: 'APPROVED' },
    orderBy: { viewCount: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      viewCount: true,
      downloadCount: true,
      graduationYear: true,
      submitter: {
        select: {
          name: true,
        },
      },
    },
  });

  // Most downloaded theses (top 10)
  const mostDownloaded = await prisma.thesis.findMany({
    where: { status: 'APPROVED' },
    orderBy: { downloadCount: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      viewCount: true,
      downloadCount: true,
      graduationYear: true,
      submitter: {
        select: {
          name: true,
        },
      },
    },
  });

  // Views/Downloads over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await prisma.$queryRaw`
    SELECT
      DATE(createdAt) as date,
      SUM(CASE WHEN eventType = 'VIEW' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN eventType = 'DOWNLOAD' THEN 1 ELSE 0 END) as downloads
    FROM StatisticsLog
    WHERE createdAt >= ${thirtyDaysAgo}
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `;

  return {
    totalTheses,
    totalViews: viewDownloadStats._sum.viewCount || 0,
    totalDownloads: viewDownloadStats._sum.downloadCount || 0,
    mostViewed,
    mostDownloaded,
    dailyStats,
  };
}

/**
 * Get statistics for a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} eventType - Optional event type filter
 * @returns {Array} Statistics logs
 */
async function getStatsByDateRange(startDate, endDate, eventType = null) {
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (eventType) {
    whereClause.eventType = eventType;
  }

  const logs = await prisma.statisticsLog.findMany({
    where: whereClause,
    include: {
      thesis: {
        select: {
          id: true,
          title: true,
          submitter: {
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
  });

  return logs;
}

/**
 * Get recent activity
 * @param {number} limit - Number of records to return
 * @returns {Array} Recent activity logs
 */
async function getRecentActivity(limit = 50) {
  const logs = await prisma.statisticsLog.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      thesis: {
        select: {
          id: true,
          title: true,
          submitter: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return logs;
}

/**
 * Get statistics by faculty
 * @returns {Array} Faculty statistics
 */
async function getStatsByFaculty() {
  const faculties = await prisma.faculty.findMany({
    include: {
      departments: {
        include: {
          theses: {
            where: { status: 'APPROVED' },
            select: {
              id: true,
              viewCount: true,
              downloadCount: true,
            },
          },
        },
      },
    },
  });

  return faculties.map(faculty => {
    const theses = faculty.departments.flatMap(dept => dept.theses);
    const thesisCount = theses.length;
    const totalViews = theses.reduce((sum, t) => sum + (t.viewCount || 0), 0);
    const totalDownloads = theses.reduce((sum, t) => sum + (t.downloadCount || 0), 0);

    return {
      id: faculty.id,
      name: faculty.name,
      thesisCount,
      totalViews,
      totalDownloads,
    };
  });
}

/**
 * Get monthly statistics for current year
 * @returns {Array} Monthly statistics
 */
async function getMonthlyStats() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const monthlyStats = await prisma.$queryRaw`
    SELECT
      MONTH(createdAt) as month,
      SUM(CASE WHEN eventType = 'VIEW' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN eventType = 'DOWNLOAD' THEN 1 ELSE 0 END) as downloads
    FROM StatisticsLog
    WHERE createdAt >= ${startOfYear}
    GROUP BY MONTH(createdAt)
    ORDER BY month ASC
  `;

  return monthlyStats;
}

module.exports = {
  anonymizeIP,
  logView,
  logDownload,
  logMetadataExport,
  logPreview,
  getThesisStats,
  getGlobalStats,
  getStatsByDateRange,
  getRecentActivity,
  getStatsByFaculty,
  getMonthlyStats,
};
