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
  /** Timestamp when charts were last captured */
  capturedAt: Date | null;
  /** How long ago charts were captured (formatted string) */
  capturedAgo: string;
  /** Whether the cached charts are considered stale (>5 mins old) */
  isStale: boolean;
}

/**
 * Format elapsed time as a human-readable string
 */
function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1m ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 7200) return '1h ago';
  return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * Hook to pre-capture charts in the background for instant PDF export
 * Captures charts after a delay to ensure they're fully rendered
 */
export function useChartPreCapture(
  /** Delay before starting capture (ms) - allows charts to render */
  captureDelay: number = 2000,
  /** Whether to auto-capture on mount */
  autoCapture: boolean = true,
  /** Time in ms after which charts are considered stale (default 5 mins) */
  staleThreshold: number = 5 * 60 * 1000
): UseChartPreCaptureResult {
  const [status, setStatus] = useState<PreCaptureStatus>('idle');
  const [charts, setCharts] = useState<CapturedChartData[] | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [capturedAgo, setCapturedAgo] = useState<string>('');
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Update "X ago" string periodically
  useEffect(() => {
    if (!capturedAt) {
      setCapturedAgo('');
      return;
    }

    // Update immediately
    setCapturedAgo(formatTimeAgo(capturedAt));

    // Then update every 30 seconds
    const interval = setInterval(() => {
      setCapturedAgo(formatTimeAgo(capturedAt));
    }, 30000);

    return () => clearInterval(interval);
  }, [capturedAt]);

  const capture = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setStatus('capturing');
    
    try {
      const capturedCharts = await captureRoadmapReviewCharts();
      
      if (!isMountedRef.current) return;
      
      const now = new Date();
      setCapturedAt(now);
      setCapturedAgo(formatTimeAgo(now));
      
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
      setCapturedAt(null);
    }
  }, []);

  const recapture = useCallback(async () => {
    // Clear any pending capture
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
    }
    
    setCharts(null);
    setCapturedAt(null);
    await capture();
  }, [capture]);

  const clearCache = useCallback(() => {
    setCharts(null);
    setStatus('idle');
    setCapturedAt(null);
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

  // Auto-recapture when tab becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'ready') {
        // Small delay to ensure DOM is fully rendered after tab switch
        captureTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            console.log('Tab visible again - recapturing charts');
            capture();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, capture]);

  // Calculate if charts are stale
  const isStale = capturedAt 
    ? (Date.now() - capturedAt.getTime()) > staleThreshold 
    : false;

  return {
    status,
    charts,
    chartCount: charts?.length ?? 0,
    recapture,
    clearCache,
    isReady: status === 'ready' && charts !== null,
    capturedAt,
    capturedAgo,
    isStale,
  };
}
