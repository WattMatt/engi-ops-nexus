/**
 * Unified PDF Engine - Main Exports
 * 
 * This is the single entry point for all PDF generation in the application.
 * 
 * Usage:
 * ```typescript
 * import { generatePDF, downloadPDF, registerReportType } from '@/utils/pdfmake/engine';
 * 
 * // Generate a PDF
 * const result = await generatePDF('roadmap-review', data, { title: 'My Report' });
 * 
 * // Download directly
 * await downloadPDF('cost-report', data, { projectName: 'Project X' });
 * ```
 */

// Core types
export type {
  ReportType,
  PDFEngine,
  GenerationMode,
  ReportConfig,
  ReportData,
  ReportSection,
  GenerationOptions,
  GenerationProgress,
  GenerationResult,
  ReportTypeRegistration,
  ChartCaptureConfig,
  UnifiedPDFRequest,
  UnifiedPDFResponse,
  SectionBuilder,
  PDFContentBuilder,
} from './types';

// Registry functions
export {
  registerReportType,
  getReportType,
  hasReportType,
  getAllReportTypes,
  getAllRegistrations,
  buildReportContent,
  validateReportData,
  getChartConfigs,
  getDefaultConfig,
  createReportRegistration,
  getReportTypeInfo,
  listReportTypes,
} from './registry';

// Generator functions
export {
  generatePDF,
  downloadPDF,
  openPDF,
  getPDFPreview,
  generateFilename,
} from './generator';

// Initialize built-in report types
import './registrations';
