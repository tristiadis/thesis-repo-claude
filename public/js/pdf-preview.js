/**
 * PDF Preview with PDF.js
 * Handles PDF preview modal with zoom, navigation, and keyboard shortcuts
 */

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let pdfPreview = {
  pdfDoc: null,
  pageNum: 1,
  pageRendering: false,
  pageNumPending: null,
  scale: 1.5,
  canvas: null,
  ctx: null,
};

/**
 * Render a page of the PDF
 */
function renderPage(num) {
  pdfPreview.pageRendering = true;

  // Get page
  pdfPreview.pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: pdfPreview.scale });
    pdfPreview.canvas.height = viewport.height;
    pdfPreview.canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: pdfPreview.ctx,
      viewport: viewport
    };

    const renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function() {
      pdfPreview.pageRendering = false;
      if (pdfPreview.pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pdfPreview.pageNumPending);
        pdfPreview.pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById('page_num').textContent = num;
  document.getElementById('page_input').value = num;
}

/**
 * Queue page rendering if another page is being rendered
 */
function queueRenderPage(num) {
  if (pdfPreview.pageRendering) {
    pdfPreview.pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Go to previous page
 */
function onPrevPage() {
  if (pdfPreview.pageNum <= 1) {
    return;
  }
  pdfPreview.pageNum--;
  queueRenderPage(pdfPreview.pageNum);
}

/**
 * Go to next page
 */
function onNextPage() {
  if (pdfPreview.pageNum >= pdfPreview.pdfDoc.numPages) {
    return;
  }
  pdfPreview.pageNum++;
  queueRenderPage(pdfPreview.pageNum);
}

/**
 * Go to specific page
 */
function goToPage(pageNum) {
  const num = parseInt(pageNum);
  if (num < 1 || num > pdfPreview.pdfDoc.numPages) {
    alert(`Page must be between 1 and ${pdfPreview.pdfDoc.numPages}`);
    return;
  }
  pdfPreview.pageNum = num;
  queueRenderPage(pdfPreview.pageNum);
}

/**
 * Zoom in
 */
function zoomIn() {
  pdfPreview.scale += 0.25;
  if (pdfPreview.scale > 3.0) pdfPreview.scale = 3.0;
  queueRenderPage(pdfPreview.pageNum);
}

/**
 * Zoom out
 */
function zoomOut() {
  pdfPreview.scale -= 0.25;
  if (pdfPreview.scale < 0.5) pdfPreview.scale = 0.5;
  queueRenderPage(pdfPreview.pageNum);
}

/**
 * Fit to page
 */
function fitToPage() {
  const container = document.getElementById('pdf-canvas-container');
  const containerHeight = container.clientHeight - 40; // Account for padding

  pdfPreview.pdfDoc.getPage(pdfPreview.pageNum).then(function(page) {
    const viewport = page.getViewport({ scale: 1.0 });
    pdfPreview.scale = containerHeight / viewport.height;
    queueRenderPage(pdfPreview.pageNum);
  });
}

/**
 * Fit to width
 */
function fitToWidth() {
  const container = document.getElementById('pdf-canvas-container');
  const containerWidth = container.clientWidth - 40; // Account for padding

  pdfPreview.pdfDoc.getPage(pdfPreview.pageNum).then(function(page) {
    const viewport = page.getViewport({ scale: 1.0 });
    pdfPreview.scale = containerWidth / viewport.width;
    queueRenderPage(pdfPreview.pageNum);
  });
}

/**
 * Print PDF
 */
function printPDF() {
  const printWindow = window.open(pdfPreview.canvas.toDataURL());
  printWindow.print();
}

/**
 * Download PDF
 */
function downloadPDF(thesisId, fileId) {
  window.location.href = `/thesis/${thesisId}/files/${fileId}/download`;
}

/**
 * Close PDF preview modal
 */
function closePDFPreview() {
  const modal = document.getElementById('pdf-preview-modal');
  modal.classList.add('hidden');

  // Clean up
  pdfPreview.pdfDoc = null;
  pdfPreview.pageNum = 1;
  pdfPreview.scale = 1.5;

  // Remove keyboard listeners
  document.removeEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
  switch(e.key) {
    case 'Escape':
      closePDFPreview();
      break;
    case 'ArrowLeft':
      onPrevPage();
      break;
    case 'ArrowRight':
      onNextPage();
      break;
    case '+':
    case '=':
      e.preventDefault();
      zoomIn();
      break;
    case '-':
    case '_':
      e.preventDefault();
      zoomOut();
      break;
  }
}

/**
 * Show PDF preview modal and load PDF
 */
async function showPDFPreview(thesisId, fileId, fileName) {
  // Check if mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    // On mobile, open PDF in new tab instead of modal
    window.open(`/thesis/${thesisId}/files/${fileId}/preview`, '_blank');
    return;
  }

  const modal = document.getElementById('pdf-preview-modal');
  const loadingSpinner = document.getElementById('pdf-loading');
  const errorMessage = document.getElementById('pdf-error');
  const pdfViewer = document.getElementById('pdf-viewer');

  // Show modal
  modal.classList.remove('hidden');
  loadingSpinner.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  pdfViewer.classList.add('hidden');

  // Setup canvas
  pdfPreview.canvas = document.getElementById('pdf-canvas');
  pdfPreview.ctx = pdfPreview.canvas.getContext('2d');

  try {
    // Fetch PDF
    const url = `/thesis/${thesisId}/files/${fileId}/preview`;
    const loadingTask = pdfjsLib.getDocument(url);

    pdfPreview.pdfDoc = await loadingTask.promise;

    // Update UI
    document.getElementById('page_count').textContent = pdfPreview.pdfDoc.numPages;
    document.getElementById('pdf-file-name').textContent = fileName || 'Document';

    // Store for download button and set download link
    window.currentPDFFileId = fileId;
    window.currentPDFThesisId = thesisId;

    const downloadLink = document.getElementById('pdf-download-link');
    if (downloadLink) {
      downloadLink.href = `/thesis/${thesisId}/files/${fileId}/download`;
    }

    // Hide loading, show viewer
    loadingSpinner.classList.add('hidden');
    pdfViewer.classList.remove('hidden');

    // Render first page
    renderPage(pdfPreview.pageNum);

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

  } catch (error) {
    console.error('Error loading PDF:', error);
    loadingSpinner.classList.add('hidden');
    errorMessage.classList.remove('hidden');

    // Check if it's an embargo error
    if (error.status === 403) {
      document.getElementById('pdf-error-message').textContent =
        'This file is currently under embargo and cannot be previewed.';
    } else {
      document.getElementById('pdf-error-message').textContent =
        'Failed to load PDF. The file may be corrupted or unavailable.';
    }
  }
}
