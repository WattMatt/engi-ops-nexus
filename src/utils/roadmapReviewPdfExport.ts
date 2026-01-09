import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { 
  EnhancedProjectSummary, 
  PortfolioMetrics,
  getDueDateStatus 
} from "./roadmapReviewCalculations";
import { CHART_QUALITY_CANVAS_OPTIONS, addHighQualityImage } from "./pdfQualitySettings";
import { 
  PDF_BRAND_COLORS, 
  PDF_LAYOUT, 
  PDF_TYPOGRAPHY,
  RoadmapPDFExportOptions,
  getContentDimensions,
  getHealthColor,
  getRiskColor
} from "./roadmapReviewPdfStyles";
import { 
  addPageHeader, 
  addAllPageFooters, 
  drawCard, 
  drawBadge,
  checkPageBreak,
  drawProgressBar as drawEnhancedProgressBar 
} from "./roadmapReviewPdfSections/pageDecorations";
import { generateTableOfContents, buildTocEntries } from "./roadmapReviewPdfSections/tableOfContents";
import { drawCompactMeetingNotes } from "./roadmapReviewPdfSections/meetingNotes";
import { generateSummaryMinutesPage } from "./roadmapReviewPdfSections/summaryMinutes";

/**
 * Captures a chart element by ID and returns as canvas
 */
export async function captureChartById(elementId: string): Promise<HTMLCanvasElement | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Chart element not found: ${elementId}`);
    return null;
  }
  
  try {
    const canvas = await html2canvas(element, {
      ...CHART_QUALITY_CANVAS_OPTIONS,
      backgroundColor: '#ffffff',
    });
    return canvas;
  } catch (error) {
    console.error(`Failed to capture chart ${elementId}:`, error);
    return null;
  }
}

/**
 * Draws a circular health gauge using jsPDF primitives
 */
export function drawHealthGauge(
  doc: jsPDF,
  score: number,
  centerX: number,
  centerY: number,
  radius: number,
  label?: string
): void {
  // Background circle
  doc.setFillColor(241, 245, 249);
  doc.circle(centerX, centerY, radius, "F");
  
  // Colored arc based on score
  const color = getHealthColor(score);
  doc.setFillColor(color[0], color[1], color[2]);
  
  // Draw score circle
  const innerRadius = radius * 0.75;
  doc.circle(centerX, centerY, innerRadius, "F");
  
  // Score text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(radius * 0.6);
  doc.setFont("helvetica", "bold");
  doc.text(`${score}%`, centerX, centerY + 2, { align: "center" });
  
  // Label below
  if (label) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, centerX, centerY + radius + 6, { align: "center" });
  }
}

/**
 * Draws a horizontal progress bar
 */
export function drawProgressBar(
  doc: jsPDF,
  progress: number,
  x: number,
  y: number,
  width: number,
  height: number,
  showLabel: boolean = true
): void {
  // Background
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x, y, width, height, 2, 2, "F");
  
  // Progress fill
  const progressWidth = (progress / 100) * width;
  const color = progress >= 70 ? [34, 197, 94] : progress >= 40 ? [234, 179, 8] : [239, 68, 68];
  doc.setFillColor(color[0], color[1], color[2]);
  if (progressWidth > 0) {
    doc.roundedRect(x, y, Math.max(progressWidth, 4), height, 2, 2, "F");
  }
  
  // Label
  if (showLabel) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`${progress}%`, x + width + 3, y + height - 1);
  }
}

/**
 * Draws a mini stacked priority bar
 */
export function drawPriorityBar(
  doc: jsPDF,
  distribution: { priority: string; count: number }[],
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const total = distribution.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) return;
  
  const colors: Record<string, number[]> = {
    critical: [239, 68, 68],
    high: [249, 115, 22],
    medium: [234, 179, 8],
    normal: [59, 130, 246],
    low: [156, 163, 175],
  };
  
  let currentX = x;
  distribution.forEach((item) => {
    const segmentWidth = (item.count / total) * width;
    if (segmentWidth > 0) {
      const color = colors[item.priority] || [156, 163, 175];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(currentX, y, segmentWidth, height, "F");
      currentX += segmentWidth;
    }
  });
}

/**
 * Draws a metric card box
 */
export function drawMetricCard(
  doc: jsPDF,
  title: string,
  value: string | number,
  x: number,
  y: number,
  width: number,
  height: number,
  color?: number[]
): void {
  // Card background with shadow
  drawCard(doc, x, y, width, height, { shadow: true });
  
  // Value
  if (color) {
    doc.setTextColor(color[0], color[1], color[2]);
  } else {
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(String(value), x + width / 2, y + height / 2, { align: "center" });
  
  // Title
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(title, x + width / 2, y + height - 4, { align: "center" });
}

/**
 * Adds a chart image to the PDF with proper sizing
 */
export function addChartToPDF(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  title?: string
): number {
  // Add title if provided
  let currentY = y;
  if (title) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text(title, x, currentY);
    currentY += 6;
  }
  
  // Calculate aspect ratio
  const aspectRatio = canvas.width / canvas.height;
  let chartWidth = maxWidth;
  let chartHeight = chartWidth / aspectRatio;
  
  if (chartHeight > maxHeight) {
    chartHeight = maxHeight;
    chartWidth = chartHeight * aspectRatio;
  }
  
  // Add border
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - 1, currentY - 1, chartWidth + 2, chartHeight + 2, 2, 2, "S");
  
  // Add image
  addHighQualityImage(doc, canvas, x, currentY, chartWidth, chartHeight, 'PNG', 0.95);
  
  return currentY + chartHeight + 8;
}

/**
 * Generates the enhanced branded cover page
 */
function generateCoverPage(
  doc: jsPDF,
  metrics: PortfolioMetrics,
  companyLogo?: string | null,
  companyName?: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Header background
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, pageHeight * 0.42, "F");
  
  // Accent stripe
  doc.setFillColor(...PDF_BRAND_COLORS.primaryLight);
  doc.rect(0, pageHeight * 0.40, pageWidth, 8, "F");
  
  // Company logo or name at top
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', 15, 15, 40, 15);
    } catch {
      doc.setTextColor(...PDF_BRAND_COLORS.white);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(companyName || 'Roadmap Review', 15, 25);
    }
  } else if (companyName) {
    doc.setTextColor(...PDF_BRAND_COLORS.white);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 15, 25);
  }
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("ROADMAP", pageWidth / 2, 55, { align: "center" });
  doc.text("REVIEW REPORT", pageWidth / 2, 73, { align: "center" });
  
  // Subtitle
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Portfolio Progress & Team Overview", pageWidth / 2, 90, { align: "center" });
  
  // Portfolio Health Section
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PORTFOLIO HEALTH SCORE", pageWidth / 2, pageHeight * 0.50, { align: "center" });
  
  // Health gauge
  drawHealthGauge(doc, metrics.totalHealthScore, pageWidth / 2, pageHeight * 0.60, 22);
  
  // Summary stats
  const boxY = pageHeight * 0.72;
  const boxWidth = 38;
  const boxHeight = 28;
  const boxSpacing = 6;
  const startX = (pageWidth - (boxWidth * 4 + boxSpacing * 3)) / 2;
  
  const statsBoxes = [
    { value: metrics.totalProjects, label: "Projects", color: PDF_BRAND_COLORS.primary },
    { value: `${metrics.averageProgress}%`, label: "Avg Progress", color: metrics.averageProgress >= 60 ? PDF_BRAND_COLORS.success : PDF_BRAND_COLORS.warning },
    { value: metrics.projectsAtRisk + metrics.projectsCritical, label: "At Risk", color: PDF_BRAND_COLORS.danger },
    { value: metrics.totalOverdueItems, label: "Overdue", color: metrics.totalOverdueItems > 5 ? PDF_BRAND_COLORS.danger : PDF_BRAND_COLORS.success },
  ];
  
  statsBoxes.forEach((box, idx) => {
    const x = startX + (boxWidth + boxSpacing) * idx;
    drawMetricCard(doc, box.label, String(box.value), x, boxY, boxWidth, boxHeight, box.color as number[]);
  });
  
  // Generation date
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "PPPP 'at' p")}`, pageWidth / 2, pageHeight - 32, { align: "center" });
  
  // Footer
  doc.setDrawColor(...PDF_BRAND_COLORS.gray);
  doc.line(40, pageHeight - 20, pageWidth - 40, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 12, { align: "center" });
}

/**
 * Generates the executive summary page
 */
function generateExecutiveSummaryPage(
  doc: jsPDF,
  metrics: PortfolioMetrics,
  companyLogo?: string | null,
  companyName?: string
): void {
  doc.addPage();
  addPageHeader(doc, 'Executive Summary', companyLogo, companyName);
  
  const { startX, startY } = getContentDimensions();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = startY + 5;
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text("Executive Summary", startX, yPos);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, yPos + 3, 80, yPos + 3);
  yPos += 18;
  
  // Summary metrics table
  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value", "Status"]],
    body: [
      ["Total Projects", String(metrics.totalProjects), "Active"],
      ["Average Progress", `${metrics.averageProgress}%`, metrics.averageProgress >= 60 ? "On Track" : metrics.averageProgress >= 40 ? "Needs Attention" : "Behind"],
      ["Portfolio Health", `${metrics.totalHealthScore}%`, metrics.totalHealthScore >= 70 ? "Healthy" : metrics.totalHealthScore >= 50 ? "Moderate" : "Needs Attention"],
      ["Projects at Risk", String(metrics.projectsAtRisk), metrics.projectsAtRisk === 0 ? "None" : metrics.projectsAtRisk <= 2 ? "Manageable" : "High"],
      ["Critical Projects", String(metrics.projectsCritical), metrics.projectsCritical === 0 ? "None" : "Immediate Action"],
      ["Overdue Items", String(metrics.totalOverdueItems), metrics.totalOverdueItems === 0 ? "None" : metrics.totalOverdueItems <= 3 ? "Low" : "High"],
      ["Due This Week", String(metrics.totalDueSoonItems), "-"],
      ["Team Members", String(metrics.totalTeamMembers), "-"],
    ],
    theme: "striped",
    headStyles: { fillColor: PDF_BRAND_COLORS.primary as any, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: PDF_BRAND_COLORS.lightGray as any },
    margin: { left: startX, right: PDF_LAYOUT.margins.right },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Priority breakdown if available
  if (metrics.priorityBreakdown.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text("Priority Distribution", startX, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Priority Level", "Items Count", "Percentage"]],
      body: metrics.priorityBreakdown.map((p) => {
        const total = metrics.priorityBreakdown.reduce((acc, x) => acc + x.count, 0);
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        return [p.priority.charAt(0).toUpperCase() + p.priority.slice(1), String(p.count), `${pct}%`];
      }),
      theme: "striped",
      headStyles: { fillColor: PDF_BRAND_COLORS.primary as any, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: startX, right: PDF_LAYOUT.margins.right },
      tableWidth: 120,
    });
  }
}

/**
 * Generates the analytics page with captured charts - each chart on its own page for clarity
 */
async function generateAnalyticsPage(
  doc: jsPDF,
  chartCanvases: Map<string, HTMLCanvasElement>,
  companyLogo?: string | null,
  companyName?: string
): Promise<void> {
  const pageHeight = doc.internal.pageSize.getHeight();
  const { startX, startY, width: contentWidth, endY } = getContentDimensions();
  const availableHeight = endY - startY - 30; // Leave room for headers/titles
  
  // --- PAGE 1: Project Comparison Chart ---
  const comparisonChart = chartCanvases.get('project-comparison-chart');
  if (comparisonChart) {
    doc.addPage();
    addPageHeader(doc, 'Portfolio Analytics', companyLogo, companyName);
    
    let yPos = startY + 5;
    
    // Section header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text("Portfolio Analytics", startX, yPos);
    
    doc.setDrawColor(...PDF_BRAND_COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(startX, yPos + 3, 75, yPos + 3);
    yPos += 15;
    
    // Add chart at full width with generous height
    yPos = addChartToPDF(doc, comparisonChart, startX, yPos, contentWidth, availableHeight - 20, "Project Progress Comparison");
  }
  
  // --- PAGE 2: Priority Heat Map ---
  const heatMapChart = chartCanvases.get('priority-heat-map');
  if (heatMapChart) {
    doc.addPage();
    addPageHeader(doc, 'Portfolio Analytics', companyLogo, companyName);
    
    let yPos = startY + 5;
    
    // Add chart at full width
    yPos = addChartToPDF(doc, heatMapChart, startX, yPos, contentWidth, availableHeight * 0.45, "Priority Heat Map");
    
    // --- Add Team Workload on same page if it fits ---
    const workloadChart = chartCanvases.get('team-workload-chart');
    if (workloadChart) {
      yPos += 5;
      yPos = addChartToPDF(doc, workloadChart, startX, yPos, contentWidth, availableHeight * 0.45, "Team Workload Distribution");
    }
  } else {
    // If no heat map, still add workload chart
    const workloadChart = chartCanvases.get('team-workload-chart');
    if (workloadChart) {
      doc.addPage();
      addPageHeader(doc, 'Portfolio Analytics', companyLogo, companyName);
      
      let yPos = startY + 5;
      yPos = addChartToPDF(doc, workloadChart, startX, yPos, contentWidth, availableHeight - 20, "Team Workload Distribution");
    }
  }
}

/**
 * Generates individual project detail pages with meeting notes
 */
function generateProjectPages(
  doc: jsPDF,
  projects: EnhancedProjectSummary[],
  includeMeetingNotes: boolean = true,
  companyLogo?: string | null,
  companyName?: string
): void {
  doc.addPage();
  addPageHeader(doc, 'Project Details', companyLogo, companyName);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { startX, startY, width: contentWidth } = getContentDimensions();
  let yPos = startY + 5;
  
  // Section header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text("Project Details", startX, yPos);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, yPos + 3, 65, yPos + 3);
  yPos += 15;
  
  for (const project of projects) {
    // Calculate required space (project details + optional meeting notes)
    const requiredSpace = includeMeetingNotes ? 150 : 80;
    
    // Check if we need a new page
    yPos = checkPageBreak(doc, yPos, requiredSpace, 'Project Details', companyLogo, companyName);
    
    // Project header card
    drawCard(doc, startX, yPos - 4, contentWidth, 18, { shadow: true });
    
    // Project name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text(project.projectName, startX + 4, yPos + 4);
    
    // Health badge
    const healthColor = getHealthColor(project.healthScore);
    doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
    doc.roundedRect(pageWidth - PDF_LAYOUT.margins.right - 22, yPos - 2, 18, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${project.healthScore}%`, pageWidth - PDF_LAYOUT.margins.right - 13, yPos + 4, { align: "center" });
    
    // Risk badge
    const riskColor = getRiskColor(project.riskLevel);
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(pageWidth - PDF_LAYOUT.margins.right - 45, yPos - 2, 20, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(project.riskLevel.toUpperCase(), pageWidth - PDF_LAYOUT.margins.right - 35, yPos + 4, { align: "center" });
    
    yPos += 14;
    
    // Location
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_BRAND_COLORS.gray);
    const location = [project.city, project.province].filter(Boolean).join(", ") || "No location specified";
    doc.text(`Location: ${location}`, startX + 4, yPos);
    yPos += 6;
    
    // Progress bar
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Progress:", startX + 4, yPos);
    drawProgressBar(doc, project.progress, startX + 28, yPos - 3, 60, 5);
    doc.text(`(${project.completedItems}/${project.totalItems} items)`, startX + 100, yPos);
    yPos += 8;
    
    // Metrics row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const metricsText = `Velocity: ${project.velocityLast7Days}/week | Overdue: ${project.overdueCount} | Due Soon: ${project.dueSoonCount}`;
    doc.text(metricsText, startX + 4, yPos);
    yPos += 6;
    
    // Priority distribution bar
    if (project.priorityDistribution.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Priority:", startX + 4, yPos);
      drawPriorityBar(doc, project.priorityDistribution, startX + 28, yPos - 3, 60, 4);
      yPos += 6;
    }
    
    // Team members (compact)
    if (project.teamMembers.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Team:", startX + 4, yPos);
      doc.setFont("helvetica", "normal");
      const teamText = project.teamMembers.slice(0, 4).map(m => m.name).join(", ");
      const suffix = project.teamMembers.length > 4 ? ` +${project.teamMembers.length - 4} more` : "";
      doc.text(teamText + suffix, startX + 20, yPos);
      yPos += 6;
    }
    
    // Upcoming items table
    if (project.upcomingItems.length > 0) {
      yPos += 2;
      autoTable(doc, {
        startY: yPos,
        head: [["Next Tasks", "Due Date", "Priority", "Status"]],
        body: project.upcomingItems.slice(0, 5).map((item) => [
          item.title.substring(0, 35) + (item.title.length > 35 ? "..." : ""),
          item.dueDate ? format(new Date(item.dueDate), "MMM d") : "-",
          item.priority || "Normal",
          getDueDateStatus(item.dueDate) === "overdue" ? "OVERDUE" : 
            getDueDateStatus(item.dueDate) === "soon" ? "Due Soon" : "On Track",
        ]),
        theme: "plain",
        headStyles: { fillColor: PDF_BRAND_COLORS.lightGray as any, textColor: PDF_BRAND_COLORS.primary as any, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        margin: { left: startX + 2, right: PDF_LAYOUT.margins.right },
        tableWidth: contentWidth - 4,
        styles: { cellPadding: 1.5 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 4;
    }
    
    // Add meeting notes section for this project
    if (includeMeetingNotes) {
      yPos += 4;
      yPos = drawCompactMeetingNotes(doc, startX, yPos, contentWidth);
    }
    
    // Separator
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.line(startX, yPos, pageWidth - PDF_LAYOUT.margins.right, yPos);
    yPos += 8;
  }
}

/**
 * Main function to generate the complete enhanced PDF report
 */
export async function generateEnhancedRoadmapPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {}
): Promise<jsPDF> {
  // Merge with defaults
  const config: RoadmapPDFExportOptions = {
    includeCharts: options.includeCharts ?? true,
    includeAnalytics: options.includeAnalytics ?? true,
    includeDetailedProjects: options.includeDetailedProjects ?? true,
    includeMeetingNotes: options.includeMeetingNotes ?? true,
    includeSummaryMinutes: options.includeSummaryMinutes ?? true,
    includeTableOfContents: options.includeTableOfContents ?? true,
    includeCoverPage: options.includeCoverPage ?? true,
    companyLogo: options.companyLogo ?? null,
    companyName: options.companyName ?? 'Roadmap Review',
    confidentialNotice: options.confidentialNotice ?? true,
    reportType: options.reportType ?? 'meeting-review',
  };
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  
  const generationDate = format(new Date(), "PPPP");
  
  // 1. Cover Page
  if (config.includeCoverPage) {
    generateCoverPage(doc, metrics, config.companyLogo, config.companyName);
  }
  
  // 2. Table of Contents (for meeting-review type)
  if (config.includeTableOfContents && config.reportType === 'meeting-review') {
    const tocEntries = buildTocEntries(projects.length, {
      includeCoverPage: config.includeCoverPage,
      includeTableOfContents: true,
      includeAnalytics: config.includeAnalytics,
      includeDetailedProjects: config.includeDetailedProjects,
      includeSummaryMinutes: config.includeSummaryMinutes,
    });
    generateTableOfContents(doc, tocEntries, config.companyLogo, config.companyName);
  }
  
  // 3. Executive Summary
  generateExecutiveSummaryPage(doc, metrics, config.companyLogo, config.companyName);
  
  // 4. Analytics with Charts (if requested)
  if (config.includeAnalytics && config.includeCharts) {
    const chartIds = ['project-comparison-chart', 'priority-heat-map', 'team-workload-chart'];
    const chartCanvases = new Map<string, HTMLCanvasElement>();
    
    // Capture all charts
    for (const chartId of chartIds) {
      const canvas = await captureChartById(chartId);
      if (canvas) {
        chartCanvases.set(chartId, canvas);
      }
    }
    
    if (chartCanvases.size > 0) {
      await generateAnalyticsPage(doc, chartCanvases, config.companyLogo, config.companyName);
    }
  }
  
  // 5. Project Details with Meeting Notes
  if (config.includeDetailedProjects && projects.length > 0) {
    generateProjectPages(
      doc, 
      projects, 
      config.includeMeetingNotes && config.reportType === 'meeting-review',
      config.companyLogo,
      config.companyName
    );
  }
  
  // 6. Summary Minutes Page (for meeting-review type)
  if (config.includeSummaryMinutes && config.reportType === 'meeting-review') {
    generateSummaryMinutesPage(doc, {
      companyLogo: config.companyLogo,
      companyName: config.companyName,
      generationDate,
      projectCount: projects.length,
    });
  }
  
  // 7. Add branded footers to all pages
  addAllPageFooters(doc, generationDate, 1, config.confidentialNotice);
  
  return doc;
}

/**
 * Download the generated PDF
 */
export function downloadPDF(doc: jsPDF, filename?: string): void {
  const defaultFilename = `Roadmap_Review_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename || defaultFilename);
}
