/**
 * Comparison Matrix PDF Export - Migrated to pdfmake canonical pattern
 * 
 * Replaces legacy jsPDF implementation with pdfmake.
 */

import {
  createDocument,
  heading,
  paragraph,
  dataTable,
  spacer,
  formatCurrency,
  PDF_COLORS,
  SPACING,
  type TableColumn,
} from '@/utils/pdfmake';
import { format } from 'date-fns';
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

/**
 * Format a cell value for display
 */
function formatValue(value: string | number | null, fmt?: string): string {
  if (value === null || value === '-') return '-';
  if (fmt === 'currency' && typeof value === 'number') {
    return formatCurrency(value);
  }
  return String(value);
}

/**
 * Build table data from comparison rows
 */
function buildTableData(
  rows: ComparisonRow[],
  fittingCount: number
): Record<string, string>[] {
  return rows.map((row) => {
    const rowData: Record<string, string> = { property: row.property };
    row.values.forEach((value, idx) => {
      rowData[`col${idx}`] = formatValue(value, row.format);
    });
    return rowData;
  });
}

/**
 * Build columns definition for the table
 */
function buildColumns(fittings: LightingFitting[]): TableColumn[] {
  const columns: TableColumn[] = [
    { header: 'Property', field: 'property', width: 120 },
  ];
  
  fittings.forEach((f, idx) => {
    columns.push({
      header: f.fitting_code,
      field: `col${idx}`,
      width: '*',
      align: 'center',
    });
  });
  
  return columns;
}

/**
 * Generate comparison matrix PDF
 */
export async function generateComparisonPDF(data: ComparisonExportData): Promise<void> {
  const { fittings, generalRows, performanceRows, costRows, physicalRows } = data;
  
  console.log('[ComparisonPDF] Starting generation...');
  
  const doc = createDocument({
    orientation: 'landscape',
    pageSize: 'A4',
  });
  
  // Title
  doc.add(heading('Lighting Fitting Comparison', 1));
  doc.add(paragraph(`Generated: ${format(new Date(), 'dd MMMM yyyy')}`));
  doc.add(spacer(SPACING.md));
  
  const columns = buildColumns(fittings);
  
  // General section
  doc.add(heading('General Information', 2));
  doc.add(dataTable(columns, buildTableData(generalRows, fittings.length), { 
    layout: 'zebraCompact',
  }));
  doc.add(spacer(SPACING.md));
  
  // Performance section
  doc.add(heading('Performance', 2));
  doc.add(dataTable(columns, buildTableData(performanceRows, fittings.length), { 
    layout: 'zebraCompact',
  }));
  doc.add(spacer(SPACING.md));
  
  // Costs section
  doc.add(heading('Costs', 2));
  doc.add(dataTable(columns, buildTableData(costRows, fittings.length), { 
    layout: 'zebraCompact',
  }));
  doc.add(spacer(SPACING.md));
  
  // Physical section
  doc.add(heading('Physical Specifications', 2));
  doc.add(dataTable(columns, buildTableData(physicalRows, fittings.length), { 
    layout: 'zebraCompact',
  }));
  
  // Header and footer
  doc.withStandardHeader('Lighting Comparison');
  doc.withStandardFooter(false);
  
  // Download directly (most reliable)
  console.log('[ComparisonPDF] Downloading...');
  await doc.download('lighting-comparison.pdf');
}
