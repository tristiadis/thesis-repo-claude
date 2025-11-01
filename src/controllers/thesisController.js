const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
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
 * Generate RIS export format
 */
function generateRIS(thesis, baseUrl) {
  const url = `${baseUrl}/thesis/${thesis.id}`;

  let ris = '';
  ris += 'TY  - THES\n';
  ris += `AU  - ${thesis.submitter.name}\n`;
  ris += `TI  - ${thesis.title}\n`;
  ris += `PY  - ${thesis.graduationYear}\n`;
  ris += `UR  - ${url}\n`;
  ris += `AB  - ${thesis.abstractId || ''}\n`;
  if (thesis.keywords) {
    thesis.keywords.split(',').forEach(kw => {
      ris += `KW  - ${kw.trim()}\n`;
    });
  }
  ris += `PB  - ${thesis.department.faculty.name}\n`;
  ris += 'ER  - \n';

  return ris;
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

    // Check if thesis exists and is approved
    if (!thesis || thesis.status !== 'APPROVED') {
      return res.status(404).render('errors/404', {
        title: 'Thesis Not Found',
        layout: 'layouts/main',
        message: 'The requested thesis could not be found or is not yet published.',
        user: req.user || null,
      });
    }

    // Increment view count
    await prisma.thesis.update({
      where: { id: thesisId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    // Log view event
    const visitorIP = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = hashIP(visitorIP);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'VIEW',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });

    // Process files - check embargo status
    const now = new Date();
    const processedFiles = thesis.files.map(file => {
      let accessStatus = 'public';
      let embargoMessage = '';

      if (file.embargoEnabled) {
        if (file.embargoEndDate && new Date(file.embargoEndDate) > now) {
          accessStatus = 'embargoed';
          embargoMessage = `Available from ${new Date(file.embargoEndDate).toLocaleDateString()}`;
          if (file.embargoReason) {
            embargoMessage += ` - ${file.embargoReason}`;
          }
        }
      }

      return {
        ...file,
        accessStatus,
        embargoMessage,
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

    const thesis = await prisma.thesis.findUnique({
      where: { id: thesisId },
      include: {
        department: {
          include: {
            faculty: true,
          },
        },
        submitter: true,
      },
    });

    if (!thesis || thesis.status !== 'APPROVED') {
      return res.status(404).send('Thesis not found');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const ris = generateRIS(thesis, baseUrl);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/x-research-info-systems');
    res.setHeader('Content-Disposition', `attachment; filename="thesis-${thesis.id}.ris"`);
    res.send(ris);
  } catch (error) {
    console.error('Error exporting RIS:', error);
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

    // Check if thesis is approved
    if (file.thesis.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check embargo status
    const now = new Date();
    if (file.embargoEnabled) {
      if (file.embargoEndDate && new Date(file.embargoEndDate) > now) {
        // Check if user is admin (can bypass embargo)
        const isAdmin = req.user && req.user.role === 'ADMIN';
        if (!isAdmin) {
          return res.status(403).json({
            error: 'File is embargoed',
            message: `This file is under embargo until ${new Date(file.embargoEndDate).toLocaleDateString()}`,
          });
        }
      }
    }

    // Log preview event (don't increment download count)
    const visitorIP = req.ip || req.connection.remoteAddress || 'unknown';
    const ipHash = hashIP(visitorIP);

    await prisma.statisticsLog.create({
      data: {
        thesisId,
        eventType: 'PREVIEW',
        ipHash,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
      },
    });

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

module.exports = {
  show,
  exportRIS,
  previewFile,
};
