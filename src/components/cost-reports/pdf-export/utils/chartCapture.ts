import { captureChartAsCanvas, canvasToDataUrl } from "@/utils/pdfQualitySettings";
import { QUALITY_PRESETS, type QualityPreset } from "@/utils/pdfConstants";

// ============================================================================
// Types
// ============================================================================

export interface ChartCaptureConfig {
  elementId: string;
  title: string;
  width: number;
  height: number;
}

export interface CapturedChart {
  canvas: HTMLCanvasElement;
  title: string;
  width: number;
  height: number;
}

export interface ChartContentOptions {
  /** Image quality preset - affects file size */
  quality?: QualityPreset;
  /** Maximum width for charts in the PDF */
  maxWidth?: number;
}

// ============================================================================
// Capture Functions
// ============================================================================

/**
 * Captures a chart element from the DOM and returns it as a canvas
 */
export async function captureChartElement(
  elementId: string,
  title: string
): Promise<CapturedChart | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Chart element not found: ${elementId}`);
    return null;
  }

  try {
    const canvas = await captureChartAsCanvas(element);
    return {
      canvas,
      title,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  } catch (error) {
    console.error(`Failed to capture chart ${elementId}:`, error);
    return null;
  }
}

/**
 * Captures multiple charts from the CostReportOverview component
 * Uses the actual element IDs from the component
 */
export async function captureCostReportCharts(): Promise<CapturedChart[]> {
  const chartConfigs: ChartCaptureConfig[] = [
    {
      elementId: 'budget-comparison-chart',
      title: 'Top 5 Categories Comparison',
      width: 400,
      height: 300,
    },
    {
      elementId: 'distribution-chart',
      title: 'Category Distribution',
      width: 300,
      height: 300,
    },
    {
      elementId: 'variance-chart',
      title: 'Variance Analysis',
      width: 400,
      height: 300,
    },
  ];

  const capturedCharts: CapturedChart[] = [];

  for (const config of chartConfigs) {
    const chart = await captureChartElement(config.elementId, config.title);
    if (chart) {
      capturedCharts.push(chart);
    }
  }

  return capturedCharts;
}

// ============================================================================
// pdfmake Functions
// ============================================================================

/**
 * Build charts content for pdfmake with optimized compression
 * @param charts - Array of captured chart objects
 * @param options - Configuration for quality and sizing
 */
export async function buildChartsContent(
  charts: CapturedChart[],
  options: ChartContentOptions = {}
): Promise<any[]> {
  const { quality = 'standard', maxWidth = 400 } = options;
  const qualitySettings = QUALITY_PRESETS[quality];
  
  if (charts.length === 0) return [];

  const content: any[] = [
    // Header
    {
      text: 'VISUAL SUMMARY',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 5],
    },
    {
      text: 'Charts & Graphs Overview',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center',
      margin: [0, 0, 0, 10],
    },
    // Separator line
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#c8c8c8',
        },
      ],
      margin: [0, 0, 0, 15],
    },
  ];

  // Add each chart with optimized compression
  for (const chart of charts) {
    // Use JPEG for smaller file sizes (unless transparency needed)
    const base64 = canvasToDataUrl(chart.canvas, 'JPEG', qualitySettings.imageQuality);
    
    content.push({
      text: chart.title,
      fontSize: 11,
      bold: true,
      color: '#1e3a8a',
      margin: [0, 10, 0, 5],
    });
    
    content.push({
      image: base64,
      width: Math.min(maxWidth, chart.width),
      alignment: 'center',
      margin: [0, 0, 0, 15],
    });
  }

  return content;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Waits for charts to render before capturing
 */
export async function waitForChartsToRender(timeout: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}
