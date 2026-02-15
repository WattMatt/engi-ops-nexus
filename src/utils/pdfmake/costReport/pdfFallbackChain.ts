/**
 * PDF Fallback Chain for Cost Report Generation
 * 
 * Now uses client-side pdfmake only (server EFs removed).
 */

import type { PDFWatermarkConfig, PDFColorTheme } from "@/components/cost-reports/PDFExportSettings";

export interface FallbackResult {
  success: boolean;
  method: 'pdfmake-client' | 'none';
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
    watermark?: PDFWatermarkConfig;
    colorTheme?: string;
    margins?: { top: number; bottom: number; left: number; right: number };
  };
  onProgress?: (step: string, percent: number, method: string) => void;
  signal?: AbortSignal;
}

const CLIENT_TIMEOUT_MS = 120000;

/**
 * Execute the PDF generation — client-side only.
 */
export async function executeFallbackChain(options: FallbackOptions): Promise<FallbackResult> {
  const { pdfData, filename, sections, onProgress } = options;
  
  onProgress?.("Generating PDF locally...", 50, "pdfmake-client");
  const clientResult = await tryClientSidePdfmake(pdfData, filename, sections);
  
  if (clientResult.success) {
    console.log('[FallbackChain] pdfmake-client succeeded');
    return clientResult;
  }
  
  console.error('[FallbackChain] Client-side generation failed');
  return {
    success: false,
    method: 'none',
    error: `Generation failed: ${clientResult.error}`,
  };
}

/**
 * Client-side pdfmake generation
 */
async function tryClientSidePdfmake(
  pdfData: any,
  filename: string,
  sections: FallbackOptions['sections']
): Promise<FallbackResult> {
  try {
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    
    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    pdfMake.vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs;
    
    const { report, categoryTotals, grandTotals, companyDetails } = pdfData;
    
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
    
    // Executive Summary
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
    
    return new Promise((resolve) => {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download(filename);
      setTimeout(() => {
        resolve({ success: true, method: 'pdfmake-client', fileName: filename });
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
