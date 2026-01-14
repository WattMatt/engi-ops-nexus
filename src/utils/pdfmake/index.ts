/**
 * PDFMake Utilities - Main Export
 * 
 * This module provides a complete replacement for jsPDF with pdfmake,
 * offering a more declarative and maintainable approach to PDF generation.
 * 
 * Usage:
 * ```typescript
 * import { createDocument, heading, paragraph, dataTable, fetchCompanyDetails, generateCoverPageContent } from '@/utils/pdfmake';
 * 
 * const companyDetails = await fetchCompanyDetails();
 * const coverPage = await generateCoverPageContent({ title: 'Report', projectName: 'My Project' }, companyDetails);
 * 
 * const doc = createDocument()
 *   .add(coverPage)
 *   .add(heading('Section 1'))
 *   .add(paragraph('This is body text'))
 *   .add(dataTable(columns, data))
 *   .withStandardFooter();
 * 
 * doc.download('report.pdf');
 * ```
 */

// Core configuration
export { pdfMake, PAGE_SIZES, STANDARD_MARGINS, mmToPoints, pointsToMm, isPdfMakeReady } from './config';

// Styles and colors
export { PDF_COLORS, FONT_SIZES, defaultStyles, tableLayouts, QUALITY_PRESETS } from './styles';
export type { QualityPreset } from './styles';

// Helper functions
export {
  heading,
  paragraph,
  keyValue,
  sectionHeader,
  dataTable,
  infoTable,
  twoColumns,
  stack,
  horizontalLine,
  spacer,
  imageToBase64,
  image,
  pageBreak,
  newPage,
  formatCurrency,
  formatDate,
  formatPercentage,
} from './helpers';
export type { TableColumn } from './helpers';

// Document builder
export { PDFDocumentBuilder, createDocument, downloadPdf, openPdf, getPdfBlob } from './documentBuilder';
export type { DocumentBuilderOptions } from './documentBuilder';

// Cover page
export { fetchCompanyDetails, generateCoverPageContent } from './coverPage';
export type { CoverPageOptions, CompanyDetails, ContactDetails } from './coverPage';

// Cost report builder
export { 
  generateCostReportPDF, 
  downloadCostReportPDF,
  buildCoverPageContent,
  buildExecutiveSummaryContent,
  buildCategoryDetailsContent,
} from './costReportBuilder';
export type { CostReportData, CostReportOptions } from './costReportBuilder';

// Validation utilities
export {
  validateDocument,
  getDocumentSummary,
  formatValidationResult,
} from './validation';
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DocumentSummary,
  ContentStats,
} from './validation';

// Testing utilities
export {
  testPDFGeneration,
  generatePDFPreview,
  compareDocuments,
  createTestDocument,
  benchmarkPDFGeneration,
  formatBenchmarkResult,
} from './testing';
export type {
  PDFTestResult,
  DocumentComparison,
  BenchmarkResult,
} from './testing';

// Image utilities
export {
  loadImageAsBase64,
  fileToBase64,
  processImage,
  captureElement,
  captureElementById,
  captureMultipleElements,
  createImageContent,
  createCaptionedImage,
  createImageGrid,
  createBannerImage,
  resizeImage,
  compressImageToSize,
  getImageDimensions,
  captureRechartsChart,
  buildChartContent,
} from './imageUtils';
export type {
  ImageOptions,
  ImageCaptureOptions,
  ProcessedImage,
  ImageGridOptions,
} from './imageUtils';

// Chart utilities
export {
  waitForCharts,
  captureChart,
  captureCharts,
  captureChartsByPrefix,
  buildSingleChartContent,
  buildChartGridContent,
  buildChartSectionContent,
  COST_REPORT_CHARTS,
  ROADMAP_CHARTS,
  buildCostReportChartsSection,
  buildRoadmapChartsSection,
} from './chartUtils';
export type {
  ChartConfig,
  CapturedChartData,
  ChartSectionOptions,
} from './chartUtils';

// HR Export utilities
export {
  buildPayslipContent,
  generatePayslipPDF,
  buildEmployeeReportContent,
  buildAttendanceReportContent,
  buildLeaveReportContent,
  createEmployeeReportPDF,
  createAttendanceReportPDF,
  createLeaveReportPDF,
} from './hrExports';
export type {
  PayslipData,
  EmployeeReportData,
  AttendanceReportData,
  LeaveReportData,
} from './hrExports';

// Admin Export utilities
export {
  buildProjectSummaryContent,
  buildAuditLogContent,
  buildInvoiceContent,
  createProjectSummaryPDF,
  createAuditLogPDF,
  createInvoicePDF,
} from './adminExports';
export type {
  ProjectSummaryData,
  AuditLogData,
  SystemReportData,
  InvoiceData,
} from './adminExports';

// Re-export pdfmake types for convenience
export type { 
  Content, 
  TDocumentDefinitions, 
  ContentTable, 
  ContentColumns, 
  ContentStack,
  Margins,
  Style,
  StyleDictionary,
  PageOrientation,
  PageSize,
} from 'pdfmake/interfaces';
