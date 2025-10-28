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
  
  // Step 1: Remove viewport transform (pan and zoom)
  const unzoomedX = (canvasPoint.x - vpt[4]) / zoom;
  const unzoomedY = (canvasPoint.y - vpt[5]) / zoom;
  
  // Step 2: Remove PDF offset (positioned at 20, 20)
  const relativeX = unzoomedX - 20;
  const relativeY = unzoomedY - 20;
  
  // Step 3: Convert to PDF space
  const pdfX = relativeX / pdfDimensions.canvasScale;
  const pdfY = relativeY / pdfDimensions.canvasScale;
  
  return { x: pdfX, y: pdfY };
}

/**
 * Convert PDF coordinates to canvas coordinates
 */
export function pdfToCanvas(
  pdfPoint: PDFPoint,
  pdfDimensions: PDFDimensions
): CanvasPoint {
  // Step 1: Apply canvas scale
  const scaledX = pdfPoint.x * pdfDimensions.canvasScale;
  const scaledY = pdfPoint.y * pdfDimensions.canvasScale;
  
  // Step 2: Add PDF offset (positioned at 20, 20)
  const canvasX = scaledX + 20;
  const canvasY = scaledY + 20;
  
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
