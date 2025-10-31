import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';

// Set PDF.js worker source
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.296/build/pdf.worker.mjs`;
}

export interface PdfCanvasRenderOptions {
  pdfCanvas: HTMLCanvasElement;
  drawingCanvas?: HTMLCanvasElement;
  scale?: number;
}

/**
 * Load a PDF from a file
 */
export const loadPdfFromFile = async (file: File): Promise<PDFDocumentProxy> => {
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file');
  }

  if (file.size === 0) {
    throw new Error('The selected PDF file is empty');
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument(arrayBuffer);
  return await loadingTask.promise;
};

/**
 * Render a PDF page to a canvas
 */
export const renderPdfToCanvas = async (
  pdfDoc: PDFDocumentProxy,
  options: PdfCanvasRenderOptions
): Promise<{ width: number; height: number; viewport: PageViewport }> => {
  const { pdfCanvas, drawingCanvas, scale = 2.0 } = options;
  
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale });
  
  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;
  
  if (drawingCanvas) {
    drawingCanvas.width = viewport.width;
    drawingCanvas.height = viewport.height;
  }
  
  const context = pdfCanvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  } as any).promise;
  
  return {
    width: viewport.width,
    height: viewport.height,
    viewport
  };
};
