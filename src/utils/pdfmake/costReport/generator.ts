/**
 * Cost Report PDF Generator using pdfmake
 * 
 * Main orchestration function that combines all content builders
 * to generate a complete cost report PDF.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { createDocument } from '../documentBuilder';
import { PDF_COLORS } from '../styles';
import { 
  buildCoverPageContent, 
  buildExecutiveSummaryContent, 
  buildCategoryDetailsContent,
} from '../costReportBuilder';
import { buildVariationSheetContent } from './variationSheet';
import { buildDetailedLineItemsContent } from './detailedLineItems';
import type { CompanyDetails } from '@/components/cost-reports/pdf-export/types';

export interface CostReportPdfmakeOptions {
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  includeExecutiveSummary?: boolean;
  includeCategoryDetails?: boolean;
  includeDetailedLineItems?: boolean;
  includeVariations?: boolean;
  includeVisualSummary?: boolean;
  chartImages?: string[]; // Base64 encoded chart images
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  onProgress?: (section: string, progress: number) => void;
}

interface VariationData {
  id: string;
  code: string;
  description: string;
  is_credit: boolean;
  total_amount?: number;
  tenants?: {
    shop_name: string;
    shop_number: string;
  };
}

interface VariationLineItem {
  line_number: number;
  description: string;
  comments?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

interface GenerateCostReportOptions {
  report: any;
  categoriesData: any[];
  variationsData: VariationData[];
  variationLineItemsMap: Map<string, VariationLineItem[]>;
  companyDetails: CompanyDetails;
  categoryTotals: any[];
  grandTotals: any;
  options?: CostReportPdfmakeOptions;
}

/**
 * Build variations summary table content
 */
function buildVariationsSummaryContent(
  variations: VariationData[],
  projectName: string
): Content[] {
  const content: Content[] = [
    {
      text: 'VARIATION ORDERS SUMMARY',
      fontSize: 16,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 5] as Margins,
    },
    {
      text: 'Overview of All Variation Orders',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center' as const,
      margin: [0, 0, 0, 15] as Margins,
    },
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
      margin: [0, 0, 0, 15] as Margins,
    },
  ];

  // Summary table
  const tableBody: any[][] = [
    // Header row
    [
      { text: 'No.', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'center' as const },
      { text: 'Description', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
      { text: 'Amount', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'right' as const },
      { text: 'Type', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'center' as const },
    ],
    // Data rows
    ...variations.map((v, idx) => [
      { text: v.code, fontSize: 8, bold: true, alignment: 'center' as const },
      { text: v.description || '-', fontSize: 8 },
      { 
        text: `R${Number(v.total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
        fontSize: 8, 
        alignment: 'right' as const 
      },
      { 
        text: v.is_credit ? 'Credit' : 'Debit', 
        fontSize: 8, 
        alignment: 'center' as const,
        color: v.is_credit ? PDF_COLORS.success : PDF_COLORS.danger,
        bold: true,
      },
    ]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [30, '*', 80, 50],
      body: tableBody,
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
      fillColor: (rowIndex: number) => rowIndex > 0 && rowIndex % 2 === 0 ? '#f5f7fa' : null,
    },
  });

  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}

/**
 * Build visual summary content with chart images
 */
function buildVisualSummaryContent(chartImages: string[]): Content[] {
  if (chartImages.length === 0) return [];

  const content: Content[] = [
    {
      text: 'VISUAL SUMMARY',
      fontSize: 16,
      bold: true,
      alignment: 'center' as const,
      margin: [0, 0, 0, 5] as Margins,
    },
    {
      text: 'Charts & Graphs Overview',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center' as const,
      margin: [0, 0, 0, 15] as Margins,
    },
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
      margin: [0, 0, 0, 20] as Margins,
    },
  ];

  // Add chart images
  chartImages.forEach((imageDataUrl, index) => {
    if (!imageDataUrl) return;
    
    content.push({
      image: imageDataUrl,
      width: 450,
      alignment: 'center' as const,
      margin: [0, index > 0 ? 15 : 0, 0, 10] as Margins,
    });
  });

  // Page break after visual summary
  content.push({ text: '', pageBreak: 'after' as const });

  return content;
}

/**
 * Generate a complete cost report PDF using pdfmake
 */
export async function generateCostReportPdfmake(
  data: GenerateCostReportOptions
): Promise<Blob> {
  const {
    report,
    categoriesData,
    variationsData,
    variationLineItemsMap,
    companyDetails,
    categoryTotals,
    grandTotals,
    options = {},
  } = data;

  const {
    includeCoverPage = true,
    includeTableOfContents = true,
    includeExecutiveSummary = true,
    includeCategoryDetails = true,
    includeDetailedLineItems = true,
    includeVariations = true,
    includeVisualSummary = false,
    chartImages = [],
    margins = { top: 20, right: 15, bottom: 20, left: 15 },
    onProgress,
  } = options;

  // Track TOC entries
  const tocEntries: { title: string; page: number }[] = [];
  let currentPage = 1;

  // Initialize document
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: [margins.left * 2.83, margins.top * 2.83, margins.right * 2.83, margins.bottom * 2.83], // Convert mm to points
  });

  // Cover Page
  if (includeCoverPage) {
    onProgress?.('Generating cover page...', 10);
    doc.add(buildCoverPageContent(report, companyDetails));
    currentPage++;
  }

  // Table of Contents placeholder - we'll update this later
  if (includeTableOfContents) {
    currentPage++; // Reserve page for TOC
  }

  // Executive Summary
  if (includeExecutiveSummary) {
    onProgress?.('Generating executive summary...', 25);
    tocEntries.push({ title: 'Executive Summary', page: currentPage });
    doc.add(buildExecutiveSummaryContent(categoryTotals, grandTotals));
    currentPage++;
  }

  // Category Details
  if (includeCategoryDetails) {
    onProgress?.('Generating category details...', 40);
    tocEntries.push({ title: 'Category Performance Details', page: currentPage });
    doc.add(buildCategoryDetailsContent(categoryTotals));
    currentPage++;
  }

  // Detailed Line Items
  if (includeDetailedLineItems && categoriesData.length > 0) {
    onProgress?.('Generating detailed line items...', 55);
    tocEntries.push({ title: 'Detailed Line Items', page: currentPage });
    doc.add(buildDetailedLineItemsContent({ categories: categoriesData }));
    currentPage += Math.ceil(categoriesData.length / 3); // Estimate pages
  }

  // Variations Summary
  if (includeVariations && variationsData.length > 0) {
    onProgress?.('Generating variations summary...', 70);
    tocEntries.push({ title: 'Variation Orders Summary', page: currentPage });
    doc.add(buildVariationsSummaryContent(variationsData, report.project_name));
    currentPage++;

    // Individual Variation Sheets
    const variationStartPage = currentPage;
    variationsData.forEach((variation, index) => {
      onProgress?.(`Generating variation sheet ${index + 1}/${variationsData.length}...`, 70 + (index / variationsData.length) * 20);
      const lineItems = variationLineItemsMap.get(variation.id) || [];
      doc.add(buildVariationSheetContent({
        projectName: report.project_name,
        reportDate: report.report_date,
        variation,
        lineItems,
      }));
      currentPage++;
    });
    
    if (variationsData.length > 0) {
      tocEntries.push({ 
        title: `Variation Order Sheets (${variationsData.length} sheets)`, 
        page: variationStartPage 
      });
    }
  }

  // Visual Summary (Charts)
  if (includeVisualSummary && chartImages.length > 0) {
    onProgress?.('Generating visual summary...', 90);
    tocEntries.push({ title: 'Visual Summary', page: currentPage });
    doc.add(buildVisualSummaryContent(chartImages));
    currentPage++;
  }

  // Add header and footer
  doc.withStandardHeader(report.project_name || 'Cost Report', report.revision || 'A');
  doc.withStandardFooter();

  // Set document info
  doc.setInfo({
    title: `Cost Report - ${report.project_name}`,
    author: companyDetails.companyName,
    subject: 'Cost Report',
    creator: 'Lovable Cost Report Generator',
  });

  onProgress?.('Finalizing PDF...', 95);

  return doc.toBlob();
}
