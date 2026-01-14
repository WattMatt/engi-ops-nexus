import { useState, useEffect, useCallback, useRef } from 'react';
import { captureRoadmapReviewCharts } from '@/utils/roadmapReviewPdfMake';
import type { CapturedChartData } from '@/utils/pdfmake/chartUtils';

export type PreCaptureStatus = 'idle' | 'capturing' | 'ready' | 'error';

interface UseChartPreCaptureResult {
  /** Current status of the pre-capture process */
  status: PreCaptureStatus;
  /** Pre-captured chart images (null if not ready) */
  charts: CapturedChartData[] | null;
  /** Number of charts successfully captured */
  chartCount: number;
  /** Manually trigger a re-capture */
  recapture: () => Promise<void>;
  /** Clear cached charts */
  clearCache: () => void;
  /** Whether charts are ready for instant export */
  isReady: boolean;
}

/**
 * Hook to pre-capture charts in the background for instant PDF export
 * Captures charts after a delay to ensure they're fully rendered
 */
export function useChartPreCapture(
  /** Delay before starting capture (ms) - allows charts to render */
  captureDelay: number = 2000,
  /** Whether to auto-capture on mount */
  autoCapture: boolean = true
): UseChartPreCaptureResult {
  const [status, setStatus] = useState<PreCaptureStatus>('idle');
  const [charts, setCharts] = useState<CapturedChartData[] | null>(null);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const capture = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setStatus('capturing');
    
    try {
      const capturedCharts = await captureRoadmapReviewCharts();
      
      if (!isMountedRef.current) return;
      
      if (capturedCharts.length > 0) {
        setCharts(capturedCharts);
        setStatus('ready');
        console.log(`Pre-captured ${capturedCharts.length} charts for instant export`);
      } else {
        // No charts found - this is okay, just mark as ready with no charts
        setCharts([]);
        setStatus('ready');
        console.log('No charts found to pre-capture');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Chart pre-capture failed:', error);
      setStatus('error');
      setCharts(null);
    }
  }, []);

  const recapture = useCallback(async () => {
    // Clear any pending capture
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    
    setCharts(null);
    await capture();
  }, [capture]);

  const clearCache = useCallback(() => {
    setCharts(null);
    setStatus('idle');
  }, []);

  // Auto-capture on mount with delay
  useEffect(() => {
    isMountedRef.current = true;
    
    if (autoCapture) {
      captureTimeoutRef.current = setTimeout(() => {
        capture();
      }, captureDelay);
    }
    
    return () => {
      isMountedRef.current = false;
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [autoCapture, captureDelay, capture]);

  return {
    status,
    charts,
    chartCount: charts?.length ?? 0,
    recapture,
    clearCache,
    isReady: status === 'ready' && charts !== null,
  };
}
