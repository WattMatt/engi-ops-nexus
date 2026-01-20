import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';

export interface PdfRenderResult {
  success: boolean;
  width: number;
  height: number;
  renderScale: number;
  naturalWidth: number;
  naturalHeight: number;
  error?: string;
}

export interface PdfRenderCallbacks {
  onStart?: () => void;
  onProgress?: (message: string) => void;
  onComplete?: (result: PdfRenderResult) => void;
  onError?: (error: string) => void;
}

// Browser canvas limits vary, but these are safe maximums
const MAX_CANVAS_DIMENSION = 32767; // Absolute browser limit
const TARGET_MAX_DIMENSION = 8000; // Target for good performance
const MIN_RENDER_SCALE = 0.25; // Don't go below this for readability

/**
 * Calculate the optimal render scale for a PDF based on its natural size
 * and browser canvas limitations
 */
export function calculateOptimalRenderScale(
  naturalWidth: number,
  naturalHeight: number
): { scale: number; reason: string } {
  const maxNatural = Math.max(naturalWidth, naturalHeight);
  
  // Start with 2x for crisp rendering
  let scale = 2.0;
  let reason = 'Standard 2x scale for crisp rendering';
  
  // Check if 2x would exceed browser limits
  if (maxNatural * 2 > MAX_CANVAS_DIMENSION) {
    scale = MAX_CANVAS_DIMENSION / maxNatural * 0.9; // 90% of max for safety
    reason = `Reduced to ${scale.toFixed(2)}x to stay within browser canvas limits`;
  }
  // Check if it would be too large for good performance
  else if (maxNatural * 2 > TARGET_MAX_DIMENSION) {
    if (maxNatural > TARGET_MAX_DIMENSION) {
      // Natural size already exceeds target, use reduced scale
      scale = TARGET_MAX_DIMENSION / maxNatural;
      reason = `Reduced to ${scale.toFixed(2)}x for large PDF (${naturalWidth.toFixed(0)}x${naturalHeight.toFixed(0)})`;
    } else {
      // Natural size is OK, use 1x
      scale = 1.0;
      reason = 'Using 1x scale for medium-large PDF';
    }
  }
  
  // Ensure we don't go below minimum
  if (scale < MIN_RENDER_SCALE) {
    scale = MIN_RENDER_SCALE;
    reason = `Using minimum ${MIN_RENDER_SCALE}x scale - PDF is extremely large`;
  }
  
  return { scale, reason };
}

/**
 * Render a PDF page to a canvas with automatic scale optimization
 */
export async function renderPdfToCanvas(
  pdfDoc: PDFDocumentProxy,
  pdfCanvas: HTMLCanvasElement,
  drawingCanvas: HTMLCanvasElement | null,
  callbacks?: PdfRenderCallbacks
): Promise<PdfRenderResult> {
  callbacks?.onStart?.();
  callbacks?.onProgress?.('Loading PDF page...');
  
  try {
    const page = await pdfDoc.getPage(1);
    const naturalViewport = page.getViewport({ scale: 1 });
    const naturalWidth = naturalViewport.width;
    const naturalHeight = naturalViewport.height;
    
    callbacks?.onProgress?.(`PDF size: ${naturalWidth.toFixed(0)} × ${naturalHeight.toFixed(0)} pixels`);
    
    // Calculate optimal render scale
    const { scale: renderScale, reason } = calculateOptimalRenderScale(naturalWidth, naturalHeight);
    console.log('[pdfRenderer]', reason);
    callbacks?.onProgress?.(reason);
    
    const viewport: PageViewport = page.getViewport({ scale: renderScale });
    
    // Set canvas dimensions
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    
    if (drawingCanvas) {
      drawingCanvas.width = viewport.width;
      drawingCanvas.height = viewport.height;
    }
    
    callbacks?.onProgress?.(`Rendering at ${viewport.width.toFixed(0)} × ${viewport.height.toFixed(0)}...`);
    
    const context = pdfCanvas.getContext('2d');
    if (!context) {
      const error = 'Could not get canvas 2D context';
      callbacks?.onError?.(error);
      return {
        success: false,
        width: 0,
        height: 0,
        renderScale,
        naturalWidth,
        naturalHeight,
        error
      };
    }
    
    // Render the PDF page
    // @ts-ignore - pdfjs-dist types mismatch
    await page.render({ canvasContext: context, viewport }).promise;
    
    const result: PdfRenderResult = {
      success: true,
      width: viewport.width,
      height: viewport.height,
      renderScale,
      naturalWidth,
      naturalHeight
    };
    
    callbacks?.onProgress?.('PDF rendered successfully');
    callbacks?.onComplete?.(result);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error rendering PDF';
    console.error('[pdfRenderer] Error:', errorMessage);
    callbacks?.onError?.(errorMessage);
    
    return {
      success: false,
      width: 0,
      height: 0,
      renderScale: 1,
      naturalWidth: 0,
      naturalHeight: 0,
      error: errorMessage
    };
  }
}

/**
 * Calculate the initial view state to fit and center the PDF in the container
 */
export function calculateInitialView(
  canvasWidth: number,
  canvasHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 0.95
): { zoom: number; offsetX: number; offsetY: number } {
  const zoom = Math.min(
    containerWidth / canvasWidth,
    containerHeight / canvasHeight
  ) * padding;
  
  const offsetX = (containerWidth - canvasWidth * zoom) / 2;
  const offsetY = (containerHeight - canvasHeight * zoom) / 2;
  
  return { zoom, offsetX, offsetY };
}
