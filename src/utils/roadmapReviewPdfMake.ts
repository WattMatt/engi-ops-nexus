/**
 * Roadmap Review PDF Export - Dual Engine Support
 * 
 * Supports two PDF generation engines:
 * - jsPDF (client-side): Rich tables with autoTable, local processing
 * - pdfmake (client-side): Declarative API, modern approach
 */

import { format } from "date-fns";
import {
  generateRoadmapReviewPDF as pdfmakeClientGenerate,
  downloadRoadmapReviewPDF,
} from "./pdfmake/roadmapReviewBuilder";
import type { PDFGenerationResult } from "./pdfmake/roadmapReviewBuilder";
import type {
  EnhancedProjectSummary,
  PortfolioMetrics,
} from "./roadmapReviewCalculations";
import {
  RoadmapPDFExportOptions,
  PDFEngine,
} from "./roadmapReviewPdfStyles";
import {
  captureCharts,
  type ChartConfig,
  type CapturedChartData,
} from "./pdfmake/chartUtils";
// jsPDF implementation
import { generateEnhancedRoadmapPDF, downloadPDF } from "./roadmapReviewPdfExport";

// Re-export for backwards compatibility
export { downloadRoadmapReviewPDF };
export type { PDFGenerationResult };

// ============================================================================
// TYPES
// ============================================================================

interface RoadmapItem {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  is_completed: boolean;
  parent_id?: string | null;
}

// ============================================================================
// CHART CONFIGURATIONS
// ============================================================================

export const ROADMAP_REVIEW_CHARTS: ChartConfig[] = [
  {
    elementId: 'priority-heatmap-chart',
    title: 'Priority Distribution Heatmap',
    description: 'Task priority distribution across projects',
  },
  {
    elementId: 'project-comparison-chart',
    title: 'Project Progress Comparison',
    description: 'Progress and health metrics across all projects',
  },
  {
    elementId: 'team-workload-chart',
    title: 'Team Workload Analysis',
    description: 'Team member assignment distribution',
  },
  {
    elementId: 'portfolio-health-gauge',
    title: 'Portfolio Health Score',
    description: 'Overall portfolio health indicator',
  },
];

export const captureRoadmapReviewCharts = async (): Promise<CapturedChartData[]> => {
  console.log('[RoadmapPDF] Starting chart capture...');

  const availableCharts = ROADMAP_REVIEW_CHARTS.filter(
    config => document.getElementById(config.elementId) !== null
  );

  if (availableCharts.length === 0) {
    console.warn('[RoadmapPDF] No chart elements found.');
    return [];
  }

  console.log(`[RoadmapPDF] Found ${availableCharts.length} charts to capture`);

  const charts = await captureCharts(availableCharts, {
    scale: 1.0,
    format: 'JPEG',
    quality: 0.7,
    backgroundColor: '#ffffff',
    timeout: 8000,
    maxWidth: 600,
    maxHeight: 400,
  });

  console.log(`[RoadmapPDF] Successfully captured ${charts.length} charts`);
  return charts;
};

// ============================================================================
// JSPDF GENERATION (Client-Side - Recommended)
// ============================================================================

async function generateWithJsPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Using jsPDF engine (client-side)...');
  
  const startTime = Date.now();
  const doc = await generateEnhancedRoadmapPDF(projects, metrics, options, allRoadmapItems);
  const blob = doc.output('blob');
  const generatedFilename = filename || `Roadmap_Review_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  
  const elapsed = Date.now() - startTime;
  console.log(`[RoadmapPDF] jsPDF generation completed: ${(blob.size / 1024).toFixed(1)}KB in ${elapsed}ms`);
  
  return { blob, filename: generatedFilename };
}

// ============================================================================
// PDFMAKE GENERATION (Client-Side only — server EF removed)
// ============================================================================

async function generateWithPdfmake(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Using pdfmake engine (client-side)...');
  return pdfmakeClientGenerate(projects, metrics, options, allRoadmapItems, capturedCharts, filename);
}

// ============================================================================
// MAIN EXPORT FUNCTION (Dual Engine Support)
// ============================================================================

export async function generateRoadmapPdfBlob(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  const engine: PDFEngine = options.pdfEngine || 'jspdf';
  
  console.log(`[RoadmapPDF] Starting PDF generation with engine: ${engine}`);
  
  if (engine === 'pdfmake') {
    return generateWithPdfmake(projects, metrics, options, allRoadmapItems, capturedCharts, filename);
  }
  
  return generateWithJsPDF(projects, metrics, options, allRoadmapItems, filename);
}

export async function quickExportRoadmapPdf(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<void> {
  const engine: PDFEngine = options.pdfEngine || 'jspdf';
  
  console.log(`[RoadmapPDF] Quick export with engine: ${engine}`);
  
  if (engine === 'pdfmake') {
    await downloadRoadmapReviewPDF(projects, metrics, options, allRoadmapItems, capturedCharts, filename);
  } else {
    const doc = await generateEnhancedRoadmapPDF(projects, metrics, options, allRoadmapItems);
    downloadPDF(doc, filename);
  }
}
