/**
 * Unified PDF Engine - Type Definitions
 * 
 * Core types for the centralized PDF generation system.
 * All report types use these common interfaces.
 */

import type { Content, TDocumentDefinitions, PageOrientation, PageSize, Margins } from 'pdfmake/interfaces';
import type { CapturedChartData } from '../chartUtils';

// ============================================================================
// REPORT TYPE DEFINITIONS
// ============================================================================

/**
 * Available report types in the system
 * Add new report types here when extending the engine
 */
export type ReportType =
  | 'roadmap-review'
  | 'cost-report'
  | 'tenant-evaluation'
  | 'tenant-schedule'
  | 'tenant-completion'
  | 'cable-schedule'
  | 'lighting-report'
  | 'project-outline'
  | 'floor-plan'
  | 'generator-report'
  | 'payslip'
  | 'section-export'
  | 'custom';

/**
 * PDF generation engine selection
 */
export type PDFEngine = 'pdfmake' | 'jspdf';

/**
 * Generation mode
 */
export type GenerationMode = 'client' | 'server' | 'auto';

// ============================================================================
// REPORT CONFIGURATION
// ============================================================================

/**
 * Base configuration for all report types
 */
export interface ReportConfig {
  /** Report type identifier */
  reportType: ReportType;
  
  /** Human-readable report title */
  title: string;
  
  /** Project name for header */
  projectName?: string;
  
  /** Project number for header/filename */
  projectNumber?: string;
  
  /** Include cover page */
  includeCoverPage?: boolean;
  
  /** Include table of contents */
  includeTableOfContents?: boolean;
  
  /** Include confidential notice */
  includeConfidentialNotice?: boolean;
  
  /** Company branding */
  branding?: {
    companyName?: string;
    companyLogo?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  
  /** Page settings */
  page?: {
    orientation?: PageOrientation;
    size?: PageSize;
    margins?: Margins;
  };
  
  /** Output filename (without extension) */
  filename?: string;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Report data payload - varies by report type
 */
export interface ReportData {
  /** The actual data for the report */
  data: any;
  
  /** Captured charts from DOM */
  charts?: CapturedChartData[];
  
  /** Additional sections to include */
  sections?: ReportSection[];
}

/**
 * A section within a report
 */
export interface ReportSection {
  id: string;
  title: string;
  content: Content | Content[];
  pageBreakBefore?: boolean;
}

// ============================================================================
// GENERATION OPTIONS
// ============================================================================

/**
 * Options for PDF generation
 */
export interface GenerationOptions {
  /** Which engine to use */
  engine?: PDFEngine;
  
  /** Generation mode (client/server/auto) */
  mode?: GenerationMode;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Store in Supabase storage */
  storeInStorage?: boolean;
  
  /** Storage bucket name */
  storageBucket?: string;
  
  /** Storage path prefix */
  storagePath?: string;
  
  /** On progress callback */
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Progress updates during generation
 */
export interface GenerationProgress {
  stage: 'preparing' | 'capturing-charts' | 'building' | 'generating' | 'storing' | 'complete';
  percent: number;
  message: string;
}

// ============================================================================
// GENERATION RESULTS
// ============================================================================

/**
 * Result of PDF generation
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  
  /** PDF blob (if generated) */
  blob?: Blob;
  
  /** Base64 encoded PDF (from server) */
  pdfBase64?: string;
  
  /** Generated filename */
  filename: string;
  
  /** File size in bytes */
  sizeBytes?: number;
  
  /** Generation time in milliseconds */
  generationTimeMs?: number;
  
  /** Storage URL (if stored) */
  storageUrl?: string;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Which engine was used */
  engineUsed: PDFEngine;
  
  /** Which mode was used */
  modeUsed: GenerationMode;
}

// ============================================================================
// REPORT TYPE REGISTRY
// ============================================================================

/**
 * Registry entry for a report type
 */
export interface ReportTypeRegistration {
  /** Report type identifier */
  type: ReportType;
  
  /** Human-readable name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Default configuration */
  defaultConfig: Partial<ReportConfig>;
  
  /** Chart configurations to capture */
  chartConfigs?: ChartCaptureConfig[];
  
  /** Content builder function */
  buildContent: (data: any, config: ReportConfig) => Content[];
  
  /** Validate data before generation */
  validateData?: (data: any) => { valid: boolean; errors?: string[] };
  
  /** Supported engines */
  supportedEngines: PDFEngine[];
  
  /** Preferred generation mode */
  preferredMode: GenerationMode;
}

/**
 * Chart capture configuration
 */
export interface ChartCaptureConfig {
  elementId: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
}

// ============================================================================
// ENGINE REQUEST/RESPONSE (for edge function)
// ============================================================================

/**
 * Request to the unified PDF edge function
 */
export interface UnifiedPDFRequest {
  /** Report type */
  reportType: ReportType;
  
  /** Report configuration */
  config: ReportConfig;
  
  /** Report data */
  data: any;
  
  /** Captured charts */
  charts?: CapturedChartData[];
  
  /** Store in storage */
  storeInStorage?: boolean;
  
  /** Storage bucket */
  storageBucket?: string;
  
  /** Storage path */
  storagePath?: string;
}

/**
 * Response from the unified PDF edge function
 */
export interface UnifiedPDFResponse {
  success: boolean;
  pdfBase64?: string;
  filename?: string;
  sizeKB?: number;
  generationTimeMs?: number;
  storageUrl?: string;
  error?: string;
}

// ============================================================================
// BUILDER INTERFACES
// ============================================================================

/**
 * Section builder interface for report-specific builders
 */
export interface SectionBuilder<T = any> {
  /** Build cover page content */
  buildCoverPage?: (data: T, config: ReportConfig) => Content[];
  
  /** Build table of contents */
  buildTableOfContents?: (data: T, config: ReportConfig) => Content[];
  
  /** Build executive summary */
  buildExecutiveSummary?: (data: T, config: ReportConfig) => Content[];
  
  /** Build main content */
  buildMainContent: (data: T, config: ReportConfig) => Content[];
  
  /** Build appendix */
  buildAppendix?: (data: T, config: ReportConfig) => Content[];
  
  /** Build charts section */
  buildCharts?: (charts: CapturedChartData[], config: ReportConfig) => Content[];
}

/**
 * Export convenience type
 */
export type PDFContentBuilder = (data: any, config: ReportConfig) => Content[];
