/**
 * Bulk Services PDF Generator using pdfmake
 * 
 * REBUILT to exactly match the working cost report pattern:
 * - Simple content structure (no absolute positioning/canvas)
 * - Pre-processed logos with strict timeouts
 * - 120s timeout for blob generation
 * - Defensive error handling throughout
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { format } from 'date-fns';
import { createDocument } from '../documentBuilder';
import { PDF_COLORS, tableLayouts } from '../styles';
import { imageToBase64 } from '../helpers';
import { supabase } from '@/integrations/supabase/client';

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
  onProgress?: (step: string) => void;
}

export interface BulkServicesPDFResult {
  blob: Blob;
  filename: string;
}

// ============================================================================
// CONSTANTS - Match cost report pattern
// ============================================================================

const METHOD_NAMES: Record<string, string> = {
  'sans_204': 'SANS 204 - Commercial/Retail',
  'sans_10142': 'SANS 10142-1 - General Buildings',
  'residential': 'Residential ADMD Method',
};

const MAX_SECTIONS = 50;
const LOGO_TIMEOUT_MS = 5000;
const COMPANY_TIMEOUT_MS = 5000;

// ============================================================================
// PRE-PROCESSING (with strict timeouts - matching cost report)
// ============================================================================

async function fetchCompanyDetails(): Promise<{ companyName?: string; logoBase64?: string | null }> {
  console.log('[BulkServicesPDF] Fetching company details...');
  
  try {
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Company fetch timeout')), COMPANY_TIMEOUT_MS)
    );
    
    const fetchPromise = supabase
      .from('company_settings')
      .select('company_name, company_logo_url')
      .limit(1)
      .maybeSingle();
    
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!result || 'data' in result === false) {
      console.log('[BulkServicesPDF] Company fetch timed out, proceeding without');
      return { companyName: undefined, logoBase64: null };
    }

    const { data: settings } = result;
    console.log('[BulkServicesPDF] Company details fetched');
    
    // Convert logo to base64 if present
    let logoBase64: string | null = null;
    if (settings?.company_logo_url) {
      try {
        const logoPromise = imageToBase64(settings.company_logo_url);
        const logoTimeout = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Logo timeout')), LOGO_TIMEOUT_MS)
        );
        logoBase64 = await Promise.race([logoPromise, logoTimeout]);
        console.log('[BulkServicesPDF] Logo converted to base64');
      } catch {
        console.warn('[BulkServicesPDF] Logo conversion failed, skipping');
        logoBase64 = null;
      }
    }
    
    return {
      companyName: settings?.company_name || undefined,
      logoBase64,
    };
  } catch (error) {
    console.warn('[BulkServicesPDF] Company fetch failed:', error);
    return { companyName: undefined, logoBase64: null };
  }
}

// ============================================================================
// CONTENT BUILDERS - Simple structures only (no canvas/absolute positioning)
// ============================================================================

function buildCoverPage(
  document: BulkServicesDocument,
  options: BulkServicesPDFOptions,
  companyName?: string,
  logoBase64?: string | null
): Content[] {
  const content: Content[] = [];
  
  // Logo at top (if available)
  if (logoBase64) {
    content.push({
      image: logoBase64,
      width: 120,
      alignment: 'center',
      margin: [0, 20, 0, 30] as Margins,
    });
  } else {
    content.push({ text: '', margin: [0, 60, 0, 0] as Margins });
  }
  
  // Main title
  content.push({
    text: 'BULK SERVICES REPORT',
    fontSize: 28,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 40, 0, 10] as Margins,
  });
  
  content.push({
    text: 'ELECTRICAL INFRASTRUCTURE',
    fontSize: 14,
    color: PDF_COLORS.textLight,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });
  
  content.push({
    text: `Document ${document.document_number}`,
    fontSize: 11,
    color: PDF_COLORS.textLight,
    alignment: 'center',
    margin: [0, 0, 0, 40] as Margins,
  });
  
  // Divider line
  content.push({
    canvas: [{
      type: 'line',
      x1: 150, y1: 0,
      x2: 365, y2: 0,
      lineWidth: 2,
      lineColor: PDF_COLORS.primary,
    }],
    margin: [0, 0, 0, 40] as Margins,
  });
  
  // Project details table
  content.push({
    table: {
      widths: [120, '*'],
      body: [
        [
          { text: 'Project:', fontSize: 10, color: PDF_COLORS.textLight, margin: [0, 4, 0, 4] as Margins },
          { text: options.projectName || 'Bulk Services', fontSize: 11, bold: true, margin: [0, 4, 0, 4] as Margins },
        ],
        [
          { text: 'Revision:', fontSize: 10, color: PDF_COLORS.textLight, margin: [0, 4, 0, 4] as Margins },
          { text: options.revision, fontSize: 11, margin: [0, 4, 0, 4] as Margins },
        ],
        [
          { text: 'Date:', fontSize: 10, color: PDF_COLORS.textLight, margin: [0, 4, 0, 4] as Margins },
          { text: format(new Date(), 'dd MMMM yyyy'), fontSize: 11, margin: [0, 4, 0, 4] as Margins },
        ],
        [
          { text: 'Method:', fontSize: 10, color: PDF_COLORS.textLight, margin: [0, 4, 0, 4] as Margins },
          { text: METHOD_NAMES[document.building_calculation_type || 'sans_204'] || 'SANS 204', fontSize: 11, margin: [0, 4, 0, 4] as Margins },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [100, 0, 100, 40] as Margins,
  });
  
  // Company name at bottom
  if (companyName) {
    content.push({
      text: companyName,
      fontSize: 12,
      alignment: 'center',
      color: PDF_COLORS.textLight,
      margin: [0, 60, 0, 0] as Margins,
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
    fontSize: 16,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });
  
  content.push({
    canvas: [{
      type: 'line',
      x1: 0, y1: 0,
      x2: 515, y2: 0,
      lineWidth: 1,
      lineColor: PDF_COLORS.primary,
    }],
    margin: [0, 0, 0, 15] as Margins,
  });
  
  const rows: any[][] = [
    [
      { text: 'Document Number', fontSize: 9, color: PDF_COLORS.textLight },
      { text: document.document_number, fontSize: 10, bold: true },
    ],
    [
      { text: 'Project', fontSize: 9, color: PDF_COLORS.textLight },
      { text: projectName || 'Not specified', fontSize: 10 },
    ],
    [
      { text: 'Created', fontSize: 9, color: PDF_COLORS.textLight },
      { text: format(new Date(document.created_at), 'dd MMMM yyyy'), fontSize: 10 },
    ],
  ];
  
  if (document.building_calculation_type) {
    rows.push([
      { text: 'Calculation Method', fontSize: 9, color: PDF_COLORS.textLight },
      { text: METHOD_NAMES[document.building_calculation_type] || document.building_calculation_type, fontSize: 10 },
    ]);
  }
  
  content.push({
    table: {
      widths: [140, '*'],
      body: rows,
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 20] as Margins,
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
      color: PDF_COLORS.textLight,
      margin: [0, 0, 0, 20] as Margins,
    });
  }
  
  content.push({ text: '', pageBreak: 'after' });
  
  return content;
}

function buildLoadAnalysis(document: BulkServicesDocument): Content[] {
  const content: Content[] = [];
  
  content.push({
    text: 'ELECTRICAL LOAD ANALYSIS',
    fontSize: 16,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });
  
  content.push({
    canvas: [{
      type: 'line',
      x1: 0, y1: 0,
      x2: 515, y2: 0,
      lineWidth: 1,
      lineColor: PDF_COLORS.primary,
    }],
    margin: [0, 0, 0, 15] as Margins,
  });
  
  // Key metrics grid
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Project Area', fontSize: 9, color: PDF_COLORS.textLight },
          { text: `${document.project_area?.toLocaleString() || 'N/A'} m²`, fontSize: 14, bold: true, margin: [0, 2, 0, 15] as Margins },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Applied Load', fontSize: 9, color: PDF_COLORS.textLight },
          { text: `${document.va_per_sqm || 'N/A'} VA/m²`, fontSize: 14, bold: true, margin: [0, 2, 0, 15] as Margins },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Climatic Zone', fontSize: 9, color: PDF_COLORS.textLight },
          { text: document.climatic_zone || 'N/A', fontSize: 14, bold: true, margin: [0, 2, 0, 15] as Margins },
        ],
      },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });
  
  // Calculated values
  if (document.total_connected_load || document.maximum_demand) {
    content.push({
      text: 'Calculated Values',
      fontSize: 12,
      bold: true,
      margin: [0, 10, 0, 10] as Margins,
    });
    
    const calcRows: any[][] = [];
    
    if (document.total_connected_load) {
      calcRows.push([
        { text: 'Total Connected Load', fontSize: 9 },
        { text: `${document.total_connected_load.toLocaleString()} kVA`, fontSize: 10, bold: true, alignment: 'right' },
      ]);
    }
    if (document.diversity_factor) {
      calcRows.push([
        { text: 'Diversity Factor', fontSize: 9 },
        { text: `${document.diversity_factor}%`, fontSize: 10, alignment: 'right' },
      ]);
    }
    if (document.future_expansion_factor) {
      calcRows.push([
        { text: 'Future Expansion', fontSize: 9 },
        { text: `${document.future_expansion_factor}%`, fontSize: 10, alignment: 'right' },
      ]);
    }
    if (document.maximum_demand) {
      calcRows.push([
        { text: 'Maximum Demand', fontSize: 9, bold: true },
        { text: `${document.maximum_demand.toLocaleString()} kVA`, fontSize: 12, bold: true, color: PDF_COLORS.primary, alignment: 'right' },
      ]);
    }
    
    if (calcRows.length > 0) {
      content.push({
        table: {
          widths: ['*', 100],
          body: calcRows,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20] as Margins,
      });
    }
  }
  
  // Connection details
  if (document.primary_voltage || document.connection_size || document.supply_authority) {
    content.push({
      text: 'Connection Details',
      fontSize: 12,
      bold: true,
      margin: [0, 15, 0, 10] as Margins,
    });
    
    const connRows: any[][] = [];
    if (document.primary_voltage) {
      connRows.push([
        { text: 'Primary Voltage', fontSize: 9 },
        { text: document.primary_voltage, fontSize: 10, alignment: 'right' },
      ]);
    }
    if (document.connection_size) {
      connRows.push([
        { text: 'Connection Size', fontSize: 9 },
        { text: document.connection_size, fontSize: 10, alignment: 'right' },
      ]);
    }
    if (document.supply_authority) {
      connRows.push([
        { text: 'Supply Authority', fontSize: 9 },
        { text: document.supply_authority, fontSize: 10, alignment: 'right' },
      ]);
    }
    if (document.tariff_structure) {
      connRows.push([
        { text: 'Tariff Structure', fontSize: 9 },
        { text: document.tariff_structure, fontSize: 10, alignment: 'right' },
      ]);
    }
    
    if (connRows.length > 0) {
      content.push({
        table: {
          widths: ['*', 150],
          body: connRows,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20] as Margins,
      });
    }
  }
  
  content.push({ text: '', pageBreak: 'after' });
  
  return content;
}

function buildSectionsContent(sections: BulkServicesSection[]): Content[] {
  const content: Content[] = [];
  const limitedSections = sections.slice(0, MAX_SECTIONS);
  
  if (limitedSections.length === 0) return content;
  
  content.push({
    text: 'REPORT SECTIONS',
    fontSize: 16,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });
  
  content.push({
    canvas: [{
      type: 'line',
      x1: 0, y1: 0,
      x2: 515, y2: 0,
      lineWidth: 1,
      lineColor: PDF_COLORS.primary,
    }],
    margin: [0, 0, 0, 15] as Margins,
  });
  
  limitedSections.forEach((section, index) => {
    content.push({
      text: `${section.section_number}. ${section.section_title}`,
      fontSize: 13,
      bold: true,
      margin: [0, index === 0 ? 10 : 20, 0, 8] as Margins,
    });
    
    if (section.content) {
      content.push({
        text: section.content,
        fontSize: 10,
        color: PDF_COLORS.text,
        lineHeight: 1.4,
        margin: [0, 0, 0, 10] as Margins,
      });
    } else {
      content.push({
        text: 'No content provided for this section.',
        fontSize: 10,
        italics: true,
        color: PDF_COLORS.textLight,
        margin: [0, 0, 0, 10] as Margins,
      });
    }
  });
  
  return content;
}

// ============================================================================
// MAIN GENERATOR - Following exact cost report pattern
// ============================================================================

export async function generateBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions
): Promise<BulkServicesPDFResult> {
  const startTime = Date.now();
  console.log('[BulkServicesPDF] Starting PDF generation...');
  
  // Step 1: Pre-process all external data BEFORE building document
  options.onProgress?.('Fetching data...');
  const { companyName, logoBase64 } = await fetchCompanyDetails();
  console.log('[BulkServicesPDF] Pre-processing complete');
  
  // Step 2: Create document using standard builder
  options.onProgress?.('Building document...');
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
  });
  
  // Step 3: Add content sections
  options.onProgress?.('Adding cover page...');
  doc.add(buildCoverPage(document, options, companyName, logoBase64));
  
  options.onProgress?.('Adding document info...');
  doc.add(buildDocumentInfo(document, options.projectName));
  
  options.onProgress?.('Adding load analysis...');
  doc.add(buildLoadAnalysis(document));
  
  if (sections.length > 0) {
    options.onProgress?.('Adding sections...');
    doc.add(buildSectionsContent(sections));
  }
  
  // Step 4: Add headers and footers
  doc.withStandardHeader(options.projectName || 'Bulk Services Report', options.revision);
  doc.withStandardFooter();
  
  // Step 5: Set metadata
  doc.setInfo({
    title: `Bulk Services Report - ${options.projectName || document.document_number}`,
    author: companyName || 'Bulk Services Generator',
    subject: 'Bulk Services Electrical Infrastructure Report',
    creator: 'Lovable Bulk Services Generator',
  });
  
  // Step 6: Generate filename
  const filename = `BulkServices_${document.document_number}_${options.revision}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  // Step 7: Generate blob with 120s timeout
  options.onProgress?.('Generating PDF...');
  console.log('[BulkServicesPDF] Calling toBlob with 120s timeout...');
  
  try {
    const blob = await doc.toBlob(120000);
    const elapsed = Date.now() - startTime;
    console.log(`[BulkServicesPDF] PDF generated in ${elapsed}ms, size: ${Math.round(blob.size / 1024)}KB`);
    
    return { blob, filename };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[BulkServicesPDF] Generation failed after ${elapsed}ms:`, error);
    throw error;
  }
}

/**
 * Direct download using pdfmake's internal download() - most reliable
 */
export async function downloadBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions,
  filename?: string
): Promise<void> {
  console.log('[BulkServicesPDF] Starting direct download...');
  
  const { companyName, logoBase64 } = await fetchCompanyDetails();
  
  const doc = createDocument({
    pageSize: 'A4',
    orientation: 'portrait',
  });
  
  doc.add(buildCoverPage(document, options, companyName, logoBase64));
  doc.add(buildDocumentInfo(document, options.projectName));
  doc.add(buildLoadAnalysis(document));
  
  if (sections.length > 0) {
    doc.add(buildSectionsContent(sections));
  }
  
  doc.withStandardHeader(options.projectName || 'Bulk Services Report', options.revision);
  doc.withStandardFooter();
  
  const downloadFilename = filename || `BulkServices_${document.document_number}_${options.revision}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  
  await doc.download(downloadFilename);
  console.log('[BulkServicesPDF] Download triggered');
}
