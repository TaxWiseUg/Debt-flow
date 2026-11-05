import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface ExportOptions {
  filename: string;
  backgroundColor?: string;
  pixelRatio?: number;
}

/**
 * Robustly captures a DOM element as a PNG data URL
 */
const captureElementToDataUrl = async (
  element: HTMLElement,
  pixelRatio = 2,
  backgroundColor = '#F6F4EB'
): Promise<string> => {
  const filter = (node: HTMLElement) => {
    if (node.classList && (node.classList.contains('no-print') || node.classList.contains('no-export'))) {
      return false;
    }
    return true;
  };

  try {
    return await toPng(element, {
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      skipFonts: true,
      filter,
    });
  } catch (firstErr) {
    console.warn('Initial capture failed, retrying with fallback settings...', firstErr);
    return await toPng(element, {
      pixelRatio: 1,
      backgroundColor,
      cacheBust: true,
      skipFonts: true,
      filter,
    });
  }
};

/**
 * Downloads a DOM element as a high-resolution PNG image
 */
export const exportElementToPng = async (
  element: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  const { filename, backgroundColor = '#F6F4EB', pixelRatio = 2 } = options;

  const dataUrl = await captureElementToDataUrl(element, pixelRatio, backgroundColor);

  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads a DOM element as a single-page A4 PDF document that never splits or breaks across pages
 */
export const exportElementToPdf = async (
  element: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  const { filename, backgroundColor = '#F6F4EB', pixelRatio = 2 } = options;

  const dataUrl = await captureElementToDataUrl(element, pixelRatio, backgroundColor);

  // Load image to get true pixel dimensions
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Force fit entire document height to fit precisely within 1 single A4 page (no splitting/breaking)
  const calculatedHeight = (img.naturalHeight * pdfWidth) / img.naturalWidth;
  const finalHeight = Math.min(calculatedHeight, pdfHeight);

  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, finalHeight, undefined, 'FAST');

  const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(finalName);
};
