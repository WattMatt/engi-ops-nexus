/**
 * Cost Report Registration
 * 
 * Defines how cost report PDFs are generated.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, tableLayouts } from '../../styles';
import { buildPanel, buildMetricCard } from '../../helpers';
import { formatCurrency } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

interface CostCategory {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  items?: CostItem[];
}

interface CostItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

interface CostReportData {
  projectName: string;
  projectNumber?: string;
  reportDate: string;
  categories: CostCategory[];
  summary: {
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
  };
  notes?: string;
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildSummarySection(data: CostReportData, config: ReportConfig): Content[] {
  const { summary } = data;
  const isOverBudget = summary.totalVariance < 0;
  
  return [
    { text: 'Cost Summary', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
    
    // Summary metrics
    {
      columns: [
        buildMetricCard(formatCurrency(summary.totalBudget), 'Total Budget', { width: 130 }),
        buildMetricCard(formatCurrency(summary.totalActual), 'Total Actual', { width: 130 }),
        buildMetricCard(formatCurrency(Math.abs(summary.totalVariance)), 'Variance', { 
          width: 130,
          valueColor: isOverBudget ? PDF_COLORS.danger : PDF_COLORS.success,
        }),
        buildMetricCard(`${summary.variancePercent.toFixed(1)}%`, 'Variance %', { 
          width: 130,
          valueColor: isOverBudget ? PDF_COLORS.danger : PDF_COLORS.success,
        }),
      ],
      columnGap: 8,
      margin: [0, 0, 0, SPACING.xl] as Margins,
    },
    
    // Status indicator
    {
      table: {
        widths: ['*'],
        body: [[
          {
            text: isOverBudget 
              ? `⚠️ Project is ${Math.abs(summary.variancePercent).toFixed(1)}% over budget`
              : `✓ Project is ${summary.variancePercent.toFixed(1)}% under budget`,
            fillColor: isOverBudget ? PDF_COLORS.dangerLight : PDF_COLORS.successLight,
            color: isOverBudget ? PDF_COLORS.danger : PDF_COLORS.success,
            margin: [SPACING.sm, SPACING.xs, SPACING.sm, SPACING.xs] as Margins,
            bold: true,
          }
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, SPACING.lg] as Margins,
    },
  ];
}

function buildCategoriesTable(data: CostReportData, config: ReportConfig): Content[] {
  const { categories } = data;
  
  const tableBody = [
    // Header
    [
      { text: 'Category', style: 'tableHeader' },
      { text: 'Budgeted', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Actual', style: 'tableHeader', alignment: 'right' as const },
      { text: 'Variance', style: 'tableHeader', alignment: 'right' as const },
      { text: '%', style: 'tableHeader', alignment: 'right' as const },
    ],
    // Data rows
    ...categories.map(cat => [
      { text: cat.name, bold: true },
      { text: formatCurrency(cat.budgeted), alignment: 'right' as const },
      { text: formatCurrency(cat.actual), alignment: 'right' as const },
      { 
        text: formatCurrency(Math.abs(cat.variance)),
        alignment: 'right' as const,
        color: cat.variance < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
      },
      { 
        text: `${cat.variancePercent.toFixed(1)}%`,
        alignment: 'right' as const,
        color: cat.variance < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
      },
    ]),
    // Total row
    [
      { text: 'TOTAL', bold: true, fillColor: PDF_COLORS.backgroundAlt },
      { text: formatCurrency(data.summary.totalBudget), alignment: 'right' as const, bold: true, fillColor: PDF_COLORS.backgroundAlt },
      { text: formatCurrency(data.summary.totalActual), alignment: 'right' as const, bold: true, fillColor: PDF_COLORS.backgroundAlt },
      { 
        text: formatCurrency(Math.abs(data.summary.totalVariance)),
        alignment: 'right' as const,
        bold: true,
        fillColor: PDF_COLORS.backgroundAlt,
        color: data.summary.totalVariance < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
      },
      { 
        text: `${data.summary.variancePercent.toFixed(1)}%`,
        alignment: 'right' as const,
        bold: true,
        fillColor: PDF_COLORS.backgroundAlt,
        color: data.summary.totalVariance < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
      },
    ],
  ];
  
  return [
    { text: '', pageBreak: 'before' },
    { text: 'Cost Breakdown by Category', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: tableBody,
      },
      layout: tableLayouts.professional,
    },
  ];
}

function buildCategoryDetails(data: CostReportData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  for (const category of data.categories) {
    if (!category.items || category.items.length === 0) continue;
    
    content.push(
      { text: '', pageBreak: 'before' },
      { text: category.name, style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'center' as const },
              { text: 'Unit', style: 'tableHeader', alignment: 'center' as const },
              { text: 'Rate', style: 'tableHeader', alignment: 'right' as const },
              { text: 'Total', style: 'tableHeader', alignment: 'right' as const },
            ],
            ...category.items.map(item => [
              { text: item.description },
              { text: String(item.quantity), alignment: 'center' as const },
              { text: item.unit, alignment: 'center' as const },
              { text: formatCurrency(item.rate), alignment: 'right' as const },
              { text: formatCurrency(item.total), alignment: 'right' as const },
            ]),
          ],
        },
        layout: tableLayouts.zebra,
      },
    );
  }
  
  return content;
}

// ============================================================================
// MAIN CONTENT BUILDER
// ============================================================================

function buildCostReportContent(data: CostReportData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  // Summary section
  content.push(...buildSummarySection(data, config));
  
  // Categories table
  content.push(...buildCategoriesTable(data, config));
  
  // Category details (if enabled)
  if (config.metadata?.includeDetails !== false) {
    content.push(...buildCategoryDetails(data, config));
  }
  
  // Notes
  if (data.notes) {
    content.push(
      { text: '', pageBreak: 'before' },
      { text: 'Notes', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
      { text: data.notes, style: 'body' },
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
  description: 'Detailed cost breakdown with budget vs actual comparison',
  
  defaultConfig: {
    includeCoverPage: true,
    includeConfidentialNotice: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  chartConfigs: [
    { elementId: 'cost-breakdown-chart', title: 'Cost Breakdown' },
    { elementId: 'budget-variance-chart', title: 'Budget vs Actual' },
    { elementId: 'category-comparison-chart', title: 'Category Comparison' },
  ],
  
  buildContent: buildCostReportContent,
  
  validateData: (data) => {
    const errors: string[] = [];
    if (!data.categories || !Array.isArray(data.categories)) {
      errors.push('Categories array is required');
    }
    if (!data.summary) {
      errors.push('Summary object is required');
    }
    return { valid: errors.length === 0, errors };
  },
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));
