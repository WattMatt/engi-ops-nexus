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

interface PDFGenerationOptions {
  includeCharts?: boolean;
  includeAnalytics?: boolean;
  includeDetailedProjects?: boolean;
}

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
  const color = score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : score >= 40 ? [249, 115, 22] : [239, 68, 68];
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
  // Card background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, width, height, 3, 3, "F");
  
  // Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 3, 3, "S");
  
  // Value
  if (color) {
    doc.setTextColor(color[0], color[1], color[2]);
  } else {
    doc.setTextColor(30, 58, 138);
  }
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(String(value), x + width / 2, y + height / 2, { align: "center" });
  
  // Title
  doc.setTextColor(100, 100, 100);
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
    doc.setTextColor(30, 58, 138);
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
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - 1, currentY - 1, chartWidth + 2, chartHeight + 2, 2, 2, "S");
  
  // Add image
  addHighQualityImage(doc, canvas, x, currentY, chartWidth, chartHeight, 'PNG', 0.95);
  
  return currentY + chartHeight + 8;
}

/**
 * Generates the cover page
 */
function generateCoverPage(
  doc: jsPDF,
  metrics: PortfolioMetrics
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Header background
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, pageHeight * 0.42, "F");
  
  // Accent stripe
  doc.setFillColor(59, 130, 246);
  doc.rect(0, pageHeight * 0.40, pageWidth, 8, "F");
  
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
  doc.setTextColor(30, 58, 138);
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
    { value: metrics.totalProjects, label: "Projects", color: [30, 58, 138] },
    { value: `${metrics.averageProgress}%`, label: "Avg Progress", color: metrics.averageProgress >= 60 ? [34, 197, 94] : [234, 179, 8] },
    { value: metrics.projectsAtRisk + metrics.projectsCritical, label: "At Risk", color: [239, 68, 68] },
    { value: metrics.totalOverdueItems, label: "Overdue", color: metrics.totalOverdueItems > 5 ? [239, 68, 68] : [34, 197, 94] },
  ];
  
  statsBoxes.forEach((box, idx) => {
    const x = startX + (boxWidth + boxSpacing) * idx;
    drawMetricCard(doc, box.label, String(box.value), x, boxY, boxWidth, boxHeight, box.color as number[]);
  });
  
  // Generation date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "PPPP 'at' p")}`, pageWidth / 2, pageHeight - 32, { align: "center" });
  
  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(40, pageHeight - 20, pageWidth - 40, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 12, { align: "center" });
}

/**
 * Generates the executive summary page
 */
function generateExecutiveSummaryPage(
  doc: jsPDF,
  metrics: PortfolioMetrics
): void {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Executive Summary", 14, yPos);
  
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(14, yPos + 3, 80, yPos + 3);
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
    headStyles: { fillColor: [30, 58, 138], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
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
    doc.setTextColor(30, 58, 138);
    doc.text("Priority Distribution", 14, yPos);
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
      headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      tableWidth: 120,
    });
  }
}

/**
 * Generates the analytics page with captured charts
 */
async function generateAnalyticsPage(
  doc: jsPDF,
  chartCanvases: Map<string, HTMLCanvasElement>
): Promise<void> {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let yPos = 20;
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Portfolio Analytics", margin, yPos);
  
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 3, 75, yPos + 3);
  yPos += 15;
  
  const contentWidth = pageWidth - 2 * margin;
  const maxChartHeight = 70;
  
  // Project Comparison Chart
  const comparisonChart = chartCanvases.get('project-comparison-chart');
  if (comparisonChart) {
    yPos = addChartToPDF(doc, comparisonChart, margin, yPos, contentWidth, maxChartHeight, "Project Progress Comparison");
  }
  
  // Check page break
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = 20;
  }
  
  // Priority Heat Map
  const heatMapChart = chartCanvases.get('priority-heat-map');
  if (heatMapChart) {
    yPos = addChartToPDF(doc, heatMapChart, margin, yPos, contentWidth * 0.48, maxChartHeight, "Priority Heat Map");
  }
  
  // Team Workload Chart (side by side if space)
  const workloadChart = chartCanvases.get('team-workload-chart');
  if (workloadChart) {
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 20;
    }
    yPos = addChartToPDF(doc, workloadChart, margin, yPos, contentWidth, maxChartHeight, "Team Workload Distribution");
  }
}

/**
 * Generates individual project detail pages
 */
function generateProjectPages(
  doc: jsPDF,
  projects: EnhancedProjectSummary[]
): void {
  doc.addPage();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let yPos = 20;
  
  // Section header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text("Project Details", margin, yPos);
  
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 3, 65, yPos + 3);
  yPos += 15;
  
  for (const project of projects) {
    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }
    
    // Project header card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos - 4, pageWidth - 2 * margin, 18, 3, 3, "F");
    
    // Project name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(project.projectName, margin + 4, yPos + 4);
    
    // Health badge
    const badgeColor = project.healthScore >= 70 ? [34, 197, 94] : project.healthScore >= 50 ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(pageWidth - margin - 22, yPos - 2, 18, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${project.healthScore}%`, pageWidth - margin - 13, yPos + 4, { align: "center" });
    
    // Risk badge
    const riskColors: Record<string, number[]> = {
      low: [34, 197, 94],
      medium: [234, 179, 8],
      high: [249, 115, 22],
      critical: [239, 68, 68],
    };
    const riskColor = riskColors[project.riskLevel] || [156, 163, 175];
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(pageWidth - margin - 45, yPos - 2, 20, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(project.riskLevel.toUpperCase(), pageWidth - margin - 35, yPos + 4, { align: "center" });
    
    yPos += 14;
    
    // Location
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const location = [project.city, project.province].filter(Boolean).join(", ") || "No location specified";
    doc.text(`Location: ${location}`, margin + 4, yPos);
    yPos += 6;
    
    // Progress bar
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Progress:", margin + 4, yPos);
    drawProgressBar(doc, project.progress, margin + 28, yPos - 3, 60, 5);
    doc.text(`(${project.completedItems}/${project.totalItems} items)`, margin + 100, yPos);
    yPos += 8;
    
    // Metrics row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const metricsText = `Velocity: ${project.velocityLast7Days}/week | Overdue: ${project.overdueCount} | Due Soon: ${project.dueSoonCount}`;
    doc.text(metricsText, margin + 4, yPos);
    yPos += 6;
    
    // Priority distribution bar
    if (project.priorityDistribution.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Priority:", margin + 4, yPos);
      drawPriorityBar(doc, project.priorityDistribution, margin + 28, yPos - 3, 60, 4);
      yPos += 6;
    }
    
    // Team members (compact)
    if (project.teamMembers.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Team:", margin + 4, yPos);
      doc.setFont("helvetica", "normal");
      const teamText = project.teamMembers.slice(0, 4).map(m => m.name).join(", ");
      const suffix = project.teamMembers.length > 4 ? ` +${project.teamMembers.length - 4} more` : "";
      doc.text(teamText + suffix, margin + 20, yPos);
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
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 58, 138], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin + 2, right: margin },
        tableWidth: pageWidth - 2 * margin - 4,
        styles: { cellPadding: 1.5 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 4;
    }
    
    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
  }
}

/**
 * Adds page numbers to all pages
 */
function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }
}

/**
 * Main function to generate the complete enhanced PDF report
 */
export async function generateEnhancedRoadmapPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: PDFGenerationOptions = {}
): Promise<jsPDF> {
  const {
    includeCharts = true,
    includeAnalytics = true,
    includeDetailedProjects = true,
  } = options;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  
  // 1. Cover Page
  generateCoverPage(doc, metrics);
  
  // 2. Executive Summary
  generateExecutiveSummaryPage(doc, metrics);
  
  // 3. Analytics with Charts (if requested)
  if (includeAnalytics && includeCharts) {
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
      await generateAnalyticsPage(doc, chartCanvases);
    }
  }
  
  // 4. Project Details
  if (includeDetailedProjects && projects.length > 0) {
    generateProjectPages(doc, projects);
  }
  
  // 5. Add page numbers
  addPageNumbers(doc);
  
  return doc;
}

/**
 * Download the generated PDF
 */
export function downloadPDF(doc: jsPDF, filename?: string): void {
  const defaultFilename = `Roadmap_Review_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename || defaultFilename);
}
