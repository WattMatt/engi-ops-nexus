import { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export type PreCaptureStatus = 'idle' | 'capturing' | 'ready' | 'error';

export interface CapturedChartData {
  elementId: string;
  title: string;
  description: string;
  dataUrl: string;
  width: number;
  height: number;
}

interface UseChartPreCaptureResult {
  status: PreCaptureStatus;
  charts: CapturedChartData[] | null;
  chartCount: number;
  recapture: () => Promise<void>;
  clearCache: () => void;
  isReady: boolean;
  capturedAt: Date | null;
  capturedAgo: string;
  isStale: boolean;
}

const CHART_IDS = [
  { elementId: 'priority-heatmap-chart', title: 'Priority Distribution Heatmap', description: 'Task priority distribution' },
  { elementId: 'project-comparison-chart', title: 'Project Progress Comparison', description: 'Progress across projects' },
  { elementId: 'team-workload-chart', title: 'Team Workload Analysis', description: 'Team member distribution' },
  { elementId: 'portfolio-health-gauge', title: 'Portfolio Health Score', description: 'Overall health indicator' },
];

function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1m ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 7200) return '1h ago';
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function useChartPreCapture(
  captureDelay: number = 2000,
  autoCapture: boolean = true,
  staleThreshold: number = 5 * 60 * 1000
): UseChartPreCaptureResult {
  const [status, setStatus] = useState<PreCaptureStatus>('idle');
  const [charts, setCharts] = useState<CapturedChartData[] | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [capturedAgo, setCapturedAgo] = useState<string>('');
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!capturedAt) { setCapturedAgo(''); return; }
    setCapturedAgo(formatTimeAgo(capturedAt));
    const interval = setInterval(() => setCapturedAgo(formatTimeAgo(capturedAt)), 30000);
    return () => clearInterval(interval);
  }, [capturedAt]);

  const capture = useCallback(async () => {
    if (!isMountedRef.current) return;
    setStatus('capturing');

    try {
      const results: CapturedChartData[] = [];
      for (const config of CHART_IDS) {
        const el = document.getElementById(config.elementId);
        if (!el) continue;
        try {
          const canvas = await html2canvas(el, {
            scale: 1.0,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
          });
          results.push({
            elementId: config.elementId,
            title: config.title,
            description: config.description,
            dataUrl: canvas.toDataURL('image/jpeg', 0.7),
            width: canvas.width,
            height: canvas.height,
          });
        } catch { /* skip failed chart */ }
      }

      if (!isMountedRef.current) return;

      const now = new Date();
      setCapturedAt(now);
      setCapturedAgo(formatTimeAgo(now));
      setCharts(results);
      setStatus('ready');
      console.log(`Pre-captured ${results.length} charts for instant export`);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Chart pre-capture failed:', error);
      setStatus('error');
      setCharts(null);
      setCapturedAt(null);
    }
  }, []);

  const recapture = useCallback(async () => {
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    setCharts(null);
    setCapturedAt(null);
    await capture();
  }, [capture]);

  const clearCache = useCallback(() => {
    setCharts(null);
    setStatus('idle');
    setCapturedAt(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoCapture) {
      captureTimeoutRef.current = setTimeout(() => capture(), captureDelay);
    }
    return () => {
      isMountedRef.current = false;
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    };
  }, [autoCapture, captureDelay, capture]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'ready') {
        captureTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) capture();
        }, 500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, capture]);

  const isStale = capturedAt ? (Date.now() - capturedAt.getTime()) > staleThreshold : false;

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
