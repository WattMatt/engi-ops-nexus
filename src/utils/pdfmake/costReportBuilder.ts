/**
 * Cost Report PDF Builder using pdfmake
 * 
 * This module provides a high-level API for building cost report PDFs
 * using the pdfmake library, replacing the legacy jsPDF implementation.
 */

import type { Content, TDocumentDefinitions, TableCell, Style } from "pdfmake/interfaces";
import { createDocument } from "./documentBuilder";
import { defaultStyles, tableLayouts, PDF_COLORS } from "./styles";
import { 
  CategoryTotal, 
  GrandTotals, 
  CompanyDetails,
  PDF_COLORS_HEX,
  CATEGORY_COLORS_HEX,
  getCostReportStyles 
} from "@/components/cost-reports/pdf-export/types";
import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";
import { format } from "date-fns";

// ============================================================================
// Types
// ============================================================================

export interface CostReportData {
  report: any;
  categoryTotals: CategoryTotal[];
  grandTotals: GrandTotals;
  companyDetails: CompanyDetails;
  categoriesData: any[];
  variationsData: any[];
  detailsData: any[];
}

export interface CostReportOptions {
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  includeExecutiveSummary?: boolean;
  includeCategoryDetails?: boolean;
  includeVariations?: boolean;
  includeDetailedLineItems?: boolean;
  includeVisualSummary?: boolean;
  chartImages?: string[]; // Base64 encoded chart images
}

// ============================================================================
// Cover Page Builder
// ============================================================================

export function buildCoverPageContent(
  report: any,
  companyDetails: CompanyDetails
): Content[] {
  // Validate logo URL - must be a proper data URL with content
  const hasValidLogo = companyDetails.company_logo_url && 
    typeof companyDetails.company_logo_url === 'string' &&
    companyDetails.company_logo_url.length > 100 &&
    companyDetails.company_logo_url.startsWith('data:image/') &&
    companyDetails.company_logo_url !== 'data:,';
    
  return [
    // Logo placeholder (if available and valid)
    hasValidLogo ? {
      image: companyDetails.company_logo_url!,
      width: 150,
      alignment: 'center' as const,
      margin: [0, 40, 0, 30] as [number, number, number, number],
    } : { text: '', margin: [0, 80, 0, 0] as [number, number, number, number] },
    
    // Report title
    {
      text: 'COST REPORT',
      fontSize: 32,
      bold: true,
      color: PDF_COLORS_HEX.primary,
      alignment: 'center' as const,
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    
    // Project name
    {
      text: report.project_name || 'Project Name',
      fontSize: 20,
      color: PDF_COLORS_HEX.text,
      alignment: 'center' as const,
      margin: [0, 0, 0, 40] as [number, number, number, number],
    },
    
    // Report number and revision
    {
      columns: [
        { text: '', width: '*' },
        {
          width: 'auto',
          table: {
            body: [
              [
                { text: 'Report No:', bold: true, fontSize: 10, color: PDF_COLORS_HEX.neutral },
                { text: report.report_number || '-', fontSize: 10 },
              ],
              [
                { text: 'Revision:', bold: true, fontSize: 10, color: PDF_COLORS_HEX.neutral },
                { text: report.revision || 'A', fontSize: 10 },
              ],
              [
                { text: 'Date:', bold: true, fontSize: 10, color: PDF_COLORS_HEX.neutral },
                { text: format(new Date(report.report_date || new Date()), 'dd MMMM yyyy'), fontSize: 10 },
              ],
            ],
          },
          layout: 'noBorders',
        },
        { text: '', width: '*' },
      ],
      margin: [0, 0, 0, 40] as [number, number, number, number],
    },
    
    // Company details
    {
      text: companyDetails.companyName || '',
      fontSize: 12,
      alignment: 'center' as const,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    },
    {
      text: companyDetails.contactName || '',
      fontSize: 10,
      color: PDF_COLORS_HEX.neutral,
      alignment: 'center' as const,
    },
    
    { text: '', pageBreak: 'after' as const },
  ];
}

// ============================================================================
// Executive Summary Builder
// ============================================================================

export function buildExecutiveSummaryContent(
  categoryTotals: CategoryTotal[],
  grandTotals: GrandTotals
): Content[] {
  const tableData = generateExecutiveSummaryTableData(categoryTotals, grandTotals);

  return [
    // Header
    {
      text: 'EXECUTIVE SUMMARY',
      fontSize: 16,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 5] as [number, number, number, number],
    },
    {
      text: 'Key Performance Indicators & Financial Overview',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center' as const,
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    
    // Separator line
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#c8c8c8',
        },
      ],
      margin: [0, 0, 0, 15] as [number, number, number, number],
    },
    
    // Table
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          // Header row
          tableData.headers.map(h => ({
            text: h,
            bold: true,
            fontSize: 8,
            fillColor: PDF_COLORS_HEX.tableHeader,
            color: '#ffffff',
            alignment: h === 'Code' ? 'center' as const : (h === 'Description' ? 'left' as const : 'right' as const),
          })),
          // Data rows
          ...tableData.categoryRows.map(row => [
            { text: row.code, bold: true, alignment: 'center' as const, fontSize: 8 },
            { text: row.description, bold: true, fontSize: 8 },
            { text: `R${row.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: `R${row.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: `R${row.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: row.percentOfTotal, alignment: 'center' as const, fontSize: 8 },
            { 
              text: `${row.currentVariance >= 0 ? '+' : ''}R${Math.abs(row.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              fontSize: 8,
              color: row.currentVariance < 0 ? PDF_COLORS_HEX.success : (row.currentVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
            { 
              text: `${row.originalVariance >= 0 ? '+' : ''}R${Math.abs(row.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              fontSize: 8,
              color: row.originalVariance < 0 ? PDF_COLORS_HEX.success : (row.originalVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
          ]),
          // Grand total row
          [
            { text: '', fontSize: 8 },
            { text: tableData.grandTotalRow.description, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: `R${tableData.grandTotalRow.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: `R${tableData.grandTotalRow.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: `R${tableData.grandTotalRow.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: tableData.grandTotalRow.percentOfTotal, alignment: 'center' as const, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { 
              text: `${tableData.grandTotalRow.currentVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              bold: true, 
              fontSize: 8,
              fillColor: '#f3f4f6',
              color: tableData.grandTotalRow.currentVariance < 0 ? PDF_COLORS_HEX.success : (tableData.grandTotalRow.currentVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
            { 
              text: `${tableData.grandTotalRow.originalVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              bold: true, 
              fontSize: 8,
              fillColor: '#f3f4f6',
              color: tableData.grandTotalRow.originalVariance < 0 ? PDF_COLORS_HEX.success : (tableData.grandTotalRow.originalVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#dcdcdc',
        vLineColor: () => '#dcdcdc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    },
    
    { text: '', pageBreak: 'after' as const },
  ];
}

// ============================================================================
// Category Details Builder
// ============================================================================

export function buildCategoryDetailsContent(
  categoryTotals: CategoryTotal[]
): Content[] {
  const cardRows: Content[][] = [];
  
  for (let i = 0; i < categoryTotals.length; i += 2) {
    const row: Content[] = [];
    
    // First card
    const cat1 = categoryTotals[i];
    const color1 = CATEGORY_COLORS_HEX[i % CATEGORY_COLORS_HEX.length];
    row.push(buildCategoryCard(cat1, color1));
    
    // Second card (if exists)
    if (i + 1 < categoryTotals.length) {
      const cat2 = categoryTotals[i + 1];
      const color2 = CATEGORY_COLORS_HEX[(i + 1) % CATEGORY_COLORS_HEX.length];
      row.push(buildCategoryCard(cat2, color2));
    } else {
      row.push({ text: '' });
    }
    
    cardRows.push(row);
  }

  return [
    {
      text: 'CATEGORY PERFORMANCE DETAILS',
      fontSize: 16,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    {
      table: {
        widths: ['*', '*'],
        body: cardRows.map(row => row.map(cell => {
          if (typeof cell === 'object' && cell !== null && !Array.isArray(cell)) {
            return { ...cell, margin: [5, 5, 5, 5] };
          }
          return { text: '', margin: [5, 5, 5, 5] };
        })),
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#e5e5e5',
        vLineColor: () => '#e5e5e5',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
    },
    { text: '', pageBreak: 'after' as const },
  ];
}

function buildCategoryCard(
  cat: CategoryTotal,
  colorHex: string
): Content {
  const isNegative = cat.originalVariance < 0;
  const varianceColor = isNegative ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger;

  return {
    stack: [
      {
        columns: [
          {
            text: cat.code,
            fontSize: 8,
            bold: true,
            color: '#ffffff',
            background: colorHex,
            margin: [4, 2, 4, 2] as [number, number, number, number],
          },
          {
            text: cat.description,
            fontSize: 8,
            bold: true,
            margin: [5, 2, 0, 0] as [number, number, number, number],
          },
        ],
      },
      {
        columns: [
          {
            stack: [
              { text: 'ORIGINAL BUDGET', fontSize: 6, color: '#646464', margin: [0, 5, 0, 2] as [number, number, number, number] },
              { text: `R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, fontSize: 9, bold: true },
              { text: 'ANTICIPATED FINAL', fontSize: 6, color: '#646464', margin: [0, 5, 0, 2] as [number, number, number, number] },
              { text: `R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, fontSize: 9, bold: true },
            ],
          },
          {
            stack: [
              { 
                text: `${isNegative ? '-' : '+'}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
                fontSize: 9, 
                bold: true, 
                alignment: 'right' as const,
                color: varianceColor,
              },
              { 
                text: isNegative ? 'SAVING' : 'EXTRA', 
                fontSize: 6, 
                bold: true, 
                alignment: 'right' as const,
                color: varianceColor,
                margin: [0, 3, 0, 0] as [number, number, number, number],
              },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 5, 0, 0] as [number, number, number, number],
      },
    ],
  };
}

// ============================================================================
// Main Export Function
// ============================================================================

export async function generateCostReportPDF(
  data: CostReportData,
  options: CostReportOptions = {}
): Promise<Blob> {
  const {
    includeCoverPage = true,
    includeExecutiveSummary = true,
    includeCategoryDetails = true,
  } = options;

  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: [40, 60, 40, 60],
  });

  // Add custom styles
  const customStyles = getCostReportStyles();
  doc.addStyles(customStyles);

  // Cover page
  if (includeCoverPage) {
    doc.add(buildCoverPageContent(data.report, data.companyDetails));
  }

  // Executive summary
  if (includeExecutiveSummary) {
    doc.add(buildExecutiveSummaryContent(data.categoryTotals, data.grandTotals));
  }

  // Category details
  if (includeCategoryDetails) {
    doc.add(buildCategoryDetailsContent(data.categoryTotals));
  }

  // Add header/footer
  doc.withStandardHeader(data.report.project_name || 'Cost Report', data.report.revision || 'A');
  doc.withStandardFooter();

  return doc.toBlob();
}

export async function downloadCostReportPDF(
  data: CostReportData,
  fileName: string,
  options: CostReportOptions = {}
): Promise<void> {
  const blob = await generateCostReportPDF(data, options);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
