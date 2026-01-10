import jsPDF from "jspdf";
import type { Content } from "pdfmake/interfaces";
import { captureChartAsCanvas, addHighQualityImage, canvasToDataUrl } from "@/utils/pdfQualitySettings";

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
// jsPDF Functions (Legacy)
// ============================================================================

/**
 * Adds captured charts to a PDF document as a Visual Summary page
 * @deprecated Use buildChartsContent for pdfmake instead
 */
export async function addChartsToPDF(
  doc: jsPDF,
  charts: CapturedChart[],
  options: {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentStartY: number;
  }
): Promise<void> {
  if (charts.length === 0) return;

  const { pageWidth, pageHeight, margin, contentStartY } = options;
  const contentWidth = pageWidth - 2 * margin;

  doc.addPage();
  
  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("VISUAL SUMMARY", pageWidth / 2, contentStartY + 5, { align: "center" });

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Charts & Graphs Overview", pageWidth / 2, contentStartY + 11, { align: "center" });

  // Decorative line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, contentStartY + 14, pageWidth - margin, contentStartY + 14);

  let yPos = contentStartY + 25;
  const maxChartWidth = contentWidth;
  const maxChartHeight = 70; // mm

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];

    // Check if we need a new page
    if (yPos + maxChartHeight + 20 > pageHeight - margin) {
      doc.addPage();
      yPos = contentStartY;
    }

    // Chart title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(chart.title, margin, yPos);
    yPos += 5;

    // Calculate aspect ratio and size
    const aspectRatio = chart.width / chart.height;
    let chartWidth = Math.min(maxChartWidth, maxChartHeight * aspectRatio);
    let chartHeight = chartWidth / aspectRatio;

    if (chartHeight > maxChartHeight) {
      chartHeight = maxChartHeight;
      chartWidth = chartHeight * aspectRatio;
    }

    // Center the chart
    const chartX = margin + (maxChartWidth - chartWidth) / 2;

    // Add chart image with border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(chartX - 2, yPos - 2, chartWidth + 4, chartHeight + 4);
    
    addHighQualityImage(
      doc,
      chart.canvas,
      chartX,
      yPos,
      chartWidth,
      chartHeight,
      'PNG',
      0.95
    );

    yPos += chartHeight + 15;
  }
}

// ============================================================================
// pdfmake Functions (New - preferred)
// ============================================================================

/**
 * Build charts content for pdfmake
 */
export async function buildChartsContent(
  charts: CapturedChart[]
): Promise<Content[]> {
  if (charts.length === 0) return [];

  const content: Content[] = [
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

  // Add each chart
  for (const chart of charts) {
    const base64 = canvasToDataUrl(chart.canvas, 'PNG', 0.95);
    
    content.push({
      text: chart.title,
      fontSize: 11,
      bold: true,
      color: '#1e3a8a',
      margin: [0, 10, 0, 5],
    });
    
    content.push({
      image: base64,
      width: 400,
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
