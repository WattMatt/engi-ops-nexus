/**
 * Cost Report Registration
 * 
 * Defines how cost report PDFs are generated.
 * Full implementation covering Summary, Details, Variations, and KPI Dashboards.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, tableLayouts, FONT_SIZES } from '../../styles';
import { buildPanel, buildMetricCard, dataTable, pageBreak, spacer, buildInfoBox } from '../../helpers';
import { formatCurrency } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface CostItem {
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  original_budget: number;
  previous_report: number;
  anticipated_final: number;
  total?: number; // Legacy support
}

export interface CostCategory {
  id: string;
  code: string;
  name: string; // Description
  budgeted: number; // Original Budget
  previous: number; // Previous Report
  actual: number;   // Anticipated Final
  variance: number; // Original Variance (Anticipated - Budget)
  variancePercent: number;
  items?: CostItem[];
}

export interface VariationItem {
  code: string;
  description: string;
  amount: number;
  status: 'credit' | 'addition';
  tenantName: string;
}

export interface VariationLineItem {
  line_number: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  comments: string;
}

export interface VariationSheetData {
  code: string;
  description: string;
  amount: number;
  isCredit: boolean;
  lineItems: VariationLineItem[];
}

export interface ContractorData {
  role: string;
  name: string | null;
  icon: string;
  accentColor: string;
}

export interface ProjectHealthData {
  totalOriginalBudget: number;
  totalAnticipatedFinal: number;
  totalCurrentVariance: number; // vs Previous
  totalOriginalVariance: number; // vs Budget
  categoryCount: number;
  categoriesOverBudget: number;
  categoriesUnderBudget: number;
  categoriesOnTrack: number;
  variationsCount: number;
  variationsTotal: number;
}

export interface CostReportData {
  projectName: string;
  projectNumber?: string;
  reportDate: string;
  reportNumber?: number | string;
  revision?: string;
  
  categories: CostCategory[];
  summary: {
    totalBudget: number;
    totalPrevious: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
  };
  
  variations?: {
    items: VariationItem[];
    total: number;
  };
  
  variationSheets?: VariationSheetData[];
  
  projectHealth?: ProjectHealthData;
  
  contractors?: ContractorData[];
  
  notes?: string;
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildSummarySection(data: CostReportData): Content[] {
  const { summary, categories } = data;
  const isOverBudget = summary.totalVariance > 0; // Positive variance means over budget (Extra) in this context usually? 
  // Wait, legacy code: currentVariance < 0 ? "(Saving)" : "Extra".
  // So negative is saving (good), positive is extra (bad).
  
  // KPI Cards
  const kpiSection: Content = {
    columns: [
      buildMetricCard(formatCurrency(summary.totalBudget), 'Original Budget', { width: '*', valueColor: PDF_COLORS.primary }),
      buildMetricCard(formatCurrency(summary.totalPrevious), 'Previous Report', { width: '*', valueColor: PDF_COLORS.text }),
      buildMetricCard(formatCurrency(summary.totalActual), 'Anticipated Final', { width: '*', valueColor: PDF_COLORS.secondary }),
      buildMetricCard(formatCurrency(Math.abs(summary.totalVariance)), summary.totalVariance < 0 ? 'Saving' : 'Extra', { 
        width: '*',
        valueColor: summary.totalVariance < 0 ? PDF_COLORS.success : PDF_COLORS.danger,
      }),
    ],
    columnGap: 10,
    margin: [0, 0, 0, SPACING.xl] as Margins,
  };

  // Main Category Table
  const tableBody = [
    // Header
    [
      { text: 'Code', style: 'tableHeader', width: 40 },
      { text: 'Description', style: 'tableHeader', width: '*' },
      { text: 'Original Budget', style: 'tableHeader', alignment: 'right' as const, width: 90 },
      { text: 'Previous Report', style: 'tableHeader', alignment: 'right' as const, width: 90 },
      { text: 'Anticipated Final', style: 'tableHeader', alignment: 'right' as const, width: 90 },
      { text: 'Variance', style: 'tableHeader', alignment: 'right' as const, width: 80 },
    ],
    // Data rows
    ...categories.map(cat => [
      { text: cat.code, bold: true },
      { text: cat.name },
      { text: formatCurrency(cat.budgeted), alignment: 'right' as const },
      { text: formatCurrency(cat.previous), alignment: 'right' as const },
      { text: formatCurrency(cat.actual), alignment: 'right' as const, bold: true },
      { 
        text: formatCurrency(Math.abs(cat.variance)),
        alignment: 'right' as const,
        color: cat.variance < 0 ? PDF_COLORS.success : (cat.variance > 0 ? PDF_COLORS.danger : PDF_COLORS.textMuted),
        fillColor: cat.variance < 0 ? '#dcfce7' : (cat.variance > 0 ? '#fee2e2' : undefined) // Light green/red bg for variance
      },
    ]),
    // Total row
    [
      { text: '', border: [false, false, false, false], colSpan: 2 },
      {},
      { text: formatCurrency(summary.totalBudget), bold: true, alignment: 'right' as const, fillColor: PDF_COLORS.backgroundAlt },
      { text: formatCurrency(summary.totalPrevious), bold: true, alignment: 'right' as const, fillColor: PDF_COLORS.backgroundAlt },
      { text: formatCurrency(summary.totalActual), bold: true, alignment: 'right' as const, fillColor: PDF_COLORS.backgroundAlt },
      { 
        text: formatCurrency(Math.abs(summary.totalVariance)),
        alignment: 'right' as const,
        bold: true,
        fillColor: PDF_COLORS.backgroundAlt,
        color: summary.totalVariance < 0 ? PDF_COLORS.success : PDF_COLORS.danger,
      },
    ],
  ];

  return [
    { text: 'Executive Summary', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    kpiSection,
    {
      table: {
        headerRows: 1,
        widths: [40, '*', 90, 90, 90, 80],
        body: tableBody,
      },
      layout: tableLayouts.professional,
    }
  ];
}

function buildProjectHealth(data: CostReportData): Content[] {
  if (!data.projectHealth) return [];
  const ph = data.projectHealth;

  return [
    pageBreak(),
    { text: 'Project Health Dashboard', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    
    // Top Row: Big Numbers
    {
      columns: [
        buildMetricCard(ph.categoryCount, 'Active Categories', { width: '*' }),
        buildMetricCard(ph.variationsCount, 'Total Variations', { width: '*' }),
        buildMetricCard(formatCurrency(ph.variationsTotal), 'Variations Value', { 
          width: '*', 
          valueColor: ph.variationsTotal < 0 ? PDF_COLORS.success : PDF_COLORS.danger 
        }),
      ],
      columnGap: 10,
      margin: [0, 0, 0, SPACING.xl]
    },

    // Status Grid
    {
      columns: [
        // Budget Status
        {
          stack: [
            { text: 'Budget Status', style: 'h3', margin: [0, 0, 0, 10] },
            buildInfoBox([
              { text: `Categories On Track: ${ph.categoriesOnTrack}`, color: PDF_COLORS.textMuted },
              { text: `Categories Under Budget: ${ph.categoriesUnderBudget}`, color: PDF_COLORS.success, bold: true },
              { text: `Categories Over Budget: ${ph.categoriesOverBudget}`, color: PDF_COLORS.danger, bold: true },
            ])
          ]
        },
        // Variance Analysis
        {
          stack: [
            { text: 'Variance Analysis', style: 'h3', margin: [0, 0, 0, 10] },
            buildInfoBox([
              { text: `Current Variance (vs Prev): ${formatCurrency(Math.abs(ph.totalCurrentVariance))}`, color: ph.totalCurrentVariance < 0 ? PDF_COLORS.success : PDF_COLORS.danger },
              { text: `Total Variance (vs Original): ${formatCurrency(Math.abs(ph.totalOriginalVariance))}`, color: ph.totalOriginalVariance < 0 ? PDF_COLORS.success : PDF_COLORS.danger },
            ])
          ]
        }
      ],
      columnGap: 20
    }
  ];
}

function buildCategoryDetails(data: CostReportData): Content[] {
  const content: Content[] = [];
  
  for (const category of data.categories) {
    if (!category.items || category.items.length === 0) continue;
    
    content.push(
      pageBreak(),
      { text: `${category.code} - ${category.name}`, style: 'h2', margin: [0, 0, 0, SPACING.md] },
      
      // Category Summary Header
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { text: `Original: ${formatCurrency(category.budgeted)}`, style: 'small' },
            { text: `Previous: ${formatCurrency(category.previous)}`, style: 'small' },
            { text: `Anticipated: ${formatCurrency(category.actual)}`, style: 'small', bold: true },
            { 
              text: `Variance: ${formatCurrency(Math.abs(category.variance))} ${category.variance < 0 ? '(Saving)' : '(Extra)'}`, 
              style: 'small', 
              color: category.variance < 0 ? PDF_COLORS.success : PDF_COLORS.danger 
            },
          ]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, SPACING.lg]
      },

      // Line Items
      {
        table: {
          headerRows: 1,
          widths: ['*', 90, 90, 90],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Original', style: 'tableHeader', alignment: 'right' },
              { text: 'Previous', style: 'tableHeader', alignment: 'right' },
              { text: 'Anticipated', style: 'tableHeader', alignment: 'right' },
            ],
            ...category.items.map(item => [
              { text: item.description },
              { text: formatCurrency(item.original_budget), alignment: 'right' as const },
              { text: formatCurrency(item.previous_report), alignment: 'right' as const },
              { text: formatCurrency(item.anticipated_final), alignment: 'right' as const },
            ]),
            // Subtotal
            [
              { text: 'SUBTOTAL', bold: true, alignment: 'right' },
              { text: formatCurrency(category.budgeted), bold: true, alignment: 'right' },
              { text: formatCurrency(category.previous), bold: true, alignment: 'right' },
              { text: formatCurrency(category.actual), bold: true, alignment: 'right' },
            ]
          ],
        },
        layout: tableLayouts.lightHorizontalLines,
      },
    );
  }
  
  return content;
}

function buildVariationsSection(data: CostReportData): Content[] {
  if (!data.variations || data.variations.items.length === 0) return [];
  
  const rows = data.variations.items.map(v => [
    { text: v.code, bold: true },
    v.description,
    v.tenantName || '-',
    { 
      text: formatCurrency(Math.abs(v.amount)), 
      alignment: 'right' as const, 
      color: v.amount < 0 ? PDF_COLORS.success : undefined 
    },
    { 
      text: v.amount < 0 ? 'Credit' : 'Addition', 
      alignment: 'center' as const,
      color: v.amount < 0 ? PDF_COLORS.success : undefined
    }
  ]);

  return [
    pageBreak(),
    { text: 'Variation Summary', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    {
      table: {
        headerRows: 1,
        widths: [60, '*', 100, 90, 70],
        body: [
          [
            { text: 'Code', style: 'tableHeader' },
            { text: 'Description', style: 'tableHeader' },
            { text: 'Reference', style: 'tableHeader' },
            { text: 'Amount', style: 'tableHeader', alignment: 'right' },
            { text: 'Type', style: 'tableHeader', alignment: 'center' },
          ],
          ...rows,
          [
            { text: 'TOTAL VARIATIONS', colSpan: 3, bold: true, alignment: 'right' },
            {}, {},
            { text: formatCurrency(data.variations.total), bold: true, alignment: 'right' },
            {}
          ]
        ]
      },
      layout: tableLayouts.zebra
    }
  ];
}

function buildVariationSheets(data: CostReportData): Content[] {
  if (!data.variationSheets || data.variationSheets.length === 0) return [];
  
  const content: Content[] = [];
  
  for (const sheet of data.variationSheets) {
    content.push(
      pageBreak(),
      { text: `Variation Sheet: ${sheet.code}`, style: 'h2', margin: [0, 0, 0, SPACING.sm] },
      { text: sheet.description, style: 'h3', color: PDF_COLORS.textMuted, margin: [0, 0, 0, SPACING.lg] },
      
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 50, 50, 80, 80],
          body: [
            [
              { text: '#', style: 'tableHeader' },
              { text: 'Description', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'center' },
              { text: 'Rate', style: 'tableHeader', alignment: 'right' },
              { text: 'Amount', style: 'tableHeader', alignment: 'right' },
              { text: 'Comments', style: 'tableHeader' },
            ],
            ...sheet.lineItems.map(item => [
              item.line_number,
              item.description,
              item.quantity,
              formatCurrency(item.rate),
              formatCurrency(item.amount),
              { text: item.comments, style: 'small', color: 'gray' }
            ]),
            [
              { text: 'TOTAL', colSpan: 4, bold: true, alignment: 'right' },
              {}, {}, {},
              { text: formatCurrency(sheet.amount), bold: true, alignment: 'right' },
              {}
            ]
          ]
        },
        layout: tableLayouts.lightHorizontalLines
      }
    );
  }
  
  return content;
}

function buildContractors(data: CostReportData): Content[] {
  if (!data.contractors || data.contractors.length === 0) return [];
  
  return [
    pageBreak(),
    { text: 'Project Directory', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
    {
      columns: data.contractors.map(c => ({
        stack: [
          { text: c.role, style: 'label', color: c.accentColor },
          { text: c.name || 'Not Appointed', style: 'h3', margin: [0, 5, 0, 0] }
        ],
        width: '50%',
        margin: [0, 0, 0, 20]
      })),
      columnGap: 20
    }
  ];
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

function buildCostReportContent(data: CostReportData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  // 1. Executive Summary
  content.push(...buildSummarySection(data));
  
  // 2. Project Health
  if (data.projectHealth) content.push(...buildProjectHealth(data));
  
  // 3. Category Breakdown
  content.push(...buildCategoryDetails(data));
  
  // 4. Variations
  content.push(...buildVariationsSection(data));
  
  // 5. Variation Sheets
  content.push(...buildVariationSheets(data));
  
  // 6. Contractors
  content.push(...buildContractors(data));
  
  // 7. Notes
  if (data.notes) {
    content.push(
      pageBreak(),
      { text: 'Notes & Assumptions', style: 'h2', margin: [0, 0, 0, SPACING.lg] },
      { text: data.notes, style: 'body' }
    );
  }
  
  return content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<CostReportData>({
  type: 'cost-report',
  name: 'Cost Analysis Report',
  description: 'Detailed financial evaluation with budget vs actual, variations, and KPIs',
  
  defaultConfig: {
    includeCoverPage: true,
    includeConfidentialNotice: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
      margins: [20, 30, 20, 30]
    },
  },
  
  // Chart configurations handled by engine
  chartConfigs: [
    { elementId: 'distribution-chart', title: 'Category Distribution', width: 800, height: 400 },
    { elementId: 'variance-chart', title: 'Variance Trends', width: 800, height: 400 },
    { elementId: 'budget-comparison-chart', title: 'Budget Comparison', width: 800, height: 400 },
  ],
  
  buildContent: buildCostReportContent,
  
  validateData: (data) => {
    const errors: string[] = [];
    if (!data.categories) errors.push('Categories array is required');
    if (!data.summary) errors.push('Summary object is required');
    return { valid: errors.length === 0, errors };
  },
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));
