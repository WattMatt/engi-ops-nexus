/**
 * Roadmap Review Report Registration
 * 
 * Defines how roadmap review PDFs are generated.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, FONT_SIZES, tableLayouts, getStyles } from '../../styles';
import { buildPanel, buildMetricCard, buildStatusBadge, priorityToStatus } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

interface EnhancedProjectSummary {
  projectId: string;
  projectName: string;
  projectNumber?: string;
  status?: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  healthScore: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  overdueCount: number;
  dueSoonCount: number;
  teamMembers: Array<{ id: string; name: string; email: string; role: string }>;
  upcomingItems: Array<{ id: string; title: string; dueDate: string | null; priority: string | null }>;
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
  priorityBreakdown: Array<{ priority: string; count: number }>;
  portfolioTrend: 'improving' | 'declining' | 'stable';
}

interface RoadmapReviewData {
  projects: EnhancedProjectSummary[];
  metrics: PortfolioMetrics;
  allRoadmapItems?: any[];
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildExecutiveSummary(data: RoadmapReviewData, config: ReportConfig): Content[] {
  const { metrics } = data;
  
  return [
    { text: 'Executive Summary', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
    
    // Key metrics grid
    {
      columns: [
        buildMetricCard(String(metrics.totalProjects), 'Total Projects', { width: 120 }),
        buildMetricCard(`${Math.round(metrics.averageProgress)}%`, 'Avg Progress', { width: 120 }),
        buildMetricCard(`${Math.round(metrics.totalHealthScore)}%`, 'Health Score', { width: 120 }),
        buildMetricCard(String(metrics.projectsAtRisk + metrics.projectsCritical), 'At Risk', { 
          width: 120,
          valueColor: metrics.projectsCritical > 0 ? PDF_COLORS.danger : PDF_COLORS.warning 
        }),
      ],
      columnGap: 10,
      margin: [0, 0, 0, SPACING.xl] as Margins,
    },
    
    // Portfolio trend
    {
      text: [
        { text: 'Portfolio Trend: ', bold: true },
        { 
          text: metrics.portfolioTrend.charAt(0).toUpperCase() + metrics.portfolioTrend.slice(1),
          color: metrics.portfolioTrend === 'improving' ? PDF_COLORS.success 
               : metrics.portfolioTrend === 'declining' ? PDF_COLORS.danger 
               : PDF_COLORS.textMuted,
        },
      ],
      margin: [0, 0, 0, SPACING.lg] as Margins,
    },
    
    // Overdue items alert
    metrics.totalOverdueItems > 0 ? {
      table: {
        widths: ['*'],
        body: [[
          {
            text: `⚠️ ${metrics.totalOverdueItems} items are overdue across the portfolio`,
            fillColor: PDF_COLORS.warningLight,
            color: PDF_COLORS.warning,
            margin: [SPACING.sm, SPACING.xs, SPACING.sm, SPACING.xs] as Margins,
          }
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, SPACING.lg] as Margins,
    } : null,
  ].filter(Boolean) as Content[];
}

function buildProjectsTable(data: RoadmapReviewData, config: ReportConfig): Content[] {
  const { projects } = data;
  
  if (projects.length === 0) {
    return [{ text: 'No projects to display.', style: 'muted' }];
  }
  
  const tableBody = [
    // Header row
    [
      { text: 'Project', style: 'tableHeader' },
      { text: 'Progress', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Health', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Risk', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Overdue', style: 'tableHeader', alignment: 'center' as const },
    ],
    // Data rows
    ...projects.map(project => [
      { 
        stack: [
          { text: project.projectName, bold: true },
          project.projectNumber ? { text: project.projectNumber, style: 'small', color: PDF_COLORS.textMuted } : null,
        ].filter(Boolean),
      },
      { text: `${Math.round(project.progress)}%`, alignment: 'center' as const },
      { 
        text: `${Math.round(project.healthScore)}%`, 
        alignment: 'center' as const,
        color: project.healthScore >= 70 ? PDF_COLORS.success 
             : project.healthScore >= 40 ? PDF_COLORS.warning 
             : PDF_COLORS.danger,
      },
      buildStatusBadge(project.riskLevel || 'low', priorityToStatus(project.riskLevel || 'low')),
      { 
        text: String(project.overdueCount), 
        alignment: 'center' as const,
        color: project.overdueCount > 0 ? PDF_COLORS.danger : PDF_COLORS.text,
      },
    ]),
  ];
  
  return [
    { text: '', pageBreak: 'before' },
    { text: 'Project Overview', style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.lg] as Margins },
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

function buildProjectDetails(data: RoadmapReviewData, config: ReportConfig): Content[] {
  const { projects } = data;
  const content: Content[] = [];
  
  for (const project of projects) {
    content.push(
      { text: '', pageBreak: 'before' },
      { text: project.projectName, style: ['heading', 'h1'], margin: [0, 0, 0, SPACING.sm] as Margins },
      project.projectNumber ? { text: project.projectNumber, style: 'muted', margin: [0, 0, 0, SPACING.lg] as Margins } : null,
      
      // Project metrics
      {
        columns: [
          { 
            stack: [
              { text: 'Progress', style: 'small', color: PDF_COLORS.textMuted },
              { text: `${Math.round(project.progress)}%`, style: ['heading', 'h2'] },
            ],
            width: 'auto',
          },
          { 
            stack: [
              { text: 'Health Score', style: 'small', color: PDF_COLORS.textMuted },
              { text: `${Math.round(project.healthScore)}%`, style: ['heading', 'h2'] },
            ],
            width: 'auto',
          },
          { 
            stack: [
              { text: 'Items', style: 'small', color: PDF_COLORS.textMuted },
              { text: `${project.completedItems}/${project.totalItems}`, style: ['heading', 'h2'] },
            ],
            width: 'auto',
          },
        ],
        columnGap: SPACING.xl,
        margin: [0, 0, 0, SPACING.lg] as Margins,
      },
      
      // Team members
      project.teamMembers.length > 0 ? buildPanel('Team Members', {
        ul: project.teamMembers.map(m => `${m.name} (${m.role})`),
      }) : null,
      
      // Upcoming items
      project.upcomingItems.length > 0 ? buildPanel('Upcoming Items', {
        ul: project.upcomingItems.slice(0, 5).map(item => 
          `${item.title}${item.dueDate ? ` - Due: ${item.dueDate}` : ''}`
        ),
      }) : null,
    );
  }
  
  return content.filter(Boolean) as Content[];
}

// ============================================================================
// MAIN CONTENT BUILDER
// ============================================================================

function buildRoadmapReviewContent(data: RoadmapReviewData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  // Executive Summary
  content.push(...buildExecutiveSummary(data, config));
  
  // Projects table
  content.push(...buildProjectsTable(data, config));
  
  // Detailed project sections (optional based on config)
  if (config.metadata?.includeDetailedProjects !== false) {
    content.push(...buildProjectDetails(data, config));
  }
  
  return content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<RoadmapReviewData>({
  type: 'roadmap-review',
  name: 'Roadmap Review Report',
  description: 'Comprehensive project portfolio review with metrics, progress tracking, and team analysis',
  
  defaultConfig: {
    includeCoverPage: true,
    includeConfidentialNotice: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  chartConfigs: [
    { elementId: 'priority-heatmap-chart', title: 'Priority Distribution Heatmap' },
    { elementId: 'project-comparison-chart', title: 'Project Progress Comparison' },
    { elementId: 'team-workload-chart', title: 'Team Workload Analysis' },
    { elementId: 'portfolio-health-gauge', title: 'Portfolio Health Score' },
  ],
  
  buildContent: buildRoadmapReviewContent,
  
  validateData: (data) => {
    const errors: string[] = [];
    if (!data.projects || !Array.isArray(data.projects)) {
      errors.push('Projects array is required');
    }
    if (!data.metrics) {
      errors.push('Portfolio metrics are required');
    }
    return { valid: errors.length === 0, errors };
  },
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'server',
}));
