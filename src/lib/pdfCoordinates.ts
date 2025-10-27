/**
 * PDF Coordinate System Utilities
 * 
 * This module handles coordinate transformations between:
 * - Canvas coordinates (where user clicks, affected by zoom/pan)
 * - PDF coordinates (actual position on the original PDF image)
 * 
 * All positions stored in database should use PDF coordinates for consistency.
 */

export interface PDFDimensions {
  width: number;
  height: number;
  canvasScale: number; // Scale factor applied to fit PDF on canvas
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface PDFPoint {
  x: number;
  y: number;
}

/**
 * Convert canvas coordinates to PDF coordinates
 * Canvas coords are affected by:
 * - Initial scale to fit canvas
 * - Current zoom level
 * - Current pan offset
 */
export function canvasToPDF(
  canvasPoint: CanvasPoint,
  pdfDimensions: PDFDimensions,
  fabricCanvas: any
): PDFPoint {
  // Get the current viewport transform
  const vpt = fabricCanvas.viewportTransform;
  const zoom = fabricCanvas.getZoom();
  
  // Account for viewport transform (pan and zoom)
  const canvasX = (canvasPoint.x - vpt[4]) / zoom;
  const canvasY = (canvasPoint.y - vpt[5]) / zoom;
  
  // Convert from canvas space to PDF space
  // Remove the initial scaling that was applied to fit PDF on canvas
  const pdfX = canvasX / pdfDimensions.canvasScale;
  const pdfY = canvasY / pdfDimensions.canvasScale;
  
  return { x: pdfX, y: pdfY };
}

/**
 * Convert PDF coordinates to canvas coordinates
 */
export function pdfToCanvas(
  pdfPoint: PDFPoint,
  pdfDimensions: PDFDimensions
): CanvasPoint {
  // Apply the initial canvas scale
  const canvasX = pdfPoint.x * pdfDimensions.canvasScale;
  const canvasY = pdfPoint.y * pdfDimensions.canvasScale;
  
  return { x: canvasX, y: canvasY };
}

/**
 * Calculate distance in meters between two PDF points
 */
export function calculatePDFDistance(
  point1: PDFPoint,
  point2: PDFPoint,
  metersPerPDFUnit: number
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const pdfDistance = Math.sqrt(dx * dx + dy * dy);
  return pdfDistance * metersPerPDFUnit;
}

/**
 * Calculate meters per PDF unit from scale calibration
 */
export function calculateMetersPerPDFUnit(
  pdfPoint1: PDFPoint,
  pdfPoint2: PDFPoint,
  realWorldMeters: number
): number {
  const dx = pdfPoint2.x - pdfPoint1.x;
  const dy = pdfPoint2.y - pdfPoint1.y;
  const pdfDistance = Math.sqrt(dx * dx + dy * dy);
  return realWorldMeters / pdfDistance;
}
