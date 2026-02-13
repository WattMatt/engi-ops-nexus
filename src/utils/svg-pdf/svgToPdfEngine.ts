/**
 * SVG-to-PDF Engine
 * 
 * Converts an array of SVG elements (one per page) into a multi-page PDF
 * using jsPDF + svg2pdf.js.
 */
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface SvgToPdfOptions {
  filename?: string;
  pageWidth?: number;
  pageHeight?: number;
}

/**
 * Convert an array of SVG elements into a PDF Blob.
 * Each SVG element becomes one page.
 */
export async function svgPagesToPdfBlob(
  svgElements: SVGSVGElement[],
  options: SvgToPdfOptions = {}
): Promise<{ blob: Blob; timeMs: number }> {
  const start = performance.now();
  const width = options.pageWidth || A4_WIDTH_MM;
  const height = options.pageHeight || A4_HEIGHT_MM;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height],
  });

  for (let i = 0; i < svgElements.length; i++) {
    if (i > 0) {
      doc.addPage([width, height], 'portrait');
    }

    await (doc as any).svg(svgElements[i], {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const blob = doc.output('blob');
  const timeMs = Math.round(performance.now() - start);

  return { blob, timeMs };
}

/**
 * Generate PDF from SVG elements and trigger download.
 */
export async function svgPagesToDownload(
  svgElements: SVGSVGElement[],
  options: SvgToPdfOptions = {}
): Promise<{ timeMs: number; sizeBytes: number }> {
  const { blob, timeMs } = await svgPagesToPdfBlob(svgElements, options);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || 'report.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { timeMs, sizeBytes: blob.size };
}
