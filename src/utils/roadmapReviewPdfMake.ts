/**
 * Roadmap Review PDF Export - PDFMake Implementation
 * 
 * Complete replacement for jsPDF with proper text rendering and table support.
 * Uses the pdfmake library for better quality output.
 */

import type { Content, ContentTable, TableCell, Margins } from "pdfmake/interfaces";
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
} from "./pdfmake";
import type { PDFDocumentBuilder } from "./pdfmake";
import { 
  EnhancedProjectSummary, 
  PortfolioMetrics,
  getDueDateStatus 
} from "./roadmapReviewCalculations";
import { 
  PDF_COLORS_HEX,
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

const getPriorityColorHex = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical': return PDF_COLORS_HEX.riskCritical;
    case 'high': return PDF_COLORS_HEX.riskHigh;
    case 'medium': return PDF_COLORS_HEX.riskMedium;
    case 'normal':
    case 'low': return PDF_COLORS_HEX.success;
    default: return PDF_COLORS_HEX.gray;
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
  return { label: 'Pending', color: PDF_COLORS_HEX.text };
};

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

/**
 * Build executive summary content
 */
const buildExecutiveSummary = (metrics: PortfolioMetrics): Content => {
  const rows: TableCell[][] = [
    [
      { text: 'Metric', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10 },
      { text: 'Value', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
      { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 10, alignment: 'center' },
    ],
    [
      { text: 'Total Projects', fontSize: 10 },
      { text: String(metrics.totalProjects), fontSize: 10, alignment: 'center' },
      { text: 'Active', fontSize: 10, alignment: 'center' },
    ],
    [
      { text: 'Average Progress', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray },
      { text: `${metrics.averageProgress}%`, fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.lightGray },
      { 
        text: metrics.averageProgress >= 60 ? 'On Track' : metrics.averageProgress >= 40 ? 'Attention' : 'Behind', 
        fontSize: 10, 
        alignment: 'center',
        fillColor: PDF_COLORS_HEX.lightGray,
        color: metrics.averageProgress >= 60 ? PDF_COLORS_HEX.success : metrics.averageProgress >= 40 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger,
      },
    ],
    [
      { text: 'Portfolio Health', fontSize: 10 },
      { text: `${metrics.totalHealthScore}%`, fontSize: 10, alignment: 'center' },
      { 
        text: metrics.totalHealthScore >= 70 ? 'Healthy' : metrics.totalHealthScore >= 50 ? 'Moderate' : 'Needs Attention', 
        fontSize: 10, 
        alignment: 'center',
        color: getHealthColorHex(metrics.totalHealthScore),
      },
    ],
    [
      { text: 'Projects at Risk', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray },
      { text: String(metrics.projectsAtRisk), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.lightGray },
      { 
        text: metrics.projectsAtRisk === 0 ? 'None' : metrics.projectsAtRisk <= 2 ? 'Manageable' : 'High',
        fontSize: 10, 
        alignment: 'center',
        fillColor: PDF_COLORS_HEX.lightGray,
        color: metrics.projectsAtRisk === 0 ? PDF_COLORS_HEX.success : metrics.projectsAtRisk <= 2 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger,
      },
    ],
    [
      { text: 'Critical Projects', fontSize: 10 },
      { text: String(metrics.projectsCritical), fontSize: 10, alignment: 'center' },
      { 
        text: metrics.projectsCritical === 0 ? 'None' : 'Action Needed',
        fontSize: 10, 
        alignment: 'center',
        color: metrics.projectsCritical === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger,
      },
    ],
    [
      { text: 'Overdue Items', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray },
      { text: String(metrics.totalOverdueItems), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.lightGray },
      { 
        text: metrics.totalOverdueItems === 0 ? 'None' : metrics.totalOverdueItems <= 3 ? 'Low' : 'High',
        fontSize: 10, 
        alignment: 'center',
        fillColor: PDF_COLORS_HEX.lightGray,
        color: metrics.totalOverdueItems === 0 ? PDF_COLORS_HEX.success : metrics.totalOverdueItems <= 3 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger,
      },
    ],
    [
      { text: 'Due This Week', fontSize: 10 },
      { text: String(metrics.totalDueSoonItems), fontSize: 10, alignment: 'center' },
      { text: '-', fontSize: 10, alignment: 'center' },
    ],
    [
      { text: 'Team Members', fontSize: 10, fillColor: PDF_COLORS_HEX.lightGray },
      { text: String(metrics.totalTeamMembers), fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.lightGray },
      { text: '-', fontSize: 10, alignment: 'center', fillColor: PDF_COLORS_HEX.lightGray },
    ],
  ];

  return {
    stack: [
      { text: 'Executive Summary', style: 'h1', margin: [0, 0, 0, 10] as Margins },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 2, lineColor: PDF_COLORS.primary }],
        margin: [0, 0, 0, 15] as Margins,
      },
      {
        table: {
          headerRows: 1,
          widths: ['40%', '25%', '35%'],
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
 * Build priority distribution content
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
 * Build project details content
 */
const buildProjectDetails = (projects: EnhancedProjectSummary[]): Content => {
  const content: Content[] = [
    { text: 'Project Details', style: 'h1', margin: [0, 0, 0, 10] as Margins },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 2, lineColor: PDF_COLORS.primary }],
      margin: [0, 0, 0, 15] as Margins,
    },
  ];

  projects.forEach((project, idx) => {
    const healthColor = getHealthColorHex(project.healthScore);
    
    content.push({
      stack: [
        // Project header
        {
          columns: [
            { 
              text: project.projectName, 
              fontSize: 14, 
              bold: true, 
              color: PDF_COLORS_HEX.primary,
              width: '*',
            },
            {
              stack: [
                { 
                  text: `${project.healthScore}%`, 
                  fontSize: 12, 
                  bold: true, 
                  color: '#FFFFFF',
                  alignment: 'center' as const,
                  background: healthColor,
                },
              ],
              width: 50,
            },
          ],
          margin: [0, idx > 0 ? 15 : 0, 0, 5] as Margins,
        },
        // Project stats
        {
          columns: [
            { text: `Progress: ${project.progress}%`, fontSize: 9, color: PDF_COLORS_HEX.darkGray },
            { text: `Items: ${project.completedItems}/${project.totalItems}`, fontSize: 9, color: PDF_COLORS_HEX.darkGray },
            { text: `Overdue: ${project.overdueCount}`, fontSize: 9, color: project.overdueCount > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.darkGray },
            { text: `Team: ${project.teamMembers.length}`, fontSize: 9, color: PDF_COLORS_HEX.darkGray },
          ],
          margin: [0, 0, 0, 8] as Margins,
        },
        // Upcoming items table
        ...(project.upcomingItems.length > 0 ? [{
          table: {
            headerRows: 1,
            widths: ['50%', '25%', '25%'],
            body: [
              [
                { text: 'Upcoming Tasks', bold: true, fillColor: PDF_COLORS_HEX.primaryLight, color: '#FFFFFF', fontSize: 9 },
                { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primaryLight, color: '#FFFFFF', fontSize: 9, alignment: 'center' as const },
                { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primaryLight, color: '#FFFFFF', fontSize: 9, alignment: 'center' as const },
              ],
              ...project.upcomingItems.slice(0, 5).map((item, itemIdx) => {
                const fillColor = itemIdx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
                return [
                  { text: item.title, fontSize: 9, fillColor },
                  { text: item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : '-', fontSize: 9, alignment: 'center' as const, fillColor },
                  { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 9, alignment: 'center' as const, fillColor, color: getPriorityColorHex(item.priority || 'normal') },
                ];
              }),
            ],
          },
          layout: {
            hLineColor: () => PDF_COLORS_HEX.tableBorder,
            vLineColor: () => PDF_COLORS_HEX.tableBorder,
            hLineWidth: () => 0.3,
            vLineWidth: () => 0.3,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        } as Content] : []),
        // Separator line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS_HEX.tableBorder }],
          margin: [0, 10, 0, 0] as Margins,
        },
      ],
    });
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
    elementId: 'portfolio-health-gauge',
    title: 'Portfolio Health Score',
    description: 'Overall portfolio health indicator',
  },
  {
    elementId: 'project-comparison-chart',
    title: 'Project Progress Comparison',
    description: 'Progress and health metrics across all projects',
  },
  {
    elementId: 'priority-heatmap-chart',
    title: 'Priority Distribution Heatmap',
    description: 'Task priority distribution across projects',
  },
  {
    elementId: 'team-workload-chart',
    title: 'Team Workload Analysis',
    description: 'Team member assignment distribution',
  },
];

/**
 * Capture roadmap review charts from the DOM (ultra-fast)
 */
export const captureRoadmapReviewCharts = async (): Promise<CapturedChartData[]> => {
  // Only capture charts that actually exist in the DOM
  const availableCharts = ROADMAP_REVIEW_CHARTS.filter(
    config => document.getElementById(config.elementId) !== null
  );
  
  if (availableCharts.length === 0) {
    console.log('No chart elements found in DOM');
    return [];
  }
  
  console.log(`Capturing ${availableCharts.length} charts...`);
  
  // No wait - capture immediately with minimal settings
  const charts = await captureCharts(availableCharts, {
    scale: 1,
    format: 'JPEG',
    quality: 0.7,
    backgroundColor: '#ffffff',
    timeout: 2000,
  });
  
  return charts;
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate the roadmap review PDF using pdfmake
 * Uses a progressive approach: tries with charts first, falls back to simpler version if needed
 * @param capturedCharts - Pre-captured charts to include (optional, will capture if not provided)
 */
export async function generateRoadmapPdfMake(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[]
): Promise<Blob> {
  console.log('generateRoadmapPdfMake: Starting with', projects.length, 'projects');
  
  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  // Try with charts first, fall back to no charts if it fails
  let charts: CapturedChartData[] = capturedCharts || [];
  if (config.includeCharts && !capturedCharts) {
    try {
      console.log('generateRoadmapPdfMake: Capturing charts...');
      charts = await captureRoadmapReviewCharts();
      console.log(`generateRoadmapPdfMake: Captured ${charts.length} charts`);
    } catch (error) {
      console.error('Failed to capture charts:', error);
      charts = [];
    }
  } else if (capturedCharts) {
    console.log('generateRoadmapPdfMake: Using', capturedCharts.length, 'pre-captured charts');
  }

  // First attempt: with charts
  try {
    console.log('generateRoadmapPdfMake: Building document with charts...');
    const blob = await buildPdfDocument(projects, metrics, config, allRoadmapItems, charts);
    console.log('generateRoadmapPdfMake: PDF generated successfully with charts, size:', blob.size);
    return blob;
  } catch (error) {
    console.error('PDF generation with charts failed:', error);
    
    // Fallback: try without charts if we had charts
    if (charts.length > 0) {
      console.log('generateRoadmapPdfMake: Retrying without charts...');
      try {
        const blob = await buildPdfDocument(projects, metrics, config, allRoadmapItems, []);
        console.log('generateRoadmapPdfMake: PDF generated successfully without charts, size:', blob.size);
        return blob;
      } catch (fallbackError) {
        console.error('PDF generation without charts also failed:', fallbackError);
      }
    }
    
    // Final fallback: minimal PDF
    console.log('generateRoadmapPdfMake: Creating minimal PDF...');
    return buildMinimalPdf(projects, metrics);
  }
}

/**
 * Build the full PDF document
 */
async function buildPdfDocument(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  config: RoadmapPDFExportOptions,
  allRoadmapItems?: RoadmapItem[],
  charts: CapturedChartData[] = []
): Promise<Blob> {
  const doc = createDocument()
    .withStandardHeader('Roadmap Review Report', config.companyName)
    .withStandardFooter(config.confidentialNotice);

  // Add cover page
  if (config.includeCoverPage) {
    console.log('generateRoadmapPdfMake: Adding cover page...');
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
      console.error('Failed to generate cover page:', error);
      // Add simple cover page fallback
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
    console.log('generateRoadmapPdfMake: Adding TOC...');
    doc.add(buildTableOfContents(config, charts.length > 0));
    doc.addPageBreak();
  }

  // Add executive summary
  if (config.includeAnalytics) {
    console.log('generateRoadmapPdfMake: Adding executive summary...');
    doc.add(buildExecutiveSummary(metrics));
    doc.add(buildPriorityDistribution(metrics));
    doc.addPageBreak();
  }

  // Add visual summary (charts) if captured - with size check
  if (config.includeCharts && charts.length > 0) {
    // Check total chart data size - skip if too large
    const totalChartSize = charts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 500 * 1024; // 500KB limit for all charts
    
    if (totalChartSize < maxChartSize) {
      console.log('generateRoadmapPdfMake: Adding', charts.length, 'charts (', Math.round(totalChartSize / 1024), 'KB)...');
      const chartContent = buildChartSectionContent(charts, {
        title: 'Visual Summary',
        subtitle: 'Portfolio Charts & Graphs',
        layout: config.chartLayout || 'stacked',
        chartsPerRow: 2,
        showBorder: true,
        pageBreakBefore: false,
      });
      doc.add(chartContent);
      doc.addPageBreak();
    } else {
      console.log('generateRoadmapPdfMake: Skipping charts - too large (', Math.round(totalChartSize / 1024), 'KB)');
    }
  }

  // Add project details - limit to prevent huge documents
  if (config.includeDetailedProjects) {
    console.log('generateRoadmapPdfMake: Adding project details...');
    const limitedProjects = projects.slice(0, 30); // Limit projects to prevent timeout
    doc.add(buildProjectDetails(limitedProjects));
    doc.addPageBreak();
  }

  // Add meeting notes
  if (config.includeMeetingNotes) {
    console.log('generateRoadmapPdfMake: Adding meeting notes...');
    doc.add(buildMeetingNotes());
    doc.addPageBreak();
  }

  // Add full roadmap pages for each project (limited)
  if (config.includeFullRoadmapItems && allRoadmapItems) {
    console.log('generateRoadmapPdfMake: Adding full roadmap pages...');
    const limitedProjects = projects.slice(0, 20); // Limit for performance
    for (const project of limitedProjects) {
      const pageContent = buildFullRoadmapPage(project, allRoadmapItems);
      if ((pageContent as any).stack && (pageContent as any).stack.length > 0) {
        doc.add(pageContent);
      }
    }
  }

  // Generate and return blob with extended timeout
  console.log('generateRoadmapPdfMake: Building PDF blob...');
  const blob = await doc.toBlob(120000); // 2 minute timeout for complex docs
  return blob;
}

/**
 * Build a minimal PDF as a last resort fallback
 */
async function buildMinimalPdf(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics
): Promise<Blob> {
  console.log('generateRoadmapPdfMake: Building minimal fallback PDF...');
  
  const doc = createDocument();
  
  // Simple title
  doc.add([
    { text: 'ROADMAP REVIEW REPORT', fontSize: 24, bold: true, alignment: 'center' as const, margin: [0, 40, 0, 20] as Margins },
    { text: `Generated: ${format(new Date(), 'MMMM d, yyyy')}`, fontSize: 12, alignment: 'center' as const, margin: [0, 0, 0, 40] as Margins },
  ]);
  
  // Simple summary table
  doc.add([
    { text: 'Portfolio Summary', fontSize: 16, bold: true, margin: [0, 20, 0, 10] as Margins },
    {
      table: {
        widths: ['50%', '50%'],
        body: [
          ['Total Projects', String(metrics.totalProjects)],
          ['Average Progress', `${metrics.averageProgress}%`],
          ['Portfolio Health', `${metrics.totalHealthScore}%`],
          ['Projects at Risk', String(metrics.projectsAtRisk)],
          ['Overdue Items', String(metrics.totalOverdueItems)],
        ],
      },
    },
  ]);
  
  // Project list
  doc.add([
    { text: 'Projects', fontSize: 16, bold: true, margin: [0, 30, 0, 10] as Margins },
    ...projects.slice(0, 15).map(p => ({
      text: `• ${p.projectName} - ${p.progress}% complete (Health: ${p.healthScore}%)`,
      fontSize: 10,
      margin: [0, 2, 0, 2] as Margins,
    })),
  ]);
  
  return doc.toBlob(30000); // 30 second timeout for simple doc
}

/**
 * Download the roadmap review PDF
 */
export async function downloadRoadmapPdfMake(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options?: Partial<RoadmapPDFExportOptions>,
  allRoadmapItems?: RoadmapItem[],
  filename?: string
): Promise<Blob> {
  const blob = await generateRoadmapPdfMake(projects, metrics, options, allRoadmapItems);
  
  // Create download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return blob;
}
