/**
 * Roadmap Review PDF Export - PDFMake Implementation
 * 
 * Complete replacement for jsPDF with proper text rendering and table support.
 * Uses the pdfmake library for better quality output.
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
 * Generate the roadmap review PDF using pdfmake with DIRECT DOWNLOAD
 * This bypasses all blob/base64 methods which hang in browsers
 * @param capturedCharts - Pre-captured charts to include (optional, will capture if not provided)
 * @returns Promise that resolves when download is complete
 */
/**
 * Result from PDF generation
 */
export interface PDFGenerationResult {
  blob: Blob;
  filename: string;
}

export async function generateRoadmapPdfMake(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
  filename?: string
): Promise<PDFGenerationResult> {
  console.log('[RoadmapPDF] Starting generation with', projects.length, 'projects');
  
  // Import validation function
  const { validatePdfMake, pdfMake } = await import('./pdfmake/config');
  
  // Validate pdfmake is properly configured
  const validation = validatePdfMake();
  if (!validation.valid) {
    console.error('[RoadmapPDF] PDFMake validation failed:', validation.error);
    console.error('[RoadmapPDF] Details:', validation.details);
    throw new Error(`PDF library not properly initialized: ${validation.error}`);
  }
  console.log('[RoadmapPDF] PDFMake validation passed');
  
  const config: RoadmapPDFExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
  };

  // Try with charts first, fall back to no charts if it fails
  let charts: CapturedChartData[] = capturedCharts || [];
  if (config.includeCharts && !capturedCharts) {
    try {
      console.log('[RoadmapPDF] Capturing charts...');
      charts = await captureRoadmapReviewCharts();
      console.log(`[RoadmapPDF] Captured ${charts.length} charts`);
    } catch (error) {
      console.error('[RoadmapPDF] Failed to capture charts:', error);
      charts = [];
    }
  } else if (capturedCharts) {
    console.log('[RoadmapPDF] Using', capturedCharts.length, 'pre-captured charts');
  }

  const finalFilename = filename || `Roadmap_Review_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

  // Build the document definition and return as blob for storage
  try {
    console.log('[RoadmapPDF] Building document...');
    const docDefinition = await buildPdfDocumentDefinition(projects, metrics, config, allRoadmapItems, charts);
    
    console.log('[RoadmapPDF] Generating PDF via base64...');
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timed out after 60s'));
      }, 60000);
      
      try {
        // Use getBase64 which is more reliable in browsers, then convert to blob
        pdfMake.createPdf(docDefinition).getBase64((base64: string) => {
          clearTimeout(timeout);
          try {
            // Convert base64 to blob
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            console.log('[RoadmapPDF] PDF generated via base64:', finalFilename, 'size:', blob.size);
            resolve({ blob, filename: finalFilename });
          } catch (conversionError) {
            reject(conversionError);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  } catch (error) {
    console.error('[RoadmapPDF] PDF generation failed:', error);
    throw error;
  }
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

  // Limit projects to prevent overly complex documents
  const maxProjects = 25;
  const limitedProjects = projects.slice(0, maxProjects);

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
    doc.addPageBreak();
  }

  // Add visual summary (charts) if captured - with size check
  if (config.includeCharts && charts.length > 0) {
    const totalChartSize = charts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 500 * 1024;
    
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
      console.warn(`[RoadmapPDF] Charts too large: ${Math.round(totalChartSize / 1024)}KB`);
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

  // Add full roadmap pages - limited for performance
  if (config.includeFullRoadmapItems && allRoadmapItems) {
    console.log('[RoadmapPDF] Adding full roadmap pages...');
    const roadmapProjects = limitedProjects.slice(0, 10);
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
