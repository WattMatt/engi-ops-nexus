/**
 * Server-Side Roadmap Review PDF Generation
 * 
 * Uses pdfmake to generate PDFs server-side for better reliability
 * and performance compared to client-side generation.
 */

import { createClient } from "npm:@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPES - Matching client-side EnhancedProjectSummary from roadmapReviewCalculations.ts
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UpcomingItem {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string | null;
  isCompleted: boolean;
}

interface EnhancedProjectSummary {
  projectId: string;
  projectName: string;
  projectNumber?: string;
  city?: string | null;
  province?: string | null;
  status?: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  healthScore: number;
  healthTrend?: 'improving' | 'declining' | 'stable';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  overdueCount: number;
  dueSoonCount: number;
  priorityDistribution?: { priority: string; count: number }[];
  phaseBreakdown?: { phase: string; completed: number; total: number }[];
  criticalMilestones?: { title: string; dueDate: string; daysUntil: number }[];
  recentCompletions?: { title: string; completedAt: string }[];
  velocityLast7Days?: number;
  velocityLast30Days?: number;
  teamMembers: TeamMember[];
  upcomingItems: UpcomingItem[];
  // Legacy fields for backward compatibility
  overdueItems?: number;
  dueSoonItems?: number;
}

interface PortfolioMetrics {
  totalProjects: number;
  averageProgress: number;
  totalHealthScore: number;
  projectsAtRisk: number;
  projectsCritical: number;
  totalOverdueItems: number;
  totalDueSoonItems: number;
  totalTeamMembers: number;
  priorityBreakdown: { priority: string; count: number }[];
  portfolioTrend: 'improving' | 'declining' | 'stable';
  resourceBottlenecks: { memberName: string; taskCount: number; overdueCount: number }[];
}

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

interface RoadmapPDFExportOptions {
  includeCharts: boolean;
  includeAnalytics: boolean;
  includeDetailedProjects: boolean;
  includeMeetingNotes: boolean;
  includeSummaryMinutes: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  includeFullRoadmapItems: boolean;
  includeBranding?: boolean;
  companyLogo?: string | null;
  companyName?: string;
  confidentialNotice?: boolean;
  reportType: 'standard' | 'meeting-review' | 'executive-summary';
  chartLayout: 'stacked' | 'grid';
}

interface CapturedChartData {
  config: { elementId: string; title: string; description?: string };
  image: { dataUrl: string; sizeBytes: number };
}

interface GenerateRequest {
  projects: EnhancedProjectSummary[];
  metrics: PortfolioMetrics;
  options: Partial<RoadmapPDFExportOptions>;
  allRoadmapItems?: RoadmapItem[];
  capturedCharts?: CapturedChartData[];
  filename?: string;
  storeInStorage?: boolean;
}

// ============================================================================
// PDF COLORS
// ============================================================================

const PDF_COLORS_HEX = {
  primary: '#1E40AF',
  secondary: '#3B82F6',
  accent: '#60A5FA',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  text: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  lightGray: '#F3F4F6',
  offWhite: '#F9FAFB',
  darkGray: '#4B5563',
  tableBorder: '#E5E7EB',
  tableHeader: '#1E40AF',
  riskCritical: '#7C2D12',
  riskHigh: '#DC2626',
  riskMedium: '#D97706',
};

const DEFAULT_EXPORT_OPTIONS: RoadmapPDFExportOptions = {
  includeCharts: true,
  includeAnalytics: true,
  includeDetailedProjects: true,
  includeMeetingNotes: false,
  includeSummaryMinutes: false,
  includeTableOfContents: true,
  includeCoverPage: true,
  includeFullRoadmapItems: false,
  includeBranding: true,
  companyName: 'Portfolio Review',
  confidentialNotice: false,
  reportType: 'standard',
  chartLayout: 'grid',
};

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

const getDueDateStatus = (dueDate: string | null): 'overdue' | 'soon' | 'ok' | 'none' => {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'soon';
  return 'ok';
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

const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ============================================================================
// SECTION BUILDERS
// ============================================================================

const spacer = (height: number) => ({ text: '', margin: [0, height, 0, 0] as [number, number, number, number] });

const buildSectionHeader = (title: string, subtitle?: string): any => ({
  stack: [
    { text: title, fontSize: 18, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 4] },
    subtitle ? { text: subtitle, fontSize: 10, color: PDF_COLORS_HEX.textMuted, margin: [0, 0, 0, 8] } : null,
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: PDF_COLORS_HEX.primary },
        { type: 'line', x1: 0, y1: 3, x2: 180, y2: 3, lineWidth: 1, lineColor: PDF_COLORS_HEX.accent },
      ],
      margin: [0, 0, 0, 15],
    },
  ].filter(Boolean),
});

const buildCoverPage = (config: RoadmapPDFExportOptions, metrics: PortfolioMetrics): any[] => {
  const content: any[] = [];

  // Blue header band
  content.push({
    canvas: [
      {
        type: 'rect',
        x: -40,
        y: -40,
        w: 595.28,
        h: 200,
        color: PDF_COLORS_HEX.primary,
      },
    ],
    absolutePosition: { x: 0, y: 0 },
  });

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
    margin: [0, 5, 0, 10],
  });

  // Company name
  if (config.companyName) {
    content.push({
      text: config.companyName,
      fontSize: 14,
      color: '#ffffff',
      alignment: 'center',
      margin: [0, 0, 0, 40],
    });
  }

  content.push(spacer(60));

  // Report type
  content.push({
    text: formatReportType(config.reportType),
    fontSize: 12,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 10],
  });

  // Generation date
  content.push({
    text: `Generated: ${formatDateTime(new Date())}`,
    fontSize: 10,
    color: PDF_COLORS_HEX.textMuted,
    alignment: 'center',
    margin: [0, 0, 0, 30],
  });

  // Summary stats box
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          { text: 'PORTFOLIO OVERVIEW', colSpan: 4, fontSize: 10, bold: true, fillColor: PDF_COLORS_HEX.lightGray, margin: [8, 8, 8, 8] },
          {}, {}, {},
        ],
        [
          { text: `Total Projects\n${metrics.totalProjects}`, fontSize: 10, alignment: 'center', margin: [4, 8, 4, 8] },
          { text: `Avg Progress\n${metrics.averageProgress}%`, fontSize: 10, alignment: 'center', margin: [4, 8, 4, 8] },
          { text: `At Risk\n${metrics.projectsAtRisk}`, fontSize: 10, alignment: 'center', color: metrics.projectsAtRisk > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.text, margin: [4, 8, 4, 8] },
          { text: `Critical\n${metrics.projectsCritical}`, fontSize: 10, alignment: 'center', color: metrics.projectsCritical > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.text, margin: [4, 8, 4, 8] },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
    },
    margin: [40, 0, 40, 0],
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

  // Page break
  content.push({ text: '', pageBreak: 'after' });

  return content;
};

const buildTableOfContents = (config: RoadmapPDFExportOptions, hasCharts: boolean): any[] => {
  const content: any[] = [
    { text: 'Table of Contents', fontSize: 20, bold: true, color: PDF_COLORS_HEX.primary, margin: [0, 0, 0, 5] },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 2, lineColor: PDF_COLORS_HEX.primary }],
      margin: [0, 0, 0, 20],
    },
    { text: `Report Type: ${formatReportType(config.reportType)}`, fontSize: 9, color: PDF_COLORS_HEX.textMuted, margin: [0, 0, 0, 15] },
  ];

  const entries = [
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
        margin: [0, 6, 0, 6],
      });
      pageNum++;
    }
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildExecutiveSummary = (metrics: PortfolioMetrics): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Executive Summary', 'Portfolio performance overview and key metrics'));

  // KPI Cards
  const avgHealth = metrics.totalProjects > 0 ? Math.round(metrics.totalHealthScore / metrics.totalProjects) : 0;
  content.push({
    columns: [
      {
        stack: [
          { text: String(metrics.totalProjects), fontSize: 28, bold: true, color: PDF_COLORS_HEX.primary, alignment: 'center' },
          { text: 'Total Projects', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
        ],
        width: '*',
      },
      {
        stack: [
          { text: `${metrics.averageProgress}%`, fontSize: 28, bold: true, color: metrics.averageProgress >= 60 ? PDF_COLORS_HEX.success : metrics.averageProgress >= 40 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.danger, alignment: 'center' },
          { text: 'Avg Progress', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
        ],
        width: '*',
      },
      {
        stack: [
          { text: `${avgHealth}%`, fontSize: 28, bold: true, color: getHealthColorHex(avgHealth), alignment: 'center' },
          { text: 'Portfolio Health', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
        ],
        width: '*',
      },
      {
        stack: [
          { text: String(metrics.projectsAtRisk), fontSize: 28, bold: true, color: metrics.projectsAtRisk === 0 ? PDF_COLORS_HEX.success : PDF_COLORS_HEX.danger, alignment: 'center' },
          { text: 'At Risk', fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
        ],
        width: '*',
      },
    ],
    margin: [0, 0, 0, 25],
  });

  // Metrics table
  const metricsRows = [
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
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['40%', '25%', '35%'],
      body: metricsRows,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => PDF_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_COLORS_HEX.tableBorder,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 20],
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildVisualAnalytics = (charts: CapturedChartData[], layout: 'stacked' | 'grid'): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Visual Analytics', 'Key charts and data visualizations'));

  if (layout === 'grid' && charts.length >= 2) {
    // 2-column grid layout
    for (let i = 0; i < charts.length; i += 2) {
      const row: any[] = [];
      
      // First chart in row
      row.push({
        stack: [
          { image: charts[i].image.dataUrl, width: 240, alignment: 'center' },
          { text: charts[i].config.title, fontSize: 10, bold: true, alignment: 'center', margin: [0, 5, 0, 0] },
        ],
        width: '*',
      });
      
      // Second chart in row (if exists)
      if (i + 1 < charts.length) {
        row.push({
          stack: [
            { image: charts[i + 1].image.dataUrl, width: 240, alignment: 'center' },
            { text: charts[i + 1].config.title, fontSize: 10, bold: true, alignment: 'center', margin: [0, 5, 0, 0] },
          ],
          width: '*',
        });
      } else {
        row.push({ text: '', width: '*' });
      }
      
      content.push({ columns: row, columnGap: 15, margin: [0, 0, 0, 20] });
    }
  } else {
    // Stacked layout
    charts.forEach(chart => {
      content.push({
        stack: [
          { image: chart.image.dataUrl, width: 480, alignment: 'center' },
          { text: chart.config.title, fontSize: 11, bold: true, alignment: 'center', margin: [0, 8, 0, 0] },
          chart.config.description ? { text: chart.config.description, fontSize: 9, color: PDF_COLORS_HEX.textMuted, alignment: 'center', margin: [0, 3, 0, 0] } : null,
        ].filter(Boolean),
        margin: [0, 0, 0, 25],
      });
    });
  }

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildProjectDetails = (projects: EnhancedProjectSummary[]): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Project Details', `Detailed breakdown of ${projects.length} projects`));

  projects.forEach((project, index) => {
    const overdueCount = project.overdueCount ?? project.overdueItems ?? 0;
    const dueSoonCount = project.dueSoonCount ?? project.dueSoonItems ?? 0;
    const healthColor = getHealthColorHex(project.healthScore);

    // Project header with health badge
    content.push({
      columns: [
        { text: project.projectName, fontSize: 16, bold: true, color: PDF_COLORS_HEX.primary, width: '*' },
        { 
          table: {
            body: [[{ text: `${project.healthScore}%`, fontSize: 11, bold: true, color: '#FFFFFF', alignment: 'center' }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => healthColor,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          width: 55,
        },
      ],
      margin: [0, index > 0 ? 20 : 0, 0, 8],
    });

    // Project number and location if available
    const subInfo: string[] = [];
    if (project.projectNumber) subInfo.push(`#${project.projectNumber}`);
    if (project.city && project.province) subInfo.push(`${project.city}, ${project.province}`);
    else if (project.city) subInfo.push(project.city);
    
    if (subInfo.length > 0) {
      content.push({
        text: subInfo.join(' • '),
        fontSize: 9,
        color: PDF_COLORS_HEX.textMuted,
        margin: [0, 0, 0, 10],
      });
    }

    // Health bar visualization
    content.push({
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 515, h: 6, color: PDF_COLORS_HEX.lightGray, r: 3 },
        { type: 'rect', x: 0, y: 0, w: Math.min(515 * (project.healthScore / 100), 515), h: 6, color: healthColor, r: 3 },
      ],
      margin: [0, 0, 0, 12],
    });

    // KPI Stats row with cards
    content.push({
      columns: [
        {
          stack: [
            { text: 'Progress', fontSize: 8, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
            { text: `${project.progress}%`, fontSize: 18, bold: true, alignment: 'center' },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Completed', fontSize: 8, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
            { text: `${project.completedItems}/${project.totalItems}`, fontSize: 18, bold: true, alignment: 'center' },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Overdue', fontSize: 8, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
            { text: String(overdueCount), fontSize: 18, bold: true, color: overdueCount > 0 ? PDF_COLORS_HEX.danger : PDF_COLORS_HEX.success, alignment: 'center' },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Due Soon', fontSize: 8, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
            { text: String(dueSoonCount), fontSize: 18, bold: true, color: dueSoonCount > 3 ? PDF_COLORS_HEX.warning : PDF_COLORS_HEX.darkGray, alignment: 'center' },
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'Team', fontSize: 8, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
            { text: String(project.teamMembers?.length || 0), fontSize: 18, bold: true, alignment: 'center' },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 15],
    });

    // Upcoming tasks table if available
    if (project.upcomingItems && project.upcomingItems.length > 0) {
      const upcomingToShow = project.upcomingItems.slice(0, 8);
      content.push({
        text: 'Upcoming Tasks',
        fontSize: 11,
        bold: true,
        color: PDF_COLORS_HEX.primary,
        margin: [0, 5, 0, 8],
      });

      const taskRows: any[][] = [
        [
          { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9 },
          { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9, alignment: 'center' },
          { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9, alignment: 'center' },
        ],
        ...upcomingToShow.map((item, idx) => {
          const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.lightGray : '#FFFFFF';
          return [
            { text: item.title.substring(0, 45), fontSize: 9, fillColor },
            { text: item.dueDate ? formatDate(item.dueDate) : '-', fontSize: 9, alignment: 'center', fillColor },
            { text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), fontSize: 9, alignment: 'center', fillColor, color: getPriorityColorHex(item.priority || 'normal') },
          ];
        }),
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['55%', '25%', '20%'],
          body: taskRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0,
          vLineWidth: () => 0,
          hLineColor: () => PDF_COLORS_HEX.tableBorder,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 10],
      });

      if (project.upcomingItems.length > 8) {
        content.push({
          text: `+ ${project.upcomingItems.length - 8} more upcoming tasks`,
          fontSize: 8,
          italics: true,
          color: PDF_COLORS_HEX.textMuted,
        });
      }
    }

    // Team members if available
    if (project.teamMembers && project.teamMembers.length > 0) {
      content.push({
        text: 'Team Members',
        fontSize: 11,
        bold: true,
        color: PDF_COLORS_HEX.primary,
        margin: [0, 15, 0, 5],
      });
      content.push({
        text: project.teamMembers.map(m => m.name || m.email || 'Unnamed').join('  •  '),
        fontSize: 9,
        color: PDF_COLORS_HEX.darkGray,
      });
    }

    // Separator line
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS_HEX.tableBorder }],
      margin: [0, 15, 0, 0],
    });
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildMeetingNotes = (): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Meeting Notes', 'Space for recording meeting discussions'));

  content.push({
    text: 'Key Discussion Points:',
    fontSize: 11,
    bold: true,
    margin: [0, 0, 0, 10],
  });

  // Create lined area for notes
  for (let i = 0; i < 15; i++) {
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS_HEX.tableBorder }],
      margin: [0, 20, 0, 0],
    });
  }

  content.push(spacer(20));

  content.push({
    text: 'Action Items:',
    fontSize: 11,
    bold: true,
    margin: [0, 0, 0, 10],
  });

  for (let i = 0; i < 8; i++) {
    content.push({
      columns: [
        { text: '☐', fontSize: 12, width: 20 },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 495, y2: 10, lineWidth: 0.5, lineColor: PDF_COLORS_HEX.tableBorder }], width: '*' },
      ],
      margin: [0, 8, 0, 0],
    });
  }

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildSummaryMinutes = (projects: EnhancedProjectSummary[], metrics: PortfolioMetrics): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Summary Minutes', 'Meeting summary and next steps'));

  // Meeting info
  content.push({
    table: {
      widths: ['25%', '75%'],
      body: [
        [{ text: 'Date:', bold: true, fontSize: 10 }, { text: formatDate(new Date()), fontSize: 10 }],
        [{ text: 'Attendees:', bold: true, fontSize: 10 }, { text: '________________________________', fontSize: 10 }],
        [{ text: 'Next Meeting:', bold: true, fontSize: 10 }, { text: '________________________________', fontSize: 10 }],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 20],
  });

  // Quick summary
  content.push({
    text: 'Portfolio Status Summary',
    fontSize: 12,
    bold: true,
    margin: [0, 10, 0, 8],
  });

  content.push({
    ul: [
      `${metrics.totalProjects} projects reviewed`,
      `Average progress: ${metrics.averageProgress}%`,
      `${metrics.projectsAtRisk} projects at risk`,
      `${metrics.totalOverdueItems} overdue items require attention`,
    ],
    fontSize: 10,
    margin: [0, 0, 0, 20],
  });

  // Decisions section
  content.push({
    text: 'Key Decisions:',
    fontSize: 11,
    bold: true,
    margin: [0, 10, 0, 10],
  });

  for (let i = 0; i < 5; i++) {
    content.push({
      columns: [
        { text: `${i + 1}.`, fontSize: 10, width: 20 },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 495, y2: 10, lineWidth: 0.5, lineColor: PDF_COLORS_HEX.tableBorder }], width: '*' },
      ],
      margin: [0, 6, 0, 0],
    });
  }

  content.push({ text: '', pageBreak: 'after' });
  return content;
};

const buildFullRoadmapItems = (projects: EnhancedProjectSummary[], allItems: RoadmapItem[]): any[] => {
  const content: any[] = [];

  content.push(buildSectionHeader('Full Roadmap Items', 'Complete list of all tasks and deliverables'));

  projects.forEach((project, pIndex) => {
    const projectItems = allItems.filter(item => item.project_id === project.projectId);
    
    if (projectItems.length === 0) return;

    // Project header
    content.push({
      text: project.projectName,
      fontSize: 13,
      bold: true,
      color: PDF_COLORS_HEX.primary,
      margin: [0, pIndex > 0 ? 15 : 0, 0, 8],
    });

    // Items table
    const tableBody: any[][] = [
      [
        { text: 'Task', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9 },
        { text: 'Priority', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9, alignment: 'center' },
        { text: 'Due Date', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9, alignment: 'center' },
        { text: 'Status', bold: true, fillColor: PDF_COLORS_HEX.primary, color: '#FFFFFF', fontSize: 9, alignment: 'center' },
      ],
      ...projectItems.slice(0, 20).map((item, idx) => {
        const statusInfo = getStatusInfo(item);
        const fillColor = idx % 2 === 0 ? PDF_COLORS_HEX.offWhite : '#FFFFFF';
        return [
          { text: item.title.substring(0, 60) + (item.title.length > 60 ? '...' : ''), fontSize: 8, fillColor },
          { text: item.priority || '-', fontSize: 8, alignment: 'center', fillColor, color: getPriorityColorHex(item.priority || '') },
          { text: item.due_date ? formatDate(item.due_date) : '-', fontSize: 8, alignment: 'center', fillColor },
          { text: statusInfo.label, fontSize: 8, alignment: 'center', fillColor, color: statusInfo.color },
        ];
      }),
    ];

    if (projectItems.length > 20) {
      tableBody.push([
        { text: `... and ${projectItems.length - 20} more items`, colSpan: 4, fontSize: 8, italics: true, color: PDF_COLORS_HEX.textMuted, alignment: 'center' },
        {}, {}, {},
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['45%', '15%', '20%', '20%'],
        body: tableBody,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS_HEX.tableBorder,
        vLineColor: () => PDF_COLORS_HEX.tableBorder,
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 10],
    });
  });

  return content;
};

// ============================================================================
// MAIN PDF GENERATION
// ============================================================================

async function generatePDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions>,
  allRoadmapItems?: RoadmapItem[],
  capturedCharts?: CapturedChartData[],
): Promise<{ docDefinition: any; filename: string }> {
  console.log('[generate-roadmap-pdf] Building document with', projects.length, 'projects');
  
  const config: RoadmapPDFExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const filename = `Roadmap_Review_${new Date().toISOString().split('T')[0]}.pdf`;

  // Limit projects for performance
  const maxProjects = config.reportType === 'executive-summary' ? 10 : 20;
  const limitedProjects = projects.slice(0, maxProjects);

  // Build content
  const content: any[] = [];

  // Cover Page
  if (config.includeCoverPage) {
    console.log('[generate-roadmap-pdf] Adding cover page');
    content.push(...buildCoverPage(config, metrics));
  }

  // Table of Contents
  if (config.includeTableOfContents && config.reportType !== 'executive-summary') {
    console.log('[generate-roadmap-pdf] Adding table of contents');
    const hasCharts = (capturedCharts?.length || 0) > 0;
    content.push(...buildTableOfContents(config, hasCharts));
  }

  // Executive Summary
  if (config.includeAnalytics) {
    console.log('[generate-roadmap-pdf] Adding executive summary');
    content.push(...buildExecutiveSummary(metrics));
  }

  // Visual Analytics (Charts)
  if (config.includeCharts && capturedCharts && capturedCharts.length > 0) {
    console.log('[generate-roadmap-pdf] Adding charts section');
    // Check chart size limits
    const totalChartSize = capturedCharts.reduce((acc, c) => acc + c.image.sizeBytes, 0);
    const maxChartSize = 500 * 1024; // 500KB for server-side
    const maxCharts = 4;

    if (totalChartSize < maxChartSize && capturedCharts.length <= maxCharts) {
      content.push(...buildVisualAnalytics(capturedCharts.slice(0, maxCharts), config.chartLayout));
    } else {
      console.warn(`[generate-roadmap-pdf] Charts skipped (${Math.round(totalChartSize / 1024)}KB limit exceeded)`);
    }
  }

  // Project Details
  if (config.includeDetailedProjects && config.reportType !== 'executive-summary') {
    console.log('[generate-roadmap-pdf] Adding project details');
    content.push(...buildProjectDetails(limitedProjects));
  }

  // Meeting Notes
  if (config.includeMeetingNotes && config.reportType === 'meeting-review') {
    console.log('[generate-roadmap-pdf] Adding meeting notes');
    content.push(...buildMeetingNotes());
  }

  // Summary Minutes
  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    console.log('[generate-roadmap-pdf] Adding summary minutes');
    content.push(...buildSummaryMinutes(limitedProjects, metrics));
  }

  // Full Roadmap Items
  if (config.includeFullRoadmapItems && config.reportType !== 'executive-summary' && allRoadmapItems) {
    console.log('[generate-roadmap-pdf] Adding full roadmap items');
    content.push(...buildFullRoadmapItems(limitedProjects, allRoadmapItems));
  }

  // Document definition
  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 60, 40, 60],
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.3,
    },
    styles: {
      header: { fontSize: 18, bold: true, color: PDF_COLORS_HEX.primary },
      subheader: { fontSize: 14, bold: true, color: PDF_COLORS_HEX.secondary },
      small: { fontSize: 8 },
    },
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return { text: '' };
      return {
        columns: [
          { 
            text: `Roadmap Review${config.companyName ? ` - ${config.companyName}` : ''}`,
            fontSize: 8,
            color: PDF_COLORS_HEX.textLight,
            margin: [40, 20, 0, 0],
          },
          {
            text: formatDate(new Date()),
            fontSize: 8,
            color: PDF_COLORS_HEX.textLight,
            alignment: 'right',
            margin: [0, 20, 40, 0],
          },
        ],
      };
    },
    footer: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return { text: '' };
      const pageNum = currentPage - 1;
      const totalPages = pageCount - 1;
      return {
        columns: [
          config.confidentialNotice
            ? { text: 'CONFIDENTIAL', fontSize: 8, color: PDF_COLORS_HEX.textLight, margin: [40, 0, 0, 20] }
            : { text: '', width: '*' },
          {
            text: `Page ${pageNum} of ${totalPages}`,
            fontSize: 8,
            color: PDF_COLORS_HEX.textLight,
            alignment: 'right',
            margin: [0, 0, 40, 20],
          },
        ],
      };
    },
  };

  return { docDefinition, filename };
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    console.log("[generate-roadmap-pdf] Request received");

    const {
      projects,
      metrics,
      options,
      allRoadmapItems,
      capturedCharts,
      filename,
      storeInStorage,
    }: GenerateRequest = await req.json();

    if (!projects || !metrics) {
      throw new Error("Missing required fields: projects and metrics");
    }

    console.log(`[generate-roadmap-pdf] Generating PDF for ${projects.length} projects`);
    console.log(`[generate-roadmap-pdf] Charts: ${capturedCharts?.length || 0}, Items: ${allRoadmapItems?.length || 0}`);

    // Generate document definition
    const { docDefinition, filename: defaultFilename } = await generatePDF(
      projects,
      metrics,
      options || {},
      allRoadmapItems,
      capturedCharts
    );

    const finalFilename = filename || defaultFilename;

    // Import pdfmake from esm.sh - use any type to avoid TS issues
    const pdfMakeModule = await import("https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js");
    const pdfFontsModule = await import("https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js");
    
    const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
    // Set virtual file system for fonts
    pdfMake.vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs || (pdfFontsModule as any).vfs;

    console.log("[generate-roadmap-pdf] Creating PDF...");

    // Generate PDF as base64
    const pdfBase64: string = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("PDF generation timed out after 60 seconds"));
      }, 60000);

      try {
        pdfMake.createPdf(docDefinition).getBase64((data: string) => {
          clearTimeout(timeoutId);
          if (data) {
            resolve(data);
          } else {
            reject(new Error("PDF generation returned empty data"));
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    const elapsedTime = Date.now() - startTime;
    const sizeKB = Math.round((pdfBase64.length * 3) / 4 / 1024);
    console.log(`[generate-roadmap-pdf] PDF generated in ${elapsedTime}ms, size: ~${sizeKB}KB`);

    // Option to store in Supabase storage
    if (storeInStorage) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Convert base64 to Uint8Array
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const storagePath = `roadmap-exports/${Date.now()}-${finalFilename}`;
      
      const { error: uploadError } = await supabase.storage
        .from("exports")
        .upload(storagePath, bytes, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("[generate-roadmap-pdf] Storage upload failed:", uploadError);
        // Don't throw - still return the base64
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from("exports")
          .getPublicUrl(storagePath);

        return new Response(
          JSON.stringify({
            success: true,
            filename: finalFilename,
            storagePath,
            publicUrl,
            sizeKB,
            generationTimeMs: elapsedTime,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return base64 PDF data
    return new Response(
      JSON.stringify({
        success: true,
        filename: finalFilename,
        pdfBase64,
        sizeKB,
        generationTimeMs: elapsedTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-roadmap-pdf] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
