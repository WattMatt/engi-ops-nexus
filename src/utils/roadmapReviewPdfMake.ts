/**
 * Roadmap Review PDF Export - Server-Side Generation
 * 
 * Uses edge function for reliable server-side PDF generation with pdfmake.
 * Falls back to client-side generation if the edge function fails.
 */

import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRoadmapReviewPDF as clientGeneratePDF,
  downloadRoadmapReviewPDF,
} from "./pdfmake/roadmapReviewBuilder";
import type { PDFGenerationResult } from "./pdfmake/roadmapReviewBuilder";
import type {
  EnhancedProjectSummary,
  PortfolioMetrics,
} from "./roadmapReviewCalculations";
import { getDueDateStatus } from "./roadmapReviewCalculations";
import {
  PDF_COLORS_HEX,
  RoadmapPDFExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from "./roadmapReviewPdfStyles";
import {
  captureCharts,
  type ChartConfig,
  type CapturedChartData,
  waitForCharts,
} from "./pdfmake/chartUtils";

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

/**
 * Roadmap review chart configurations
 * These match the element IDs in the AdminRoadmapReview component
 */
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

/**
 * Capture roadmap review charts from the DOM
 */
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
// MAIN EXPORT FUNCTION (Wrapper for backwards compatibility)
// ============================================================================

/**
 * Generate the roadmap review PDF as a blob for storage/preview.
 * This is the main entry point - delegates to pdfmake implementation.
 * 
 * @returns Promise that resolves with the PDF blob and filename
 */
export async function generateRoadmapPdfBlob(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Attempting server-side generation...');
  
  try {
    // Try server-side generation first
    const { data, error } = await supabase.functions.invoke('generate-roadmap-pdf', {
      body: {
        projects,
        metrics,
        options,
        allRoadmapItems,
        capturedCharts,
        filename,
      },
    });

    if (error) throw error;
    if (!data?.success || !data?.pdfBase64) throw new Error(data?.error || 'No PDF data returned');

    console.log(`[RoadmapPDF] Server-side generation succeeded: ${data.sizeKB}KB in ${data.generationTimeMs}ms`);

    // Convert base64 to blob
    const binaryString = atob(data.pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    return { blob, filename: data.filename };
  } catch (serverError) {
    console.warn('[RoadmapPDF] Server-side generation failed, falling back to client-side:', serverError);
    
    // Fall back to client-side generation
    return clientGeneratePDF(projects, metrics, options, allRoadmapItems, capturedCharts, filename);
  }
}

/**
 * Quick export - download PDF directly without blob generation
 */
export async function quickExportRoadmapPdf(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<void> {
  console.log('[RoadmapPDF] Using quick export (direct download)...');
  
  await downloadRoadmapReviewPDF(
    projects,
    metrics,
    options,
    allRoadmapItems,
    capturedCharts,
    filename
  );
}
