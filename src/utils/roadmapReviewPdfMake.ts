/**
 * Roadmap Review PDF Export - PDFMake Implementation
 * 
 * Professional PDF generation with polished styling, modern tables,
 * and refined typography for engineering-grade reports.
 */

import type { Content, ContentTable, TableCell, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import { format } from "date-fns";
import {
  createDocument,
  heading,
  paragraph,
  dataTable,
  horizontalLine,
  spacer,
  pageBreak,
  fetchCompanyDetails,
  generateCoverPageContent,
  PDF_COLORS,
  FONT_SIZES,
  isPdfMakeReady,
  pdfMake,
} from "./pdfmake";
import type { PDFDocumentBuilder } from "./pdfmake";
import {
  EnhancedProjectSummary,
  PortfolioMetrics,
  getDueDateStatus
} from "./roadmapReviewCalculations";
import {
  PDF_COLORS_HEX,
  ROADMAP_PDF_STYLES,
  ROADMAP_TABLE_LAYOUTS,
  RoadmapPDFExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from "./roadmapReviewPdfStyles";
import {
  captureCharts,
  buildChartSectionContent,
  type ChartConfig,
  type CapturedChartData,
  waitForCharts,
} from "./pdfmake/chartUtils";

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getHealthColorHex = (score: number): string => {
  if (score >= 70) return PDF_COLORS_HEX.success;
  if (score >= 40) return PDF_COLORS_HEX.warning;
  return PDF_COLORS_HEX.danger;
};

const getHealthBackground = (score: number): string => {
  if (score >= 70) return PDF_COLORS_HEX.successLight;
  if (score >= 40) return PDF_COLORS_HEX.warningLight;
  return PDF_COLORS_HEX.dangerLight;
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

const getStatusInfo = (item: RoadmapItem): { label: string; color: string; bg?: string } => {
  if (item.is_completed) {
    return { label: '✓ Complete', color: PDF_COLORS_HEX.success, bg: PDF_COLORS_HEX.successLight };
  }
  const status = getDueDateStatus(item.due_date || null);
  if (status === 'overdue') {
    return { label: 'OVERDUE', color: PDF_COLORS_HEX.danger, bg: PDF_COLORS_HEX.dangerLight };
  }
  if (status === 'soon') {
    return { label: 'Due Soon', color: PDF_COLORS_HEX.warning, bg: PDF_COLORS_HEX.warningLight };
  }
  return { label: 'Pending', color: PDF_COLORS_HEX.darkGray };
};

// Section header with underline
const buildSectionHeader = (title: string, subtitle?: string): Content => {
  return {
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
  };
};

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

/**
 * Build executive summary content - Enhanced with KPI cards
 */
const buildExecutiveSummary = (metrics: PortfolioMetrics): Content => {
  // Build KPI cards row
  const kpiCards: Content = {
    columns: [
      {
        stack: [
          { text: String(metrics.totalProjects), fontSize: 28, bold: true, color: PDF_COLORS_HEX.primary, alignment: 'center' as const },
          { text: 'Total Projects', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
        margin: [0, 0, 5, 0] as Margins,
      },
      {
        stack: [
          { text: `${metrics.averageProgress}%`, fontSize: 28, bold: true, color: metrics.averageProgress >= 60 ? PDF_COLORS_HEX.success : metrics.averageProgress >= 40 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger, alignment: 'center' as const },
          { text: 'Avg Progress', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
        margin: [5, 0, 5, 0] as Margins,
      },
      {
        stack: [
          { text: `${metrics.totalHealthScore}%`, fontSize: 28, bold: true, color: getHealthColorHex(metrics.totalHealthScore), alignment: 'center' as const },
          { text: 'Portfolio Health', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
        margin: [5, 0, 5, 0] as Margins,
      },
      {
        stack: [
          { text: String(metrics.projectsAtRisk), fontSize: 28, bold: true, color: metrics.projectsAtRisk === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger, alignment: 'center' as const },
          { text: 'At Risk', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' as const },
        ],
        width: '*',
        margin: [5, 0, 0, 0] as Margins,
      },
    ],
    margin: [0, 0, 0, 20] as Margins,
  };

  // Build detailed metrics table
  const rows: TableCell[][] = [
    [
      { text: 'Metric', bold: true, fillColor: PDF_COLORS_HEX.tableHeader, color: '#FFFFFF', fontSize: 10 },
      { text: 'Value', bold: true, fillColor: PDF_COLORS_HEX.tableHeader, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      { text: 'Assessment', bold: true, fillColor: PDF_COLORS_HEX.tableHeader, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
    ],
    [
      { text: 'Critical Projects', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.projectsCritical), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      {
        text: metrics.projectsCritical === 0 ? '✓ None' : '⚠ Action Required',
        fontSize: 10,
        alignment: 'center',
        fillColor: PDF_COLORS_HEX.offWhite,
        color: metrics.projectsCritical === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger,
        bold: metrics.projectsCritical > 0,
      },
    ],
    [
      { text: 'Overdue Items', fontSize: 10 },
      { text: String(metrics.totalOverdueItems), fontSize: 10, alignment: 'center' },
      {
        text: metrics.totalOverdueItems === 0 ? '✓ On Track' : metrics.totalOverdueItems <= 3 ? 'Manageable' : '⚠ High',
        fontSize: 10,
        alignment: 'center',
        color: metrics.totalOverdueItems === 0 ? PDF_COLORS_HEX.success : metrics.totalOverdueItems <= 3 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger,
      },
    ],
    [
      { text: 'Due This Week', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.totalDueSoonItems), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      { text: metrics.totalDueSoonItems > 5 ? 'Busy Week' : 'Normal', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite, color: PDF_COLORS_HEX.darkGray },
    ],
    [
      { text: 'Portfolio Trend', fontSize: 10 },
      { text: metrics.portfolioTrend.charAt(0).toUpperCase() + metrics.portfolioTrend.slice(1), fontSize: 10, alignment: 'center' },
      {
        text: metrics.portfolioTrend === 'improving' ? '↑ Positive' : metrics.portfolioTrend === 'declining' ? '↓ Declining' : '→ Stable',
        fontSize: 10,
        alignment: 'center',
        color: metrics.portfolioTrend === 'improving' ? PDF_COLORS_HEX.success : metrics.portfolioTrend === 'declining' ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.primary,
        bold: true,
      },
    ],
    [
      { text: 'Team Members', fontSize: 10, fillColor: PDF_COLORS_HEX.offWhite },
      { text: String(metrics.totalTeamMembers), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
      { text: '-', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.offWhite },
    ],
  ];

  return {
    stack: [
      buildSectionHeader('Executive Summary', 'Portfolio performance overview and key metrics'),
      kpiCards,
      {
        table: {
          headerRows: 1,
          widths: ['40%', '25%', '35%'],
          body: rows,
        },
        layout: ROADMAP_TABLE_LAYOUTS.professional,
      },
    ],
  };
};

/**
 * Build resource bottlenecks section - Enhanced styling
 */
const buildResourceBottlenecks = (metrics: PortfolioMetrics): Content => {
  if (metrics.resourceBottlenecks.length === 0) {
    return { text: '' };
  }

  const rows: TableCell[][] = [
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

  return {
    stack: [
      { text: 'Resource Bottleneck Analysis', fontSize: 14, bold: true, color: PDF_COLORS_HEX.riskCritical, margin: [0, 20, 0, 5] as Margins },
      { text: 'Team members with high workload or overdue items requiring attention', fontSize: 9, color: PDF_COLORS_HEX.textMuted, italics: true, margin: [0, 0, 0, 10] as Margins },
      {
        table: {
          headerRows: 1,
          widths: ['35%', '20%', '20%', '25%'],
          body: rows,
        },
        layout: ROADMAP_TABLE_LAYOUTS.zebra,
      },
    ],
  };
};

/**
 * Build priority distribution content - Enhanced with visual indicators
 */
const buildPriorityDistribution = (metrics: PortfolioMetrics): Content => {
  if (metrics.priorityBreakdown.length === 0) {
    return { text: '' };
  }

  const total = metrics.priorityBreakdown.reduce((acc, x) => acc + x.count, 0);

  const rows: TableCell[][] = [
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

  return {
    stack: [
      { text: 'Priority Distribution', style: 'h2', margin: [0, 20, 0, 10] as Margins },
      {
        table: {
          headerRows: 1,
          widths: ['40%', '30%', '30%'],
          body: rows,
        },
        layout: {
          hLineColor: () => PDF_COLORS_HEX.tableBorder,
          vLineColor: () => PDF_COLORS_HEX.tableBorder,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
    ],
  };
};

/**
 * Build project details content - Each project on its own page
 */
const buildProjectDetails = (projects: EnhancedProjectSummary[]): Content => {
  const content: Content[] = [];

  projects.forEach((project, idx) => {
    const healthColor = getHealthColorHex(project.healthScore);

    // Build the stack content for this project
    const stackContent: Content[] = [];

    // Project section header (only on first project)
    if (idx === 0) {
      stackContent.push(
        { text: 'Project Details', style: 'h1', margin: [0, 0, 0, 10] as Margins },
        {
          canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 2, lineColor: PDF_COLORS.primary }],
          margin: [0, 0, 0, 15] as Margins,
        }
      );
    }

    // Project header
    stackContent.push({
      columns: [
        {
          text: project.projectName,
          fontSize: 18,
          bold: true,
          color: PDF_COLORS_HEX.primary,
          width: '*',
        },
        {
          stack: [
            {
              text: `${project.healthScore}%`,
              fontSize: 14,
              bold: true,
              color: '#FFFFFF',
              alignment: 'center' as const,
              background: healthColor,
            },
          ],
          width: 60,
        },
      ],
      margin: [0, 0, 0, 10] as Margins,
    });

    // Health indicator bar
    stackContent.push({
      canvas: [
        { type: 'rect' as const, x: 0, y: 0, w: 515, h: 4, color: PDF_COLORS_HEX.lightGray, r: 2 },
        { type: 'rect' as const, x: 0, y: 0, w: Math.min(515 * (project.healthScore / 100), 515), h: 4, color: healthColor, r: 2 },
      ],
      margin: [0, 0, 0, 15] as Margins,
    });

    // Project stats in a clear grid
    stackContent.push({
      columns: [
        {
          stack: [
            { text: 'Progress', fontSize: 8, color: PDF_COLORS_HEX.gray },
            { text: `${project.progress}%`, fontSize: 14, bold: true, color: PDF_COLORS_HEX.text },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Items Completed', fontSize: 8, color: PDF_COLORS_HEX.gray },
            { text: `${project.completedItems}/${project.totalItems}`, fontSize: 14, bold: true, color: PDF_COLORS_HEX.text },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Overdue', fontSize: 8, color: PDF_COLORS_HEX.gray },
            { text: `${project.overdueCount}`, fontSize: 14, bold: true, color: project.overdueCount > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.success },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Team Members', fontSize: 8, color: PDF_COLORS_HEX.gray },
            { text: `${project.teamMembers.length}`, fontSize: 14, bold: true, color: PDF_COLORS_HEX.text },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 20] as Margins,
    });

    // Upcoming items table
    if (project.upcomingItems.length > 0) {
      stackContent.push(
        { text: 'Upcoming Tasks', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 8] as Margins }
      );
      stackContent.push({
        table: {
          headerRows: 1,
          widths: ['50%', '25%', '25%'],
          body: [
            [
              { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
              { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' as const },
              { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' as const },
            ],
            ...project.upcomingItems.slice(0, 10).map((item, itemIdx) => {
              const fillColor = itemIdx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
              return [
                { text: item.title, fontSize: 10, fillColor },
                { text: item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-', fontSize: 10, alignment: 'center' as const, fillColor },
                { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 10, alignment: 'center' as const, fillColor, color: getPriorityColorHex(item.priority || 'normal') },
              ];
            }),
          ],
        },
        layout: {
          hLineColor: () => PDF_COLORS_HEX.tableBorder,
          vLineColor: () => PDF_COLORS_HEX.tableBorder,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      });

      if (project.upcomingItems.length > 10) {
        stackContent.push({
          text: `+ ${project.upcomingItems.length - 10} more upcoming tasks`,
          fontSize: 9,
          italics: true,
          color: PDF_COLORS_HEX.gray,
          margin: [0, 5, 0, 0] as Margins,
        });
      }
    } else {
      stackContent.push({
        text: 'No upcoming tasks scheduled',
        fontSize: 11,
        italics: true,
        color: PDF_COLORS_HEX.gray,
        margin: [0, 10, 0, 0] as Margins,
      });
    }

    // Team members section if available
    if (project.teamMembers.length > 0) {
      stackContent.push(
        { text: 'Team Members', fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 20, 0, 8] as Margins },
        {
          text: project.teamMembers.map(m => m.name || m.email || 'Unnamed').join('  •  '),
          fontSize: 10,
          color: PDF_COLORS_HEX.darkGray,
        }
      );
    }

    // Each project gets its own page (add page break before all except first)
    const projectContent: Content = {
      stack: stackContent,
      pageBreak: idx > 0 ? 'before' as const : undefined,
    };

    content.push(projectContent);
  });

  return { stack: content };
};

/**
 * Build full roadmap items page for a project
 */
const buildFullRoadmapPage = (
  project: EnhancedProjectSummary,
  allItems: RoadmapItem[]
): Content => {
  const projectItems = allItems.filter(item => item.project_id === project.projectId);

  if (projectItems.length === 0) {
    return { text: '' };
  }

  const pendingItems = projectItems.filter(item => !item.is_completed);
  const completedItems = projectItems.filter(item => item.is_completed);

  // Sort pending items: overdue first, then by due date
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

  const content: Content[] = [
    // Project header
    {
      columns: [
        {
          text: `${project.projectName} - Full Roadmap`,
          fontSize: 16,
          bold: true,
          color: PDF_COLORS_HEX.primary,
          width: '*',
        },
        {
          text: `Health: ${project.healthScore}%`,
          fontSize: 11,
          bold: true,
          color: healthColor,
          alignment: 'right' as const,
          width: 100,
        },
      ],
      margin: [0, 0, 0, 5] as Margins,
    },
    // Stats line
    {
      text: `Total Items: ${projectItems.length}  |  Completed: ${project.completedItems}  |  Progress: ${project.progress}%  |  Overdue: ${project.overdueCount}`,
      fontSize: 10,
      color: PDF_COLORS_HEX.darkGray,
      margin: [0, 0, 0, 15] as Margins,
    },
  ];

  // Pending items section
  if (pendingItems.length > 0) {
    content.push(
      { text: `Pending Items (${pendingItems.length})`, fontSize: 12, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 10, 0, 8] as Margins }
    );

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
          { text: item.title, fontSize: 10, fillColor },
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
      layout: {
        hLineColor: () => PDF_COLORS_HEX.tableBorder,
        vLineColor: () => PDF_COLORS_HEX.tableBorder,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
    });
  }

  // Completed items section
  if (completedItems.length > 0) {
    content.push(
      { text: `Completed Items (${completedItems.length})`, fontSize: 12, bold: true, color: PDF_COLORS_HEX.success, margin: [0, 15, 0, 8] as Margins }
    );

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
          { text: item.title, fontSize: 10, fillColor },
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
      layout: {
        hLineColor: () => PDF_COLORS_HEX.tableBorder,
        vLineColor: () => PDF_COLORS_HEX.tableBorder,
        hLineWidth: () => 0.4,
        vLineWidth: () => 0.4,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    });

    if (completedItems.length > 15) {
      content.push({
        text: `+ ${completedItems.length - 15} more completed items`,
        fontSize: 9,
        italics: true,
        color: PDF_COLORS_HEX.gray,
        margin: [0, 5, 0, 0] as Margins,
      });
    }
  }

  return { stack: content, pageBreak: 'before' as const };
};

/**
 * Build meeting notes section
 */
const buildMeetingNotes = (): Content => {
  return {
    stack: [
      { text: 'Meeting Notes', style: 'h1', margin: [0, 0, 0, 10] as Margins },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 2, lineColor: PDF_COLORS.primary }],
        margin: [0, 0, 0, 15] as Margins,
      },
      // Discussion points box
      { text: 'Discussion Points:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins },
      {
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
      },
      // Key decisions box
      { text: 'Key Decisions:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins },
      {
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
      },
      // Action items table
      { text: 'Action Items:', fontSize: 11, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] as Margins },
      {
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
            [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }, { text: '', fontSize: 10 }, { text: '', fontSize: 10 }],
            [{ text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }],
            [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }, { text: '', fontSize: 10 }, { text: '', fontSize: 10 }],
            [{ text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }, { text: '', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray }],
          ],
        },
        layout: {
          hLineColor: () => PDF_COLORS_HEX.tableBorder,
          vLineColor: () => PDF_COLORS_HEX.tableBorder,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
    ],
  };
};

/**
 * Build table of contents
 */
const buildTableOfContents = (options: RoadmapPDFExportOptions, hasCharts: boolean): Content => {
  const entries: { title: string; page: string }[] = [];
  let pageNum = 2;

  if (options.includeAnalytics) {
    entries.push({ title: 'Executive Summary', page: String(pageNum++) });
  }
  if (options.includeCharts && hasCharts) {
    entries.push({ title: 'Visual Summary', page: String(pageNum++) });
  }
  if (options.includeDetailedProjects) {
    entries.push({ title: 'Project Details', page: String(pageNum++) });
  }
  if (options.includeMeetingNotes) {
    entries.push({ title: 'Meeting Notes', page: String(pageNum++) });
  }

  return {
    stack: [
      { text: 'Table of Contents', style: 'h1', margin: [0, 0, 0, 15] as Margins },
      ...entries.map(entry => ({
        columns: [
          { text: entry.title, fontSize: 11, width: '*' },
          { text: entry.page, fontSize: 11, alignment: 'right' as const, width: 30 },
        ],
        margin: [0, 5, 0, 5] as Margins,
      })),
    ],
  };
};

// ============================================================================
// CHART CONFIGURATIONS
// ============================================================================

/**
 * Roadmap review chart configurations
 * These match the element IDs in the AdminRoadmapReview component
 */
export const ROADMAP_REVIEW_CHARTS: ChartConfig[] = [
  {
    elementId: 'priority-heatmap-chart',
    title: 'Priority Distribution Heatmap',
    description: 'Task priority distribution across projects',
  },
  {
    elementId: 'project-comparison-chart',
    title: 'Project Progress Comparison',
    description: 'Progress and health metrics across all projects',
  },
  {
    elementId: 'team-workload-chart',
    title: 'Team Workload Analysis',
    description: 'Team member assignment distribution',
  },
  {
    elementId: 'portfolio-health-gauge',
    title: 'Portfolio Health Score',
    description: 'Overall portfolio health indicator',
  },
];

/**
 * Capture roadmap review charts from the DOM (ultra-fast)
 * Captures charts sequentially to avoid memory issues
 */
export const captureRoadmapReviewCharts = async (): Promise<CapturedChartData[]> => {
  console.log('[RoadmapPDF] Starting chart capture...');

  // Only capture charts that actually exist in the DOM
  const availableCharts = ROADMAP_REVIEW_CHARTS.filter(
    config => document.getElementById(config.elementId) !== null
  );

  if (availableCharts.length === 0) {
    console.warn('[RoadmapPDF] No chart elements found. Expected IDs:', ROADMAP_REVIEW_CHARTS.map(c => c.elementId));
    return [];
  }

  console.log(`[RoadmapPDF] Found ${availableCharts.length} charts to capture:`, availableCharts.map(c => c.elementId));

  // Capture with balanced settings
  const charts = await captureCharts(availableCharts, {
    scale: 1.0,
    format: 'JPEG',
    quality: 0.7,
    backgroundColor: '#ffffff',
    timeout: 8000,
    maxWidth: 600,
    maxHeight: 400,
  });

  console.log(`[RoadmapPDF] Successfully captured ${charts.length}/${availableCharts.length} charts`);
  return charts;
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Result from PDF generation
 */
export interface PDFGenerationResult {
  blob: Blob;
  filename: string;
}

/**
 * Download the roadmap review PDF directly using pdfmake's streaming download.
 * This is the PRIMARY export method - it streams directly to file without memory issues.
 * 
 * @returns Promise that resolves when download is initiated (not when complete)
 */
export async function downloadRoadmapPdfDirect(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<string> {
  console.log('[RoadmapPDF] Starting direct download with', projects.length, 'projects');

  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  const charts: CapturedChartData[] = capturedCharts || [];
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Build document definition
  console.log('[RoadmapPDF] Building document definition...');
  const docDefinition = await buildPdfDocumentDefinition(projects, metrics, config, allRoadmapItems, charts);

  // Use native download - streams directly to file, no memory issues
  console.log('[RoadmapPDF] Initiating streaming download...');
  const pdfDoc = pdfMake.createPdf(docDefinition);
  pdfDoc.download(finalFilename);
  
  console.log('[RoadmapPDF] Download initiated:', finalFilename);
  return finalFilename;
}

/**
 * Generate PDF blob for storage (simplified version without charts for reliability)
 * This is used ONLY for saving to cloud storage after the user already got their download.
 * 
 * Uses a smaller timeout and simpler content to ensure completion.
 */
export async function generateRoadmapPdfForStorage(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Generating storage version (no charts for reliability)');

  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    // Force simpler settings for storage version
    includeCharts: false, // Charts cause timeouts
    includeFullRoadmapItems: false, // Too much content
  };

  // Limit projects strictly for storage
  const maxProjects = 8;
  const limitedProjects = projects.slice(0, maxProjects);

  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Build simplified document
  const docDefinition = await buildPdfDocumentDefinition(
    limitedProjects, 
    metrics, 
    config, 
    allRoadmapItems, 
    [] // No charts
  );

  // Use getBlob with a short timeout
  const pdfDoc = pdfMake.createPdf(docDefinition);
  
  return new Promise<PDFGenerationResult>((resolve, reject) => {
    // Set a hard timeout of 15 seconds
    const timeout = setTimeout(() => {
      reject(new Error('PDF generation timed out for storage version'));
    }, 15000);

    try {
      pdfDoc.getBlob((blob) => {
        clearTimeout(timeout);
        console.log('[RoadmapPDF] Storage PDF generated:', finalFilename, 'size:', Math.round(blob.size / 1024), 'KB');
        resolve({ blob, filename: finalFilename });
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('[RoadmapPDF] getBlob failed:', error);
      reject(error);
    }
  });
}

/**
 * @deprecated Use downloadRoadmapPdfDirect for instant downloads, 
 * or generateRoadmapPdfForStorage for cloud storage.
 * 
 * This legacy function is kept for backward compatibility but may timeout on large documents.
 */
export async function generateRoadmapPdfMake(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] [LEGACY] Starting generation with', projects.length, 'projects');
  console.warn('[RoadmapPDF] Using legacy generateRoadmapPdfMake - consider using downloadRoadmapPdfDirect instead');

  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  // Use simpler settings to avoid timeout
  const charts: CapturedChartData[] = capturedCharts || [];
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Build the document definition
  console.log('[RoadmapPDF] Building document...');
  const docDefinition = await buildPdfDocumentDefinition(projects, metrics, config, allRoadmapItems, charts);

  console.log('[RoadmapPDF] Generating PDF blob...');
  const pdfDoc = pdfMake.createPdf(docDefinition);
  
  // Use getBlob with timeout
  return new Promise<PDFGenerationResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('PDF generation timed out - document too complex'));
    }, 30000);

    try {
      pdfDoc.getBlob((blob) => {
        clearTimeout(timeout);
        console.log('[RoadmapPDF] PDF generated:', finalFilename, 'size:', Math.round(blob.size / 1024), 'KB');
        resolve({ blob, filename: finalFilename });
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('[RoadmapPDF] getBlob failed:', error);
      reject(error);
    }
  });
}


/**
 * Build the full PDF document definition (no blob - just the definition)
 */
async function buildPdfDocumentDefinition(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  config: RoadmapPDFExportOptions,
  allRoadmapItems?: RoadmapItem[],
  charts: CapturedChartData[] = []
): Promise<TDocumentDefinitions> {
  const doc = createDocument()
    .withStandardHeader('Roadmap Review Report', config.companyName)
    .withStandardFooter(config.confidentialNotice);

  // CRITICAL: Register chart images BEFORE adding chart content
  if (charts.length > 0) {
    const imageDict: Record<string, string> = {};
    charts.forEach(chart => {
      // Ensure the data URL is properly formatted
      const dataUrl = chart.image.dataUrl.startsWith('data:')
        ? chart.image.dataUrl
        : `data:image/jpeg;base64,${chart.image.dataUrl}`;
      imageDict[chart.config.elementId] = dataUrl;
    });
    doc.addImages(imageDict);
    console.log(`[RoadmapPDF] Registered ${Object.keys(imageDict).length} chart images`);
  }

  // Limit projects to prevent overly complex documents (reduced for performance)
  const maxProjects = Math.min(projects.length, 12);
  const limitedProjects = projects.slice(0, maxProjects);
  
  if (projects.length > maxProjects) {
    console.log(`[RoadmapPDF] Limiting from ${projects.length} to ${maxProjects} projects for performance`);
  }

  // Add cover page
  if (config.includeCoverPage) {
    console.log('[RoadmapPDF] Adding cover page...');
    try {
      const companyDetails = await fetchCompanyDetails();
      const coverContent = await generateCoverPageContent(
        {
          title: 'Roadmap Review Report',
          projectName: config.companyName || 'Portfolio Overview',
          subtitle: `Generated ${format(new Date(), 'MMMM d, yyyy')}`,
          revision: 'Rev 1.0',
        },
        companyDetails
      );
      doc.add(coverContent);
    } catch (error) {
      console.error('[RoadmapPDF] Cover page failed, using fallback:', error);
      doc.add([
        { text: 'ROADMAP REVIEW REPORT', fontSize: 28, bold: true, alignment: 'center' as const, margin: [0, 100, 0, 20] as Margins },
        { text: config.companyName || 'Portfolio Overview', fontSize: 18, alignment: 'center' as const, margin: [0, 0, 0, 40] as Margins },
        { text: `Generated: ${format(new Date(), 'MMMM d, yyyy')}`, fontSize: 12, alignment: 'center' as const, color: PDF_COLORS_HEX.gray },
        { text: '', pageBreak: 'after' as const },
      ]);
    }
  }

  // Add table of contents
  if (config.includeTableOfContents) {
    console.log('[RoadmapPDF] Adding TOC...');
    doc.add(buildTableOfContents(config, charts.length > 0));
    doc.addPageBreak();
  }

  // Add executive summary
  if (config.includeAnalytics) {
    console.log('[RoadmapPDF] Adding executive summary...');
    doc.add(buildExecutiveSummary(metrics));
    doc.add(buildPriorityDistribution(metrics));
    doc.add(buildResourceBottlenecks(metrics));
    doc.addPageBreak();
  }

  // Add visual summary (charts) if captured - with stricter size check for performance
  if (config.includeCharts && charts.length > 0) {
    const totalChartSize = charts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 300 * 1024; // Reduced from 500KB for better performance

    if (totalChartSize < maxChartSize) {
      console.log(`[RoadmapPDF] Adding ${charts.length} charts (${Math.round(totalChartSize / 1024)}KB)...`);
      const chartContent = buildChartSectionContent(charts, {
        title: 'Visual Summary',
        subtitle: 'Portfolio Charts & Graphs',
        layout: config.chartLayout || 'stacked',
        chartsPerRow: 2,
        showBorder: false,
        pageBreakBefore: false,
      });
      doc.add(chartContent);
      doc.addPageBreak();
    } else {
      console.warn(`[RoadmapPDF] Charts too large (${Math.round(totalChartSize / 1024)}KB > ${maxChartSize / 1024}KB), skipping`);
      // Add placeholder text instead
      doc.add({
        stack: [
          buildSectionHeader('Visual Summary', 'Charts omitted due to size'),
          { text: 'Charts were too large to include in this PDF. View them in the application.', style: 'body', margin: [0, 10, 0, 20] as Margins },
        ]
      });
      doc.addPageBreak();
    }
  }

  // Add project details
  if (config.includeDetailedProjects) {
    console.log('[RoadmapPDF] Adding project details...');
    doc.add(buildProjectDetails(limitedProjects));
    doc.addPageBreak();
  }

  // Add meeting notes
  if (config.includeMeetingNotes) {
    console.log('[RoadmapPDF] Adding meeting notes...');
    doc.add(buildMeetingNotes());
    doc.addPageBreak();
  }

  // Add full roadmap pages - strictly limited for performance
  if (config.includeFullRoadmapItems && allRoadmapItems) {
    const maxRoadmapProjects = 6; // Reduced for performance
    const roadmapProjects = limitedProjects.slice(0, maxRoadmapProjects);
    console.log(`[RoadmapPDF] Adding ${roadmapProjects.length} full roadmap pages...`);
    
    for (const project of roadmapProjects) {
      const pageContent = buildFullRoadmapPage(project, allRoadmapItems);
      if ((pageContent as any).stack && (pageContent as any).stack.length > 0) {
        doc.add(pageContent);
      }
    }
  }

  // Return document definition - NOT a blob
  console.log('[RoadmapPDF] Document definition built successfully');
  return doc.build();
}

// NOTE: buildMinimalPdf, downloadRoadmapPdfMake, and quickDownloadRoadmapPdf removed
// Use generateRoadmapPdfMake which returns a blob for storage
