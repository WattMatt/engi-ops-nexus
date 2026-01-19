/**
 * Bulk Services PDF Generator using pdfmake
 * 
 * Rebuilt following the canonical pattern with:
 * - Pre-processed logos (base64 before build)
 * - Safety limits to prevent hanging
 * - 120-second timeout for blob generation
 * - Graceful fallback for missing data
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { format } from 'date-fns';
import { createDocument } from '../documentBuilder';
import { PDF_COLORS, tableLayouts } from '../styles';
import { imageToBase64, spacer, horizontalLine } from '../helpers';
import { supabase } from '@/integrations/supabase/client';
import { STANDARD_MARGINS } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkServicesDocument {
  id: string;
  project_id: string;
  document_number: string;
  revision: string;
  document_date: string;
  created_at: string;
  notes?: string | null;
  building_calculation_type?: string | null;
  project_area?: number | null;
  climatic_zone?: string | null;
  climatic_zone_city?: string | null;
  va_per_sqm?: number | null;
  diversity_factor?: number | null;
  future_expansion_factor?: number | null;
  maximum_demand?: number | null;
  total_connected_load?: number | null;
  primary_voltage?: string | null;
  connection_size?: string | null;
  supply_authority?: string | null;
  tariff_structure?: string | null;
}

export interface BulkServicesSection {
  id: string;
  document_id: string;
  section_number: string;
  section_title: string;
  content?: string | null;
  sort_order: number;
}

export interface BulkServicesPDFOptions {
  projectName?: string;
  revision: string;
  chartDataUrl?: string;
  onProgress?: (section: string, progress?: number) => void;
}

export interface BulkServicesPDFResult {
  blob: Blob;
  filename: string;
}

interface LocalCompanyDetails {
  companyName?: string;
  logoUrl?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#3b82f6',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#0f172a',
  textMuted: '#475569',
  lightGray: '#f1f5f9',
  border: '#e2e8f0',
  white: '#ffffff',
};

const METHOD_NAMES: Record<string, string> = {
  'sans_204': 'SANS 204 - Commercial/Retail',
  'sans_10142': 'SANS 10142-1 - General Buildings',
  'residential': 'Residential ADMD Method',
};

// Safety limits
const MAX_SECTIONS = 30;
const LOGO_TIMEOUT_MS = 3000;
const COMPANY_TIMEOUT_MS = 5000;
const PDF_TIMEOUT_MS = 120000;

// ============================================================================
// DATA FETCHING WITH STRICT TIMEOUTS
// ============================================================================

async function fetchCompanyDetailsLocal(): Promise<LocalCompanyDetails> {
  console.log('[BulkServicesPDF] Fetching company details...');
  
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[BulkServicesPDF] Company details fetch timed out');
      resolve({ companyName: undefined, logoUrl: null });
    }, COMPANY_TIMEOUT_MS);

    try {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, company_logo_url')
        .limit(1)
        .maybeSingle();

      clearTimeout(timeout);
      console.log('[BulkServicesPDF] Company details fetched');
      resolve({
        companyName: settings?.company_name || undefined,
        logoUrl: settings?.company_logo_url || null,
      });
    } catch (error) {
      console.warn('[BulkServicesPDF] Company fetch error:', error);
      clearTimeout(timeout);
      resolve({ companyName: undefined, logoUrl: null });
    }
  });
}

async function prepareLogoBase64(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[BulkServicesPDF] Logo conversion timed out');
      resolve(null);
    }, LOGO_TIMEOUT_MS);

    try {
      const base64 = await imageToBase64(logoUrl);
      clearTimeout(timeout);
      console.log('[BulkServicesPDF] Logo converted');
      resolve(base64);
    } catch (error) {
      console.warn('[BulkServicesPDF] Logo conversion failed:', error);
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildCoverPage(
  document: BulkServicesDocument,
  options: BulkServicesPDFOptions,
  companyDetails?: LocalCompanyDetails | null,
  logoBase64?: string | null
): Content[] {
  const content: Content[] = [];

  // Blue header band
  content.push({
    canvas: [
      {
        type: 'rect',
        x: -STANDARD_MARGINS.left,
        y: -STANDARD_MARGINS.top,
        w: 595.28,
        h: 200,
        color: COLORS.primary,
      },
    ],
    absolutePosition: { x: 0, y: 0 },
  });

  // Logo if available
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 100,
      margin: [0, 20, 0, 20] as Margins,
    });
  }

  content.push(spacer(50));

  // Title
  content.push({
    text: 'BULK SERVICES REPORT',
    fontSize: 32,
    bold: true,
    color: COLORS.white,
    alignment: 'center',
  });

  content.push({
    text: 'ELECTRICAL INFRASTRUCTURE',
    fontSize: 16,
    color: COLORS.white,
    alignment: 'center',
    margin: [0, 5, 0, 10] as Margins,
  });

  content.push({
    text: `Document ${document.document_number}`,
    fontSize: 12,
    color: COLORS.white,
    alignment: 'center',
    margin: [0, 0, 0, 40] as Margins,
  });

  content.push(spacer(60));

  // Project details box
  content.push({
    table: {
      widths: ['*', '*'],
      body: [
        [
          { text: 'PROJECT DETAILS', colSpan: 2, fontSize: 10, bold: true, fillColor: COLORS.lightGray, margin: [8, 8, 8, 8] as Margins },
          {},
        ],
        [
          { text: 'Project Name', fontSize: 9, color: COLORS.textMuted, margin: [8, 4, 4, 4] as Margins },
          { text: options.projectName || 'Bulk Services', fontSize: 10, bold: true, margin: [4, 4, 8, 4] as Margins },
        ],
        [
          { text: 'Revision', fontSize: 9, color: COLORS.textMuted, margin: [8, 4, 4, 4] as Margins },
          { text: options.revision, fontSize: 10, margin: [4, 4, 8, 4] as Margins },
        ],
        [
          { text: 'Date', fontSize: 9, color: COLORS.textMuted, margin: [8, 4, 4, 4] as Margins },
          { text: format(new Date(), 'dd MMMM yyyy'), fontSize: 10, margin: [4, 4, 8, 4] as Margins },
        ],
        [
          { text: 'Calculation Method', fontSize: 9, color: COLORS.textMuted, margin: [8, 4, 4, 4] as Margins },
          { text: METHOD_NAMES[document.building_calculation_type || 'sans_204'] || 'SANS 204', fontSize: 10, margin: [4, 4, 8, 4] as Margins },
        ],
      ],
    },
    layout: tableLayouts.standard,
    margin: [60, 0, 60, 0] as Margins,
  });

  // Company name at bottom
  if (companyDetails?.companyName) {
    content.push(spacer(40));
    content.push({
      text: companyDetails.companyName,
      fontSize: 12,
      alignment: 'center',
      color: COLORS.textMuted,
    });
  }

  content.push({ text: '', pageBreak: 'after' });

  return content;
}

function buildDocumentInfo(
  document: BulkServicesDocument,
  projectName?: string
): Content[] {
  const content: Content[] = [];

  content.push({
    text: 'DOCUMENT INFORMATION',
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });

  content.push(horizontalLine({ color: COLORS.primary, width: 2 }));

  const infoRows: any[][] = [
    [
      { text: 'Document Number', fontSize: 9, color: COLORS.textMuted, margin: [0, 4, 8, 4] as Margins },
      { text: document.document_number, fontSize: 10, bold: true, margin: [8, 4, 0, 4] as Margins },
    ],
    [
      { text: 'Project', fontSize: 9, color: COLORS.textMuted, margin: [0, 4, 8, 4] as Margins },
      { text: projectName || '', fontSize: 10, margin: [8, 4, 0, 4] as Margins },
    ],
    [
      { text: 'Created', fontSize: 9, color: COLORS.textMuted, margin: [0, 4, 8, 4] as Margins },
      { text: format(new Date(document.created_at), 'dd MMMM yyyy'), fontSize: 10, margin: [8, 4, 0, 4] as Margins },
    ],
  ];

  if (document.building_calculation_type) {
    infoRows.push([
      { text: 'Calculation Method', fontSize: 9, color: COLORS.textMuted, margin: [0, 4, 8, 4] as Margins },
      { text: METHOD_NAMES[document.building_calculation_type] || document.building_calculation_type, fontSize: 10, margin: [8, 4, 0, 4] as Margins },
    ]);
  }

  content.push({
    table: {
      widths: [120, '*'],
      body: infoRows,
    },
    layout: 'noBorders',
    margin: [0, 10, 0, 20] as Margins,
  });

  if (document.notes) {
    content.push({
      text: 'Notes',
      fontSize: 12,
      bold: true,
      margin: [0, 10, 0, 5] as Margins,
    });
    content.push({
      text: document.notes,
      fontSize: 10,
      color: COLORS.textMuted,
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  content.push({ text: '', pageBreak: 'after' });

  return content;
}

function buildSANS204Analysis(document: BulkServicesDocument): Content[] {
  const content: Content[] = [];

  content.push({
    text: 'SANS 204 LOAD ANALYSIS',
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });

  content.push(horizontalLine({ color: COLORS.primary, width: 2 }));

  // Building info
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Calculation Method', fontSize: 9, color: COLORS.textMuted },
          { text: METHOD_NAMES[document.building_calculation_type || 'sans_204'] || 'SANS 204', fontSize: 11, bold: true, margin: [0, 2, 0, 10] as Margins },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Project Area', fontSize: 9, color: COLORS.textMuted },
          { text: `${document.project_area?.toLocaleString() || 'Not set'} m²`, fontSize: 11, bold: true, margin: [0, 2, 0, 10] as Margins },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Climatic Zone', fontSize: 9, color: COLORS.textMuted },
          { text: document.climatic_zone || 'Not set', fontSize: 11, bold: true, margin: [0, 2, 0, 10] as Margins },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Applied Load', fontSize: 9, color: COLORS.textMuted },
          { text: `${document.va_per_sqm || 'Not set'} VA/m²`, fontSize: 11, bold: true, margin: [0, 2, 0, 10] as Margins },
        ],
      },
    ],
    margin: [0, 10, 0, 20] as Margins,
  });

  // SANS 204 Reference Table
  content.push({
    text: 'SANS 204 Table 1 - Zone Comparison (VA/m²)',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  const getZoneColor = (value: number): string => {
    if (value >= 89) return '#fee2e2';
    if (value >= 82) return '#fef3c7';
    return '#dbeafe';
  };

  const sans204Data = [
    ['Class', 'Building Type', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6'],
    ['A1', 'Entertainment & Assembly', '85', '80', '90', '80', '80', '85'],
    ['A2', 'Theatrical & Indoor Sport', '85', '80', '90', '80', '80', '85'],
    ['A3', 'Places of Instruction', '80', '75', '85', '75', '75', '80'],
    ['A4', 'Worship', '80', '75', '85', '75', '75', '80'],
    ['F1', 'Large Shop (Retail)', '90', '85', '95', '85', '85', '90'],
    ['G1', 'Offices', '80', '75', '85', '75', '75', '80'],
    ['H1', 'Hotel', '90', '85', '95', '85', '85', '90'],
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [30, 100, 45, 45, 45, 45, 45, 45],
      body: sans204Data.map((row, rowIdx) => 
        row.map((cell, colIdx) => {
          if (rowIdx === 0) {
            return { text: cell, fontSize: 7, bold: true, fillColor: COLORS.secondary, color: COLORS.white, alignment: 'center' as const };
          }
          if (colIdx === 0) {
            return { text: cell, fontSize: 7, bold: true, alignment: 'center' as const };
          }
          if (colIdx === 1) {
            return { text: cell, fontSize: 7 };
          }
          const value = parseInt(cell);
          return { 
            text: cell, 
            fontSize: 7, 
            alignment: 'center' as const,
            fillColor: getZoneColor(value),
          };
        })
      ),
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Statistics
  content.push({
    text: 'Overall Statistics',
    fontSize: 12,
    bold: true,
    margin: [0, 15, 0, 10] as Margins,
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'Average', fontSize: 9, bold: true, fillColor: COLORS.secondary, color: COLORS.white, alignment: 'center' as const },
          { text: 'Minimum', fontSize: 9, bold: true, fillColor: COLORS.success, color: COLORS.white, alignment: 'center' as const },
          { text: 'Maximum', fontSize: 9, bold: true, fillColor: COLORS.danger, color: COLORS.white, alignment: 'center' as const },
        ],
        [
          { text: '82.6 VA/m²', fontSize: 16, bold: true, color: COLORS.secondary, alignment: 'center' as const, margin: [0, 8, 0, 8] as Margins },
          { text: '75 VA/m²', fontSize: 16, bold: true, color: COLORS.success, alignment: 'center' as const, margin: [0, 8, 0, 8] as Margins },
          { text: '95 VA/m²', fontSize: 16, bold: true, color: COLORS.danger, alignment: 'center' as const, margin: [0, 8, 0, 8] as Margins },
        ],
      ],
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 20] as Margins,
  });

  content.push({ text: '', pageBreak: 'after' });

  return content;
}

function buildSectionsContent(sections: BulkServicesSection[]): Content[] {
  const content: Content[] = [];
  const limitedSections = sections.slice(0, MAX_SECTIONS);

  if (limitedSections.length === 0) return content;

  content.push({
    text: 'REPORT SECTIONS',
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });

  content.push(horizontalLine({ color: COLORS.primary, width: 2 }));

  limitedSections.forEach((section, index) => {
    content.push({
      text: `${section.section_number}. ${section.section_title}`,
      fontSize: 14,
      bold: true,
      color: COLORS.text,
      margin: [0, index === 0 ? 15 : 25, 0, 8] as Margins,
    });

    if (section.content) {
      content.push({
        text: section.content,
        fontSize: 10,
        color: COLORS.textMuted,
        lineHeight: 1.4,
        margin: [0, 0, 0, 10] as Margins,
      });
    } else {
      content.push({
        text: 'No content provided for this section.',
        fontSize: 10,
        italics: true,
        color: COLORS.textMuted,
        margin: [0, 0, 0, 10] as Margins,
      });
    }
  });

  return content;
}

// ============================================================================
// MAIN GENERATOR FUNCTIONS
// ============================================================================

/**
 * Generate Bulk Services PDF as Blob (for storage/preview)
 */
export async function generateBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions
): Promise<BulkServicesPDFResult> {
  const startTime = Date.now();
  console.log('[BulkServicesPDF] Starting PDF generation...');
  
  options.onProgress?.('Initializing...', 5);

  // Pre-process: Fetch company details with timeout
  options.onProgress?.('Fetching company details...', 10);
  const companyDetails = await fetchCompanyDetailsLocal();

  // Pre-process: Convert logo to base64 BEFORE building document
  options.onProgress?.('Processing logo...', 20);
  const logoBase64 = await prepareLogoBase64(companyDetails?.logoUrl);

  // Create document
  options.onProgress?.('Building document...', 30);
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
  });

  // Add cover page
  options.onProgress?.('Adding cover page...', 40);
  doc.add(buildCoverPage(document, options, companyDetails, logoBase64));

  // Add document info
  options.onProgress?.('Adding document info...', 50);
  doc.add(buildDocumentInfo(document, options.projectName));

  // Add SANS 204 analysis if applicable
  if (document.building_calculation_type === 'sans_204' || !document.building_calculation_type) {
    options.onProgress?.('Adding SANS 204 analysis...', 60);
    doc.add(buildSANS204Analysis(document));
  }

  // Add sections content
  if (sections.length > 0) {
    options.onProgress?.('Adding sections...', 75);
    doc.add(buildSectionsContent(sections));
  }

  // Add headers and footers
  doc.withStandardHeader(options.projectName || 'Bulk Services Report', options.revision);
  doc.withStandardFooter();

  // Set document metadata
  doc.setInfo({
    title: `Bulk Services Report - ${options.projectName || document.document_number}`,
    author: companyDetails?.companyName || 'Bulk Services Generator',
    subject: 'Bulk Services Electrical Infrastructure Report',
    creator: 'Lovable Bulk Services Generator',
  });

  // Generate filename
  const filename = `BulkServices_${document.document_number}_${options.revision}_${format(new Date(), 'yyyyMMdd')}.pdf`;

  // Generate blob with 120 second timeout (extended for complex documents)
  options.onProgress?.('Generating PDF...', 90);
  console.log('[BulkServicesPDF] Building PDF blob with 120s timeout...');
  
  try {
    const blob = await doc.toBlob(120000);
    const elapsedTime = Date.now() - startTime;
    console.log(`[BulkServicesPDF] PDF generated in ${elapsedTime}ms, size: ${Math.round(blob.size / 1024)}KB`);
    
    options.onProgress?.('Complete', 100);
    return { blob, filename };
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`[BulkServicesPDF] PDF generation failed after ${elapsedTime}ms:`, error);
    throw error;
  }
}

/**
 * Direct download fallback - uses pdfmake's internal download() for reliability
 */
export async function downloadBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions,
  filename?: string
): Promise<void> {
  const startTime = Date.now();
  console.log('[BulkServicesPDF] Starting direct download...');

  // Pre-process company details
  const companyDetails = await fetchCompanyDetailsLocal();

  // Pre-process logo
  const logoBase64 = await prepareLogoBase64(companyDetails?.logoUrl);

  // Build document
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
  });

  doc.add(buildCoverPage(document, options, companyDetails, logoBase64));
  doc.add(buildDocumentInfo(document, options.projectName));
  
  if (document.building_calculation_type === 'sans_204' || !document.building_calculation_type) {
    doc.add(buildSANS204Analysis(document));
  }
  
  if (sections.length > 0) {
    doc.add(buildSectionsContent(sections));
  }

  doc.withStandardHeader(options.projectName || 'Bulk Services Report', options.revision);
  doc.withStandardFooter();

  // Generate filename
  const downloadFilename = filename || `BulkServices_${document.document_number}_${options.revision}_${format(new Date(), 'yyyyMMdd')}.pdf`;

  // Direct download
  console.log('[BulkServicesPDF] Triggering download...');
  await doc.download(downloadFilename);
  
  const elapsedTime = Date.now() - startTime;
  console.log(`[BulkServicesPDF] Download triggered in ${elapsedTime}ms`);
}
