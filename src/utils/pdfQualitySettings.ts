/**
 * PDF Quality Settings and Element Capture Utilities
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIGRATING TO PDFMAKE - jsPDF compatibility maintained for legacy code
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file provides:
 * - Quality presets for image capture
 * - Canvas capture utilities for charts and UI elements
 * - Base64 conversion for pdfmake image embedding
 * - Legacy jsPDF functions for backward compatibility
 * 
 * @see src/utils/pdfmake/imageUtils.ts for advanced image utilities
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QUALITY_PRESETS as PDFMAKE_QUALITY_PRESETS } from './pdfConstants';

export type QualityPreset = 'draft' | 'standard' | 'high';

export interface QualitySettings {
  scale: number;
  compression: number;
  format: 'PNG' | 'JPEG';
  fontSize: {
    table: number;
    body: number;
    heading: number;
  };
}

/**
 * Quality preset configurations
 */
export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  draft: {
    scale: 1.5,
    compression: 0.75,
    format: 'JPEG',
    fontSize: { table: 8, body: 10, heading: 14 }
  },
  standard: {
    scale: 2,
    compression: 0.85,
    format: 'JPEG',
    fontSize: { table: 9, body: 11, heading: 16 }
  },
  high: {
    scale: 3,
    compression: 0.95,
    format: 'JPEG',
    fontSize: { table: 10, body: 12, heading: 18 }
  }
};

/**
 * Get quality settings for current preset (default: standard)
 */
export const getQualitySettings = (preset: QualityPreset = 'standard'): QualitySettings => {
  return QUALITY_PRESETS[preset];
};

/**
 * Get pdfmake quality preset settings
 */
export const getPdfmakeQualitySettings = (preset: QualityPreset = 'standard') => {
  return PDFMAKE_QUALITY_PRESETS[preset];
};

/**
 * High-quality html2canvas settings
 * Still useful for capturing charts and UI elements as images
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
 * Optimized for chart elements with reasonable scale
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
 * Useful for embedding charts/UI elements as images in pdfmake documents
 */
export const captureElementAsCanvas = async (
  element: HTMLElement,
  options: { scale?: number; useCORS?: boolean; backgroundColor?: string } = {}
): Promise<HTMLCanvasElement> => {
  return await html2canvas(element, {
    ...HIGH_QUALITY_CANVAS_OPTIONS,
    ...options,
  } as Parameters<typeof html2canvas>[1]);
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
 * Convert a canvas to a base64 data URL for use in pdfmake
 * @param canvas - The canvas element to convert
 * @param format - Image format ('PNG' or 'JPEG')
 * @param quality - JPEG quality (0-1), defaults to 0.85
 */
export const canvasToDataUrl = (
  canvas: HTMLCanvasElement,
  format: 'PNG' | 'JPEG' = 'JPEG',
  quality: number = 0.85
): string => {
  return format === 'JPEG' 
    ? canvas.toDataURL('image/jpeg', quality)
    : canvas.toDataURL('image/png');
};

/**
 * Capture an element and convert to base64 for pdfmake
 * This is the preferred way to add captured UI elements to pdfmake documents
 */
export const captureElementAsBase64 = async (
  element: HTMLElement,
  options: {
    scale?: number;
    format?: 'PNG' | 'JPEG';
    quality?: number;
  } = {}
): Promise<string> => {
  const { scale = 2, format = 'JPEG', quality = 0.85 } = options;
  
  const canvas = await captureElementAsCanvas(element, { scale });
  return canvasToDataUrl(canvas, format, quality);
};

/**
 * Capture a chart element and convert to base64 for pdfmake
 */
export const captureChartAsBase64 = async (
  element: HTMLElement,
  options: {
    format?: 'PNG' | 'JPEG';
    quality?: number;
  } = {}
): Promise<string> => {
  const { format = 'JPEG', quality = 0.85 } = options;
  
  const canvas = await captureChartAsCanvas(element);
  return canvasToDataUrl(canvas, format, quality);
};

// ============ LEGACY JSPDF COMPATIBILITY ============
// These functions are kept for backward compatibility during migration

/**
 * @deprecated Use canvasToDataUrl() + pdfmake image() instead
 * Add image to PDF with optimized quality settings
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
  const imgData = canvasToDataUrl(canvas, format, quality);
  doc.addImage(imgData, format, x, y, width, height, undefined, 'FAST');
};

/**
 * @deprecated Use createDocument() from @/utils/pdfmake instead
 * Create a new jsPDF instance with optimal settings
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
    precision: 16,
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
 * Ensures element is visible and fully rendered
 */
export const prepareElementForCapture = async (element: HTMLElement): Promise<void> => {
  element.style.display = 'block';
  element.style.visibility = 'visible';
  
  // Force a reflow
  element.offsetHeight;
  
  // Wait for any animations or async rendering
  await waitForElementRender(1500);
};
