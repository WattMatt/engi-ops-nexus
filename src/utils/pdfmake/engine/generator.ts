/**
 * Unified PDF Engine - Core Generator
 * 
 * The main entry point for all PDF generation.
 * Routes to appropriate engine and mode based on configuration.
 */

import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { createDocument, getPdfBlob } from '../documentBuilder';
import { getStyles, PDF_COLORS, SPACING } from '../styles';
import { fetchCompanyDetails, generateCoverPageContent } from '../coverPage';
import { captureCharts, type CapturedChartData } from '../chartUtils';
import type { Content, Margins } from 'pdfmake/interfaces';
import type {
  ReportType,
  ReportConfig,
  ReportData,
  GenerationOptions,
  GenerationResult,
  GenerationProgress,
  UnifiedPDFRequest,
  UnifiedPDFResponse,
} from './types';
import {
  getReportType,
  buildReportContent,
  validateReportData,
  getChartConfigs,
  getDefaultConfig,
} from './registry';

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate a PDF report using the unified engine
 * 
 * @param reportType - The type of report to generate
 * @param data - The data for the report
 * @param config - Report configuration
 * @param options - Generation options
 * @returns Promise resolving to generation result
 */
export async function generatePDF(
  reportType: ReportType,
  data: any,
  config: Partial<ReportConfig> = {},
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  // Get registration for validation
  const registration = getReportType(reportType);
  if (!registration) {
    return {
      success: false,
      error: `Unknown report type: ${reportType}`,
      filename: 'error.pdf',
      engineUsed: 'pdfmake',
      modeUsed: 'client',
    };
  }
  
  // Merge with default config
  const fullConfig: ReportConfig = {
    reportType,
    title: registration.name,
    ...registration.defaultConfig,
    ...config,
  };
  
  // Progress callback
  const updateProgress = (progress: GenerationProgress) => {
    options.onProgress?.(progress);
  };
  
  updateProgress({ stage: 'preparing', percent: 10, message: 'Validating data...' });
  
  // Validate data
  const validation = validateReportData(reportType, data);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors?.join(', ')}`,
      filename: 'error.pdf',
      engineUsed: 'pdfmake',
      modeUsed: 'client',
    };
  }
  
  // Determine mode and engine
  const engine = options.engine || registration.supportedEngines[0] || 'pdfmake';
  const mode = options.mode || registration.preferredMode || 'auto';
  
  // Capture charts if needed
  let capturedCharts: CapturedChartData[] = [];
  const chartConfigs = getChartConfigs(reportType);
  
  if (chartConfigs.length > 0) {
    updateProgress({ stage: 'capturing-charts', percent: 20, message: 'Capturing charts...' });
    capturedCharts = await captureCharts(chartConfigs, {
      scale: 1.0,
      format: 'JPEG',
      quality: 0.7,
      backgroundColor: '#ffffff',
      timeout: 8000,
      maxWidth: 600,
      maxHeight: 400,
    });
  }
  
  updateProgress({ stage: 'building', percent: 40, message: 'Building document...' });
  
  // Route to appropriate generation method
  try {
    let result: GenerationResult;
    
    if (mode === 'server' || (mode === 'auto' && shouldUseServer(reportType, data))) {
      result = await generateServerSide(reportType, data, fullConfig, capturedCharts, options);
    } else {
      result = await generateClientSide(reportType, data, fullConfig, capturedCharts, options);
    }
    
    updateProgress({ stage: 'complete', percent: 100, message: 'PDF generated successfully' });
    
    result.generationTimeMs = Date.now() - startTime;
    return result;
  } catch (error) {
    console.error('[UnifiedPDF] Generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filename: generateFilename(fullConfig),
      engineUsed: engine,
      modeUsed: mode === 'auto' ? 'client' : mode,
    };
  }
}

// ============================================================================
// CLIENT-SIDE GENERATION
// ============================================================================

/**
 * Generate PDF on the client using pdfmake
 */
async function generateClientSide(
  reportType: ReportType,
  data: any,
  config: ReportConfig,
  charts: CapturedChartData[],
  options: GenerationOptions
): Promise<GenerationResult> {
  console.log(`[UnifiedPDF] Client-side generation for: ${reportType}`);
  
  const doc = createDocument({
    orientation: config.page?.orientation || 'portrait',
    pageSize: config.page?.size || 'A4',
    margins: config.page?.margins,
  });
  
  // Add cover page if requested
  if (config.includeCoverPage) {
    const companyDetails = await fetchCompanyDetails();
    const coverContent = await generateCoverPageContent({
      title: config.title,
      projectName: config.projectName,
      projectNumber: config.projectNumber,
      subtitle: getSubtitleForType(reportType),
    }, companyDetails);
    doc.add(coverContent);
  }
  
  // Build main content
  const mainContent = buildReportContent(reportType, data, config);
  doc.add(mainContent);
  
  // Add charts if available
  if (charts.length > 0) {
    const chartContent = buildChartsSection(charts, config);
    doc.add(chartContent);
  }
  
  // Add header/footer
  doc.withStandardHeader(config.title, config.projectName);
  doc.withStandardFooter(config.includeConfidentialNotice || false);
  
  // Generate blob
  const blob = await doc.toBlob(options.timeout || 60000);
  const filename = generateFilename(config);
  
  // Store if requested
  let storageUrl: string | undefined;
  if (options.storeInStorage) {
    storageUrl = await storeBlob(blob, filename, options);
  }
  
  return {
    success: true,
    blob,
    filename,
    sizeBytes: blob.size,
    engineUsed: 'pdfmake',
    modeUsed: 'client',
    storageUrl,
  };
}

// ============================================================================
// SERVER-SIDE GENERATION
// ============================================================================

/**
 * Generate PDF on the server — now falls back to client-side only (server EFs removed)
 */
async function generateServerSide(
  reportType: ReportType,
  data: any,
  config: ReportConfig,
  charts: CapturedChartData[],
  options: GenerationOptions
): Promise<GenerationResult> {
  console.warn(`[UnifiedPDF] Server-side EFs removed, falling back to client-side for: ${reportType}`);
  return generateClientSide(reportType, data, config, charts, options);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determine if server-side generation should be used
 */
function shouldUseServer(reportType: ReportType, data: any): boolean {
  // Use server for large data sets or complex reports
  const registration = getReportType(reportType);
  if (registration?.preferredMode === 'server') return true;
  
  // Check data size heuristics
  const dataStr = JSON.stringify(data);
  if (dataStr.length > 100000) return true; // > 100KB of data
  
  return false;
}

/**
 * Generate standardized filename
 */
export function generateFilename(config: ReportConfig): string {
  const parts: string[] = [];
  
  if (config.projectNumber) {
    parts.push(config.projectNumber.replace(/\s+/g, '-'));
  }
  
  parts.push(config.title.replace(/\s+/g, '-'));
  parts.push(format(new Date(), 'yyyy-MM-dd'));
  
  return `${parts.join('_')}.pdf`;
}

/**
 * Get subtitle based on report type
 */
function getSubtitleForType(reportType: ReportType): string {
  const subtitles: Record<ReportType, string> = {
    'roadmap-review': 'Project Roadmap Review',
    'cost-report': 'Cost Analysis Report',
    'tenant-evaluation': 'Tenant Evaluation Report',
    'tenant-schedule': 'Tenant Schedule Report',
    'tenant-completion': 'Tenant Completion Report',
    'cable-schedule': 'Cable Schedule',
    'lighting-report': 'Lighting Design Report',
    'project-outline': 'Project Outline Document',
    'floor-plan': 'Floor Plan Export',
    'generator-report': 'Generator Sizing Report',
    'payslip': 'Employee Payslip',
    'section-export': 'Section Export',
    'custom': 'Custom Report',
  };
  return subtitles[reportType] || 'Report';
}

/**
 * Build charts section content
 */
function buildChartsSection(charts: CapturedChartData[], config: ReportConfig): Content[] {
  if (charts.length === 0) return [];
  
  const content: Content[] = [
    { text: '', pageBreak: 'before' },
    { text: 'Analytics & Charts', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
  ];
  
  for (const chart of charts) {
    if (!chart.image?.dataUrl) continue;
    
    content.push({
      stack: [
        { text: chart.config.title, style: ['heading', 'h3'], margin: [0, SPACING.md, 0, SPACING.xs] as Margins },
        chart.config.description ? { text: chart.config.description, style: 'muted', margin: [0, 0, 0, SPACING.sm] as Margins } : null,
        {
          image: chart.image.dataUrl,
          width: 500,
          alignment: 'center' as const,
          margin: [0, SPACING.sm, 0, SPACING.lg] as Margins,
        },
      ].filter(Boolean) as Content[],
    });
  }
  
  return content;
}

/**
 * Store blob in Supabase storage
 */
async function storeBlob(
  blob: Blob, 
  filename: string, 
  options: GenerationOptions
): Promise<string | undefined> {
  const bucket = options.storageBucket || 'reports';
  const path = options.storagePath 
    ? `${options.storagePath}/${filename}`
    : `generated/${format(new Date(), 'yyyy-MM')}/${filename}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    });
  
  if (error) {
    console.error('[UnifiedPDF] Storage upload failed:', error);
    return undefined;
  }
  
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return urlData?.publicUrl;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate and download PDF directly
 */
export async function downloadPDF(
  reportType: ReportType,
  data: any,
  config: Partial<ReportConfig> = {},
  options: GenerationOptions = {}
): Promise<void> {
  const result = await generatePDF(reportType, data, config, options);
  
  if (!result.success || !result.blob) {
    throw new Error(result.error || 'Failed to generate PDF');
  }
  
  // Trigger download
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF and open in new tab
 */
export async function openPDF(
  reportType: ReportType,
  data: any,
  config: Partial<ReportConfig> = {},
  options: GenerationOptions = {}
): Promise<void> {
  const result = await generatePDF(reportType, data, config, options);
  
  if (!result.success || !result.blob) {
    throw new Error(result.error || 'Failed to generate PDF');
  }
  
  const url = URL.createObjectURL(result.blob);
  window.open(url, '_blank');
}

/**
 * Generate PDF and return as data URL (for preview)
 */
export async function getPDFPreview(
  reportType: ReportType,
  data: any,
  config: Partial<ReportConfig> = {},
  options: GenerationOptions = {}
): Promise<string> {
  const result = await generatePDF(reportType, data, config, options);
  
  if (!result.success || !result.blob) {
    throw new Error(result.error || 'Failed to generate PDF');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(result.blob!);
  });
}
