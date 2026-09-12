import html2canvasPro from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * High-Resolution PDF Export Utility
 * Uses html2canvas-pro which supports modern CSS color functions including oklch() from Tailwind CSS v4.
 * Generates an exact A4-sized PDF without throwing color parsing errors.
 *
 * @param {string} elementId - DOM ID of the container to render
 * @param {string} candidateName - Name for the generated PDF file
 * @returns {Promise<void>}
 */
export async function exportCvToPdf(elementId, candidateName = 'Candidate') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID "${elementId}" was not found.`);
  }

  // Wait for web fonts (e.g. Google Fonts Poppins / Segoe UI) to be ready
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-blocking fallback if fonts API fails
    }
  }

  // Render canvas with html2canvas-pro (with full oklch / modern CSS support)
  const canvas = await html2canvasPro(element, {
    scale: 2, // 2x density for sharp, high-res text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollY: 0,
    scrollX: 0,
    onclone: (clonedDoc) => {
      // Ensure the cloned element is perfectly visible and unscaled
      const clonedEl = clonedDoc.getElementById(elementId);
      if (clonedEl) {
        clonedEl.style.transform = 'none';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.boxShadow = 'none';
      }
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // Standard A4 dimensions in mm: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  // Calculate proportional image height based on canvas aspect ratio
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  // If the content fits within one A4 page
  if (imgHeight <= pdfHeight + 1) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
  } else {
    // If multiple pages are needed
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
  }

  // Format clean filename
  const cleanName = (candidateName || 'Candidate')
    .trim()
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `${cleanName || 'Candidate'}_CV.pdf`;

  pdf.save(filename);
}

/**
 * Generates a PDF Blob from an element without triggering a direct browser download.
 * Useful for uploading the generated PDF directly to Google Drive.
 *
 * @param {string} elementId - DOM ID of the container to render
 * @param {string} candidateName - Name for the generated PDF
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateCvPdfBlob(elementId, candidateName = 'Candidate') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with ID "${elementId}" was not found.`);
  }

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Non-blocking
    }
  }

  const canvas = await html2canvasPro(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollY: 0,
    scrollX: 0,
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.getElementById(elementId);
      if (clonedEl) {
        clonedEl.style.transform = 'none';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.boxShadow = 'none';
      }
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  if (imgHeight <= pdfHeight + 1) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
  } else {
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
  }

  const cleanName = (candidateName || 'Candidate')
    .trim()
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_');
  const filename = `${cleanName || 'Candidate'}_CV.pdf`;

  const blob = pdf.output('blob');
  return { blob, filename };
}
