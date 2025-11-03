const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const risExporter = require('../services/risExporter');
const statsService = require('../services/statsService');
const prisma = new PrismaClient();

/**
 * Hash IP address for privacy
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Generate slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

/**
 * Format citation in APA style
 */
function formatCitation(thesis, baseUrl) {
  const author = thesis.submitter.name;
  const year = thesis.graduationYear;
  const title = thesis.title;
  const faculty = thesis.department.faculty.name;
  const university = 'University'; // Replace with actual university name
  const url = `${baseUrl}/thesis/${thesis.id}`;

  return `${author}. (${year}). ${title}. [Undergraduate thesis, ${faculty}, ${university}]. ${url}`;
}

/**
 * GET /thesis/:id or /thesis/:id/:slug - Show thesis detail
 */
const show = async (req, res, next) => {
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
        submitter: {
          select: {
            id: true,
            name: true,
            studentId: true,
          },
        },
        files: {
          orderBy: {
            fileType: 'asc',
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    // Check if thesis exists and is approved and published
    if (!thesis || thesis.status !== 'APPROVED' || !thesis.isPublished) {
      return res.status(404).render('errors/404', {
        title: 'Thesis Not Found',
        layout: 'layouts/main',
        message: 'The requested thesis could not be found or is not yet published.',
        user: req.user || null,
      });
    }

    // Log view (increments view count and creates log entry)
    await statsService.logView(thesisId, req);

    // Process files - check access status
    const now = new Date();
    const isAdmin = req.user && req.user.role === 'ADMIN';

    const processedFiles = thesis.files.map(file => {
      let accessStatus = file.accessLevel.toLowerCase();
      let embargoMessage = '';
      let canDownload = false;

      if (file.accessLevel === 'PUBLIC') {
        canDownload = true;
      } else if (file.accessLevel === 'EMBARGOED') {
        if (file.embargoUntil && new Date(file.embargoUntil) > now) {
          // Still embargoed
          accessStatus = 'embargoed';
          embargoMessage = `Available from ${new Date(file.embargoUntil).toLocaleDateString()}`;
          if (file.embargoReason) {
            embargoMessage += ` - ${file.embargoReason}`;
          }
          canDownload = isAdmin; // Only admins can download during embargo
        } else {
          // Embargo expired
          canDownload = true;
          accessStatus = 'public';
        }
      } else if (file.accessLevel === 'RESTRICTED') {
        accessStatus = 'restricted';
        embargoMessage = 'Access restricted';
        canDownload = isAdmin; // Only admins can download restricted files
      }

      return {
        ...file,
        accessStatus,
        embargoMessage,
        canDownload,
      };
    });

    // Generate slug for SEO
    const slug = generateSlug(thesis.title);

    // Get base URL for citations
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Generate citation
    const citation = formatCitation(thesis, baseUrl);

    // Calculate total downloads
    const totalDownloads = thesis.files.reduce(
      (sum, file) => sum + (file.downloadCount || 0),
      0
    );

    // Parse advisors and examiners
    const team = [];
    if (thesis.advisor) {
      team.push({ role: 'Advisor', name: thesis.advisor, department: thesis.advisorDept });
    }
    if (thesis.advisor2) {
      team.push({ role: 'Co-Advisor', name: thesis.advisor2, department: thesis.advisor2Dept });
    }
    if (thesis.examiner1) {
      team.push({ role: 'Examiner 1', name: thesis.examiner1, department: thesis.examiner1Dept });
    }
    if (thesis.examiner2) {
      team.push({ role: 'Examiner 2', name: thesis.examiner2, department: thesis.examiner2Dept });
    }
    if (thesis.examiner3) {
      team.push({ role: 'Examiner 3', name: thesis.examiner3, department: thesis.examiner3Dept });
    }

    // Generate SEO data
    const pageUrl = `${baseUrl}/thesis/${thesis.id}/${slug}`;
    const description = thesis.abstractId
      ? thesis.abstractId.substring(0, 160) + '...'
      : `${thesis.title} by ${thesis.submitter.name}`;

    res.render('public/thesis-detail', {
      title: thesis.title,
      layout: 'layouts/main',
      thesis: {
        ...thesis,
        files: processedFiles,
        downloadCount: totalDownloads,
      },
      slug,
      citation,
      team,
      seo: {
        title: `${thesis.title} - ${thesis.submitter.name}`,
        description,
        keywords: thesis.keywords || '',
        url: pageUrl,
        image: null, // Add cover image if available
      },
      user: req.user || null,
    });
  } catch (error) {
    console.error('Error loading thesis detail:', error);
    next(error);
  }
};

/**
 * GET /thesis/:id/export/ris - Export citation in RIS format
 */
const exportRIS = async (req, res, next) => {
  try {
    const thesisId = parseInt(req.params.id);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Generate RIS using service
    const ris = await risExporter.generateRIS(thesisId, baseUrl);

    // Log export event
    await statsService.logMetadataExport(thesisId, req);

    // Calculate content length
    const buffer = Buffer.from(ris, 'utf8');

    // Set headers for file download
    res.setHeader('Content-Type', 'application/x-research-info-systems; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="thesis-${thesisId}.ris"`);
    res.setHeader('Content-Length', buffer.length);

    // Send RIS file
    res.send(ris);
  } catch (error) {
    console.error('Error exporting RIS:', error);

    if (error.message === 'Thesis not found' || error.message === 'Thesis is not approved') {
      return res.status(404).send(error.message);
    }

    if (error.message.includes('Missing required fields')) {
      return res.status(400).send(error.message);
    }

    next(error);
  }
};

/**
 * GET /thesis/:thesisId/files/:fileId/preview - Preview PDF file
 */
const previewFile = async (req, res, next) => {
  try {
    const thesisId = parseInt(req.params.thesisId);
    const fileId = parseInt(req.params.fileId);

    // Get file with thesis and check access
    const file = await prisma.thesisFile.findUnique({
      where: { id: fileId },
      include: {
        thesis: true,
      },
    });

    // Check if file exists and belongs to the thesis
    if (!file || file.thesisId !== thesisId) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if thesis is approved and published
    if (file.thesis.status !== 'APPROVED' || !file.thesis.isPublished) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check access level and embargo status
    const now = new Date();
    const isAdmin = req.user && req.user.role === 'ADMIN';

    if (file.accessLevel === 'EMBARGOED') {
      if (file.embargoUntil && new Date(file.embargoUntil) > now) {
        // Still under embargo - only admins can access
        if (!isAdmin) {
          return res.status(403).json({
            error: 'File is embargoed',
            message: `This file is under embargo until ${new Date(file.embargoUntil).toLocaleDateString()}`,
            reason: file.embargoReason || null,
          });
        }
      }
    } else if (file.accessLevel === 'RESTRICTED') {
      // Restricted files - only admins can access
      if (!isAdmin) {
        return res.status(403).json({
          error: 'Access restricted',
          message: 'Access to this file is restricted',
        });
      }
    }

    // Log preview event (don't increment download count)
    await statsService.logPreview(thesisId, req);

    // Serve PDF file
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(process.cwd(), file.filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set headers for inline display (preview)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });
  } catch (error) {
    console.error('Error previewing file:', error);
    next(error);
  }
};

/**
 * GET /thesis/:thesisId/files/:fileId/download - Download file with access control
 */
const downloadFile = async (req, res, next) => {
  try {
    const thesisId = parseInt(req.params.thesisId);
    const fileId = parseInt(req.params.fileId);

    // Get file with thesis
    const file = await prisma.thesisFile.findUnique({
      where: { id: fileId },
      include: {
        thesis: true,
      },
    });

    // Check if file exists and belongs to the thesis
    if (!file || file.thesisId !== thesisId) {
      return res.status(404).render('errors/404', {
        title: 'File Not Found',
        layout: 'layouts/main',
        message: 'The requested file could not be found.',
        user: req.user || null,
      });
    }

    // Check if thesis is approved and published
    if (file.thesis.status !== 'APPROVED' || !file.thesis.isPublished) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'Access Denied',
        details: 'This thesis is not yet published.',
        statusCode: 403,
      });
    }

    // Access Control Logic
    const now = new Date();
    const isAdmin = req.user && req.user.role === 'ADMIN';
    let accessDenied = false;
    let denialMessage = '';
    let denialDetails = '';

    if (file.accessLevel === 'PUBLIC') {
      // Public access - allow download
      accessDenied = false;
    } else if (file.accessLevel === 'EMBARGOED') {
      // Check embargo date
      if (file.embargoUntil && new Date(file.embargoUntil) > now) {
        // Still under embargo
        if (!isAdmin) {
          accessDenied = true;
          denialMessage = 'File Under Embargo';
          denialDetails = `This file is embargoed until ${new Date(file.embargoUntil).toLocaleDateString()}.`;
          if (file.embargoReason) {
            denialDetails += `\n\nReason: ${file.embargoReason}`;
          }
        }
      }
      // Embargo expired or admin - allow download
    } else if (file.accessLevel === 'RESTRICTED') {
      // Restricted access - only admins can download
      if (!isAdmin) {
        accessDenied = true;
        denialMessage = 'Access Restricted';
        denialDetails = 'Access to this file is restricted. Please contact the administrator if you need access.';
      }
    }

    // If access denied, show error page
    if (accessDenied) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: denialMessage,
        details: denialDetails,
        statusCode: 403,
      });
    }

    // Access granted - proceed with download
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(process.cwd(), file.filePath);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      console.error(`File not found on disk: ${filePath}`);
      return res.status(404).render('errors/404', {
        title: 'File Not Found',
        layout: 'layouts/main',
        message: 'The requested file could not be found on the server.',
        user: req.user || null,
      });
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
    res.setHeader('Content-Length', stat.size);

    // Create read stream
    const readStream = fs.createReadStream(filePath);

    // Handle stream errors
    readStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).render('error', {
          title: 'Error',
          message: 'Error Downloading File',
          details: 'An error occurred while downloading the file. Please try again later.',
          statusCode: 500,
        });
      }
    });

    // Log download and increment counters when stream completes successfully
    readStream.on('end', async () => {
      try {
        // Log download in statistics (includes IP hash, user agent, etc.)
        await statsService.logDownload(thesisId, fileId, req);

        // Note: statsService.logDownload already increments downloadCount
        // for both the file and the thesis, so we don't need to do it here
      } catch (error) {
        console.error('Error logging download:', error);
        // Don't fail the download if logging fails
      }
    });

    // Stream the file to response
    readStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    next(error);
  }
};

module.exports = {
  show,
  exportRIS,
  previewFile,
  downloadFile,
};
