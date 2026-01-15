/**
 * PDFMake Roadmap Review Builder
 * 
 * Complete pdfmake implementation for Roadmap Review PDF generation.
 * Uses the existing pdfmake utility library for a clean, declarative approach.
 * 
 * Key features:
 * - Uses PDFDocumentBuilder fluent API
 * - Reliable blob generation via getBase64() conversion
 * - All report types supported (standard, meeting-review, executive-summary)
 * - Professional styling with branding support
 */

import type { Content, TableCell, Margins, TDocumentDefinitions } from 'pdfmake/interfaces';
import { format } from 'date-fns';
import { createDocument, PDFDocumentBuilder } from './documentBuilder';
import { PDF_COLORS, FONT_SIZES, tableLayouts } from './styles';
import { imageToBase64, spacer, horizontalLine, formatDate } from './helpers';
import { fetchCompanyDetails, generateCoverPageContent, type CompanyDetails } from './coverPage';
import { buildChartSectionContent, type CapturedChartData } from './chartUtils';
import { STANDARD_MARGINS } from './config';
import type { EnhancedProjectSummary, PortfolioMetrics } from '../roadmapReviewCalculations';
import { getDueDateStatus } from '../roadmapReviewCalculations';
import {
  PDF_COLORS_HEX,
  ROADMAP_PDF_STYLES,
  ROADMAP_TABLE_LAYOUTS,
  RoadmapPDFExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from '../roadmapReviewPdfStyles';

// ============================================================================
// TYPES
// ============================================================================

interface RoadmapItem {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  is_completed: boolean;
  parent_id?: string | null;
}

export interface PDFGenerationResult {
  blob: Blob;
  filename: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getHealthColorHex = (score: number): string => {
  if (score >= 70) return PDF_COLORS_HEX.success;
  if (score >= 40) return PDF_COLORS_HEX.warning;
  return PDF_COLORS_HEX.danger;
};

const getPriorityColorHex = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical': return PDF_COLORS_HEX.riskCritical;
    case 'high': return PDF_COLORS_HEX.riskHigh;
    case 'medium': return PDF_COLORS_HEX.riskMedium;
    case 'normal':
    case 'low': return PDF_COLORS_HEX.success;
    default: return PDF_COLORS_HEX.darkGray;
  }
};

const getStatusInfo = (item: RoadmapItem): { label: string; color: string } => {
  if (item.is_completed) {
    return { label: '✓ Complete', color: PDF_COLORS_HEX.success };
  }
  const status = getDueDateStatus(item.due_date || null);
  if (status === 'overdue') {
    return { label: 'OVERDUE', color: PDF_COLORS_HEX.danger };
  }
  if (status === 'soon') {
    return { label: 'Due Soon', color: PDF_COLORS_HEX.warning };
  }
  return { label: 'Pending', color: PDF_COLORS_HEX.darkGray };
};

const formatReportType = (type: string): string => {
  switch (type) {
    case 'meeting-review': return 'Meeting Review Format';
    case 'executive-summary': return 'Executive Summary Only';
    default: return 'Standard Report';
  }
};

// ============================================================================
// SECTION BUILDERS
// ============================================================================

/**
 * Build section header with underline
 */
const buildSectionHeader = (title: string, subtitle?: string): Content => ({
  stack: [
    { text: title, fontSize: 18, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 4] as Margins },
    subtitle ? { text: subtitle, fontSize: 10, color: PDF_COLORS_HEX.textMuted, margin: [0, 0, 0, 8] as Margins } : null,
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: PDF_COLORS_HEX.primary },
        { type: 'line', x1: 0, y1: 3, x2: 180, y2: 3, lineWidth: 1, lineColor: PDF_COLORS_HEX.accent },
      ],
      margin: [0, 0, 0, 15] as Margins,
    },
  ].filter(Boolean) as Content[],
});

/**
 * Build cover page content
 */
const buildCoverPage = async (
  config: RoadmapPDFExportOptions,
  metrics: PortfolioMetrics
): Promise<Content[]> => {
  const content: Content[] = [];

  // Blue header band
  content.push({
    canvas: [
      {
        type: 'rect',
        x: -STANDARD_MARGINS.left,
        y: -STANDARD_MARGINS.top,
        w: 595.28, // A4 width
        h: 200,
        color: PDF_COLORS_HEX.primary,
      },
    ],
    absolutePosition: { x: 0, y: 0 },
  });

  // Logo if provided
  if (config.companyLogo) {
    try {
      const logoBase64 = await imageToBase64(config.companyLogo);
      content.push({
        image: logoBase64,
        width: 80,
        margin: [0, 20, 0, 20] as Margins,
      });
    } catch (error) {
      console.warn('[RoadmapPDF] Failed to load company logo:', error);
    }
  }

  // Title
  content.push(spacer(40));
  content.push({
    text: 'ROADMAP REVIEW',
    fontSize: 32,
    bold: true,
    color: '#ffffff',
    alignment: 'center',
  });
  content.push({
    text: 'PORTFOLIO REPORT',
    fontSize: 18,
    color: '#ffffff',
    alignment: 'center',
    margin: [0, 5, 0, 10] as Margins,
  });

  // Company name
  if (config.companyName) {
    content.push({
      text: config.companyName,
      fontSize: 14,
      color: '#ffffff',
      alignment: 'center',
      margin: [0, 0, 0, 40] as Margins,
    });
  }

  content.push(spacer(60));

  // Report type
  content.push({
    text: formatReportType(config.reportType),
    fontSize: 12,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 10] as Margins,
  });

  // Generation date
  content.push({
    text: `Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}`,
    fontSize: 10,
    color: PDF_COLORS_HEX.textMuted,
    alignment: 'center',
    margin: [0, 0, 0, 30] as Margins,
  });

  // Summary stats box
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          { text: 'PORTFOLIO OVERVIEW', colSpan: 4, fontSize: 10, bold: true, fillColor: PDF_COLORS_HEX.lightGray, margin: [8, 8, 8, 8] as Margins },
          {}, {}, {},
        ],
        [
          { text: `Total Projects\n${metrics.totalProjects}`, fontSize: 10, alignment: 'center', margin: [4, 8, 4, 8] as Margins },
          { text: `Avg Progress\n${metrics.averageProgress}%`, fontSize: 10, alignment: 'center', margin: [4, 8, 4, 8] as Margins },
          { text: `At Risk\n${metrics.projectsAtRisk}`, fontSize: 10, alignment: 'center', color: metrics.projectsAtRisk > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.text, margin: [4, 8, 4, 8] as Margins },
          { text: `Critical\n${metrics.projectsCritical}`, fontSize: 10, alignment: 'center', color: metrics.projectsCritical > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.text, margin: [4, 8, 4, 8] as Margins },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
    },
    margin: [40, 0, 40, 0] as Margins,
  });

  // Confidential notice
  if (config.confidentialNotice) {
    content.push(spacer(40));
    content.push({
      text: 'CONFIDENTIAL - For internal use only',
      fontSize: 9,
      color: PDF_COLORS_HEX.danger,
      alignment: 'center',
    });
  }

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  return content;
};

/**
 * Build table of contents
 */
const buildTableOfContents = (
  config: RoadmapPDFExportOptions,
  hasCharts: boolean
): Content[] => {
  const content: Content[] = [
    { text: 'Table of Contents', fontSize: 20, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 2, lineColor: PDF_COLORS_HEX.primary }],
      margin: [0, 0, 0, 20] as Margins,
    },
    { text: `Report Type: ${formatReportType(config.reportType)}`, fontSize: 9, color: PDF_COLORS_HEX.textMuted, margin: [0, 0, 0, 15] as Margins },
  ];

  const entries: { title: string; included: boolean }[] = [
    { title: 'Executive Summary', included: config.includeAnalytics },
    { title: 'Visual Summary (Charts)', included: config.includeCharts && hasCharts },
    { title: 'Project Details', included: config.includeDetailedProjects && config.reportType !== 'executive-summary' },
    { title: 'Meeting Notes', included: config.includeMeetingNotes && config.reportType === 'meeting-review' },
    { title: 'Summary Minutes', included: config.includeSummaryMinutes && config.reportType === 'meeting-review' },
    { title: 'Full Roadmap Items', included: config.includeFullRoadmapItems && config.reportType !== 'executive-summary' },
  ];

  let pageNum = config.includeCoverPage ? 3 : 2;
  entries.forEach(entry => {
    if (entry.included) {
      content.push({
        columns: [
          { text: entry.title, fontSize: 11, width: '*' },
          { text: '...................................', fontSize: 11, color: PDF_COLORS_HEX.lightGray, width: 'auto', alignment: 'center' },
          { text: String(pageNum), fontSize: 11, alignment: 'right', width: 30 },
        ],
        margin: [0, 6, 0, 6] as Margins,
      });
      pageNum++;
    }
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build executive summary section
 */
const buildExecutiveSummary = (metrics: PortfolioMetrics): Content[] => {
  const content: Content[] = [];

  content.push(buildSectionHeader('Executive Summary', 'Portfolio performance overview and key metrics'));

  // KPI Cards
  const avgHealth = metrics.totalProjects > 0 ? Math.round(metrics.totalHealthScore / metrics.totalProjects) : 0;
  content.push({
    columns: [
      {
        stack: [
          { text: String(metrics.totalProjects), fontSize: 28, bold: true, color: PDF_COLORS_HEX.primary, alignment: 'center' as const },
          { text: 'Total Projects', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
      },
      {
        stack: [
          { text: `${metrics.averageProgress}%`, fontSize: 28, bold: true, color: metrics.averageProgress >= 60 ? PDF_COLORS_HEX.success : metrics.averageProgress >= 40 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger, alignment: 'center' as const },
          { text: 'Avg Progress', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
      },
      {
        stack: [
          { text: `${avgHealth}%`, fontSize: 28, bold: true, color: getHealthColorHex(avgHealth), alignment: 'center' as const },
          { text: 'Portfolio Health', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
      },
      {
        stack: [
          { text: String(metrics.projectsAtRisk), fontSize: 28, bold: true, color: metrics.projectsAtRisk === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger, alignment: 'center' as const },
          { text: 'At Risk', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
      },
    ],
    margin: [0, 0, 0, 25] as Margins,
  });

  // Metrics table
  const metricsRows: TableCell[][] = [
    [
      { text: 'Metric', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
      { text: 'Value', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      { text: 'Assessment', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
    ],
    [
      { text: 'Critical Projects', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.projectsCritical), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      { text: metrics.projectsCritical === 0 ? '✓ None' : '⚠ Action Required', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite, color: metrics.projectsCritical === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger, bold: metrics.projectsCritical > 0 },
    ],
    [
      { text: 'Overdue Items', fontSize: 10 },
      { text: String(metrics.totalOverdueItems), fontSize: 10, alignment: 'center' },
      { text: metrics.totalOverdueItems === 0 ? '✓ On Track' : metrics.totalOverdueItems <= 3 ? 'Manageable' : '⚠ High', fontSize: 10, alignment: 'center', color: metrics.totalOverdueItems === 0 ? PDF_COLORS_HEX.success : metrics.totalOverdueItems <= 3 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger },
    ],
    [
      { text: 'Due This Week', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.totalDueSoonItems), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      { text: metrics.totalDueSoonItems > 5 ? 'Busy Week' : 'Normal', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
    ],
    [
      { text: 'Portfolio Trend', fontSize: 10 },
      { text: metrics.portfolioTrend.charAt(0).toUpperCase() + metrics.portfolioTrend.slice(1), fontSize: 10, alignment: 'center' },
      { text: metrics.portfolioTrend === 'improving' ? '↑ Positive' : metrics.portfolioTrend === 'declining' ? '↓ Declining' : '→ Stable', fontSize: 10, alignment: 'center', color: metrics.portfolioTrend === 'improving' ? PDF_COLORS_HEX.success : metrics.portfolioTrend === 'declining' ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.primary, bold: true },
    ],
    [
      { text: 'Team Members', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.totalTeamMembers), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      { text: '-', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
    ],
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['40%', '25%', '35%'],
      body: metricsRows,
    },
    layout: ROADMAP_TABLE_LAYOUTS.professional,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Priority distribution
  if (metrics.priorityBreakdown.length > 0) {
    content.push({ text: 'Priority Distribution', fontSize: 14, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 15, 0, 10] as Margins });
    
    const total = metrics.priorityBreakdown.reduce((acc, x) => acc + x.count, 0);
    const priorityRows: TableCell[][] = [
      [
        { text: 'Priority Level', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
        { text: 'Count', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        { text: 'Percentage', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      ],
      ...metrics.priorityBreakdown.map((p, idx) => {
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
        return [
          { text: p.priority.charAt(0).toUpperCase() + p.priority.slice(1), fontSize: 10, fillColor, color: getPriorityColorHex(p.priority) },
          { text: String(p.count), fontSize: 10, alignment: 'center' as const, fillColor },
          { text: `${pct}%`, fontSize: 10, alignment: 'center' as const, fillColor },
        ];
      }),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['40%', '30%', '30%'],
        body: priorityRows,
      },
      layout: ROADMAP_TABLE_LAYOUTS.zebra,
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  // Resource bottlenecks
  if (metrics.resourceBottlenecks.length > 0) {
    content.push({ text: 'Resource Bottleneck Analysis', fontSize: 14, bold: true, color: PDF_COLORS_HEX.riskCritical, margin: [0, 15, 0, 5] as Margins });
    content.push({ text: 'Team members with high workload or overdue items requiring attention', fontSize: 9, color: PDF_COLORS_HEX.textMuted, italics: true, margin: [0, 0, 0, 10] as Margins });

    const bottleneckRows: TableCell[][] = [
      [
        { text: 'Team Member', bold: true, fillColor: PDF_COLORS_HEX.riskCritical, color: '#FFFFFF', fontSize: 10 },
        { text: 'Active Tasks', bold: true, fillColor: PDF_COLORS_HEX.riskCritical, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        { text: 'Overdue', bold: true, fillColor: PDF_COLORS_HEX.riskCritical, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.riskCritical, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      ],
      ...metrics.resourceBottlenecks.map((b, idx) => {
        const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
        const workloadStatus = b.taskCount > 10 ? 'Overloaded' : b.taskCount > 5 ? 'High' : 'Normal';
        const statusColor = b.taskCount > 10 ? PDF_COLORS_HEX.danger : b.taskCount > 5 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.success;
        return [
          { text: b.memberName, fontSize: 10, fillColor, bold: true },
          { text: String(b.taskCount), fontSize: 10, alignment: 'center' as const, fillColor },
          { text: String(b.overdueCount), fontSize: 10, alignment: 'center' as const, fillColor, color: b.overdueCount > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.darkGray, bold: b.overdueCount > 0 },
          { text: workloadStatus, fontSize: 9, alignment: 'center' as const, fillColor, color: statusColor, bold: true },
        ];
      }),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['35%', '20%', '20%', '25%'],
        body: bottleneckRows,
      },
      layout: ROADMAP_TABLE_LAYOUTS.zebra,
    });
  }

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build visual analytics section with charts
 */
const buildVisualAnalytics = (
  capturedCharts: CapturedChartData[],
  layout: 'stacked' | 'grid'
): Content[] => {
  if (capturedCharts.length === 0) return [];

  const content: Content[] = [];
  content.push(buildSectionHeader('Visual Summary', 'Key metrics and charts'));

  const chartContent = buildChartSectionContent(capturedCharts, {
    title: '',
    layout: layout === 'grid' ? 'grid' : 'single',
    chartsPerRow: 2,
  });

  content.push(...chartContent);
  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build project details section
 */
const buildProjectDetails = (projects: EnhancedProjectSummary[]): Content[] => {
  const content: Content[] = [];

  projects.forEach((project, idx) => {
    const healthColor = getHealthColorHex(project.healthScore);

    // Page break before each project (except first)
    if (idx > 0) {
      content.push({ text: '', pageBreak: 'before' });
    }

    // Section header on first project only
    if (idx === 0) {
      content.push(buildSectionHeader('Project Details', 'Individual project performance'));
    }

    // Project header with health badge
    content.push({
      columns: [
        {
          text: project.projectName,
          fontSize: 18,
          bold: true,
          color: PDF_COLORS_HEX.primary,
          width: '*',
        },
        {
          text: `${project.healthScore}%`,
          fontSize: 12,
          bold: true,
          color: '#FFFFFF',
          alignment: 'center',
          background: healthColor,
          width: 50,
          margin: [0, 2, 0, 2] as Margins,
        },
      ],
      margin: [0, 0, 0, 10] as Margins,
    });

    // Health bar
    content.push({
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 515, h: 6, color: PDF_COLORS_HEX.lightGray, r: 3 },
        { type: 'rect', x: 0, y: 0, w: Math.min(515 * (project.healthScore / 100), 515), h: 6, color: healthColor, r: 3 },
      ],
      margin: [0, 0, 0, 15] as Margins,
    });

    // Stats row
    content.push({
      columns: [
        {
          stack: [
            { text: 'Progress', fontSize: 8, color: PDF_COLORS_HEX.textMuted },
            { text: `${project.progress}%`, fontSize: 16, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Completed', fontSize: 8, color: PDF_COLORS_HEX.textMuted },
            { text: `${project.completedItems}/${project.totalItems}`, fontSize: 16, bold: true },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Overdue', fontSize: 8, color: PDF_COLORS_HEX.textMuted },
            { text: String(project.overdueCount), fontSize: 16, bold: true, color: project.overdueCount > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.success },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Team', fontSize: 8, color: PDF_COLORS_HEX.textMuted },
            { text: String(project.teamMembers.length), fontSize: 16, bold: true },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 20] as Margins,
    });

    // Upcoming tasks
    if (project.upcomingItems.length > 0) {
      content.push({ text: 'Upcoming Tasks', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 8] as Margins });

      const taskRows: TableCell[][] = [
        [
          { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
          { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        ],
        ...project.upcomingItems.slice(0, 10).map((item, itemIdx) => {
          const fillColor = itemIdx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
          return [
            { text: item.title.substring(0, 50), fontSize: 10, fillColor },
            { text: item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-', fontSize: 10, alignment: 'center' as const, fillColor },
            { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 10, alignment: 'center' as const, fillColor, color: getPriorityColorHex(item.priority || 'normal') },
          ];
        }),
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['50%', '25%', '25%'],
          body: taskRows,
        },
        layout: ROADMAP_TABLE_LAYOUTS.zebra,
        margin: [0, 0, 0, 15] as Margins,
      });

      if (project.upcomingItems.length > 10) {
        content.push({
          text: `+ ${project.upcomingItems.length - 10} more upcoming tasks`,
          fontSize: 9,
          italics: true,
          color: PDF_COLORS_HEX.textMuted,
        });
      }
    } else {
      content.push({
        text: 'No upcoming tasks scheduled',
        fontSize: 11,
        italics: true,
        color: PDF_COLORS_HEX.textMuted,
        margin: [0, 10, 0, 0] as Margins,
      });
    }

    // Team members
    if (project.teamMembers.length > 0) {
      content.push({ text: 'Team Members', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 20, 0, 8] as Margins });
      content.push({
        text: project.teamMembers.map(m => m.name || m.email || 'Unnamed').join('  •  '),
        fontSize: 10,
        color: PDF_COLORS_HEX.darkGray,
      });
    }
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build meeting notes section
 */
const buildMeetingNotes = (): Content[] => {
  const content: Content[] = [];

  content.push(buildSectionHeader('Meeting Notes', 'Capture discussion points and action items'));

  // Discussion points box
  content.push({ text: 'Discussion Points:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins });
  content.push({
    table: {
      widths: ['*'],
      heights: [80],
      body: [[{ text: '', border: [true, true, true, true] }]],
    },
    layout: {
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
    },
    margin: [0, 0, 0, 15] as Margins,
  });

  // Key decisions box
  content.push({ text: 'Key Decisions:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins });
  content.push({
    table: {
      widths: ['*'],
      heights: [60],
      body: [[{ text: '', border: [true, true, true, true] }]],
    },
    layout: {
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
    },
    margin: [0, 0, 0, 15] as Margins,
  });

  // Action items table
  content.push({ text: 'Action Items:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins });
  content.push({
    table: {
      headerRows: 1,
      widths: ['45%', '25%', '15%', '15%'],
      body: [
        [
          { text: 'Action Item', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
          { text: 'Assigned To', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        ],
        [{ text: '', fontSize: 10, margin: [4, 8, 4, 8] as Margins }, { text: '' }, { text: '' }, { text: '' }],
        [{ text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray, margin: [4, 8, 4, 8] as Margins }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }],
        [{ text: '', fontSize: 10, margin: [4, 8, 4, 8] as Margins }, { text: '' }, { text: '' }, { text: '' }],
        [{ text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray, margin: [4, 8, 4, 8] as Margins }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fillColor: PDF_COLORS_HEX.lightGray }],
      ],
    },
    layout: ROADMAP_TABLE_LAYOUTS.professional,
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build summary minutes section
 */
const buildSummaryMinutes = (
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics
): Content[] => {
  const content: Content[] = [];

  content.push(buildSectionHeader('Meeting Summary Minutes', 'Meeting outcomes and next steps'));

  // Meeting details
  content.push({
    table: {
      widths: [100, '*'],
      body: [
        [{ text: 'Date:', bold: true, fontSize: 10 }, { text: format(new Date(), 'MMMM d, yyyy'), fontSize: 10 }],
        [{ text: 'Time:', bold: true, fontSize: 10 }, { text: format(new Date(), 'HH:mm'), fontSize: 10 }],
        [{ text: 'Attendees:', bold: true, fontSize: 10 }, { text: '_______________________', fontSize: 10 }],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 20] as Margins,
  });

  // Portfolio status
  content.push({ text: 'Portfolio Status Summary', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 10] as Margins });
  content.push({
    ul: [
      `Total active projects: ${metrics.totalProjects}`,
      `Projects at risk: ${metrics.projectsAtRisk}`,
      `Critical items requiring attention: ${metrics.projectsCritical}`,
      `Overall portfolio health: ${metrics.totalHealthScore}%`,
      `Average project progress: ${metrics.averageProgress}%`,
    ],
    fontSize: 10,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Projects discussed
  content.push({ text: 'Projects Reviewed', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 10] as Margins });
  
  const projectRows: TableCell[][] = [
    [
      { text: 'Project', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
      { text: 'Health', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      { text: 'Progress', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
    ],
    ...projects.slice(0, 10).map((p, idx) => {
      const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
      const status = p.healthScore >= 70 ? 'On Track' : p.healthScore >= 40 ? 'At Risk' : 'Critical';
      const statusColor = p.healthScore >= 70 ? PDF_COLORS_HEX.success : p.healthScore >= 40 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger;
      return [
        { text: p.projectName.substring(0, 35), fontSize: 10, fillColor },
        { text: `${p.healthScore}%`, fontSize: 10, alignment: 'center' as const, fillColor, color: getHealthColorHex(p.healthScore) },
        { text: `${p.progress}%`, fontSize: 10, alignment: 'center' as const, fillColor },
        { text: status, fontSize: 10, alignment: 'center' as const, fillColor, color: statusColor, bold: true },
      ];
    }),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['40%', '20%', '20%', '20%'],
      body: projectRows,
    },
    layout: ROADMAP_TABLE_LAYOUTS.zebra,
    margin: [0, 0, 0, 20] as Margins,
  });

  // Next steps
  content.push({ text: 'Next Steps & Follow-up', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 10, 0, 5] as Margins });
  content.push({
    table: {
      widths: ['*'],
      heights: [60],
      body: [[{ text: '', border: [true, true, true, true] }]],
    },
    layout: {
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
    },
    margin: [0, 0, 0, 20] as Margins,
  });

  // Signatures
  content.push({ text: 'Signatures', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 10, 0, 10] as Margins });
  content.push({
    columns: [
      {
        stack: [
          { text: '________________________', fontSize: 10 },
          { text: 'Meeting Chair', fontSize: 9, color: PDF_COLORS_HEX.textMuted, margin: [0, 5, 0, 0] as Margins },
        ],
        width: '*',
      },
      {
        stack: [
          { text: '________________________', fontSize: 10 },
          { text: 'Date', fontSize: 9, color: PDF_COLORS_HEX.textMuted, margin: [0, 5, 0, 0] as Margins },
        ],
        width: '*',
      },
    ],
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

/**
 * Build full roadmap items section
 */
const buildFullRoadmapItems = (
  projects: EnhancedProjectSummary[],
  allItems: RoadmapItem[]
): Content[] => {
  const content: Content[] = [];

  projects.forEach((project, projectIdx) => {
    const projectItems = allItems.filter(item => item.project_id === project.projectId);
    if (projectItems.length === 0) return;

    // Page break before each project
    if (projectIdx > 0 || content.length > 0) {
      content.push({ text: '', pageBreak: 'before' });
    }

    const pendingItems = projectItems.filter(item => !item.is_completed);
    const completedItems = projectItems.filter(item => item.is_completed);

    // Sort pending: overdue first
    pendingItems.sort((a, b) => {
      const aStatus = getDueDateStatus(a.due_date || null);
      const bStatus = getDueDateStatus(b.due_date || null);
      if (aStatus === 'overdue' && bStatus !== 'overdue') return -1;
      if (bStatus === 'overdue' && aStatus !== 'overdue') return 1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    const healthColor = getHealthColorHex(project.healthScore);

    // Project header
    content.push({
      columns: [
        { text: `${project.projectName} - Full Roadmap`, fontSize: 16, bold: true, color: PDF_COLORS_HEX.primary, width: '*' },
        { text: `Health: ${project.healthScore}%`, fontSize: 11, bold: true, color: healthColor, alignment: 'right', width: 100 },
      ],
      margin: [0, 0, 0, 5] as Margins,
    });

    content.push({
      text: `Total Items: ${projectItems.length}  |  Completed: ${project.completedItems}  |  Progress: ${project.progress}%  |  Overdue: ${project.overdueCount}`,
      fontSize: 10,
      color: PDF_COLORS_HEX.darkGray,
      margin: [0, 0, 0, 15] as Margins,
    });

    // Pending items
    if (pendingItems.length > 0) {
      content.push({ text: `Pending Items (${pendingItems.length})`, fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 10, 0, 8] as Margins });

      const pendingRows: TableCell[][] = [
        [
          { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
          { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        ],
        ...pendingItems.map((item, idx) => {
          const statusInfo = getStatusInfo(item);
          const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
          return [
            { text: item.title.substring(0, 45), fontSize: 10, fillColor },
            { text: item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-', fontSize: 10, alignment: 'center' as const, fillColor },
            { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 10, alignment: 'center' as const, fillColor, color: getPriorityColorHex(item.priority || 'normal') },
            { text: statusInfo.label, fontSize: 10, alignment: 'center' as const, fillColor, color: statusInfo.color, bold: statusInfo.label === 'OVERDUE' },
          ];
        }),
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['45%', '20%', '15%', '20%'],
          body: pendingRows,
        },
        layout: ROADMAP_TABLE_LAYOUTS.zebra,
        margin: [0, 0, 0, 15] as Margins,
      });
    }

    // Completed items
    if (completedItems.length > 0) {
      content.push({ text: `Completed Items (${completedItems.length})`, fontSize: 12, bold: true, color: PDF_COLORS_HEX.success, margin: [0, 15, 0, 8] as Margins });

      const displayItems = completedItems.slice(0, 15);
      const completedRows: TableCell[][] = [
        [
          { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.success, color: '#FFFFFF', fontSize: 10 },
          { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.success, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
          { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.success, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
        ],
        ...displayItems.map((item, idx) => {
          const fillColor = idx % 2 === 0 ? '#f0fdf4' : '#FFFFFF';
          return [
            { text: item.title.substring(0, 50), fontSize: 10, fillColor },
            { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 10, alignment: 'center' as const, fillColor },
            { text: '✓ Complete', fontSize: 10, alignment: 'center' as const, fillColor, color: PDF_COLORS_HEX.success },
          ];
        }),
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['60%', '20%', '20%'],
          body: completedRows,
        },
        layout: ROADMAP_TABLE_LAYOUTS.zebra,
      });

      if (completedItems.length > 15) {
        content.push({
          text: `+ ${completedItems.length - 15} more completed items`,
          fontSize: 9,
          italics: true,
          color: PDF_COLORS_HEX.textMuted,
          margin: [0, 5, 0, 0] as Margins,
        });
      }
    }
  });

  return content;
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate the roadmap review PDF using pdfmake.
 * 
 * Uses PDFDocumentBuilder with reliable getBase64() -> Blob conversion.
 * All export options are respected per specification.
 * 
 * @returns Promise with PDF blob and filename
 */
export async function generateRoadmapReviewPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF/pdfmake] Starting PDF generation with', projects.length, 'projects');
  console.log('[RoadmapPDF/pdfmake] Options:', JSON.stringify(options, null, 2));
  const startTime = Date.now();

  // Merge with defaults
  const config: RoadmapPDFExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Limit projects for performance
  const maxProjects = config.reportType === 'executive-summary' ? 10 : 20;
  const limitedProjects = projects.slice(0, maxProjects);

  // Create document builder
  const doc = createDocument({
    orientation: 'portrait',
    pageSize: 'A4',
  });

  // Add styles
  doc.addStyles(ROADMAP_PDF_STYLES);

  // Set document info
  doc.setInfo({
    title: `Roadmap Review - ${config.companyName || 'Portfolio Report'}`,
    author: config.companyName || 'Roadmap Review System',
    subject: 'Project Portfolio Review',
    creator: 'Roadmap Review PDF Generator',
  });

  // ========== BUILD DOCUMENT CONTENT ==========

  // Cover Page
  if (config.includeCoverPage) {
    console.log('[RoadmapPDF/pdfmake] Adding cover page...');
    const coverContent = await buildCoverPage(config, metrics);
    doc.add(coverContent);
  }

  // Table of Contents
  if (config.includeTableOfContents && config.reportType !== 'executive-summary') {
    console.log('[RoadmapPDF/pdfmake] Adding table of contents...');
    const hasCharts = (capturedCharts?.length || 0) > 0;
    doc.add(buildTableOfContents(config, hasCharts));
  }

  // Executive Summary
  if (config.includeAnalytics) {
    console.log('[RoadmapPDF/pdfmake] Adding executive summary...');
    doc.add(buildExecutiveSummary(metrics));
  }

  // Visual Analytics (Charts)
  if (config.includeCharts && capturedCharts && capturedCharts.length > 0) {
    console.log('[RoadmapPDF/pdfmake] Adding charts section...');
    // Check chart size limits
    const totalChartSize = capturedCharts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 200 * 1024; // 200KB
    const maxCharts = 4;

    if (totalChartSize < maxChartSize && capturedCharts.length <= maxCharts) {
      doc.add(buildVisualAnalytics(capturedCharts.slice(0, maxCharts), config.chartLayout));
    } else {
      console.warn(`[RoadmapPDF/pdfmake] Charts skipped (${Math.round(totalChartSize / 1024)}KB/${maxChartSize / 1024}KB limit)`);
    }
  }

  // Project Details
  if (config.includeDetailedProjects && config.reportType !== 'executive-summary') {
    console.log('[RoadmapPDF/pdfmake] Adding project details...');
    doc.add(buildProjectDetails(limitedProjects));
  }

  // Meeting Notes
  if (config.includeMeetingNotes && config.reportType === 'meeting-review') {
    console.log('[RoadmapPDF/pdfmake] Adding meeting notes...');
    doc.add(buildMeetingNotes());
  }

  // Summary Minutes
  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    console.log('[RoadmapPDF/pdfmake] Adding summary minutes...');
    doc.add(buildSummaryMinutes(limitedProjects, metrics));
  }

  // Full Roadmap Items
  if (config.includeFullRoadmapItems && config.reportType !== 'executive-summary' && allRoadmapItems) {
    console.log('[RoadmapPDF/pdfmake] Adding full roadmap items...');
    doc.add(buildFullRoadmapItems(limitedProjects, allRoadmapItems));
  }

  // ========== CONFIGURE HEADER/FOOTER ==========
  doc.withStandardHeader('Roadmap Review', config.companyName);
  doc.withStandardFooter(config.confidentialNotice);

  // ========== GENERATE PDF ==========
  console.log('[RoadmapPDF/pdfmake] Building PDF document...');

  try {
    // Use 90 second timeout for complex documents
    const blob = await doc.toBlob(90000);
    const elapsedTime = Date.now() - startTime;
    console.log(`[RoadmapPDF/pdfmake] PDF generated successfully in ${elapsedTime}ms, size: ${Math.round(blob.size / 1024)}KB`);

    return {
      blob,
      filename: finalFilename,
    };
  } catch (error) {
    console.error('[RoadmapPDF/pdfmake] PDF generation failed:', error);
    throw error;
  }
}

/**
 * Download the roadmap review PDF directly (fallback method).
 * Uses pdfmake's internal download which is more reliable.
 */
export async function downloadRoadmapReviewPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<void> {
  const config: RoadmapPDFExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  const maxProjects = config.reportType === 'executive-summary' ? 10 : 20;
  const limitedProjects = projects.slice(0, maxProjects);

  const doc = createDocument({
    orientation: 'portrait',
    pageSize: 'A4',
  });

  doc.addStyles(ROADMAP_PDF_STYLES);

  // Build same content as generateRoadmapReviewPDF
  if (config.includeCoverPage) {
    doc.add(await buildCoverPage(config, metrics));
  }

  if (config.includeTableOfContents && config.reportType !== 'executive-summary') {
    const hasCharts = (capturedCharts?.length || 0) > 0;
    doc.add(buildTableOfContents(config, hasCharts));
  }

  if (config.includeAnalytics) {
    doc.add(buildExecutiveSummary(metrics));
  }

  if (config.includeCharts && capturedCharts && capturedCharts.length > 0) {
    const totalChartSize = capturedCharts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    if (totalChartSize < 200 * 1024 && capturedCharts.length <= 4) {
      doc.add(buildVisualAnalytics(capturedCharts.slice(0, 4), config.chartLayout));
    }
  }

  if (config.includeDetailedProjects && config.reportType !== 'executive-summary') {
    doc.add(buildProjectDetails(limitedProjects));
  }

  if (config.includeMeetingNotes && config.reportType === 'meeting-review') {
    doc.add(buildMeetingNotes());
  }

  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    doc.add(buildSummaryMinutes(limitedProjects, metrics));
  }

  if (config.includeFullRoadmapItems && config.reportType !== 'executive-summary' && allRoadmapItems) {
    doc.add(buildFullRoadmapItems(limitedProjects, allRoadmapItems));
  }

  doc.withStandardHeader('Roadmap Review', config.companyName);
  doc.withStandardFooter(config.confidentialNotice);

  // Use direct download (more reliable)
  await doc.download(finalFilename);
}
