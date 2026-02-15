/**
 * Shared hook for SVG-to-PDF report generation, persistence, and preview.
 * Encapsulates: build SVG pages → convert to PDF → upload to storage → save DB record → preview.
 */
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { svgPagesToPdfBlob } from '@/utils/svg-pdf/svgToPdfEngine';
import { imageToBase64 } from '@/utils/pdfmake/helpers';
import { useToast } from '@/hooks/use-toast';
import type { StandardCoverPageData } from '@/utils/svg-pdf/sharedSvgHelpers';

const LOGO_TIMEOUT = 4000;

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

export function useSvgPdfReport() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
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
   * Core pipeline: build pages → PDF blob → upload → DB record.
   */
  const generateAndPersist = useCallback(async (
    buildFn: () => SVGSVGElement[] | Promise<SVGSVGElement[]>,
    config: ReportPersistConfig,
    onSuccess?: () => void,
  ): Promise<SvgReportResult | null> => {
    setIsGenerating(true);
    setBenchmarks(null);

    try {
      const pages = await buildFn();
      setSvgPages(pages);
      setShowPreview(true);
      setCurrentPage(0);

      const { blob, timeMs } = await svgPagesToPdfBlob(pages);
      const sizeBytes = blob.size;
      setBenchmarks({ timeMs, sizeBytes });

      // Get user + revision
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const revision = config.revision || await getNextRevision(config);

      // Upload
      const fileName = `${config.reportName.replace(/[^a-zA-Z0-9._-]/g, '_')}_${revision}_${Date.now()}.pdf`;
      const storagePath = `${config.foreignKeyValue}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(config.storageBucket)
        .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });

      if (uploadError) {
        console.error('[SvgPdf] Upload failed:', uploadError);
        // Fallback: direct download
        triggerDownload(blob, fileName);
        toast({ title: 'PDF Generated', description: `Downloaded directly (${(sizeBytes / 1024).toFixed(1)} KB)` });
        return { blob, timeMs, sizeBytes, dbRecord: null };
      }

      // DB record
      const insertData: Record<string, any> = {
        [config.foreignKeyColumn]: config.foreignKeyValue,
        report_name: `${config.reportName} ${revision}`,
        revision,
        file_path: storagePath,
        file_size: sizeBytes,
        generated_by: userId || null,
        notes: 'Generated via SVG engine',
      };
      if (config.projectId) {
        insertData.project_id = config.projectId;
      }

      const { data: record, error: dbError } = await supabase
        .from(config.dbTable as any)
        .insert(insertData as any)
        .select()
        .single();

      if (dbError) {
        console.error('[SvgPdf] DB insert failed:', dbError);
        triggerDownload(blob, fileName);
        toast({ title: 'PDF Generated', description: 'Downloaded directly (history save failed)' });
        return { blob, timeMs, sizeBytes, dbRecord: null };
      }

      onSuccess?.();
      toast({
        title: 'PDF Generated & Saved',
        description: `${revision} generated in ${timeMs}ms (${(sizeBytes / 1024).toFixed(1)} KB)`,
      });

      return { blob, timeMs, sizeBytes, dbRecord: record };
    } catch (error: any) {
      console.error('[SvgPdf] Generation failed:', error);
      toast({ title: 'PDF Generation Failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast, getNextRevision]);

  return {
    isGenerating,
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
