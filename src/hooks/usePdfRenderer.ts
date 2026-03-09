/**
 * Hook to render PDF pages via pdfjs-dist at dynamic resolution.
 * Re-renders at higher DPI when zoom increases, producing crisp output.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface UsePdfRendererOptions {
  url: string | null;
  pageNumber?: number;
  zoom: number;
  containerWidth: number;
  containerHeight: number;
}

interface PdfRenderState {
  canvas: HTMLCanvasElement | null;
  pageSize: { width: number; height: number } | null;
  numPages: number;
  isLoading: boolean;
  error: string | null;
  isPdf: boolean;
}

export function usePdfRenderer({ url, pageNumber = 1, zoom, containerWidth, containerHeight }: UsePdfRendererOptions): PdfRenderState {
  const [state, setState] = useState<PdfRenderState>({
    canvas: null,
    pageSize: null,
    numPages: 0,
    isLoading: false,
    error: null,
    isPdf: false,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);
  const lastRenderRef = useRef<string>('');

  const isPdfUrl = useCallback((u: string) => {
    const lower = u.toLowerCase();
    return lower.endsWith('.pdf') || lower.includes('application/pdf') || lower.includes('/pdf');
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!url) {
      setState(prev => ({ ...prev, isPdf: false, canvas: null, pageSize: null, numPages: 0 }));
      return;
    }

    if (!isPdfUrl(url)) {
      setState(prev => ({ ...prev, isPdf: false, canvas: null, pageSize: null, numPages: 0 }));
      return;
    }

    setState(prev => ({ ...prev, isPdf: true, isLoading: true, error: null }));

    let cancelled = false;
    const loadPdf = async () => {
      try {
        // Clean up previous
        if (pdfDocRef.current) {
          await pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setState(prev => ({ ...prev, numPages: doc.numPages, isLoading: false }));
      } catch (err: any) {
        if (!cancelled) {
          setState(prev => ({ ...prev, isLoading: false, error: err?.message || 'Failed to load PDF' }));
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url, isPdfUrl]);

  // Render page at current zoom / size
  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || !state.isPdf || containerWidth <= 0 || containerHeight <= 0) return;

    // Compute a render key to avoid redundant renders
    const renderKey = `${pageNumber}-${Math.round(zoom * 100)}-${containerWidth}-${containerHeight}`;
    if (renderKey === lastRenderRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        // Cancel any in-flight render
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch {}
          renderTaskRef.current = null;
        }

        const page = await doc.getPage(Math.min(pageNumber, doc.numPages));
        if (cancelled) return;

        const originalViewport = page.getViewport({ scale: 1 });

        // Fit page to container at zoom=1, then apply zoom for DPI
        const scaleX = containerWidth / originalViewport.width;
        const scaleY = containerHeight / originalViewport.height;
        const baseScale = Math.min(scaleX, scaleY);

        // Render at higher DPI for crisp zoom. Cap at 4x device pixel ratio.
        const devicePixelRatio = window.devicePixelRatio || 1;
        const renderScale = baseScale * Math.min(zoom, 4) * devicePixelRatio;
        const viewport = page.getViewport({ scale: renderScale });

        // Create or reuse canvas
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // CSS size is the base fit (without devicePixelRatio multiplication)
        const cssScale = baseScale * Math.min(zoom, 4);
        const cssViewport = page.getViewport({ scale: cssScale });
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // @ts-ignore - pdfjs-dist types mismatch between versions
        const renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          lastRenderRef.current = renderKey;
          setState(prev => ({
            ...prev,
            canvas,
            pageSize: {
              width: cssViewport.width,
              height: cssViewport.height,
            },
            isLoading: false,
          }));
        }
      } catch (err: any) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err);
        }
      }
    };

    // Debounce re-renders when zooming rapidly
    const timer = setTimeout(renderPage, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.isPdf, pageNumber, zoom, containerWidth, containerHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  return state;
}
