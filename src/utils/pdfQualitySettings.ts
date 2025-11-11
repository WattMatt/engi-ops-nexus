/**
 * Standardized high-quality PDF export settings
 * 
 * This utility provides consistent, high-quality settings for all PDF exports
 * to ensure the final PDF matches the UI quality as closely as possible.
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * High-quality html2canvas settings
 * - scale: 2 provides good quality without massive file sizes
 * - useCORS: true for cross-origin images
 * - allowTaint: false for security
 * - backgroundColor: white for consistent backgrounds
 * - imageTimeout: longer timeout for complex charts
 */
export const HIGH_QUALITY_CANVAS_OPTIONS = {
  scale: 2,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  logging: false,
  imageTimeout: 15000,
  removeContainer: true,
  letterRendering: true,
} as const;

/**
 * Standard quality canvas settings (for simpler captures)
 * - scale: 3 provides good quality with faster rendering
 */
export const STANDARD_QUALITY_CANVAS_OPTIONS = {
  scale: 3,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  logging: false,
  imageTimeout: 10000,
  removeContainer: true,
  letterRendering: true,
} as const;

/**
 * Chart-specific canvas settings
 * - Optimized for chart elements with reasonable scale
 */
export const CHART_QUALITY_CANVAS_OPTIONS = {
  scale: 2,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  logging: false,
  imageTimeout: 20000,
  removeContainer: true,
  letterRendering: true,
  windowWidth: 1200,
  windowHeight: 800,
} as const;

/**
 * Capture an element as high-quality canvas
 */
export const captureElementAsCanvas = async (
  element: HTMLElement,
  options: Partial<typeof HIGH_QUALITY_CANVAS_OPTIONS> = {}
): Promise<HTMLCanvasElement> => {
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    ...options,
  });
};

/**
 * Capture a chart element with optimized settings
 */
export const captureChartAsCanvas = async (
  element: HTMLElement,
  options: Partial<typeof CHART_QUALITY_CANVAS_OPTIONS> = {}
): Promise<HTMLCanvasElement> => {
  return await html2canvas(element, {
    ...CHART_QUALITY_CANVAS_OPTIONS,
    ...options,
  });
};

/**
 * Add image to PDF with optimized quality settings
 * Uses JPEG compression by default to reduce file size
 * 
 * @param doc - jsPDF instance
 * @param canvas - HTML canvas element
 * @param x - X position in PDF
 * @param y - Y position in PDF
 * @param width - Width in PDF
 * @param height - Height in PDF
 * @param format - Image format ('PNG' or 'JPEG'), defaults to JPEG for smaller files
 * @param quality - JPEG quality (0-1), defaults to 0.85 for good quality/size balance
 */
export const addHighQualityImage = (
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  format: 'PNG' | 'JPEG' = 'JPEG',
  quality: number = 0.85
) => {
  // Convert canvas to data URL with compression
  const imgData = format === 'JPEG' 
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png');
  
  // Add image to PDF with compression
  doc.addImage(imgData, format, x, y, width, height, undefined, 'FAST');
};

/**
 * Create a new jsPDF instance with optimal settings
 * 
 * @param orientation - Page orientation
 * @param compress - Enable PDF compression (default: true)
 */
export const createHighQualityPDF = (
  orientation: 'portrait' | 'landscape' = 'portrait',
  compress: boolean = true
): jsPDF => {
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress,
    // Use higher precision for better rendering
    precision: 16,
    // Enable better font rendering
    putOnlyUsedFonts: true,
    floatPrecision: 16,
  });
};

/**
 * Wait for element to be fully rendered before capturing
 * Useful for charts and dynamic content
 */
export const waitForElementRender = (ms: number = 2000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Prepare element for high-quality capture
 * - Ensures element is visible and fully rendered
 * - Scrolls element into view if needed
 */
export const prepareElementForCapture = async (element: HTMLElement): Promise<void> => {
  // Ensure element is visible
  element.style.display = 'block';
  element.style.visibility = 'visible';
  
  // Force a reflow
  element.offsetHeight;
  
  // Wait for any animations or async rendering
  await waitForElementRender(1500);
};
