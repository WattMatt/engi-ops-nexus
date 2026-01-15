/**
 * Roadmap Review PDF Export - jsPDF Implementation
 * 
 * Switched from pdfmake to jsPDF for RELIABLE blob generation.
 * pdfmake's getBlob/getBase64 methods timeout on complex documents.
 * jsPDF uses synchronous doc.output("blob") which never fails.
 */

import type { Content, ContentTable, TableCell, Margins, TDocumentDefinitions } from "pdfmake/interfaces";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  imageToBase64,
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
import { buildSummaryMinutesContent } from "./roadmapReviewPdfSections/summaryMinutes";

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

  // Executive summary always included unless executive-summary-only mode
  if (options.includeAnalytics) {
    entries.push({ title: 'Executive Summary', page: String(pageNum++) });
  }
  if (options.includeCharts && hasCharts) {
    entries.push({ title: 'Visual Summary', page: String(pageNum++) });
  }
  if (options.includeDetailedProjects) {
    entries.push({ title: 'Project Details', page: String(pageNum++) });
  }
  // Meeting notes and summary only for meeting-review type
  if (options.includeMeetingNotes && options.reportType === 'meeting-review') {
    entries.push({ title: 'Meeting Notes', page: String(pageNum++) });
  }
  if (options.includeSummaryMinutes && options.reportType === 'meeting-review') {
    entries.push({ title: 'Summary Minutes', page: String(pageNum++) });
  }
  if (options.includeFullRoadmapItems) {
    entries.push({ title: 'Full Roadmap Items', page: String(pageNum++) });
  }

  return {
    stack: [
      { text: 'Table of Contents', style: 'h1', margin: [0, 0, 0, 15] as Margins },
      { text: `Report Type: ${formatReportType(options.reportType)}`, fontSize: 9, color: PDF_COLORS_HEX.textMuted, margin: [0, 0, 0, 10] as Margins },
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

// Helper to format report type for display
const formatReportType = (type: string): string => {
  switch (type) {
    case 'meeting-review': return 'Meeting Review Format';
    case 'executive-summary': return 'Executive Summary Only';
    default: return 'Standard Report';
  }
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
 * Generate the roadmap review PDF as a blob for storage/preview.
 * 
 * CRITICAL: Uses jsPDF with synchronous doc.output("blob") - NEVER times out!
 * All export options are now properly respected per specification.
 * 
 * @returns Promise that resolves with the PDF blob and filename
 */
export async function generateRoadmapPdfBlob(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Starting jsPDF generation with', projects.length, 'projects');
  console.log('[RoadmapPDF] Options:', JSON.stringify(options, null, 2));
  const startTime = Date.now();

  // Merge with defaults
  const config: RoadmapPDFExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Create jsPDF document - A4 portrait with compression
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const primaryColor = '#2563eb';
  const textColor = '#333333';
  const mutedColor = '#666666';
  const successColor = '#22c55e';
  const warningColor = '#eab308';
  const dangerColor = '#ef4444';

  // Performance limits by report type
  const maxProjects = config.reportType === 'executive-summary' ? 10 : 20;
  const limitedProjects = projects.slice(0, maxProjects);

  // Helper: Add page footer
  const addPageFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(mutedColor);
    
    // Confidential notice (left side)
    if (config.confidentialNotice) {
      doc.text('CONFIDENTIAL - For internal use only', margin, pageHeight - 8);
    }
    
    // Page number (center)
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  // Helper: Add section header
  const addSectionHeader = (title: string, yPos: number): number => {
    doc.setTextColor(primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    
    // Underline
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 2, margin + doc.getTextWidth(title), yPos + 2);
    
    return yPos + 12;
  };

  // Helper: Check if we need a new page
  const checkPageBreak = (yPos: number, neededSpace: number): number => {
    if (yPos + neededSpace > pageHeight - 25) {
      doc.addPage();
      return 25; // Start position on new page
    }
    return yPos;
  };

  let currentPage = 0;

  // ========== COVER PAGE ==========
  if (config.includeCoverPage) {
    currentPage++;
    console.log('[RoadmapPDF] Adding cover page...');
    
    // Blue header band
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 80, 'F');

    // Company logo (if provided and branding enabled)
    let logoAdded = false;
    if (config.companyLogo) {
      try {
        console.log('[RoadmapPDF] Loading company logo...');
        const logoBase64 = await imageToBase64(config.companyLogo);
        // Calculate logo dimensions - max width 50, maintain aspect ratio
        const logoMaxWidth = 50;
        const logoMaxHeight = 25;
        // Add logo to the left of the header
        doc.addImage(logoBase64, 'PNG', margin + 5, 12, logoMaxWidth, logoMaxHeight);
        logoAdded = true;
        console.log('[RoadmapPDF] Company logo added successfully');
      } catch (error) {
        console.warn('[RoadmapPDF] Failed to load company logo:', error);
      }
    }

    // Report title
    doc.setTextColor('#ffffff');
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('ROADMAP REVIEW', pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('PORTFOLIO REPORT', pageWidth / 2, 52, { align: 'center' });

    // Company name
    if (config.companyName) {
      doc.setFontSize(14);
      doc.text(config.companyName, pageWidth / 2, 68, { align: 'center' });
    }

    // Report type badge
    doc.setTextColor(textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const reportTypeLabel = formatReportType(config.reportType);
    doc.text(reportTypeLabel, pageWidth / 2, 100, { align: 'center' });

    // Generation date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(mutedColor);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy \'at\' HH:mm')}`, pageWidth / 2, 115, { align: 'center' });

    // Summary stats box
    const boxY = 135;
    doc.setFillColor('#f8fafc');
    doc.roundedRect(margin, boxY, contentWidth, 45, 3, 3, 'F');
    
    doc.setTextColor(textColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PORTFOLIO OVERVIEW', margin + 10, boxY + 12);
    
    doc.setFont('helvetica', 'normal');
    const avgHealth = metrics.totalProjects > 0 ? Math.round(metrics.totalHealthScore / metrics.totalProjects) : 0;
    doc.text(`Total Projects: ${metrics.totalProjects}`, margin + 10, boxY + 25);
    doc.text(`Average Health: ${avgHealth}%`, margin + 10, boxY + 33);
    doc.text(`At Risk: ${metrics.projectsAtRisk}`, margin + contentWidth / 2, boxY + 25);
    doc.text(`Critical: ${metrics.projectsCritical}`, margin + contentWidth / 2, boxY + 33);

    // Confidential notice at bottom of cover
    if (config.confidentialNotice) {
      doc.setFontSize(8);
      doc.setTextColor(dangerColor);
      doc.text('CONFIDENTIAL - For internal use only', pageWidth / 2, pageHeight - 20, { align: 'center' });
    }
  }

  // ========== TABLE OF CONTENTS ==========
  if (config.includeTableOfContents && config.reportType !== 'executive-summary') {
    doc.addPage();
    currentPage++;
    console.log('[RoadmapPDF] Adding table of contents...');
    
    let yPos = 25;
    doc.setTextColor(primaryColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', margin, yPos);
    yPos += 5;
    
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin + 60, yPos);
    yPos += 15;

    // Build TOC entries based on options
    const reportType = config.reportType as string;
    const tocEntries: { title: string; included: boolean }[] = [
      { title: 'Executive Summary', included: config.includeAnalytics },
      { title: 'Visual Summary (Charts)', included: config.includeCharts && (capturedCharts?.length || 0) > 0 },
      { title: 'Project Details', included: config.includeDetailedProjects && reportType !== 'executive-summary' },
      { title: 'Meeting Notes', included: config.includeMeetingNotes && reportType === 'meeting-review' },
      { title: 'Summary Minutes', included: config.includeSummaryMinutes && reportType === 'meeting-review' },
      { title: 'Full Roadmap Items', included: config.includeFullRoadmapItems && reportType !== 'executive-summary' },
    ];

    let pageRef = config.includeCoverPage ? 3 : 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    tocEntries.forEach(entry => {
      if (entry.included) {
        doc.setTextColor(textColor);
        doc.text(entry.title, margin, yPos);
        doc.setTextColor(mutedColor);
        doc.text(String(pageRef), pageWidth - margin, yPos, { align: 'right' });
        
        // Dotted line
        doc.setDrawColor('#e5e7eb');
        doc.setLineDashPattern([1, 1], 0);
        doc.line(margin + doc.getTextWidth(entry.title) + 5, yPos, pageWidth - margin - 15, yPos);
        doc.setLineDashPattern([], 0);
        
        yPos += 10;
        pageRef++;
      }
    });

    // Report type note
    doc.setFontSize(9);
    doc.setTextColor(mutedColor);
    doc.text(`Report Type: ${formatReportType(config.reportType)}`, margin, yPos + 15);
  }

  // ========== EXECUTIVE SUMMARY / ANALYTICS ==========
  if (config.includeAnalytics) {
    doc.addPage();
    currentPage++;
    console.log('[RoadmapPDF] Adding executive summary...');
    
    let yPos = 25;
    yPos = addSectionHeader('Executive Summary', yPos);

    // KPI Cards row
    const cardWidth = (contentWidth - 15) / 4;
    const cardHeight = 28;
    const cardY = yPos;
    
    const avgHealth = metrics.totalProjects > 0 ? Math.round(metrics.totalHealthScore / metrics.totalProjects) : 0;
    const projectsOnTrack = metrics.totalProjects - metrics.projectsAtRisk - metrics.projectsCritical;
    
    const kpis = [
      { label: 'Total Projects', value: String(metrics.totalProjects), color: primaryColor },
      { label: 'Avg Progress', value: `${metrics.averageProgress}%`, color: metrics.averageProgress >= 60 ? successColor : metrics.averageProgress >= 40 ? warningColor : dangerColor },
      { label: 'Portfolio Health', value: `${avgHealth}%`, color: avgHealth >= 70 ? successColor : avgHealth >= 40 ? warningColor : dangerColor },
      { label: 'At Risk', value: String(metrics.projectsAtRisk), color: metrics.projectsAtRisk === 0 ? successColor : dangerColor },
    ];

    kpis.forEach((kpi, idx) => {
      const cardX = margin + idx * (cardWidth + 5);
      doc.setFillColor('#f8fafc');
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'F');
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.color);
      doc.text(kpi.value, cardX + cardWidth / 2, cardY + 14, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedColor);
      doc.text(kpi.label, cardX + cardWidth / 2, cardY + 22, { align: 'center' });
    });

    yPos = cardY + cardHeight + 15;

    // Metrics table
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value', 'Assessment']],
      body: [
        ['Critical Projects', String(metrics.projectsCritical), metrics.projectsCritical === 0 ? '✓ None' : '⚠ Action Required'],
        ['Overdue Items', String(metrics.totalOverdueItems), metrics.totalOverdueItems === 0 ? '✓ On Track' : metrics.totalOverdueItems <= 3 ? 'Manageable' : '⚠ High'],
        ['Due This Week', String(metrics.totalDueSoonItems), metrics.totalDueSoonItems > 5 ? 'Busy Week' : 'Normal'],
        ['Portfolio Trend', metrics.portfolioTrend.charAt(0).toUpperCase() + metrics.portfolioTrend.slice(1), metrics.portfolioTrend === 'improving' ? '↑ Positive' : metrics.portfolioTrend === 'declining' ? '↓ Declining' : '→ Stable'],
        ['Team Members', String(metrics.totalTeamMembers), '-'],
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 'auto', halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Priority distribution
    if (metrics.priorityBreakdown.length > 0) {
      yPos = checkPageBreak(yPos, 60);
      yPos = addSectionHeader('Priority Distribution', yPos);
      
      const total = metrics.priorityBreakdown.reduce((acc, x) => acc + x.count, 0);
      const priorityRows = metrics.priorityBreakdown.map(p => {
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        return [p.priority.charAt(0).toUpperCase() + p.priority.slice(1), String(p.count), `${pct}%`];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Priority Level', 'Count', 'Percentage']],
        body: priorityRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Resource bottlenecks
    if (metrics.resourceBottlenecks.length > 0) {
      yPos = checkPageBreak(yPos, 60);
      yPos = addSectionHeader('Resource Bottleneck Analysis', yPos);
      
      const bottleneckRows = metrics.resourceBottlenecks.map(b => [
        b.memberName,
        String(b.taskCount),
        String(b.overdueCount),
        b.taskCount > 10 ? 'Overloaded' : b.taskCount > 5 ? 'High' : 'Normal',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Team Member', 'Active Tasks', 'Overdue', 'Status']],
        body: bottleneckRows,
        theme: 'striped',
        headStyles: { fillColor: dangerColor, textColor: '#ffffff', fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: margin, right: margin },
      });
    }
  }

  // ========== CHARTS / VISUAL SUMMARY ==========
  if (config.includeCharts && capturedCharts && capturedCharts.length > 0) {
    console.log('[RoadmapPDF] Adding charts section...');
    
    // Check total chart size
    const totalChartSize = capturedCharts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 200 * 1024; // 200KB limit
    const maxCharts = 4;

    if (totalChartSize < maxChartSize && capturedCharts.length <= maxCharts) {
      doc.addPage();
      currentPage++;
      
      let yPos = 25;
      yPos = addSectionHeader('Visual Summary', yPos);

      const chartsToRender = capturedCharts.slice(0, maxCharts);
      
      if (config.chartLayout === 'grid' && chartsToRender.length >= 2) {
        // Grid layout: 2 per row
        const chartWidth = (contentWidth - 10) / 2;
        const chartHeight = 60;
        
        for (let i = 0; i < chartsToRender.length; i += 2) {
          yPos = checkPageBreak(yPos, chartHeight + 20);
          
          // First chart
          const chart1 = chartsToRender[i];
          const chartTitle1 = chart1.config?.title || 'Chart';
          try {
            doc.addImage(chart1.image.dataUrl, 'JPEG', margin, yPos, chartWidth, chartHeight);
            doc.setFontSize(8);
            doc.setTextColor(mutedColor);
            doc.text(chartTitle1, margin, yPos + chartHeight + 5);
          } catch (e) {
            console.warn('[RoadmapPDF] Failed to add chart:', chartTitle1);
          }
          
          // Second chart (if exists)
          if (i + 1 < chartsToRender.length) {
            const chart2 = chartsToRender[i + 1];
            const chartTitle2 = chart2.config?.title || 'Chart';
            try {
              doc.addImage(chart2.image.dataUrl, 'JPEG', margin + chartWidth + 10, yPos, chartWidth, chartHeight);
              doc.text(chartTitle2, margin + chartWidth + 10, yPos + chartHeight + 5);
            } catch (e) {
              console.warn('[RoadmapPDF] Failed to add chart:', chartTitle2);
            }
          }
          
          yPos += chartHeight + 15;
        }
      } else {
        // Stacked layout: 1 per row
        const chartWidth = contentWidth;
        const chartHeight = 70;
        
        chartsToRender.forEach(chart => {
          yPos = checkPageBreak(yPos, chartHeight + 20);
          const chartTitle = chart.config?.title || 'Chart';
          
          try {
            doc.addImage(chart.image.dataUrl, 'JPEG', margin, yPos, chartWidth, chartHeight);
            doc.setFontSize(8);
            doc.setTextColor(mutedColor);
            doc.text(chartTitle, margin, yPos + chartHeight + 5);
          } catch (e) {
            console.warn('[RoadmapPDF] Failed to add chart:', chartTitle);
          }
          
          yPos += chartHeight + 15;
        });
      }
    } else {
      console.warn(`[RoadmapPDF] Charts skipped (${Math.round(totalChartSize / 1024)}KB/${maxChartSize / 1024}KB limit)`);
    }
  }

  // ========== PROJECT DETAILS ==========
  if (config.includeDetailedProjects && config.reportType !== 'executive-summary') {
    console.log('[RoadmapPDF] Adding project details...');
    
    limitedProjects.forEach((project, idx) => {
      doc.addPage();
      currentPage++;
      
      let yPos = 25;
      
      // Project header
      const healthColor = project.healthScore >= 70 ? successColor : project.healthScore >= 40 ? warningColor : dangerColor;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text(project.projectName, margin, yPos);
      
      // Health badge
      doc.setFillColor(healthColor);
      const healthText = `${project.healthScore}%`;
      const healthWidth = 25;
      doc.roundedRect(pageWidth - margin - healthWidth, yPos - 6, healthWidth, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor('#ffffff');
      doc.text(healthText, pageWidth - margin - healthWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      
      // Health bar
      doc.setFillColor('#e5e7eb');
      doc.rect(margin, yPos, contentWidth, 4, 'F');
      doc.setFillColor(healthColor);
      doc.rect(margin, yPos, contentWidth * (project.healthScore / 100), 4, 'F');
      
      yPos += 15;
      
      // Stats grid
      const statWidth = contentWidth / 4;
      const stats = [
        { label: 'Progress', value: `${project.progress}%` },
        { label: 'Completed', value: `${project.completedItems}/${project.totalItems}` },
        { label: 'Overdue', value: String(project.overdueCount), color: project.overdueCount > 0 ? dangerColor : successColor },
        { label: 'Team', value: String(project.teamMembers.length) },
      ];
      
      stats.forEach((stat, i) => {
        const statX = margin + i * statWidth;
        doc.setFontSize(8);
        doc.setTextColor(mutedColor);
        doc.text(stat.label, statX, yPos);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(stat.color || textColor);
        doc.text(stat.value, statX, yPos + 8);
      });
      
      doc.setFont('helvetica', 'normal');
      yPos += 20;
      
      // Upcoming tasks table
      if (project.upcomingItems.length > 0) {
        yPos = addSectionHeader('Upcoming Tasks', yPos);
        
        const taskRows = project.upcomingItems.slice(0, 10).map(item => [
          item.title.substring(0, 45),
          item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-',
          (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1),
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Task', 'Due Date', 'Priority']],
          body: taskRows,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });
      }
    });

    if (projects.length > maxProjects) {
      doc.setFontSize(9);
      doc.setTextColor(mutedColor);
      doc.text(`Showing ${maxProjects} of ${projects.length} projects`, margin, pageHeight - 20);
    }
  }

  // ========== MEETING NOTES (meeting-review only) ==========
  if (config.includeMeetingNotes && config.reportType === 'meeting-review') {
    doc.addPage();
    currentPage++;
    console.log('[RoadmapPDF] Adding meeting notes...');
    
    let yPos = 25;
    yPos = addSectionHeader('Meeting Notes', yPos);
    
    // Discussion points box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Discussion Points:', margin, yPos);
    yPos += 5;
    
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos, contentWidth, 50);
    
    // Add lines inside
    for (let i = 1; i <= 5; i++) {
      doc.setDrawColor('#f3f4f6');
      doc.line(margin + 5, yPos + i * 8, margin + contentWidth - 5, yPos + i * 8);
    }
    yPos += 60;
    
    // Key decisions box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Key Decisions:', margin, yPos);
    yPos += 5;
    
    doc.setDrawColor('#e5e7eb');
    doc.rect(margin, yPos, contentWidth, 40);
    for (let i = 1; i <= 4; i++) {
      doc.setDrawColor('#f3f4f6');
      doc.line(margin + 5, yPos + i * 8, margin + contentWidth - 5, yPos + i * 8);
    }
    yPos += 50;
    
    // Action items table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Action Items:', margin, yPos);
    yPos += 5;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Action Item', 'Assigned To', 'Due Date', 'Priority']],
      body: [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 6, minCellHeight: 12 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ========== SUMMARY MINUTES (meeting-review only) ==========
  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    doc.addPage();
    currentPage++;
    console.log('[RoadmapPDF] Adding summary minutes...');
    
    let yPos = 25;
    
    // Page title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('ROADMAP REVIEW - MEETING MINUTES', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Meeting details box
    doc.setFillColor('#f8fafc');
    doc.roundedRect(margin, yPos, contentWidth, 35, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text('Date: _________________', margin + 10, yPos + 10);
    doc.text('Location: _________________', margin + contentWidth / 2, yPos + 10);
    doc.text('Attendees: _______________________________________________', margin + 10, yPos + 20);
    doc.text('Facilitator: ________________', margin + 10, yPos + 30);
    doc.text('Scribe: ________________', margin + contentWidth / 2, yPos + 30);
    yPos += 45;
    
    // Portfolio overview
    yPos = addSectionHeader('Portfolio Overview', yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(mutedColor);
    doc.text(`${limitedProjects.length} projects reviewed. Key observations:`, margin, yPos);
    yPos += 5;
    doc.setDrawColor('#e5e7eb');
    doc.rect(margin, yPos, contentWidth, 20);
    yPos += 30;
    
    // Key decisions table
    yPos = addSectionHeader('Key Decisions', yPos);
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Decision', 'Owner']],
      body: [['1.', '', ''], ['2.', '', ''], ['3.', '', '']],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 110 }, 2: { cellWidth: 40 } },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Priority action items
    yPos = addSectionHeader('Priority Action Items', yPos);
    autoTable(doc, {
      startY: yPos,
      head: [['✓', 'Project', 'Action', 'Owner', 'Due', 'Status']],
      body: [
        ['☐', '', '', '', '', ''],
        ['☐', '', '', '', '', ''],
        ['☐', '', '', '', '', ''],
        ['☐', '', '', '', '', ''],
        ['☐', '', '', '', '', ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 55 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Next steps
    yPos = checkPageBreak(yPos, 50);
    yPos = addSectionHeader('Next Steps & Follow-ups', yPos);
    doc.setFillColor('#f8fafc');
    doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(textColor);
    doc.text('Next Review Date: __________', margin + 10, yPos + 8);
    doc.text('Escalations Required: __________', margin + contentWidth / 2, yPos + 8);
    doc.text('Notes: _______________________________________', margin + 10, yPos + 16);
    yPos += 30;
    
    // Sign-off
    yPos = checkPageBreak(yPos, 40);
    yPos = addSectionHeader('Sign-off', yPos);
    const sigWidth = (contentWidth - 20) / 3;
    const sigLabels = ['Prepared by', 'Reviewed by', 'Approved by'];
    sigLabels.forEach((label, i) => {
      const sigX = margin + i * (sigWidth + 10);
      doc.setFillColor('#f8fafc');
      doc.roundedRect(sigX, yPos, sigWidth, 30, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor);
      doc.text(label, sigX + 5, yPos + 8);
      doc.setDrawColor(mutedColor);
      doc.line(sigX + 5, yPos + 20, sigX + sigWidth - 5, yPos + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Name: ________', sigX + 5, yPos + 26);
      doc.text('Date: ________', sigX + sigWidth / 2, yPos + 26);
    });
  }

  // ========== FULL ROADMAP ITEMS ==========
  if (config.includeFullRoadmapItems && allRoadmapItems && config.reportType !== 'executive-summary') {
    console.log('[RoadmapPDF] Adding full roadmap items...');
    
    const maxRoadmapProjects = 6;
    const roadmapProjects = limitedProjects.slice(0, maxRoadmapProjects);
    
    roadmapProjects.forEach(project => {
      const projectItems = allRoadmapItems.filter(item => item.project_id === project.projectId);
      if (projectItems.length === 0) return;
      
      doc.addPage();
      currentPage++;
      
      let yPos = 25;
      
      // Project header
      const healthColor = project.healthScore >= 70 ? successColor : project.healthScore >= 40 ? warningColor : dangerColor;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text(`${project.projectName} - Full Roadmap`, margin, yPos);
      
      doc.setFontSize(10);
      doc.setTextColor(healthColor);
      doc.text(`Health: ${project.healthScore}%`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;
      
      // Stats line
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedColor);
      doc.text(`Total: ${projectItems.length} | Completed: ${project.completedItems} | Progress: ${project.progress}% | Overdue: ${project.overdueCount}`, margin, yPos);
      yPos += 12;
      
      // Split items
      const pendingItems = projectItems.filter(item => !item.is_completed);
      const completedItems = projectItems.filter(item => item.is_completed);
      
      // Pending items
      if (pendingItems.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text(`Pending Items (${pendingItems.length})`, margin, yPos);
        yPos += 5;
        
        const pendingRows = pendingItems.slice(0, 20).map(item => {
          const status = getDueDateStatus(item.due_date || null);
          const statusLabel = item.is_completed ? '✓ Complete' : status === 'overdue' ? 'OVERDUE' : status === 'soon' ? 'Due Soon' : 'Pending';
          return [
            item.title.substring(0, 40),
            item.due_date ? format(new Date(item.due_date), 'MMM d') : '-',
            (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1),
            statusLabel,
          ];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [['Task', 'Due', 'Priority', 'Status']],
          body: pendingRows,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: '#ffffff', fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Completed items (abbreviated)
      if (completedItems.length > 0) {
        yPos = checkPageBreak(yPos, 50);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(successColor);
        doc.text(`Completed Items (${completedItems.length})`, margin, yPos);
        yPos += 5;
        
        const completedRows = completedItems.slice(0, 10).map(item => [
          item.title.substring(0, 50),
          (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1),
          '✓ Complete',
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Task', 'Priority', 'Status']],
          body: completedRows,
          theme: 'striped',
          headStyles: { fillColor: successColor, textColor: '#ffffff', fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: margin, right: margin },
        });
        
        if (completedItems.length > 10) {
          yPos = (doc as any).lastAutoTable.finalY + 5;
          doc.setFontSize(8);
          doc.setTextColor(mutedColor);
          doc.text(`+ ${completedItems.length - 10} more completed items`, margin, yPos);
        }
      }
    });
  }

  // ========== ADD PAGE NUMBERS TO ALL PAGES ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i, totalPages);
  }

  // ========== GENERATE BLOB - SYNCHRONOUS, NEVER TIMES OUT! ==========
  console.log('[RoadmapPDF] Generating blob synchronously...');
  const blob = doc.output('blob');
  
  const elapsed = Date.now() - startTime;
  console.log(`[RoadmapPDF] PDF complete: ${finalFilename} (${(blob.size / 1024).toFixed(1)} KB) in ${elapsed}ms`);
  console.log(`[RoadmapPDF] Generated ${totalPages} pages`);
  
  return { blob, filename: finalFilename };
}

/**
 * Build FAST, simple content - no async, no complex nesting
 */
function buildFastContent(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions>
): Content[] {
  const content: Content[] = [];

  // Title
  content.push({
    text: 'ROADMAP REVIEW REPORT',
    style: 'header',
    alignment: 'center',
    margin: [0, 20, 0, 10] as Margins,
  });

  if (options.companyName) {
    content.push({
      text: options.companyName,
      fontSize: 14,
      alignment: 'center',
      color: '#666666',
      margin: [0, 0, 0, 5] as Margins,
    });
  }

  content.push({
    text: `Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`,
    fontSize: 11,
    alignment: 'center',
    color: '#888888',
    margin: [0, 0, 0, 30] as Margins,
  });

  // Calculate averageHealth from totalHealthScore
  const avgHealth = metrics.totalProjects > 0 ? Math.round(metrics.totalHealthScore / metrics.totalProjects) : 0;
  const projectsOnTrack = metrics.totalProjects - metrics.projectsAtRisk - metrics.projectsCritical;

  // Portfolio Summary Box
  content.push({
    text: 'PORTFOLIO SUMMARY',
    style: 'subheader',
  });

  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          { text: 'Total Projects', bold: true, alignment: 'center' },
          { text: 'Avg Health', bold: true, alignment: 'center' },
          { text: 'On Track', bold: true, alignment: 'center' },
          { text: 'At Risk', bold: true, alignment: 'center' },
        ],
        [
          { text: String(metrics.totalProjects), alignment: 'center', fontSize: 16, bold: true },
          { text: `${avgHealth}%`, alignment: 'center', fontSize: 16, bold: true, color: avgHealth >= 70 ? '#22c55e' : avgHealth >= 40 ? '#eab308' : '#ef4444' },
          { text: String(projectsOnTrack), alignment: 'center', fontSize: 16, bold: true, color: '#22c55e' },
          { text: String(metrics.projectsAtRisk), alignment: 'center', fontSize: 16, bold: true, color: '#ef4444' },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#e5e7eb',
      vLineColor: () => '#e5e7eb',
      paddingTop: () => 8,
      paddingBottom: () => 8,
    },
    margin: [0, 0, 0, 20] as Margins,
  });

  // Projects Table
  content.push({
    text: 'PROJECT STATUS',
    style: 'subheader',
    margin: [0, 20, 0, 10] as Margins,
  });

  const tableBody: TableCell[][] = [
    [
      { text: 'Project', style: 'tableHeader' },
      { text: 'Health', style: 'tableHeader', alignment: 'center' },
      { text: 'Progress', style: 'tableHeader', alignment: 'center' },
      { text: 'Risk', style: 'tableHeader', alignment: 'center' },
      { text: 'Overdue', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  projects.forEach((project, idx) => {
    const healthColor = project.healthScore >= 70 ? '#22c55e' : project.healthScore >= 40 ? '#eab308' : '#ef4444';
    const fillColor = idx % 2 === 0 ? '#f9fafb' : '#ffffff';
    
    tableBody.push([
      { text: project.projectName.substring(0, 40), fillColor },
      { text: `${project.healthScore}%`, alignment: 'center', color: healthColor, bold: true, fillColor },
      { text: `${project.completedItems}/${project.totalItems}`, alignment: 'center', fillColor },
      { text: project.riskLevel.charAt(0).toUpperCase() + project.riskLevel.slice(1), alignment: 'center', fillColor },
      { text: String(project.overdueCount), alignment: 'center', color: project.overdueCount > 0 ? '#ef4444' : '#22c55e', fillColor },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 60, 70, 70, 60],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#d1d5db',
      vLineColor: () => '#d1d5db',
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 8,
      paddingRight: () => 8,
    },
  });

  // Note about limited data
  if (projects.length === 5) {
    content.push({
      text: 'Note: Report limited to first 5 projects for performance.',
      fontSize: 9,
      italics: true,
      color: '#9ca3af',
      margin: [0, 10, 0, 0] as Margins,
    });
  }

  return content;
}

/**
 * @deprecated Use generateRoadmapPdfBlob instead - direct download is no longer used.
 * Download the roadmap review PDF directly using pdfmake's streaming download.
 */
export async function downloadRoadmapPdfDirect(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<string> {
  console.log('[RoadmapPDF] DEPRECATED: Using direct download - consider using generateRoadmapPdfBlob instead');

  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  const charts: CapturedChartData[] = capturedCharts || [];
  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  const docDefinition = await buildPdfDocumentDefinition(projects, metrics, config, allRoadmapItems, charts);

  const pdfDoc = pdfMake.createPdf(docDefinition);
  pdfDoc.download(finalFilename);
  
  return finalFilename;
}

/**
 * @deprecated Use generateRoadmapPdfBlob instead - this minimal version is no longer needed.
 * 
 * Generate PDF blob for storage (ULTRA-MINIMAL version for reliability)
 * This was used for saving to cloud storage after the user got their download.
 * Now we save the FULL PDF to storage via generateRoadmapPdfBlob.
 */
export async function generateRoadmapPdfForStorage(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Generating MINIMAL storage version (1-page summary)');

  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Build ULTRA-MINIMAL document - just a summary page for storage/record
  const doc = createDocument()
    .withStandardHeader('Roadmap Review Report', config.companyName)
    .withStandardFooter(config.confidentialNotice);

  // Single page with report metadata and key stats only
  doc.add([
    { text: 'ROADMAP REVIEW REPORT', fontSize: 24, bold: true, alignment: 'center' as const, margin: [0, 40, 0, 15] as Margins },
    { text: config.companyName || 'Portfolio Overview', fontSize: 14, alignment: 'center' as const, margin: [0, 0, 0, 10] as Margins },
    { text: `Report Type: ${formatReportType(config.reportType)}`, fontSize: 11, alignment: 'center' as const, color: PDF_COLORS_HEX.primary },
    { text: `Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, fontSize: 10, alignment: 'center' as const, color: PDF_COLORS_HEX.gray, margin: [0, 5, 0, 30] as Margins },
    
    // Quick stats table
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            { text: 'Total Projects', alignment: 'center' as const, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', bold: true },
            { text: 'At Risk', alignment: 'center' as const, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', bold: true },
            { text: 'Overdue Items', alignment: 'center' as const, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', bold: true },
            { text: 'Avg Progress', alignment: 'center' as const, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', bold: true },
          ],
          [
            { text: String(metrics.totalProjects), alignment: 'center' as const, fontSize: 16, bold: true },
            { text: String(metrics.projectsAtRisk), alignment: 'center' as const, fontSize: 16, bold: true },
            { text: String(metrics.totalOverdueItems), alignment: 'center' as const, fontSize: 16, bold: true },
            { text: `${Math.round(metrics.averageProgress || 0)}%`, alignment: 'center' as const, fontSize: 16, bold: true },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 25] as Margins,
    },
    
    // Report options used
    buildSectionHeader('Report Configuration', 'Options selected for this export'),
    {
      ul: [
        `Table of Contents: ${config.includeTableOfContents ? 'Yes' : 'No'}`,
        `Executive Summary: ${config.includeAnalytics ? 'Yes' : 'No'}`,
        `Visual Charts: ${config.includeCharts ? 'Yes' : 'No'}`,
        `Project Details: ${config.includeDetailedProjects ? 'Yes' : 'No'}`,
        `Meeting Notes: ${config.includeMeetingNotes ? 'Yes' : 'No'}`,
        `Summary Minutes: ${config.includeSummaryMinutes ? 'Yes' : 'No'}`,
        `Full Roadmap Items: ${config.includeFullRoadmapItems ? 'Yes' : 'No'}`,
      ],
      margin: [20, 5, 0, 25] as Margins,
    },
    
    // Project list (compact)
    buildSectionHeader('Projects Included', `${projects.length} projects in this report`),
    {
      ul: projects.slice(0, 20).map(p => `${p.projectName} (${p.status || 'Unknown'}) - ${Math.round(p.progress)}%`),
      margin: [20, 5, 0, 20] as Margins,
      fontSize: 9,
    },
    projects.length > 20 ? { text: `... and ${projects.length - 20} more projects`, italics: true, fontSize: 9, margin: [20, 0, 0, 20] as Margins } : { text: '' },
    
    // Footer note
    { text: 'This is a storage summary. The full detailed report was downloaded directly.', alignment: 'center' as const, fontSize: 8, color: PDF_COLORS_HEX.gray, margin: [0, 30, 0, 0] as Margins },
  ]);

  // Build and convert to blob with SHORT timeout (5 seconds max for 1 page)
  const docDefinition = doc.build();
  const pdfDoc = pdfMake.createPdf(docDefinition);
  
  return new Promise<PDFGenerationResult>((resolve, reject) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[RoadmapPDF] Storage generation timed out after 5 seconds');
        reject(new Error('PDF generation timed out for storage version'));
      }
    }, 5000); // 5 second timeout - should be plenty for 1 page

    try {
      pdfDoc.getBlob((blob) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log('[RoadmapPDF] Storage PDF generated:', finalFilename, 'size:', Math.round(blob.size / 1024), 'KB');
          resolve({ blob, filename: finalFilename });
        }
      });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('[RoadmapPDF] getBlob failed:', error);
        reject(error);
      }
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

  console.log('[RoadmapPDF] Generating PDF via base64 (more reliable)...');
  const pdfDoc = pdfMake.createPdf(docDefinition);
  
  // CRITICAL: Use getBase64 instead of getBlob - it's more reliable in browsers!
  return new Promise<PDFGenerationResult>((resolve, reject) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('PDF generation timed out - document too complex'));
      }
    }, 30000);

    try {
      pdfDoc.getBase64((base64: string) => {
        if (resolved) return;
        
        if (!base64 || base64.length === 0) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('PDF generation returned empty result'));
          return;
        }
        
        try {
          // Convert base64 to blob
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          resolved = true;
          clearTimeout(timeout);
          console.log('[RoadmapPDF] PDF generated:', finalFilename, 'size:', Math.round(blob.size / 1024), 'KB');
          resolve({ blob, filename: finalFilename });
        } catch (conversionError) {
          resolved = true;
          clearTimeout(timeout);
          console.error('[RoadmapPDF] Base64 conversion failed:', conversionError);
          reject(conversionError);
        }
      });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.error('[RoadmapPDF] getBase64 failed:', error);
        reject(error);
      }
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

  // Limit projects to prevent overly complex documents (REDUCED to prevent timeout)
  const maxProjects = Math.min(projects.length, 8);
  const limitedProjects = projects.slice(0, maxProjects);
  
  if (projects.length > maxProjects) {
    console.log(`[RoadmapPDF] Limiting from ${projects.length} to ${maxProjects} projects for performance`);
  }
  
  console.log(`[RoadmapPDF] Building document with ${limitedProjects.length} projects, charts: ${charts.length}`);
  console.log(`[RoadmapPDF] Options: cover=${config.includeCoverPage}, toc=${config.includeTableOfContents}, charts=${config.includeCharts}, details=${config.includeDetailedProjects}`);


  // Add cover page
  if (config.includeCoverPage) {
    console.log('[RoadmapPDF] Adding cover page...');
    try {
      const companyDetails = await fetchCompanyDetails();
      const coverContent = await generateCoverPageContent(
        {
          title: 'Roadmap Review Report',
          projectName: config.companyName || 'Portfolio Overview',
          subtitle: `${formatReportType(config.reportType)} • Generated ${format(new Date(), 'MMMM d, yyyy')}`,
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
        { text: formatReportType(config.reportType), fontSize: 12, alignment: 'center' as const, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 10] as Margins },
        { text: `Generated: ${format(new Date(), 'MMMM d, yyyy')}`, fontSize: 12, alignment: 'center' as const, color: PDF_COLORS_HEX.gray },
        { text: '', pageBreak: 'after' as const },
      ]);
    }
  }

  // Add table of contents (skip for executive-summary-only mode)
  if (config.includeTableOfContents && config.reportType !== 'executive-summary') {
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

  // Add visual summary (charts) if captured - with STRICT size check for performance
  if (config.includeCharts && charts.length > 0) {
    const totalChartSize = charts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 150 * 1024; // Reduced to 150KB for better performance
    const maxCharts = 3; // Limit to 3 charts max

    // Only include if small enough
    if (totalChartSize < maxChartSize && charts.length <= maxCharts) {
      console.log(`[RoadmapPDF] Adding ${charts.length} charts (${Math.round(totalChartSize / 1024)}KB)...`);
      const chartContent = buildChartSectionContent(charts.slice(0, maxCharts), {
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
      console.warn(`[RoadmapPDF] Charts skipped (${Math.round(totalChartSize / 1024)}KB/${maxChartSize / 1024}KB, ${charts.length}/${maxCharts} charts)`);
      // Skip charts entirely for performance - no placeholder
    }
  }

  // Add project details (skip for executive-summary-only mode)
  if (config.includeDetailedProjects && config.reportType !== 'executive-summary') {
    console.log('[RoadmapPDF] Adding project details...');
    doc.add(buildProjectDetails(limitedProjects));
    doc.addPageBreak();
  }

  // Add meeting notes (only for meeting-review type)
  if (config.includeMeetingNotes && config.reportType === 'meeting-review') {
    console.log('[RoadmapPDF] Adding meeting notes...');
    doc.add(buildMeetingNotes());
    doc.addPageBreak();
  }

  // Add summary minutes page (only for meeting-review type)
  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    console.log('[RoadmapPDF] Adding summary minutes...');
    doc.add(buildSummaryMinutesContent({
      companyLogo: config.companyLogo,
      companyName: config.companyName,
      generationDate: format(new Date(), 'MMMM d, yyyy'),
      projectCount: limitedProjects.length,
    }));
    doc.addPageBreak();
  }

  // Add full roadmap pages (skip for executive-summary-only mode)
  if (config.includeFullRoadmapItems && allRoadmapItems && config.reportType !== 'executive-summary') {
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
