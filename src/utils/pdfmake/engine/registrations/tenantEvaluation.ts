/**
 * Tenant Evaluation Report Registration
 * 
 * Defines how tenant evaluation PDFs are generated.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, tableLayouts } from '../../styles';
import { buildPanel } from '../../helpers';
import { format } from 'date-fns';

// ============================================================================
// DATA TYPES
// ============================================================================

type EvaluationValue = 'yes' | 'no' | 'na';

interface TenantEvaluationData {
  tenantName: string;
  shopNumber: string;
  projectName: string;
  evaluationDate: string;
  evaluatedBy: string;
  revision: number;
  
  // Tenant Design Pack items
  tdpDbPositionIndicated?: EvaluationValue;
  tdpDbRatingConfirmed?: EvaluationValue;
  tdpSingleLineDiagram?: EvaluationValue;
  tdpCircuitSchedule?: EvaluationValue;
  tdpLightingLayout?: EvaluationValue;
  tdpPowerLayout?: EvaluationValue;
  tdpDataLayout?: EvaluationValue;
  
  // Scope of Work items
  sowDbSupplyConfirmed?: EvaluationValue;
  sowCableRouteConfirmed?: EvaluationValue;
  sowMeteringRequired?: EvaluationValue;
  sowSignageRequirements?: EvaluationValue;
  sowHvacRequirements?: EvaluationValue;
  sowFireDetection?: EvaluationValue;
  sowSecuritySystem?: EvaluationValue;
  
  // Comments and notes
  comments?: string;
  status: 'draft' | 'completed' | 'approved';
}

// ============================================================================
// HELPERS
// ============================================================================

function formatEvaluationValue(value: EvaluationValue | undefined): { text: string; color: string } {
  switch (value) {
    case 'yes':
      return { text: '✓ Yes', color: PDF_COLORS.success };
    case 'no':
      return { text: '✗ No', color: PDF_COLORS.danger };
    case 'na':
      return { text: '— N/A', color: PDF_COLORS.textMuted };
    default:
      return { text: '—', color: PDF_COLORS.textMuted };
  }
}

function buildEvaluationRow(label: string, value: EvaluationValue | undefined): any[] {
  const formatted = formatEvaluationValue(value);
  return [
    { text: label },
    { text: formatted.text, color: formatted.color, alignment: 'center' as const },
  ];
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildHeaderSection(data: TenantEvaluationData, config: ReportConfig): Content[] {
  return [
    { text: 'Tenant Evaluation Form', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
    
    // Header info table
    {
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'Tenant:', bold: true },
            { text: data.tenantName },
            { text: 'Shop No:', bold: true },
            { text: data.shopNumber },
          ],
          [
            { text: 'Project:', bold: true },
            { text: data.projectName },
            { text: 'Date:', bold: true },
            { text: format(new Date(data.evaluationDate), 'dd MMM yyyy') },
          ],
          [
            { text: 'Evaluated By:', bold: true },
            { text: data.evaluatedBy },
            { text: 'Revision:', bold: true },
            { text: String(data.revision) },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => PDF_COLORS.border,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, SPACING.xl] as Margins,
    },
    
    // Status badge
    {
      table: {
        widths: ['auto'],
        body: [[
          {
            text: `Status: ${data.status.toUpperCase()}`,
            fillColor: data.status === 'approved' ? PDF_COLORS.successLight 
                     : data.status === 'completed' ? PDF_COLORS.primaryLight 
                     : PDF_COLORS.backgroundAlt,
            color: data.status === 'approved' ? PDF_COLORS.success 
                 : data.status === 'completed' ? PDF_COLORS.primary 
                 : PDF_COLORS.textMuted,
            bold: true,
            margin: [SPACING.sm, SPACING.xs, SPACING.sm, SPACING.xs] as Margins,
          }
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, SPACING.lg] as Margins,
    },
  ];
}

function buildTDPSection(data: TenantEvaluationData, config: ReportConfig): Content[] {
  return [
    { text: 'Tenant Design Pack (TDP) Review', style: ['heading', 'h2'], margin: [0, SPACING.lg, 0, SPACING.md] as Margins },
    {
      table: {
        widths: ['*', 80],
        body: [
          [{ text: 'Item', style: 'tableHeader' }, { text: 'Status', style: 'tableHeader', alignment: 'center' as const }],
          buildEvaluationRow('DB Position Indicated on Layout', data.tdpDbPositionIndicated),
          buildEvaluationRow('DB Rating Confirmed', data.tdpDbRatingConfirmed),
          buildEvaluationRow('Single Line Diagram Provided', data.tdpSingleLineDiagram),
          buildEvaluationRow('Circuit Schedule Provided', data.tdpCircuitSchedule),
          buildEvaluationRow('Lighting Layout Provided', data.tdpLightingLayout),
          buildEvaluationRow('Power Layout Provided', data.tdpPowerLayout),
          buildEvaluationRow('Data/IT Layout Provided', data.tdpDataLayout),
        ],
      },
      layout: tableLayouts.zebra,
    },
  ];
}

function buildSOWSection(data: TenantEvaluationData, config: ReportConfig): Content[] {
  return [
    { text: 'Scope of Work (SOW) Review', style: ['heading', 'h2'], margin: [0, SPACING.xl, 0, SPACING.md] as Margins },
    {
      table: {
        widths: ['*', 80],
        body: [
          [{ text: 'Item', style: 'tableHeader' }, { text: 'Status', style: 'tableHeader', alignment: 'center' as const }],
          buildEvaluationRow('DB Supply Point Confirmed', data.sowDbSupplyConfirmed),
          buildEvaluationRow('Cable Route Confirmed', data.sowCableRouteConfirmed),
          buildEvaluationRow('Metering Requirements Confirmed', data.sowMeteringRequired),
          buildEvaluationRow('Signage Requirements Confirmed', data.sowSignageRequirements),
          buildEvaluationRow('HVAC Requirements Confirmed', data.sowHvacRequirements),
          buildEvaluationRow('Fire Detection Requirements', data.sowFireDetection),
          buildEvaluationRow('Security System Requirements', data.sowSecuritySystem),
        ],
      },
      layout: tableLayouts.zebra,
    },
  ];
}

function buildCommentsSection(data: TenantEvaluationData, config: ReportConfig): Content[] {
  if (!data.comments) return [];
  
  return [
    { text: 'Comments & Notes', style: ['heading', 'h2'], margin: [0, SPACING.xl, 0, SPACING.md] as Margins },
    buildPanel('', { text: data.comments, style: 'body' }),
  ];
}

// ============================================================================
// MAIN CONTENT BUILDER
// ============================================================================

function buildTenantEvaluationContent(data: TenantEvaluationData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  content.push(...buildHeaderSection(data, config));
  content.push(...buildTDPSection(data, config));
  content.push(...buildSOWSection(data, config));
  content.push(...buildCommentsSection(data, config));
  
  // Signature section
  content.push(
    { text: '', margin: [0, SPACING['2xl'], 0, 0] as Margins },
    {
      columns: [
        {
          stack: [
            { text: 'Evaluated By:', style: 'small', color: PDF_COLORS.textMuted },
            { text: '', margin: [0, 30, 0, 0] as Margins },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.text }] },
            { text: 'Signature', style: 'small', color: PDF_COLORS.textMuted },
          ],
        },
        {
          stack: [
            { text: 'Date:', style: 'small', color: PDF_COLORS.textMuted },
            { text: '', margin: [0, 30, 0, 0] as Margins },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.text }] },
            { text: 'Date', style: 'small', color: PDF_COLORS.textMuted },
          ],
        },
      ],
      columnGap: SPACING.xl,
    }
  );
  
  return content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<TenantEvaluationData>({
  type: 'tenant-evaluation',
  name: 'Tenant Evaluation Report',
  description: 'Tenant design pack and scope of work evaluation form',
  
  defaultConfig: {
    includeCoverPage: false,
    includeConfidentialNotice: false,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  chartConfigs: [],
  
  buildContent: buildTenantEvaluationContent,
  
  validateData: (data) => {
    const errors: string[] = [];
    if (!data.tenantName) errors.push('Tenant name is required');
    if (!data.shopNumber) errors.push('Shop number is required');
    if (!data.evaluatedBy) errors.push('Evaluator name is required');
    return { valid: errors.length === 0, errors };
  },
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'server',
}));
