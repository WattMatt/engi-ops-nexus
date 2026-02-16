/**
 * Comparison Matrix PDF Export — SVG engine
 */
import { svgPagesToDownload } from '@/utils/svg-pdf/svgToPdfEngine';
import { buildComparisonPdf, type ComparisonPdfData } from '@/utils/svg-pdf/comparisonPdfBuilder';
import { LightingFitting } from '../lightingTypes';

interface ComparisonRow {
  property: string;
  values: (string | number | null)[];
  format?: 'currency' | 'number' | 'text';
}

interface ComparisonExportData {
  fittings: LightingFitting[];
  generalRows: ComparisonRow[];
  performanceRows: ComparisonRow[];
  costRows: ComparisonRow[];
  physicalRows: ComparisonRow[];
}

export async function generateComparisonPDF(data: ComparisonExportData): Promise<void> {
  console.log('[ComparisonPDF] Starting SVG generation...');
  
  const svgPages = buildComparisonPdf({
    fittings: data.fittings.map(f => ({ fitting_code: f.fitting_code })),
    generalRows: data.generalRows,
    performanceRows: data.performanceRows,
    costRows: data.costRows,
    physicalRows: data.physicalRows,
  });

  await svgPagesToDownload(svgPages, {
    filename: 'lighting-comparison.pdf',
    pageWidth: 297,
    pageHeight: 210,
  });
  
  console.log('[ComparisonPDF] Download complete');
}
