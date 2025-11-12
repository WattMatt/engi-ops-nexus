import html2canvas from "html2canvas";
import { HIGH_QUALITY_CANVAS_OPTIONS } from "./pdfQualitySettings";

export interface CaptureOptions {
  scale?: number;
  backgroundColor?: string;
  timeout?: number;
}

/**
 * Wait for an element to be present and visible in the DOM
 */
const waitForElement = async (selector: string, timeout: number = 10000): Promise<HTMLElement> => {
  const startTime = Date.now();
  const checkInterval = 100;
  
  while (Date.now() - startTime < timeout) {
    const element = document.getElementById(selector);
    if (element && element.offsetParent !== null) {
      // Element exists and is visible
      await new Promise(resolve => setTimeout(resolve, 500)); // Additional wait for rendering
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error(`Element with id "${selector}" not found or not visible within ${timeout}ms. Please make sure you're on the Overview tab before exporting the PDF.`);
};

/**
 * Capture KPI summary cards as a single high-quality image
 */
export const captureKPICards = async (
  elementId: string = "cost-report-kpi-cards",
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(elementId, options.timeout);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture a category summary card
 */
export const captureCategorySummaryCard = async (
  categoryId: string,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(`category-summary-${categoryId}`, options.timeout);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture multiple category cards and return them in a Map
 */
export const captureAllCategoryCards = async (
  categoryIds: string[],
  options: CaptureOptions = {}
): Promise<Map<string, HTMLCanvasElement>> => {
  const canvasMap = new Map<string, HTMLCanvasElement>();
  
  for (const categoryId of categoryIds) {
    try {
      const canvas = await captureCategorySummaryCard(categoryId, options);
      canvasMap.set(categoryId, canvas);
    } catch (error) {
      console.warn(`Failed to capture category ${categoryId}:`, error);
    }
  }
  
  return canvasMap;
};

/**
 * Capture a charts section
 */
export const captureCharts = async (
  elementId: string = "cost-report-charts",
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(elementId, options.timeout);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture a specific chart
 */
export const captureChart = async (
  chartId: string,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(chartId, options.timeout);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Prepare an element for capture by ensuring it's visible and rendered
 */
export const prepareElementForCapture = async (elementId: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Ensure visibility
  element.style.display = 'block';
  element.style.visibility = 'visible';
  
  // Force reflow
  element.offsetHeight;
  
  // Wait for rendering
  await new Promise(resolve => setTimeout(resolve, 300));
};

/**
 * Convert canvas to data URL with compression
 */
export const canvasToDataURL = (
  canvas: HTMLCanvasElement,
  format: 'PNG' | 'JPEG' = 'JPEG',
  quality: number = 0.85
): string => {
  if (format === 'JPEG') {
    return canvas.toDataURL('image/jpeg', quality);
  }
  return canvas.toDataURL('image/png');
};
