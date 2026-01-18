/**
 * Cost Report PDF Generation using pdfmake
 * 
 * This module provides a complete pdfmake-based implementation for
 * generating cost report PDFs, replacing the legacy jsPDF implementation.
 */

export { generateCostReportPdfmake, type CostReportPdfmakeOptions } from './generator';
export { buildVariationSheetContent, buildAllVariationSheetsContent } from './variationSheet';
export { buildDetailedLineItemsContent } from './detailedLineItems';
export { buildTableOfContentsContent } from './tableOfContents';
