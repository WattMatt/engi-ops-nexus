/**
 * Tenant Completion Report Registration
 * 
 * Defines how Tenant Handover Completion reports are generated.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, tableLayouts, SPACING } from '../../styles';
import { buildMetricCard, dataTable, pageBreak, formatPercentage, formatDate } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface TenantCompletionData {
  projectName: string;
  reportDate: string;
  
  stats: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
    overallPercentage: number;
  };
  
  tenants: {
    shop_number: string;
    shop_name: string;
    completionPercentage: number;
    completedCount: number;
    totalCount: number;
  }[];
  
  documents: {
    document_type: string;
    file_name: string | null;
    uploaded_at: string;
  }[];
  
  exclusions: {
    document_type: string;
    notes: string | null;
    created_at: string;
  }[];
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildSummarySection(data: TenantCompletionData): Content[] {
  return [
    { text: 'Handover Status Summary', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    
    // KPI Cards
    {
      columns: [
        buildMetricCard(formatPercentage(data.stats.overallPercentage), 'Overall Completion', { width: '*', valueColor: PDF_COLORS.primary }),
        buildMetricCard(data.stats.complete, 'Completed Units', { width: '*', valueColor: PDF_COLORS.success }),
        buildMetricCard(data.stats.inProgress, 'In Progress', { width: '*', valueColor: PDF_COLORS.warning }),
        buildMetricCard(data.stats.notStarted, 'Not Started', { width: '*', valueColor: PDF_COLORS.danger }),
      ],
      columnGap: 10,
      margin: [0, 0, 0, SPACING.xl] as Margins,
    },
  ];
}

function buildTenantList(data: TenantCompletionData): Content[] {
  if (data.tenants.length === 0) return [];

  const rows = data.tenants.map(t => [
    { text: t.shop_number, bold: true },
    t.shop_name,
    { text: `${t.completedCount} / ${t.totalCount}`, alignment: 'center' as const },
    { 
      text: formatPercentage(t.completionPercentage), 
      alignment: 'right' as const,
      color: t.completionPercentage === 100 ? PDF_COLORS.success : (t.completionPercentage === 0 ? PDF_COLORS.danger : PDF_COLORS.warning),
      bold: true
    }
  ]);

  return [
    pageBreak(),
    { text: 'Tenant Completion Status', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    {
      table: {
        headerRows: 1,
        widths: [80, '*', 100, 80],
        body: [
          [
            { text: 'Shop No.', style: 'tableHeader' },
            { text: 'Tenant Name', style: 'tableHeader' },
            { text: 'Docs (Done/Total)', style: 'tableHeader', alignment: 'center' },
            { text: 'Completion', style: 'tableHeader', alignment: 'right' },
          ],
          ...rows
        ]
      },
      layout: tableLayouts.zebra
    }
  ];
}

function buildDocumentIndex(data: TenantCompletionData): Content[] {
  if (data.documents.length === 0 && data.exclusions.length === 0) return [];

  const content: Content[] = [pageBreak(), { text: 'Document Register', style: 'h2', margin: [0, 0, 0, SPACING.lg] }];

  if (data.documents.length > 0) {
    content.push(
      { text: 'Uploaded Documents', style: 'h3', margin: [0, 0, 0, SPACING.sm] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 100],
          body: [
            [
              { text: 'Type', style: 'tableHeader' },
              { text: 'Filename', style: 'tableHeader' },
              { text: 'Date', style: 'tableHeader', alignment: 'right' },
            ],
            ...data.documents.map(d => [
              d.document_type,
              d.file_name || '-',
              { text: formatDate(d.uploaded_at), alignment: 'right' as const }
            ])
          ]
        },
        layout: tableLayouts.lightHorizontalLines,
        margin: [0, 0, 0, SPACING.lg]
      }
    );
  }

  if (data.exclusions.length > 0) {
    content.push(
      { text: 'Exclusions / Notes', style: 'h3', margin: [0, 0, 0, SPACING.sm] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 100],
          body: [
            [
              { text: 'Type', style: 'tableHeader' },
              { text: 'Note', style: 'tableHeader' },
              { text: 'Date', style: 'tableHeader', alignment: 'right' },
            ],
            ...data.exclusions.map(e => [
              e.document_type,
              e.notes || '-',
              { text: formatDate(e.created_at), alignment: 'right' as const }
            ])
          ]
        },
        layout: tableLayouts.lightHorizontalLines
      }
    );
  }

  return content;
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

function buildContent(data: TenantCompletionData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  content.push(...buildSummarySection(data));
  content.push(...buildTenantList(data));
  content.push(...buildDocumentIndex(data));
  
  return content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<TenantCompletionData>({
  type: 'tenant-completion',
  name: 'Tenant Handover Completion',
  description: 'Status report of tenant handover documentation completion',
  
  defaultConfig: {
    includeCoverPage: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  buildContent,
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));
