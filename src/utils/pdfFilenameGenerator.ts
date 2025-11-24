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
