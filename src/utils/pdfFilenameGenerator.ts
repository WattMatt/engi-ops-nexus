/**
 * Generate standardized PDF filenames with ISO dates and project numbers
 * Format: PROJ-{number}_{type}_{ISO-date}_{timestamp}.pdf
 */

export interface PDFFilenameOptions {
  projectNumber?: string;
  reportType: string;
  reportNumber?: string | number;
  revision?: string;
}

export function generateStandardizedPDFFilename(options: PDFFilenameOptions): string {
  const { projectNumber, reportType, reportNumber, revision } = options;
  
  // ISO date format: YYYY-MM-DD
  const isoDate = new Date().toISOString().split('T')[0];
  
  // Sanitize report type to remove spaces and special characters
  const sanitizedType = reportType.replace(/[^a-zA-Z0-9]/g, '');
  
  // Build filename parts
  const parts: string[] = [];
  
  // Add project number if available
  if (projectNumber) {
    parts.push(`PROJ-${projectNumber}`);
  }
  
  // Add report type
  parts.push(sanitizedType);
  
  // Add report number if available
  if (reportNumber !== undefined) {
    parts.push(`Rep${reportNumber}`);
  }
  
  // Add revision if available
  if (revision) {
    parts.push(`Rev${revision}`);
  }
  
  // Add ISO date
  parts.push(isoDate);
  
  // Join parts with underscores
  const filename = parts.join('_');
  
  return `${filename}.pdf`;
}

/**
 * Generate filename for storage (includes timestamp for uniqueness)
 */
export function generateStorageFilename(options: PDFFilenameOptions): string {
  const baseFilename = generateStandardizedPDFFilename(options);
  const timestamp = Date.now();

  // Insert timestamp before .pdf extension
  return baseFilename.replace('.pdf', `_${timestamp}.pdf`);
}

/**
 * Strip any trailing ".pdf" extension(s) from a report name (case-insensitive).
 * Callers sometimes pass already-standardized names ending in ".pdf"; composing
 * further suffixes onto those produced double-extension filenames like
 * "..._RevA_2026-06-01.pdf_A_1748736000000.pdf".
 */
export function stripPdfExtension(name: string): string {
  return name.replace(/(\.pdf)+$/i, '');
}

/**
 * Pure composition of the storage/download filename used by useSvgPdfReport:
 * {sanitized-report-name}_{revision}_{timestamp}.pdf
 *
 * - Strips any trailing ".pdf" from reportName first (fixes the
 *   double-extension bug when callers pass a standardized *.pdf name).
 * - Sanitizes to [a-zA-Z0-9._-].
 */
export function composeReportStorageFilename(
  reportName: string,
  revision: string,
  timestamp: number = Date.now(),
): string {
  const base = stripPdfExtension(reportName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${base}_${revision}_${timestamp}.pdf`;
}
