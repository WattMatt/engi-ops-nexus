/**
 * PDFMake Chart Utilities
 * Specialized utilities for capturing and embedding charts in PDFs
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { captureElement, captureElementById, type ProcessedImage, type ImageCaptureOptions } from './imageUtils';
import { PDF_COLORS } from './styles';

// ============================================================================
// Types
// ============================================================================

export interface ChartConfig {
  elementId: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
}

export interface CapturedChartData {
  config: ChartConfig;
  image: ProcessedImage;
}

export interface ChartSectionOptions {
  title?: string;
  subtitle?: string;
  layout?: 'single' | 'grid' | 'stacked';
  chartsPerRow?: number;
  showBorder?: boolean;
  pageBreakBefore?: boolean;
}

// ============================================================================
// Chart Capture Functions
// ============================================================================

/**
 * Wait for charts to be fully rendered
 */
export const waitForCharts = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Capture a single chart by element ID (ultra-fast settings)
 */
export const captureChart = async (
  config: ChartConfig,
  captureOptions: ImageCaptureOptions = {}
): Promise<CapturedChartData | null> => {
  const element = document.getElementById(config.elementId);
  if (!element) {
    console.warn(`Chart element not found: ${config.elementId}`);
    return null;
  }

  try {
    // Use aggressive compression for PDF embedding
    const capturePromise = captureElement(element, {
      scale: 0.75, // Reduced scale for smaller file size
      format: 'JPEG',
      quality: 0.6, // Lower quality for smaller file size
      backgroundColor: '#ffffff',
      timeout: 3000,
      maxWidth: 600, // Limit max dimensions
      maxHeight: 400,
      ...captureOptions,
    });

    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), 3000)
    );

    const image = await Promise.race([capturePromise, timeoutPromise]);
    if (!image) {
      console.warn(`Chart capture timed out: ${config.elementId}`);
      return null;
    }

    // Log image size for debugging
    const sizeKB = Math.round(image.dataUrl.length * 0.75 / 1024);
    console.log(`Chart captured: ${config.elementId} (${sizeKB}KB)`);

    return { config, image };
  } catch (error) {
    console.error(`Failed to capture chart ${config.elementId}:`, error);
    return null;
  }
};

/**
 * Capture multiple charts in parallel (no wait, parallel capture with timeout)
 */
export const captureCharts = async (
  configs: ChartConfig[],
  captureOptions: ImageCaptureOptions = {}
): Promise<CapturedChartData[]> => {
  if (configs.length === 0) return [];

  const results = await Promise.all(
    configs.map(config => captureChart(config, captureOptions))
  );

  return results.filter((r): r is CapturedChartData => r !== null);
};

/**
 * Capture charts by a common prefix (e.g., all elements starting with "chart-")
 */
export const captureChartsByPrefix = async (
  prefix: string,
  captureOptions: ImageCaptureOptions = {}
): Promise<CapturedChartData[]> => {
  const elements = document.querySelectorAll(`[id^="${prefix}"]`);
  const configs: ChartConfig[] = [];

  elements.forEach((element) => {
    if (element instanceof HTMLElement) {
      configs.push({
        elementId: element.id,
        title: element.dataset.chartTitle || element.id.replace(prefix, '').replace(/-/g, ' '),
        description: element.dataset.chartDescription,
      });
    }
  });

  return captureCharts(configs, captureOptions);
};

// ============================================================================
// pdfmake Content Builders
// ============================================================================

/**
 * Build content for a single chart
 */
export const buildSingleChartContent = (
  chart: CapturedChartData,
  options: { width?: number; showBorder?: boolean } = {}
): Content => {
  const { width = 450, showBorder = false } = options;

  const chartContent: Content[] = [
    {
      text: chart.config.title,
      fontSize: 12,
      bold: true,
      color: PDF_COLORS.primary,
      margin: [0, 0, 0, 4] as Margins,
    },
  ];

  if (chart.config.description) {
    chartContent.push({
      text: chart.config.description,
      fontSize: 9,
      color: PDF_COLORS.textMuted,
      margin: [0, 0, 0, 8] as Margins,
    });
  }

  chartContent.push({
    image: chart.image.dataUrl,
    width,
    alignment: 'center',
  });

  if (showBorder) {
    return {
      table: {
        widths: ['*'],
        body: [[{ stack: chartContent, margin: [10, 10, 10, 10] }]],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
      },
      margin: [0, 0, 0, 15] as Margins,
    };
  }

  return {
    stack: chartContent,
    margin: [0, 0, 0, 15] as Margins,
  };
};

/**
 * Build a grid layout for multiple charts
 */
export const buildChartGridContent = (
  charts: CapturedChartData[],
  options: { chartsPerRow?: number; gap?: number } = {}
): Content => {
  const { chartsPerRow = 2, gap = 10 } = options;
  const chartWidth = Math.floor((515 - (gap * (chartsPerRow - 1))) / chartsPerRow);

  const rows: Content[][] = [];
  let currentRow: Content[] = [];

  charts.forEach((chart, index) => {
    const chartContent: Content = {
      stack: [
        {
          text: chart.config.title,
          fontSize: 10,
          bold: true,
          color: PDF_COLORS.primary,
          margin: [0, 0, 0, 4] as Margins,
        },
        {
          image: chart.image.dataUrl,
          width: chartWidth - 10,
          alignment: 'center',
        },
      ],
    };

    currentRow.push(chartContent);

    if (currentRow.length === chartsPerRow || index === charts.length - 1) {
      while (currentRow.length < chartsPerRow) {
        currentRow.push({ text: '' });
      }
      rows.push([...currentRow]);
      currentRow = [];
    }
  });

  return {
    table: {
      widths: Array(chartsPerRow).fill('*'),
      body: rows,
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => gap / 2,
      paddingRight: () => gap / 2,
      paddingTop: () => gap,
      paddingBottom: () => gap,
    },
  };
};

/**
 * Build a complete chart section with header
 */
export const buildChartSectionContent = (
  charts: CapturedChartData[],
  options: ChartSectionOptions = {}
): Content[] => {
  const {
    title = 'Visual Summary',
    subtitle,
    layout = 'stacked',
    chartsPerRow = 2,
    showBorder = false,
    pageBreakBefore = true,
  } = options;

  const content: Content[] = [];

  // Page break if requested
  if (pageBreakBefore) {
    content.push({ text: '', pageBreak: 'before' });
  }

  // Section header
  content.push({
    text: title.toUpperCase(),
    fontSize: 16,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });

  if (subtitle) {
    content.push({
      text: subtitle,
      fontSize: 9,
      color: PDF_COLORS.textMuted,
      alignment: 'center',
      margin: [0, 0, 0, 10] as Margins,
    });
  }

  // Separator line
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 0.5,
        lineColor: PDF_COLORS.border,
      },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });

  // Charts based on layout
  switch (layout) {
    case 'grid':
      content.push(buildChartGridContent(charts, { chartsPerRow }));
      break;
    case 'single':
      if (charts.length > 0) {
        content.push(buildSingleChartContent(charts[0], { width: 500, showBorder }));
      }
      break;
    case 'stacked':
    default:
      charts.forEach(chart => {
        content.push(buildSingleChartContent(chart, { showBorder }));
      });
      break;
  }

  return content;
};

// ============================================================================
// Preset Chart Configurations
// ============================================================================

/**
 * Common chart configurations for cost reports
 */
export const COST_REPORT_CHARTS: ChartConfig[] = [
  {
    elementId: 'budget-comparison-chart',
    title: 'Top 5 Categories Comparison',
    description: 'Comparison of budget vs actual spending for top categories',
  },
  {
    elementId: 'distribution-chart',
    title: 'Category Distribution',
    description: 'Percentage distribution of spending across categories',
  },
  {
    elementId: 'variance-chart',
    title: 'Variance Analysis',
    description: 'Budget variance by category',
  },
];

/**
 * Common chart configurations for roadmap reports
 */
export const ROADMAP_CHARTS: ChartConfig[] = [
  {
    elementId: 'progress-chart',
    title: 'Project Progress Overview',
    description: 'Overall completion status across all phases',
  },
  {
    elementId: 'timeline-chart',
    title: 'Timeline Gantt Chart',
    description: 'Project timeline with milestones',
  },
  {
    elementId: 'health-chart',
    title: 'Project Health Indicators',
    description: 'Key health metrics and risk indicators',
  },
];

/**
 * Capture and build cost report charts section
 */
export const buildCostReportChartsSection = async (
  options: ChartSectionOptions = {}
): Promise<Content[]> => {
  const charts = await captureCharts(COST_REPORT_CHARTS);
  
  if (charts.length === 0) {
    return [{
      text: 'No charts available',
      fontSize: 10,
      color: PDF_COLORS.textMuted,
      italics: true,
      alignment: 'center',
      margin: [0, 20, 0, 20] as Margins,
    }];
  }

  return buildChartSectionContent(charts, {
    title: 'Visual Summary',
    subtitle: 'Charts & Graphs Overview',
    ...options,
  });
};

/**
 * Capture and build roadmap charts section
 */
export const buildRoadmapChartsSection = async (
  options: ChartSectionOptions = {}
): Promise<Content[]> => {
  const charts = await captureCharts(ROADMAP_CHARTS);
  
  if (charts.length === 0) {
    return [];
  }

  return buildChartSectionContent(charts, {
    title: 'Project Visualization',
    subtitle: 'Progress and Timeline Charts',
    ...options,
  });
};
