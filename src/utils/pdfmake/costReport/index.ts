/**
 * Cost Report PDF Generation using pdfmake
 * 
 * This module provides a complete pdfmake-based implementation for
 * generating cost report PDFs, replacing the legacy jsPDF implementation.
 * 
 * Also includes HTML template generator for PDFShift fallback
 * and automatic fallback chain for reliability.
 */

export { generateCostReportPdfmake, downloadCostReportPdfmake, type CostReportPdfmakeOptions } from './generator';
export { buildVariationSheetContent, buildAllVariationSheetsContent } from './variationSheet';
export { buildDetailedLineItemsContent } from './detailedLineItems';
export { buildTableOfContentsContent } from './tableOfContents';
export { generateCostReportHtml, type CostReportHtmlData } from './htmlTemplateGenerator';
export { executeFallbackChain, type FallbackResult, type FallbackOptions } from './pdfFallbackChain';
