/**
 * Shared hook for SVG-to-PDF report generation, persistence, and preview.
 * Encapsulates: build SVG pages → convert to PDF → upload to storage → save DB record → preview.
 */
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { svgPagesToPdfBlob } from '@/utils/svg-pdf/svgToPdfEngine';
import { imageToBase64 } from '@/utils/svg-pdf/imageUtils';
import { useToast } from '@/hooks/use-toast';
import type { StandardCoverPageData } from '@/utils/svg-pdf/sharedSvgHelpers';

const LOGO_TIMEOUT = 4000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export interface ReportPersistConfig {
  storageBucket: string;
  dbTable: string;
  foreignKeyColumn: string;
  foreignKeyValue: string;
  projectId?: string;
  revision?: string;
  reportName: string;
}

export interface SvgReportResult {
  blob: Blob;
  timeMs: number;
  sizeBytes: number;
  dbRecord: any | null;
}

export type ReportProgress = 
  | 'building' 
  | 'converting' 
  | 'uploading' 
  | 'saving' 
  | 'complete' 
  | 'error';

export interface ProgressCallback {
  (stage: ReportProgress, detail?: string): void;
}

export function useSvgPdfReport() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ReportProgress | null>(null);
  const [benchmarks, setBenchmarks] = useState<{ timeMs: number; sizeBytes: number } | null>(null);
  const [svgPages, setSvgPages] = useState<SVGSVGElement[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const previewRef = useRef<HTMLDivElement>(null);

  /**
   * Fetch company settings and convert logos to base64 for cover page use.
   */
  const fetchCompanyData = useCallback(async (): Promise<Partial<StandardCoverPageData>> => {
    const { data: company } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!company) return {};

    let companyLogoBase64: string | null = null;
    if (company.company_logo_url) {
      try {
        companyLogoBase64 = await Promise.race([
          imageToBase64(company.company_logo_url),
          new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), LOGO_TIMEOUT)),
        ]);
      } catch { /* skip */ }
    }

    return {
      companyName: company.company_name || undefined,
      companyAddress: company.client_address_line1 || undefined,
      companyPhone: company.client_phone || undefined,
      companyLogoBase64,
      contactOrganization: company.client_name || undefined,
      contactPhone: company.client_phone || undefined,
    };
  }, []);

  /**
   * Generate next revision number (R01, R02, ...) for a report table.
   */
  const getNextRevision = useCallback(async (config: ReportPersistConfig): Promise<string> => {
    const result: any = await supabase
      .from(config.dbTable as any)
      .select('revision')
      .eq(config.foreignKeyColumn, config.foreignKeyValue)
      .order('created_at', { ascending: false })
      .limit(1);
    const data = result.data;

    if (!data || data.length === 0) return 'R01';
    const lastRev = (data[0] as any).revision || 'R00';
    const num = parseInt(lastRev.replace('R', ''), 10) || 0;
    return `R${String(num + 1).padStart(2, '0')}`;
  }, []);

  /**
   * Retry wrapper with exponential backoff.
   */
  const withRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    label: string,
    retries: number = MAX_RETRIES,
  ): Promise<T> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        if (attempt === retries) throw err;
        console.warn(`[SvgPdf] ${label} attempt ${attempt + 1} failed, retrying...`, err.message);
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      }
    }
    throw new Error(`${label} failed after ${retries + 1} attempts`);
  }, []);

  /**
   * Core pipeline: build pages → PDF blob → upload → DB record.
   */
  const generateAndPersist = useCallback(async (
    buildFn: () => SVGSVGElement[] | Promise<SVGSVGElement[]>,
    config: ReportPersistConfig,
    onSuccess?: () => void,
    onProgress?: ProgressCallback,
  ): Promise<SvgReportResult | null> => {
    setIsGenerating(true);
    setBenchmarks(null);
    const report = (stage: ReportProgress, detail?: string) => {
      setProgress(stage);
      onProgress?.(stage, detail);
    };

    try {
      // Stage 1: Build SVG pages
      report('building', 'Constructing report pages...');
      const pages = await buildFn();
      setSvgPages(pages);
      setShowPreview(true);
      setCurrentPage(0);

      // Stage 2: Convert to PDF
      report('converting', `Converting ${pages.length} pages to PDF...`);
      const { blob, timeMs } = await svgPagesToPdfBlob(pages);
      const sizeBytes = blob.size;
      setBenchmarks({ timeMs, sizeBytes });

      // Get user + revision
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const revision = config.revision || await getNextRevision(config);

      // Stage 3: Upload with retry
      report('uploading', 'Uploading PDF to storage...');
      const fileName = `${config.reportName.replace(/[^a-zA-Z0-9._-]/g, '_')}_${revision}_${Date.now()}.pdf`;
      const storagePath = `${config.foreignKeyValue}/${fileName}`;

      let uploadSuccess = false;
      try {
        await withRetry(async () => {
          const { error } = await supabase.storage
            .from(config.storageBucket)
            .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });
          if (error) throw error;
        }, 'Upload');
        uploadSuccess = true;
      } catch (uploadError: any) {
        console.error('[SvgPdf] Upload failed after retries:', uploadError);
        triggerDownload(blob, fileName);
        toast({ title: 'PDF Generated', description: `Downloaded directly (${(sizeBytes / 1024).toFixed(1)} KB)` });
        report('complete', 'Downloaded directly (upload failed)');
        return { blob, timeMs, sizeBytes, dbRecord: null };
      }

      // Stage 4: Save DB record with retry
      report('saving', 'Saving report record...');
      const insertData: Record<string, any> = {
        [config.foreignKeyColumn]: config.foreignKeyValue,
        report_name: `${config.reportName} ${revision}`,
        revision,
        file_path: storagePath,
        file_size: sizeBytes,
        generated_by: userId || null,
        notes: 'Generated via SVG engine',
        engine_version: 'svg-engine',
      };
      if (config.projectId) {
        insertData.project_id = config.projectId;
      }

      let record: any = null;
      try {
        record = await withRetry(async () => {
          const { data, error } = await supabase
            .from(config.dbTable as any)
            .insert(insertData as any)
            .select()
            .single();
          if (error) throw error;
          return data;
        }, 'DB insert');
      } catch (dbError: any) {
        console.error('[SvgPdf] DB insert failed after retries:', dbError);
        triggerDownload(blob, fileName);
        toast({ title: 'PDF Generated', description: 'Downloaded directly (history save failed)' });
        report('complete', 'Downloaded (DB save failed)');
        return { blob, timeMs, sizeBytes, dbRecord: null };
      }

      onSuccess?.();
      report('complete', `${revision} — ${timeMs}ms, ${(sizeBytes / 1024).toFixed(1)} KB`);
      toast({
        title: 'PDF Generated & Saved',
        description: `${revision} generated in ${timeMs}ms (${(sizeBytes / 1024).toFixed(1)} KB)`,
      });

      return { blob, timeMs, sizeBytes, dbRecord: record };
    } catch (error: any) {
      console.error('[SvgPdf] Generation failed:', error);
      report('error', error.message);
      toast({ title: 'PDF Generation Failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast, getNextRevision, withRetry]);

  return {
    isGenerating,
    progress,
    benchmarks,
    svgPages,
    showPreview,
    setShowPreview,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    previewRef,
    fetchCompanyData,
    generateAndPersist,
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
