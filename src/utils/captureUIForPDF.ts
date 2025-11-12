/**
 * Utility for capturing UI elements as high-quality images for PDF export
 * This provides a much better visual match than manually recreating UI with jsPDF primitives
 */

import html2canvas from "html2canvas";
import { HIGH_QUALITY_CANVAS_OPTIONS, CHART_QUALITY_CANVAS_OPTIONS } from "./pdfQualitySettings";

export interface CaptureOptions {
  scale?: number;
  backgroundColor?: string;
  timeout?: number;
}

/**
 * Wait for an element to be fully rendered
 */
const waitForElement = async (selector: string, timeout = 5000): Promise<HTMLElement> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.getElementById(selector);
    if (element) {
      // Additional wait to ensure full rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Element with id "${selector}" not found within ${timeout}ms`);
};

/**
 * Capture KPI summary cards as a single high-quality image
 */
export const captureKPICards = async (
  elementId: string = "cost-report-kpi-cards",
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(elementId);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture a single category summary card
 */
export const captureCategorySummaryCard = async (
  categoryId: string,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(`category-card-${categoryId}`);
  
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture all category summary cards
 */
export const captureAllCategoryCards = async (
  categoryIds: string[],
  options: CaptureOptions = {}
): Promise<Map<string, HTMLCanvasElement>> => {
  const captures = new Map<string, HTMLCanvasElement>();
  
  for (const categoryId of categoryIds) {
    try {
      const canvas = await captureCategorySummaryCard(categoryId, options);
      captures.set(categoryId, canvas);
    } catch (error) {
      console.error(`Failed to capture category card ${categoryId}:`, error);
    }
  }
  
  return captures;
};

/**
 * Capture charts section
 */
export const captureCharts = async (
  elementId: string = "cost-report-charts",
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(elementId);
  
  return await html2canvas(element, {
    ...CHART_QUALITY_CANVAS_OPTIONS,
    scale: options.scale || 2,
    backgroundColor: options.backgroundColor || '#ffffff',
  });
};

/**
 * Capture a specific chart by ID
 */
export const captureChart = async (
  chartId: string,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(chartId);
  
  return await html2canvas(element, {
    ...CHART_QUALITY_CANVAS_OPTIONS,
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
