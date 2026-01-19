/**
 * Cost Report PDF Generator using pdfmake
 * 
 * Main orchestration function that combines all content builders
 * to generate a complete cost report PDF.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { createDocument } from '../documentBuilder';
import { PDF_COLORS } from '../styles';
import { imageToBase64 } from '../helpers';
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
 * Pre-process company details to convert logo URLs to base64
 */
// Strict timeout for logo conversion (3 seconds max per logo)
const LOGO_TIMEOUT_MS = 3000;

async function prepareCompanyDetailsWithLogos(
  companyDetails: CompanyDetails
): Promise<CompanyDetails> {
  const processed = { ...companyDetails };
  
  // Convert company logo URL to base64 with strict timeout
  if (processed.company_logo_url) {
    try {
      console.log('[CostReportPDF] Converting company logo to base64...');
      const logoPromise = imageToBase64(processed.company_logo_url);
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Logo timeout')), LOGO_TIMEOUT_MS)
      );
      processed.company_logo_url = await Promise.race([logoPromise, timeoutPromise]);
      console.log('[CostReportPDF] Company logo converted successfully');
    } catch (error) {
      console.warn('[CostReportPDF] Failed to convert company logo, skipping:', error);
      processed.company_logo_url = null; // Skip logo if conversion fails
    }
  }
  
  // Convert client logo URL to base64 with strict timeout
  if (processed.client_logo_url) {
    try {
      console.log('[CostReportPDF] Converting client logo to base64...');
      const logoPromise = imageToBase64(processed.client_logo_url);
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Logo timeout')), LOGO_TIMEOUT_MS)
      );
      processed.client_logo_url = await Promise.race([logoPromise, timeoutPromise]);
      console.log('[CostReportPDF] Client logo converted successfully');
    } catch (error) {
      console.warn('[CostReportPDF] Failed to convert client logo, skipping:', error);
      processed.client_logo_url = null; // Skip logo if conversion fails
    }
  }
  
  return processed;
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
/**
 * Validate if a data URL is a valid image
 */
function isValidImageDataUrl(dataUrl: string | null | undefined): boolean {
  if (!dataUrl) return false;
  if (typeof dataUrl !== 'string') return false;
  
  // Check for empty data URLs like "data:," or "data:image/png;base64,"
  if (dataUrl === 'data:,') return false;
  if (dataUrl.length < 100) return false; // Valid images are at least 100 chars
  if (!dataUrl.startsWith('data:image/')) return false;
  
  return true;
}

function buildVisualSummaryContent(chartImages: string[]): Content[] {
  // Filter out invalid images first
  const validImages = chartImages.filter(isValidImageDataUrl);
  
  if (validImages.length === 0) {
    console.log('[CostReportPDF] No valid chart images to include');
    return [];
  }

  console.log(`[CostReportPDF] Building visual summary with ${validImages.length} valid images`);

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

  // Add validated chart images
  validImages.forEach((imageDataUrl, index) => {
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

// Safety limits to prevent hanging (matching roadmap review best practices)
const MAX_VARIATIONS = 30;
const MAX_CATEGORIES = 20;
const MAX_LINE_ITEMS_PER_CATEGORY = 100;
const MAX_CHART_SIZE_BYTES = 200 * 1024; // 200KB
const MAX_CHARTS = 4;

/**
 * Generate a complete cost report PDF using pdfmake
 */
export async function generateCostReportPdfmake(
  data: GenerateCostReportOptions
): Promise<Blob> {
  const startTime = Date.now();
  console.log('[CostReportPDF] Starting PDF generation...');
  
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

  // Pre-process company details to convert logo URLs to base64
  console.log('[CostReportPDF] Pre-processing logos...');
  const processedCompanyDetails = await prepareCompanyDetailsWithLogos(companyDetails);

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

  // Apply safety limits (best practice from roadmap review)
  const limitedCategories = categoriesData.slice(0, MAX_CATEGORIES);
  const limitedVariations = variationsData.slice(0, MAX_VARIATIONS);
  
  if (categoriesData.length > MAX_CATEGORIES) {
    console.warn(`[CostReportPDF] Categories limited from ${categoriesData.length} to ${MAX_CATEGORIES}`);
  }
  if (variationsData.length > MAX_VARIATIONS) {
    console.warn(`[CostReportPDF] Variations limited from ${variationsData.length} to ${MAX_VARIATIONS}`);
  }

  // Track TOC entries
  const tocEntries: { title: string; page: number }[] = [];
  let currentPage = 1;

  // Initialize document
  console.log('[CostReportPDF] Creating document...');
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: [margins.left * 2.83, margins.top * 2.83, margins.right * 2.83, margins.bottom * 2.83], // Convert mm to points
  });

  // Cover Page
  if (includeCoverPage) {
    console.log('[CostReportPDF] Adding cover page...');
    onProgress?.('Generating cover page...', 10);
    doc.add(buildCoverPageContent(report, processedCompanyDetails));
    currentPage++;
  }

  // Table of Contents placeholder - we'll update this later
  if (includeTableOfContents) {
    currentPage++; // Reserve page for TOC
  }

  // Executive Summary
  if (includeExecutiveSummary) {
    console.log('[CostReportPDF] Adding executive summary...');
    onProgress?.('Generating executive summary...', 25);
    tocEntries.push({ title: 'Executive Summary', page: currentPage });
    doc.add(buildExecutiveSummaryContent(categoryTotals, grandTotals));
    currentPage++;
  }

  // Category Details
  if (includeCategoryDetails) {
    console.log('[CostReportPDF] Adding category details...');
    onProgress?.('Generating category details...', 40);
    tocEntries.push({ title: 'Category Performance Details', page: currentPage });
    doc.add(buildCategoryDetailsContent(categoryTotals));
    currentPage++;
  }

  // Detailed Line Items - with limits
  if (includeDetailedLineItems && limitedCategories.length > 0) {
    console.log(`[CostReportPDF] Adding detailed line items for ${limitedCategories.length} categories...`);
    onProgress?.('Generating detailed line items...', 55);
    tocEntries.push({ title: 'Detailed Line Items', page: currentPage });
    
    // Limit line items per category to prevent hanging
    const limitedCategoriesWithItems = limitedCategories.map(cat => ({
      ...cat,
      cost_line_items: (cat.cost_line_items || []).slice(0, MAX_LINE_ITEMS_PER_CATEGORY)
    }));
    
    doc.add(buildDetailedLineItemsContent({ categories: limitedCategoriesWithItems }));
    currentPage += Math.ceil(limitedCategories.length / 3); // Estimate pages
  }

  // Variations Summary - with limits
  if (includeVariations && limitedVariations.length > 0) {
    console.log(`[CostReportPDF] Adding ${limitedVariations.length} variations...`);
    onProgress?.('Generating variations summary...', 70);
    tocEntries.push({ title: 'Variation Orders Summary', page: currentPage });
    doc.add(buildVariationsSummaryContent(limitedVariations, report.project_name));
    currentPage++;

    // Individual Variation Sheets
    const variationStartPage = currentPage;
    limitedVariations.forEach((variation, index) => {
      onProgress?.(`Generating variation sheet ${index + 1}/${limitedVariations.length}...`, 70 + (index / limitedVariations.length) * 20);
      const lineItems = variationLineItemsMap.get(variation.id) || [];
      // Limit line items per variation too
      const limitedLineItems = lineItems.slice(0, 50);
      doc.add(buildVariationSheetContent({
        projectName: report.project_name,
        reportDate: report.report_date,
        variation,
        lineItems: limitedLineItems,
      }));
      currentPage++;
    });
    
    if (limitedVariations.length > 0) {
      tocEntries.push({ 
        title: `Variation Order Sheets (${limitedVariations.length} sheets)`, 
        page: variationStartPage 
      });
    }
  }

  // Visual Summary (Charts) - with size limits
  if (includeVisualSummary && chartImages.length > 0) {
    // Calculate total chart size and apply limits
    const totalChartSize = chartImages.reduce((acc, img) => acc + (img?.length || 0), 0);
    const chartsToInclude = chartImages.slice(0, MAX_CHARTS);
    
    if (totalChartSize > MAX_CHART_SIZE_BYTES) {
      console.warn(`[CostReportPDF] Charts may be large (${Math.round(totalChartSize / 1024)}KB), limiting to ${MAX_CHARTS}`);
    }
    
    if (chartsToInclude.length > 0) {
      console.log(`[CostReportPDF] Adding ${chartsToInclude.length} charts...`);
      onProgress?.('Generating visual summary...', 90);
      tocEntries.push({ title: 'Visual Summary', page: currentPage });
      doc.add(buildVisualSummaryContent(chartsToInclude));
      currentPage++;
    }
  }

  // Add header and footer
  console.log('[CostReportPDF] Adding headers and footers...');
  doc.withStandardHeader(report.project_name || 'Cost Report', report.revision || 'A');
  doc.withStandardFooter();

  // Set document info
  doc.setInfo({
    title: `Cost Report - ${report.project_name}`,
    author: processedCompanyDetails.companyName,
    subject: 'Cost Report',
    creator: 'Lovable Cost Report Generator',
  });

  onProgress?.('Finalizing PDF...', 95);

  console.log('[CostReportPDF] Building PDF blob...');
  try {
    // Use 120 second timeout for complex documents (canonical standard)
    const blob = await doc.toBlob(120000);
    const elapsedTime = Date.now() - startTime;
    console.log(`[CostReportPDF] PDF generated successfully in ${elapsedTime}ms, size: ${Math.round(blob.size / 1024)}KB`);
    return blob;
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[CostReportPDF] PDF generation failed after ${elapsedTime}ms:`, error);
    throw error;
  }
}

/**
 * Direct download fallback - uses pdfmake's internal download() which is more reliable
 * Use this when toBlob() fails or for simpler export flow
 */
export async function downloadCostReportPdfmake(
  data: GenerateCostReportOptions,
  filename?: string
): Promise<void> {
  const startTime = Date.now();
  console.log('[CostReportPDF] Starting direct download...');
  
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

  // Pre-process company details
  const processedCompanyDetails = await prepareCompanyDetailsWithLogos(companyDetails);

  const {
    includeCoverPage = true,
    includeExecutiveSummary = true,
    includeCategoryDetails = true,
    includeDetailedLineItems = true,
    includeVariations = true,
    includeVisualSummary = false,
    chartImages = [],
    margins = { top: 20, right: 15, bottom: 20, left: 15 },
  } = options;

  // Apply safety limits
  const limitedCategories = categoriesData.slice(0, MAX_CATEGORIES);
  const limitedVariations = variationsData.slice(0, MAX_VARIATIONS);

  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: [margins.left * 2.83, margins.top * 2.83, margins.right * 2.83, margins.bottom * 2.83],
  });

  // Build content (same as generateCostReportPdfmake)
  if (includeCoverPage) {
    doc.add(buildCoverPageContent(report, processedCompanyDetails));
  }

  if (includeExecutiveSummary) {
    doc.add(buildExecutiveSummaryContent(categoryTotals, grandTotals));
  }

  if (includeCategoryDetails) {
    doc.add(buildCategoryDetailsContent(categoryTotals));
  }

  if (includeDetailedLineItems && limitedCategories.length > 0) {
    const limitedCategoriesWithItems = limitedCategories.map(cat => ({
      ...cat,
      cost_line_items: (cat.cost_line_items || []).slice(0, MAX_LINE_ITEMS_PER_CATEGORY)
    }));
    doc.add(buildDetailedLineItemsContent({ categories: limitedCategoriesWithItems }));
  }

  if (includeVariations && limitedVariations.length > 0) {
    doc.add(buildVariationsSummaryContent(limitedVariations, report.project_name));
    limitedVariations.forEach((variation) => {
      const lineItems = variationLineItemsMap.get(variation.id) || [];
      doc.add(buildVariationSheetContent({
        projectName: report.project_name,
        reportDate: report.report_date,
        variation,
        lineItems: lineItems.slice(0, 50),
      }));
    });
  }

  if (includeVisualSummary && chartImages.length > 0) {
    const chartsToInclude = chartImages.slice(0, MAX_CHARTS);
    if (chartsToInclude.length > 0) {
      doc.add(buildVisualSummaryContent(chartsToInclude));
    }
  }

  doc.withStandardHeader(report.project_name || 'Cost Report', report.revision || 'A');
  doc.withStandardFooter();

  doc.setInfo({
    title: `Cost Report - ${report.project_name}`,
    author: processedCompanyDetails.companyName,
    subject: 'Cost Report',
    creator: 'Lovable Cost Report Generator',
  });

  const finalFilename = filename || `Cost_Report_${report.project_name}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Use direct download (more reliable than toBlob for some browsers)
  console.log('[CostReportPDF] Using direct download...');
  await doc.download(finalFilename);
  
  const elapsedTime = Date.now() - startTime;
  console.log(`[CostReportPDF] Direct download completed in ${elapsedTime}ms`);
}
