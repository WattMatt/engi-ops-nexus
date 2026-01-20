/**
 * PDF Fallback Chain for Cost Report Generation
 * 
 * Implements automatic fallback: pdfmake (server) → PDFShift → client-side
 * This ensures reliable PDF generation even when the primary method fails.
 */

import { supabase } from "@/integrations/supabase/client";
import { generateCostReportHtml, type CostReportHtmlData } from "./htmlTemplateGenerator";
import type { PDFWatermarkConfig, PDFColorTheme } from "@/components/cost-reports/PDFExportSettings";

export interface FallbackResult {
  success: boolean;
  method: 'pdfmake-server' | 'pdfshift' | 'pdfmake-client' | 'none';
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  record?: any;
  error?: string;
}

export interface FallbackOptions {
  reportId: string;
  pdfData: any;
  filename: string;
  sections: {
    includeCoverPage?: boolean;
    includeExecutiveSummary?: boolean;
    includeCategoryDetails?: boolean;
    includeDetailedLineItems?: boolean;
    includeVariations?: boolean;
    // Watermark and theme options
    watermark?: PDFWatermarkConfig;
    colorTheme?: string;
  };
  onProgress?: (step: string, percent: number, method: string) => void;
  signal?: AbortSignal;
}

const PDFMAKE_TIMEOUT_MS = 90000;  // 90s for pdfmake server
const PDFSHIFT_TIMEOUT_MS = 60000; // 60s for PDFShift
const CLIENT_TIMEOUT_MS = 120000;  // 120s for client-side (longer due to browser limitations)

/**
 * Execute the PDF generation fallback chain
 * Tries each method in order until one succeeds
 */
export async function executeFallbackChain(options: FallbackOptions): Promise<FallbackResult> {
  const { reportId, pdfData, filename, sections, onProgress, signal } = options;
  
  // Method 1: Server-side pdfmake (primary - most reliable)
  onProgress?.("Generating PDF on server...", 50, "pdfmake-server");
  const pdfmakeResult = await tryPdfmakeServer(reportId, pdfData, filename, sections, signal);
  
  if (pdfmakeResult.success) {
    console.log('[FallbackChain] pdfmake-server succeeded');
    return pdfmakeResult;
  }
  
  console.warn('[FallbackChain] pdfmake-server failed:', pdfmakeResult.error);
  
  if (signal?.aborted) {
    return { success: false, method: 'none', error: 'Cancelled' };
  }
  
  // Method 2: PDFShift HTML-to-PDF (fallback)
  onProgress?.("Trying PDFShift fallback...", 60, "pdfshift");
  const pdfshiftResult = await tryPdfShift(pdfData, filename, sections, signal);
  
  if (pdfshiftResult.success) {
    console.log('[FallbackChain] pdfshift succeeded');
    return pdfshiftResult;
  }
  
  console.warn('[FallbackChain] pdfshift failed:', pdfshiftResult.error);
  
  if (signal?.aborted) {
    return { success: false, method: 'none', error: 'Cancelled' };
  }
  
  // Method 3: Client-side pdfmake (last resort)
  onProgress?.("Generating PDF locally...", 70, "pdfmake-client");
  const clientResult = await tryClientSidePdfmake(pdfData, filename, sections);
  
  if (clientResult.success) {
    console.log('[FallbackChain] pdfmake-client succeeded');
    return clientResult;
  }
  
  console.error('[FallbackChain] All methods failed');
  return {
    success: false,
    method: 'none',
    error: `All generation methods failed. Last error: ${clientResult.error}`,
  };
}

/**
 * Method 1: Server-side pdfmake via Edge Function
 */
async function tryPdfmakeServer(
  reportId: string,
  pdfData: any,
  filename: string,
  sections: FallbackOptions['sections'],
  signal?: AbortSignal
): Promise<FallbackResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDFMAKE_TIMEOUT_MS);
    
    // Combine signals
    const combinedSignal = signal 
      ? new AbortController()
      : controller;
    
    if (signal) {
      signal.addEventListener('abort', () => combinedSignal.abort());
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cost-report-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          reportId,
          pdfData,
          filename,
          options: {
            includeCoverPage: sections.includeCoverPage ?? true,
            includeExecutiveSummary: sections.includeExecutiveSummary ?? true,
            includeCategoryDetails: sections.includeCategoryDetails ?? true,
            includeDetailedLineItems: sections.includeDetailedLineItems ?? true,
            includeVariations: sections.includeVariations ?? true,
            watermark: sections.watermark,
            colorTheme: sections.colorTheme,
          },
        }),
        signal: combinedSignal.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      method: 'pdfmake-server',
      filePath: result.filePath,
      fileName: result.fileName,
      fileSize: result.fileSize,
      record: result.record,
    };
  } catch (error: any) {
    return {
      success: false,
      method: 'pdfmake-server',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Method 2: PDFShift HTML-to-PDF via Edge Function
 */
async function tryPdfShift(
  pdfData: any,
  filename: string,
  sections: FallbackOptions['sections'],
  signal?: AbortSignal
): Promise<FallbackResult> {
  try {
    // Build HTML from data
    const htmlData: CostReportHtmlData = {
      report: pdfData.report,
      categoriesData: pdfData.categoriesData,
      variationsData: pdfData.variationsData,
      categoryTotals: pdfData.categoryTotals,
      grandTotals: pdfData.grandTotals,
      companyDetails: pdfData.companyDetails,
      options: {
        includeCoverPage: sections.includeCoverPage ?? true,
        includeExecutiveSummary: sections.includeExecutiveSummary ?? true,
        includeCategoryDetails: sections.includeCategoryDetails ?? true,
        includeDetailedLineItems: sections.includeDetailedLineItems ?? true,
        includeVariations: sections.includeVariations ?? true,
      },
    };
    
    const html = generateCostReportHtml(htmlData);
    
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PDFSHIFT_TIMEOUT_MS);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }
    
    const storagePath = `cost-reports/${pdfData.report.project_id}`;
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf-pdfshift`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          html,
          filename,
          storagePath,
          options: {
            format: 'A4',
            margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
            printBackground: true,
            displayHeaderFooter: true,
            footerTemplate: '<div style="font-size: 8pt; text-align: center; width: 100%; color: #9ca3af;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
          },
        }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `PDFShift error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      method: 'pdfshift',
      filePath: result.filePath,
      fileName: result.fileName,
      fileSize: result.fileSize,
    };
  } catch (error: any) {
    return {
      success: false,
      method: 'pdfshift',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Method 3: Client-side pdfmake (last resort)
 * Uses direct download to browser - most reliable for avoiding callback hangs
 */
async function tryClientSidePdfmake(
  pdfData: any,
  filename: string,
  sections: FallbackOptions['sections']
): Promise<FallbackResult> {
  try {
    // Dynamically import pdfmake
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    
    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    pdfMake.vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs;
    
    const { report, categoryTotals, grandTotals, companyDetails, categoriesData, variationsData } = pdfData;
    
    // Build simplified content for client-side (to avoid hangs)
    const content: any[] = [];
    
    // Cover Page
    if (sections.includeCoverPage !== false) {
      content.push(
        { text: 'COST REPORT', fontSize: 28, bold: true, alignment: 'center', margin: [0, 100, 0, 20] },
        { text: report.project_name || 'Project', fontSize: 18, alignment: 'center', margin: [0, 0, 0, 40] },
        { text: `Report No: ${report.report_number || 1}`, alignment: 'center', margin: [0, 5, 0, 0] },
        { text: `Revision: ${report.revision || 'A'}`, alignment: 'center', margin: [0, 5, 0, 0] },
        { text: `Date: ${new Date(report.report_date || Date.now()).toLocaleDateString()}`, alignment: 'center', margin: [0, 5, 0, 40] },
        { text: companyDetails?.companyName || '', alignment: 'center', margin: [0, 20, 0, 0] },
        { text: '', pageBreak: 'after' }
      );
    }
    
    // Executive Summary (simplified)
    if (sections.includeExecutiveSummary !== false && categoryTotals?.length > 0) {
      content.push(
        { text: 'EXECUTIVE SUMMARY', fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 15] }
      );
      
      const tableBody: any[][] = [
        [
          { text: 'CODE', bold: true, fillColor: '#1e3a5f', color: '#fff' },
          { text: 'CATEGORY', bold: true, fillColor: '#1e3a5f', color: '#fff' },
          { text: 'ORIGINAL BUDGET', bold: true, fillColor: '#1e3a5f', color: '#fff', alignment: 'right' },
          { text: 'ANTICIPATED FINAL', bold: true, fillColor: '#1e3a5f', color: '#fff', alignment: 'right' },
        ],
      ];
      
      categoryTotals.forEach((cat: any) => {
        tableBody.push([
          { text: cat.code || '-', fontSize: 8 },
          { text: cat.description || '-', fontSize: 8 },
          { text: `R${Math.round(cat.originalBudget || 0).toLocaleString()}`, fontSize: 8, alignment: 'right' },
          { text: `R${Math.round(cat.anticipatedFinal || 0).toLocaleString()}`, fontSize: 8, alignment: 'right' },
        ]);
      });
      
      // Grand total
      tableBody.push([
        { text: 'TOTAL', bold: true, colSpan: 2, fillColor: '#f3f4f6' }, {},
        { text: `R${Math.round(grandTotals?.originalBudget || 0).toLocaleString()}`, bold: true, alignment: 'right', fillColor: '#f3f4f6' },
        { text: `R${Math.round(grandTotals?.anticipatedFinal || 0).toLocaleString()}`, bold: true, alignment: 'right', fillColor: '#f3f4f6' },
      ]);
      
      content.push({
        table: { headerRows: 1, widths: [40, '*', 80, 80], body: tableBody },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
        },
      });
    }
    
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 50],
      content,
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      footer: (currentPage: number, pageCount: number): any => {
        if (currentPage === 1) return null;
        return {
          text: `Page ${currentPage - 1} of ${pageCount - 1}`,
          alignment: 'center' as const,
          fontSize: 8,
          color: '#9ca3af',
          margin: [0, 15, 0, 0],
        };
      },
    };
    
    // Use direct download (most reliable method)
    return new Promise((resolve) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      
      pdfDoc.download(filename);
      
      // Resolve after delay - download doesn't have reliable callback
      setTimeout(() => {
        resolve({
          success: true,
          method: 'pdfmake-client',
          fileName: filename,
        });
      }, 2000);
    });
  } catch (error: any) {
    return {
      success: false,
      method: 'pdfmake-client',
      error: error.message || 'Client-side generation failed',
    };
  }
}
