/**
 * PDFMake Bulk Services Builder
 * 
 * Complete pdfmake implementation for Bulk Services PDF generation.
 * Migrated from jsPDF to use declarative pdfmake approach.
 */

import type { Content, TableCell, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';
import { format } from 'date-fns';
import { createDocument, PDFDocumentBuilder } from './documentBuilder';
import { PDF_COLORS, FONT_SIZES, tableLayouts, SPACING } from './styles';
import { 
  imageToBase64, 
  spacer, 
  horizontalLine, 
  formatDate, 
  buildPanel,
  buildInfoBox,
  buildMetricCard,
} from './helpers';
import { fetchCompanyDetails, type CompanyDetails } from './coverPage';
import { STANDARD_MARGINS } from './config';
import { COPPER_CABLE_TABLE } from '@/utils/cableSizing';

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

export interface PDFGenerationResult {
  blob: Blob;
  filename: string;
}

interface BulkServicesPDFOptions {
  projectName?: string;
  revision: string;
  companyDetails?: CompanyDetails;
  chartDataUrl?: string;
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
  // Diagram colors
  supplyBlue: '#3498db',
  meterYellow: '#f1c40f',
  protectionRed: '#e74c3c',
  mdbGreen: '#2ecc71',
  subDbPurple: '#9b59b6',
};

const METHOD_NAMES: Record<string, string> = {
  'sans_204': 'SANS 204 - Commercial/Retail',
  'sans_10142': 'SANS 10142-1 - General Buildings',
  'residential': 'Residential ADMD Method',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getZoneColor = (value: number): string => {
  if (value >= 89) return '#fee2e2'; // light red
  if (value >= 82) return '#fef3c7'; // light amber
  return '#dbeafe'; // light blue
};

// ============================================================================
// SECTION BUILDERS
// ============================================================================

// Safety limits to prevent hanging (matching cost report best practices)
const MAX_SECTIONS = 50;
const MAX_CHART_SIZE_BYTES = 200 * 1024; // 200KB

/**
 * Build cover page - now synchronous, uses pre-processed logo
 */
const buildCoverPage = (
  document: BulkServicesDocument,
  options: BulkServicesPDFOptions,
  companyDetails?: CompanyDetails,
  logoBase64?: string | null
): Content[] => {
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

  // Logo if available (pre-processed base64)
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

  // Document number
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
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
    },
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
};

/**
 * Build document information page
 */
const buildDocumentInfo = (
  document: BulkServicesDocument,
  projectName?: string
): Content[] => {
  const content: Content[] = [];

  content.push({
    text: 'DOCUMENT INFORMATION',
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });

  content.push(horizontalLine({ color: COLORS.primary, width: 2 }));

  // Info table
  const infoRows: TableCell[][] = [
    [
      { text: 'Document Number', style: 'label' },
      { text: document.document_number, style: 'value' },
    ],
    [
      { text: 'Project', style: 'label' },
      { text: projectName || '', style: 'value' },
    ],
    [
      { text: 'Created', style: 'label' },
      { text: format(new Date(document.created_at), 'dd MMMM yyyy'), style: 'value' },
    ],
  ];

  if (document.building_calculation_type) {
    infoRows.push([
      { text: 'Calculation Method', style: 'label' },
      { text: METHOD_NAMES[document.building_calculation_type] || document.building_calculation_type, style: 'value' },
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

  // Notes if present
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
};

/**
 * Build SANS 204 analysis page
 */
const buildSANS204Analysis = (document: BulkServicesDocument): Content[] => {
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

  // SANS 204 Table 1
  content.push({
    text: 'SANS 204 Table 1 - Zone Comparison (VA/m²)',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  const sans204Data = [
    ['Class', 'Building Type', 'Zone 1\nCold Int', 'Zone 2\nTemp Int', 'Zone 3\nHot Int', 'Zone 4\nTemp Coast', 'Zone 5\nSub-trop', 'Zone 6\nArid Int'],
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
      widths: [30, 90, 45, 45, 45, 45, 45, 45],
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

  // Statistics Cards
  content.push({
    text: 'Overall Statistics',
    fontSize: 12,
    bold: true,
    margin: [0, 15, 0, 10] as Margins,
  });

  // Simplified statistics table (avoiding function-based layouts that can hang pdfmake)
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

  // Zone Statistics Grid
  content.push({
    text: 'Zone Statistics',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  const zoneData = [
    { num: 'Zone 1', name: 'Cold Interior', avg: '84.3', min: '80', max: '90' },
    { num: 'Zone 2', name: 'Temperate Interior', avg: '79.3', min: '75', max: '85' },
    { num: 'Zone 3', name: 'Hot Interior', avg: '89.3', min: '85', max: '95' },
    { num: 'Zone 4', name: 'Temperate Coastal', avg: '79.3', min: '75', max: '85' },
    { num: 'Zone 5', name: 'Sub-tropical Coastal', avg: '79.3', min: '75', max: '85' },
    { num: 'Zone 6', name: 'Arid Interior', avg: '84.3', min: '80', max: '90' },
  ];

  const selectedZoneNum = document.climatic_zone 
    ? parseInt(document.climatic_zone.replace(/\D/g, '')) 
    : null;

  // Zone Statistics Table - simplified layout
  content.push({
    table: {
      headerRows: 1,
      widths: ['auto', '*', 'auto', 'auto', 'auto'],
      body: [
        [
          { text: 'Zone', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 8 },
          { text: 'Description', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 8 },
          { text: 'Avg', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 8, alignment: 'center' as const },
          { text: 'Min', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 8, alignment: 'center' as const },
          { text: 'Max', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 8, alignment: 'center' as const },
        ],
        ...zoneData.map(zone => {
          const zoneNum = parseInt(zone.num.replace(/\D/g, ''));
          const isSelected = zoneNum === selectedZoneNum;
          const bgColor = isSelected ? '#dbeafe' : undefined;
          return [
            { text: zone.num, fontSize: 8, bold: isSelected, fillColor: bgColor },
            { text: zone.name, fontSize: 8, fillColor: bgColor },
            { text: zone.avg, fontSize: 8, alignment: 'center' as const, fillColor: bgColor },
            { text: zone.min, fontSize: 8, color: COLORS.success, alignment: 'center' as const, fillColor: bgColor },
            { text: zone.max, fontSize: 8, color: COLORS.danger, alignment: 'center' as const, fillColor: bgColor },
          ];
        }),
      ],
    },
    layout: tableLayouts.zebra,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Key Insights
  content.push({
    text: 'Key Insights',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  const insights = [
    'The range across all zones and building types is 20 VA/m² (27% variation)',
    'Hot interior zones (Zone 3) require the highest loads due to cooling requirements',
    'Retail (F1) and Hotels (H1) have the highest load requirements',
    `Your selected configuration requires ${document.va_per_sqm || '90'} VA/m² in ${document.climatic_zone || 'Zone 1'}`,
  ];

  // Use standard layout instead of function-based layout
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        ul: insights.map(i => ({ text: i, fontSize: 9 })),
        margin: [8, 8, 8, 8] as Margins,
        fillColor: COLORS.lightGray,
      }]],
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Calculation Breakdown
  if (document.project_area && document.va_per_sqm) {
    const totalConnectedLoad = document.project_area * document.va_per_sqm / 1000;
    const maxDemand = totalConnectedLoad * (document.diversity_factor || 0.75);

    content.push({
      text: 'Calculation Breakdown',
      fontSize: 12,
      bold: true,
      margin: [0, 10, 0, 10] as Margins,
    });

    content.push({
      ol: [
        { text: `SANS 204 Applied Load: ${document.va_per_sqm} VA/m²`, fontSize: 9 },
        { text: `Total Connected Load: ${document.project_area.toLocaleString()} m² × ${document.va_per_sqm} VA/m² = ${(document.project_area * document.va_per_sqm).toLocaleString()} VA`, fontSize: 9 },
        { text: `Convert to kVA: ${(document.project_area * document.va_per_sqm).toLocaleString()} VA ÷ 1000 = ${totalConnectedLoad.toFixed(2)} kVA`, fontSize: 9 },
        { text: `Apply Diversity Factor: ${totalConnectedLoad.toFixed(2)} kVA × ${document.diversity_factor || 0.75} = ${maxDemand.toFixed(2)} kVA`, fontSize: 9 },
      ],
      margin: [20, 0, 0, 15] as Margins,
    });

    // Summary table
    content.push({
      table: {
        headerRows: 1,
        widths: [120, 80],
        body: [
          [
            { text: 'Parameter', bold: true, fillColor: COLORS.lightGray, fontSize: 9 },
            { text: 'Value', bold: true, fillColor: COLORS.lightGray, fontSize: 9, alignment: 'right' as const },
          ],
          [
            { text: 'Total Connected Load', fontSize: 9 },
            { text: `${totalConnectedLoad.toFixed(2)} kVA`, fontSize: 9, alignment: 'right' as const },
          ],
          [
            { text: 'Diversity Factor', fontSize: 9 },
            { text: `${document.diversity_factor || 0.75}`, fontSize: 9, alignment: 'right' as const },
          ],
          [
            { text: 'Maximum Demand', fontSize: 9, bold: true },
            { text: `${maxDemand.toFixed(2)} kVA`, fontSize: 9, bold: true, alignment: 'right' as const },
          ],
        ],
      },
      layout: tableLayouts.standard,
      margin: [0, 0, 0, 0] as Margins,
    });
  }

  content.push({ text: '', pageBreak: 'after' });

  return content;
};

/**
 * Build connection size and cable routing page
 */
const buildConnectionAndCabling = (document: BulkServicesDocument): Content[] => {
  const content: Content[] = [];

  const maxDemandKVA = document.maximum_demand || 0;
  const maxDemandAmps = maxDemandKVA > 0 ? (maxDemandKVA * 1000) / (Math.sqrt(3) * 400) : 0;
  const maxAmpsPerCable = 300;
  const cablesNeeded = Math.ceil(maxDemandAmps / maxAmpsPerCable) || 1;
  const ampsPerCable = maxDemandAmps / cablesNeeded;
  const suitableCable = COPPER_CABLE_TABLE.find(cable => cable.currentRatingAir >= ampsPerCable) 
    || COPPER_CABLE_TABLE[COPPER_CABLE_TABLE.length - 1];
  const breakerSize = Math.ceil(maxDemandAmps / 50) * 50 || 100;

  content.push({
    text: 'CONNECTION SIZE & CABLE ROUTING',
    fontSize: 18,
    bold: true,
    color: COLORS.primary,
    margin: [0, 0, 0, 15] as Margins,
  });

  content.push(horizontalLine({ color: COLORS.primary, width: 2 }));

  // Connection Parameters Table
  content.push({
    text: 'Connection Parameters',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  content.push({
    table: {
      headerRows: 1,
      widths: [100, 80, '*'],
      body: [
        [
          { text: 'Parameter', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 9 },
          { text: 'Value', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 9, alignment: 'center' as const },
          { text: 'Notes', bold: true, fillColor: COLORS.secondary, color: COLORS.white, fontSize: 9 },
        ],
        [
          { text: 'Maximum Demand', fontSize: 9 },
          { text: `${maxDemandKVA.toFixed(2)} kVA`, fontSize: 9, alignment: 'center' as const },
          { text: 'After diversity', fontSize: 9 },
        ],
        [
          { text: 'Supply Voltage', fontSize: 9 },
          { text: document.primary_voltage || '11kV/400V', fontSize: 9, alignment: 'center' as const },
          { text: '3-Phase', fontSize: 9 },
        ],
        [
          { text: 'Design Current', fontSize: 9 },
          { text: `${maxDemandAmps.toFixed(1)} A`, fontSize: 9, alignment: 'center' as const },
          { text: 'Per phase', fontSize: 9 },
        ],
        [
          { text: 'Connection Size', fontSize: 9 },
          { text: document.connection_size || `${maxDemandKVA.toFixed(0)} kVA`, fontSize: 9, alignment: 'center' as const },
          { text: 'Required capacity', fontSize: 9 },
        ],
        [
          { text: 'Supply Authority', fontSize: 9 },
          { text: document.supply_authority || 'TBD', fontSize: 9, alignment: 'center' as const },
          { text: 'Local municipality', fontSize: 9 },
        ],
      ],
    },
    layout: tableLayouts.zebra,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Single Line Diagram (simplified text representation)
  content.push({
    text: 'Single Line Diagram - Bulk Connection',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 15] as Margins,
  });

  // Simplified diagram - using basic table structure instead of complex nested layouts
  // Complex diagram layouts with function callbacks can cause pdfmake to hang
  const diagramRows = [
    {
      label: 'SUPPLY AUTHORITY',
      detail: document.primary_voltage || '11kV',
      bgColor: COLORS.supplyBlue,
      textColor: COLORS.white,
    },
    {
      label: 'BULK METERING',
      detail: `${document.connection_size || `${maxDemandKVA.toFixed(0)} kVA`} (Municipal Equipment)`,
      bgColor: COLORS.meterYellow,
      textColor: COLORS.text,
    },
    {
      label: 'MAIN PROTECTION',
      detail: `MCCB ${breakerSize}A @ 400V 3φ`,
      bgColor: COLORS.protectionRed,
      textColor: COLORS.white,
    },
    {
      label: 'MAIN DISTRIBUTION BOARD',
      detail: `Busbar Rating: ${breakerSize}A | Cable: ${cablesNeeded > 1 ? `${cablesNeeded}x ${suitableCable.size}` : suitableCable.size} COPPER`,
      bgColor: COLORS.mdbGreen,
      textColor: COLORS.white,
    },
  ];

  content.push({
    table: {
      headerRows: 0,
      widths: [180, '*'],
      body: diagramRows.map(row => [
        { 
          text: row.label, 
          fontSize: 10, 
          bold: true, 
          color: row.textColor, 
          fillColor: row.bgColor,
          alignment: 'center' as const,
          margin: [5, 8, 5, 8] as Margins,
        },
        { 
          text: row.detail, 
          fontSize: 9, 
          fillColor: '#f8fafc',
          margin: [8, 8, 8, 8] as Margins,
        },
      ]),
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 15] as Margins,
  });

  // Sub-distribution summary (simplified)
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'SUB-DB 1', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.subDbPurple, alignment: 'center' as const },
          { text: 'SUB-DB 2', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.subDbPurple, alignment: 'center' as const },
          { text: 'SUB-DB 3', bold: true, fontSize: 8, color: COLORS.white, fillColor: COLORS.subDbPurple, alignment: 'center' as const },
        ],
        [
          { text: 'Area 1', fontSize: 8, alignment: 'center' as const },
          { text: 'Area 2', fontSize: 8, alignment: 'center' as const },
          { text: 'Area 3', fontSize: 8, alignment: 'center' as const },
        ],
      ],
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Cable Routing Recommendations
  content.push({
    text: 'Cable Routing Recommendations',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 10] as Margins,
  });

  content.push({
    table: {
      headerRows: 1,
      widths: [90, 90, 90, 80],
      body: [
        [
          { text: 'Route Segment', bold: true, fillColor: '#2c3e50', color: COLORS.white, fontSize: 8 },
          { text: 'Cable Size', bold: true, fillColor: '#2c3e50', color: COLORS.white, fontSize: 8 },
          { text: 'Installation Method', bold: true, fillColor: '#2c3e50', color: COLORS.white, fontSize: 8 },
          { text: 'Protection', bold: true, fillColor: '#2c3e50', color: COLORS.white, fontSize: 8 },
        ],
        [
          { text: 'Supply → Metering', fontSize: 8 },
          { text: 'By Supply Authority', fontSize: 8 },
          { text: 'Underground (Ducts)', fontSize: 8 },
          { text: 'As per Authority', fontSize: 8 },
        ],
        [
          { text: 'Metering → Main Protection', fontSize: 8 },
          { text: `${suitableCable.size}${cablesNeeded > 1 ? ` (${cablesNeeded} cables)` : ''}`, fontSize: 8 },
          { text: 'Underground/Trunking', fontSize: 8 },
          { text: `${breakerSize}A MCCB`, fontSize: 8 },
        ],
        [
          { text: 'Main → Sub-distribution', fontSize: 8 },
          { text: 'Per sub-board load', fontSize: 8 },
          { text: 'Trunking/Cable Tray', fontSize: 8 },
          { text: 'Per circuit design', fontSize: 8 },
        ],
        [
          { text: 'Future Expansion', fontSize: 8 },
          { text: `Allow ${Math.round(((document.future_expansion_factor || 1.2) - 1) * 100)}% spare capacity`, fontSize: 8 },
          { text: 'Reserve conduits', fontSize: 8 },
          { text: 'Upsize protection', fontSize: 8 },
        ],
      ],
    },
    layout: tableLayouts.zebra,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Technical Notes
  content.push({
    text: 'Technical Notes',
    fontSize: 10,
    bold: true,
    margin: [0, 10, 0, 8] as Margins,
  });

  const technicalNotes = [
    'All cables to be copper conductors, PVC insulated, SWA armoured, PVC sheathed',
    `Cable sizing based on ${maxDemandKVA.toFixed(2)} kVA maximum demand (${maxDemandAmps.toFixed(1)}A)`,
    `Installation method: ${suitableCable.currentRatingAir}A rating (air/trunking installation)`,
    'Voltage drop allowance: 2.5% from source to final distribution point',
    'All cable terminations to be crimped with appropriate lugs',
    'Earth continuity to be maintained throughout via cable armouring and earth bar',
    'Color coding: Brown/Black/Grey (L1/L2/L3), Blue (Neutral), Green-Yellow (Earth)',
    `Future expansion factor of ${((document.future_expansion_factor || 1.2) * 100).toFixed(0)}% considered in main infrastructure`,
  ];

  content.push({
    ul: technicalNotes.map(note => ({ text: note, fontSize: 8 })),
    margin: [0, 0, 0, 0] as Margins,
  });

  content.push({ text: '', pageBreak: 'after' });

  return content;
};

/**
 * Build section content pages
 */
const buildSectionContent = (sections: BulkServicesSection[]): Content[] => {
  const content: Content[] = [];

  for (const section of sections) {
    content.push({
      text: `${section.section_number}. ${section.section_title}`,
      fontSize: 16,
      bold: true,
      color: COLORS.primary,
      margin: [0, 0, 0, 10] as Margins,
    });

    content.push(horizontalLine({ color: COLORS.secondary, width: 1 }));

    if (section.content) {
      const lines = section.content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('## ')) {
          content.push({
            text: trimmed.replace('## ', ''),
            fontSize: 12,
            bold: true,
            margin: [0, 10, 0, 5] as Margins,
          });
        } else if (trimmed.startsWith('- ')) {
          content.push({
            text: `• ${trimmed.replace('- ', '')}`,
            fontSize: 10,
            margin: [10, 2, 0, 2] as Margins,
          });
        } else if (trimmed.startsWith('|')) {
          // Table row - render as monospace style (using Roboto since Courier not available)
          content.push({
            text: trimmed,
            fontSize: 8,
            font: 'Roboto',
            margin: [0, 1, 0, 1] as Margins,
          });
        } else if (trimmed) {
          content.push({
            text: trimmed,
            fontSize: 10,
            margin: [0, 3, 0, 3] as Margins,
          });
        }
      }
    }

    content.push({ text: '', pageBreak: 'after' });
  }

  return content;
};

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate Bulk Services PDF using pdfmake
 */
export async function generateBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions
): Promise<PDFGenerationResult> {
  console.log('[BulkServicesPDF] Starting pdfmake generation...');
  const startTime = Date.now();

  try {
    // ========== PHASE 1: Pre-process all async data BEFORE document building ==========
    console.log('[BulkServicesPDF] Phase 1: Pre-processing data...');
    
    // Fetch company details
    console.log('[BulkServicesPDF] Fetching company details...');
    const companyDetails = options.companyDetails || await fetchCompanyDetails();
    
    // Pre-convert logo to base64 (like Cost Report does)
    let logoBase64: string | null = null;
    if (companyDetails?.logoUrl) {
      try {
        console.log('[BulkServicesPDF] Converting logo to base64...');
        logoBase64 = await imageToBase64(companyDetails.logoUrl);
        console.log('[BulkServicesPDF] Logo converted successfully');
      } catch (error) {
        console.warn('[BulkServicesPDF] Failed to convert logo, skipping:', error);
        logoBase64 = null; // Proceed without logo
      }
    }
    
    // Validate and limit chart size
    let validChartDataUrl: string | null = null;
    if (options.chartDataUrl && options.chartDataUrl.startsWith('data:image/')) {
      const chartSizeBytes = options.chartDataUrl.length * 0.75; // Approximate base64 to bytes
      if (chartSizeBytes <= MAX_CHART_SIZE_BYTES) {
        validChartDataUrl = options.chartDataUrl;
        console.log(`[BulkServicesPDF] Chart validated: ${Math.round(chartSizeBytes / 1024)}KB`);
      } else {
        console.warn(`[BulkServicesPDF] Chart too large (${Math.round(chartSizeBytes / 1024)}KB > ${MAX_CHART_SIZE_BYTES / 1024}KB), skipping`);
      }
    }
    
    // Apply safety limits to sections
    const limitedSections = sections.slice(0, MAX_SECTIONS);
    if (sections.length > MAX_SECTIONS) {
      console.warn(`[BulkServicesPDF] Sections limited from ${sections.length} to ${MAX_SECTIONS}`);
    }

    // ========== PHASE 2: Build document synchronously ==========
    console.log('[BulkServicesPDF] Phase 2: Building document...');
    
    const doc = createDocument({
      orientation: 'portrait',
      pageSize: 'A4',
    });

    // Add custom styles
    doc.addStyles({
      label: { fontSize: 9, color: COLORS.textMuted, bold: true },
      value: { fontSize: 10, color: COLORS.text },
    });

    // Cover Page (now synchronous - uses pre-processed logo)
    console.log('[BulkServicesPDF] Building cover page...');
    doc.add(buildCoverPage(document, options, companyDetails, logoBase64));

    // Document Information
    console.log('[BulkServicesPDF] Building document info...');
    doc.add(buildDocumentInfo(document, options.projectName));

    // SANS 204 Analysis
    console.log('[BulkServicesPDF] Building SANS 204 analysis...');
    doc.add(buildSANS204Analysis(document));

    // Connection & Cabling
    console.log('[BulkServicesPDF] Building connection & cabling...');
    doc.add(buildConnectionAndCabling(document));

    // Chart if available and validated
    if (validChartDataUrl) {
      console.log('[BulkServicesPDF] Adding chart...');
      doc.add([
        {
          text: 'Zone Load Comparison Chart',
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          image: validChartDataUrl,
          width: 500,
          margin: [0, 0, 0, 20] as Margins,
        },
        { text: '', pageBreak: 'after' },
      ]);
    }

    // Section Content (with limits applied)
    if (limitedSections.length > 0) {
      console.log(`[BulkServicesPDF] Building ${limitedSections.length} sections...`);
      doc.add(buildSectionContent(limitedSections));
    }

    // Configure standard header/footer (skip first page automatically)
    doc.withStandardHeader('Bulk Services Report', options.projectName);
    doc.withStandardFooter(false);

    // ========== PHASE 3: Generate PDF blob using toBlob (same as Cost Report) ==========
    console.log('[BulkServicesPDF] Phase 3: Generating PDF via doc.toBlob()...');
    
    // Use the standard toBlob method which internally uses getBase64 - proven reliable
    const blob = await doc.toBlob(90000);

    const filename = `bulk-services-${document.document_number.replace(/\s+/g, '-')}-${options.revision}-${format(new Date(), 'yyyyMMdd')}.pdf`;

    const elapsed = Date.now() - startTime;
    console.log(`[BulkServicesPDF] Generation complete: ${(blob.size / 1024).toFixed(1)}KB in ${elapsed}ms`);

    return { blob, filename };
  } catch (error) {
    console.error('[BulkServicesPDF] Generation failed:', error);
    throw error;
  }
}

/**
 * Download Bulk Services PDF directly
 */
export async function downloadBulkServicesPDF(
  document: BulkServicesDocument,
  sections: BulkServicesSection[],
  options: BulkServicesPDFOptions
): Promise<void> {
  const { blob, filename } = await generateBulkServicesPDF(document, sections, options);
  
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
