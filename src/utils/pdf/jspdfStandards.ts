/**
 * Shared jsPDF Standards for all client-side legacy PDF generators
 * 
 * @see src/utils/pdfmake/PDF_GENERATION_SPEC.md
 * 
 * EVERY jsPDF generator MUST use these helpers to ensure
 * consistent headers, footers, page numbers, and table integrity.
 */

import jsPDF from "jspdf";

/** Standard margins matching the PDF spec (in points, ~mm conversion) */
export const PDF_STANDARD_MARGINS = {
  top: 25,    // 25mm
  right: 15,  // 15mm
  bottom: 22, // 22mm
  left: 15,   // 15mm
};

/**
 * Add running headers to all pages except the cover page.
 * Call AFTER all content has been added to the document.
 * 
 * @param doc - jsPDF document instance
 * @param reportTitle - Title shown on the left
 * @param projectName - Project name shown on the right (optional)
 * @param startPage - First page to add header to (default: 2, skipping cover)
 */
export function addRunningHeaders(
  doc: jsPDF,
  reportTitle: string,
  projectName?: string,
  startPage: number = 2
): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = startPage; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Header line
    doc.setDrawColor(229, 231, 235); // #e5e7eb
    doc.setLineWidth(0.3);
    doc.line(PDF_STANDARD_MARGINS.left, 18, pageWidth - PDF_STANDARD_MARGINS.right, 18);
    
    // Report title (left)
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81); // #374151
    doc.text(reportTitle, PDF_STANDARD_MARGINS.left, 15);
    
    // Project name (right)
    if (projectName) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128); // #6b7280
      const projWidth = doc.getTextWidth(projectName);
      doc.text(projectName, pageWidth - PDF_STANDARD_MARGINS.right - projWidth, 15);
    }
  }
}

/**
 * Add running footer with automatic page numbers to all pages except cover.
 * Call AFTER all content has been added to the document.
 * 
 * @param doc - jsPDF document instance
 * @param reportDate - Date string shown on the left (optional)
 * @param startPage - First page to add footer to (default: 2, skipping cover)
 */
export function addRunningFooter(
  doc: jsPDF,
  reportDate?: string,
  startPage: number = 2
): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentPages = pageCount - (startPage - 1);

  for (let i = startPage; i <= pageCount; i++) {
    doc.setPage(i);
    const yPos = pageHeight - 10;
    
    // Footer line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(PDF_STANDARD_MARGINS.left, yPos - 4, pageWidth - PDF_STANDARD_MARGINS.right, yPos - 4);
    
    // Date (left)
    if (reportDate) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // #94a3b8
      doc.text(reportDate, PDF_STANDARD_MARGINS.left, yPos);
    }
    
    // Page X of Y (right)
    const currentContentPage = i - (startPage - 1);
    const pageText = `Page ${currentContentPage} of ${contentPages}`;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - PDF_STANDARD_MARGINS.right - textWidth, yPos);
  }
}

/**
 * Get standard autoTable configuration with row-break protection.
 * Merge this with your specific table config.
 * 
 * ```typescript
 * import { getAutoTableDefaults } from '@/utils/pdf/jspdfStandards';
 * autoTable(doc, { ...getAutoTableDefaults(), body: [...], columns: [...] });
 * ```
 */
export function getAutoTableDefaults() {
  return {
    showHead: 'everyPage' as const,
    rowPageBreak: 'avoid' as const,
    margin: {
      top: PDF_STANDARD_MARGINS.top,
      right: PDF_STANDARD_MARGINS.right,
      bottom: PDF_STANDARD_MARGINS.bottom,
      left: PDF_STANDARD_MARGINS.left,
    },
  };
}
