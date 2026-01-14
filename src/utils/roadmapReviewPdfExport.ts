/**
 * Roadmap Review PDF Export
 * 
 * MIGRATION STATUS: Phase 4 - pdfmake compatibility layer added
 * - jsPDF: Full support with autoTable (current implementation)
 * - pdfmake: Content builders available for incremental migration
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
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
  PDF_COLORS_HEX,
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
  drawProgressBar as drawEnhancedProgressBar,
  // pdfmake builders
  buildPageHeaderContent,
  buildPageFooterContent,
  buildCardContent,
  buildBadgeContent,
  buildProgressBarContent
} from "./roadmapReviewPdfSections/pageDecorations";
import { 
  generateTableOfContents, 
  buildTocEntries,
  // pdfmake builder
  buildTocContent
} from "./roadmapReviewPdfSections/tableOfContents";
import { 
  drawCompactMeetingNotes,
  // pdfmake builders
  buildMeetingNotesContent,
  buildCompactMeetingNotesContent
} from "./roadmapReviewPdfSections/meetingNotes";
import { 
  generateSummaryMinutesPage,
  // pdfmake builder
  buildSummaryMinutesContent
} from "./roadmapReviewPdfSections/summaryMinutes";
import {
  // pdfmake builders
  buildRoadmapTableContent,
  buildFullRoadmapPageContent
} from "./roadmapReviewPdfSections/fullRoadmapPage";

// Alias for hex colors
const PDF_BRAND_COLORS_HEX = PDF_COLORS_HEX;

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
 * Adds a chart image to the PDF with proper sizing and aspect ratio
 * Ensures charts are fully visible without cropping
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
  const { startX, width: contentWidth } = getContentDimensions();
  
  // Add title if provided
  let currentY = y;
  if (title) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text(title, x, currentY);
    currentY += PDF_LAYOUT.spacing.paragraph;
  }
  
  // Calculate aspect ratio preserving dimensions
  const aspectRatio = canvas.width / canvas.height;
  const availableWidth = Math.min(maxWidth, contentWidth);
  
  let chartWidth = availableWidth;
  let chartHeight = chartWidth / aspectRatio;
  
  // If height exceeds max, scale down proportionally
  if (chartHeight > maxHeight) {
    chartHeight = maxHeight;
    chartWidth = chartHeight * aspectRatio;
  }
  
  // Center the chart within available width
  const chartX = x + (availableWidth - chartWidth) / 2;
  
  // Draw subtle border around chart
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(chartX - 2, currentY - 2, chartWidth + 4, chartHeight + 4, 2, 2, "S");
  
  // Add chart image with high quality
  addHighQualityImage(doc, canvas, chartX, currentY, chartWidth, chartHeight, 'PNG', 0.95);
  
  return currentY + chartHeight + PDF_LAYOUT.spacing.card;
}

/**
 * Generates the enhanced branded cover page with proper logo sizing
 */
function generateCoverPage(
  doc: jsPDF,
  metrics: PortfolioMetrics,
  companyLogo?: string | null,
  companyName?: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { margins } = PDF_LAYOUT;
  
  // Header background - upper 40% of page
  const headerHeight = pageHeight * 0.40;
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  
  // Accent stripe at bottom of header
  doc.setFillColor(...PDF_BRAND_COLORS.primaryLight);
  doc.rect(0, headerHeight - 6, pageWidth, 6, "F");
  
  // Company logo with proper sizing and aspect ratio preservation
  const logoMaxWidth = 50;
  const logoMaxHeight = 20;
  const logoX = margins.left;
  const logoY = 15;
  
  if (companyLogo) {
    try {
      // Create temp image to calculate aspect ratio
      const img = new Image();
      img.src = companyLogo;
      
      // Calculate proportional dimensions
      const aspectRatio = img.naturalWidth && img.naturalHeight 
        ? img.naturalWidth / img.naturalHeight 
        : 2; // Default 2:1 aspect ratio
      
      let logoWidth = logoMaxWidth;
      let logoHeight = logoWidth / aspectRatio;
      
      // Scale down if height exceeds max
      if (logoHeight > logoMaxHeight) {
        logoHeight = logoMaxHeight;
        logoWidth = logoHeight * aspectRatio;
      }
      
      doc.addImage(companyLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // Fallback to company name
      doc.setTextColor(...PDF_BRAND_COLORS.white);
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
      doc.setFont("helvetica", "bold");
      doc.text(companyName || 'Roadmap Review', logoX, logoY + 12);
    }
  } else if (companyName) {
    doc.setTextColor(...PDF_BRAND_COLORS.white);
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, logoX, logoY + 12);
  }
  
  // Main title - centered in header area
  const titleY = headerHeight * 0.45;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.title + 8);
  doc.setFont("helvetica", "bold");
  doc.text("ROADMAP", pageWidth / 2, titleY, { align: "center" });
  doc.text("REVIEW REPORT", pageWidth / 2, titleY + 18, { align: "center" });
  
  // Subtitle
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setFont("helvetica", "normal");
  doc.text("Portfolio Progress & Team Overview", pageWidth / 2, titleY + 36, { align: "center" });
  
  // Portfolio Health Section - positioned below header
  const contentStartY = headerHeight + 20;
  
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
  doc.setFont("helvetica", "bold");
  doc.text("PORTFOLIO HEALTH SCORE", pageWidth / 2, contentStartY, { align: "center" });
  
  // Health gauge - centered
  const gaugeY = contentStartY + 25;
  drawHealthGauge(doc, metrics.totalHealthScore, pageWidth / 2, gaugeY, 25);
  
  // Summary stats cards - evenly spaced with proper margins
  const cardsY = gaugeY + 45;
  const cardWidth = 40;
  const cardHeight = 30;
  const cardSpacing = 8;
  const totalCardsWidth = (cardWidth * 4) + (cardSpacing * 3);
  const cardsStartX = (pageWidth - totalCardsWidth) / 2;
  
  const statsBoxes = [
    { value: metrics.totalProjects, label: "Projects", color: PDF_BRAND_COLORS.primary },
    { value: `${metrics.averageProgress}%`, label: "Avg Progress", color: metrics.averageProgress >= 60 ? PDF_BRAND_COLORS.success : PDF_BRAND_COLORS.warning },
    { value: metrics.projectsAtRisk + metrics.projectsCritical, label: "At Risk", color: PDF_BRAND_COLORS.danger },
    { value: metrics.totalOverdueItems, label: "Overdue", color: metrics.totalOverdueItems > 5 ? PDF_BRAND_COLORS.danger : PDF_BRAND_COLORS.success },
  ];
  
  statsBoxes.forEach((box, idx) => {
    const x = cardsStartX + (cardWidth + cardSpacing) * idx;
    drawMetricCard(doc, box.label, String(box.value), x, cardsY, cardWidth, cardHeight, box.color as number[]);
  });
  
  // Generation date - positioned above footer
  const footerY = pageHeight - 40;
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
  doc.text(`Generated: ${format(new Date(), "PPPP 'at' p")}`, pageWidth / 2, footerY, { align: "center" });
  
  // Footer line and confidential notice
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.4);
  doc.line(margins.left + 20, pageHeight - 25, pageWidth - margins.right - 20, pageHeight - 25);
  
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.setFont("helvetica", "italic");
  doc.text("Confidential - For Internal Use Only", pageWidth / 2, pageHeight - 15, { align: "center" });
}

/**
 * Generates the executive summary page with proper table sizing
 */
function generateExecutiveSummaryPage(
  doc: jsPDF,
  metrics: PortfolioMetrics,
  companyLogo?: string | null,
  companyName?: string
): void {
  doc.addPage();
  addPageHeader(doc, 'Executive Summary', companyLogo, companyName);
  
  const { startX, startY, width: contentWidth } = getContentDimensions();
  let yPos = startY;
  
  // Section header with consistent styling
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text("Executive Summary", startX, yPos);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, yPos + 3, startX + 55, yPos + 3);
  yPos += PDF_LAYOUT.spacing.section + 5;
  
  // Calculate table width to fit within content area
  const tableWidth = Math.min(contentWidth, 150);
  
  // Summary metrics table - improved styling for readability
  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value", "Status"]],
    body: [
      ["Total Projects", String(metrics.totalProjects), "Active"],
      ["Average Progress", `${metrics.averageProgress}%`, metrics.averageProgress >= 60 ? "On Track" : metrics.averageProgress >= 40 ? "Attention" : "Behind"],
      ["Portfolio Health", `${metrics.totalHealthScore}%`, metrics.totalHealthScore >= 70 ? "Healthy" : metrics.totalHealthScore >= 50 ? "Moderate" : "Attention"],
      ["Projects at Risk", String(metrics.projectsAtRisk), metrics.projectsAtRisk === 0 ? "None" : metrics.projectsAtRisk <= 2 ? "Manageable" : "High"],
      ["Critical Projects", String(metrics.projectsCritical), metrics.projectsCritical === 0 ? "None" : "Action Needed"],
      ["Overdue Items", String(metrics.totalOverdueItems), metrics.totalOverdueItems === 0 ? "None" : metrics.totalOverdueItems <= 3 ? "Low" : "High"],
      ["Due This Week", String(metrics.totalDueSoonItems), "-"],
      ["Team Members", String(metrics.totalTeamMembers), "-"],
    ],
    theme: "striped",
    headStyles: { 
      fillColor: PDF_BRAND_COLORS.primary as any, 
      textColor: [255, 255, 255] as any,
      fontSize: PDF_TYPOGRAPHY.sizes.body, 
      fontStyle: 'bold',
      cellPadding: 4,
      minCellHeight: 10,
    },
    bodyStyles: { 
      fontSize: PDF_TYPOGRAPHY.sizes.body,
      cellPadding: 3.5,
      minCellHeight: 9,
      textColor: PDF_BRAND_COLORS.text as any,
    },
    alternateRowStyles: { fillColor: PDF_BRAND_COLORS.lightGray as any },
    margin: { left: startX, right: PDF_LAYOUT.margins.right },
    tableWidth: tableWidth,
    columnStyles: {
      0: { cellWidth: tableWidth * 0.4 },
      1: { cellWidth: tableWidth * 0.25, halign: 'center' },
      2: { cellWidth: tableWidth * 0.35, halign: 'center' },
    },
    styles: {
      lineColor: PDF_BRAND_COLORS.tableBorder as any,
      lineWidth: 0.3,
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + PDF_LAYOUT.spacing.section;
  
  // Priority breakdown if available
  if (metrics.priorityBreakdown.length > 0) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text("Priority Distribution", startX, yPos);
    yPos += PDF_LAYOUT.spacing.paragraph + 2;
    
    const priorityTableWidth = Math.min(contentWidth * 0.7, 120);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Priority Level", "Count", "Percentage"]],
      body: metrics.priorityBreakdown.map((p) => {
        const total = metrics.priorityBreakdown.reduce((acc, x) => acc + x.count, 0);
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        return [p.priority.charAt(0).toUpperCase() + p.priority.slice(1), String(p.count), `${pct}%`];
      }),
      theme: "striped",
      headStyles: { 
        fillColor: PDF_BRAND_COLORS.primary as any, 
        textColor: [255, 255, 255] as any,
        fontSize: PDF_TYPOGRAPHY.sizes.body,
        fontStyle: 'bold',
        cellPadding: 3.5,
        minCellHeight: 9,
      },
      bodyStyles: { 
        fontSize: PDF_TYPOGRAPHY.sizes.body,
        cellPadding: 3,
        minCellHeight: 8,
        textColor: PDF_BRAND_COLORS.text as any,
      },
      alternateRowStyles: { fillColor: PDF_BRAND_COLORS.lightGray as any },
      margin: { left: startX, right: PDF_LAYOUT.margins.right },
      tableWidth: priorityTableWidth,
      columnStyles: {
        0: { cellWidth: priorityTableWidth * 0.45 },
        1: { cellWidth: priorityTableWidth * 0.25, halign: 'center' },
        2: { cellWidth: priorityTableWidth * 0.30, halign: 'center' },
      },
      styles: {
        lineColor: PDF_BRAND_COLORS.tableBorder as any,
        lineWidth: 0.2,
      },
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
 * Generates individual project detail pages with meeting notes and roadmap snapshots
 * Implements proper page breaks and prevents orphaned content
 */
function generateProjectPages(
  doc: jsPDF,
  projects: EnhancedProjectSummary[],
  includeMeetingNotes: boolean = true,
  companyLogo?: string | null,
  companyName?: string,
  projectCharts?: Map<number, HTMLCanvasElement>
): void {
  doc.addPage();
  addPageHeader(doc, 'Project Details', companyLogo, companyName);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const { startX, startY, width: contentWidth, endY } = getContentDimensions();
  let yPos = startY;
  
  // Section header
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text("Project Details", startX, yPos);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, yPos + 3, startX + 45, yPos + 3);
  yPos += PDF_LAYOUT.spacing.section;
  
  for (let projectIndex = 0; projectIndex < projects.length; projectIndex++) {
    const project = projects[projectIndex];
    const projectChart = projectCharts?.get(projectIndex);
    
    // Calculate required space for this project block
    const baseHeight = 70; // Minimum project card height
    const chartHeight = projectChart ? 58 : 0; // Height for roadmap snapshot
    const meetingNotesHeight = includeMeetingNotes ? 55 : 0;
    const upcomingItemsHeight = project.upcomingItems.length > 0 ? Math.min(project.upcomingItems.length, 5) * 8 + 15 : 0;
    const requiredSpace = baseHeight + chartHeight + meetingNotesHeight + upcomingItemsHeight;
    
    // Check if we need a new page - ensure full project block stays together
    yPos = checkPageBreak(doc, yPos, requiredSpace, 'Project Details', companyLogo, companyName);
    
    // Project header card with proper sizing - expand height for wrapped text
    const maxNameWidth = contentWidth - 55;
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(project.projectName, maxNameWidth);
    const cardHeight = nameLines.length > 1 ? 20 + (nameLines.length - 1) * 5 : 20;
    
    drawCard(doc, startX, yPos, contentWidth, cardHeight, { shadow: true });
    
    // Project name - wrapped text
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text(nameLines, startX + 5, yPos + 12);
    
    // Health badge - properly positioned within card
    const badgeY = yPos + 6;
    const healthColor = getHealthColor(project.healthScore);
    doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
    doc.roundedRect(pageWidth - PDF_LAYOUT.margins.right - 22, badgeY, 18, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
    doc.setFont("helvetica", "bold");
    doc.text(`${project.healthScore}%`, pageWidth - PDF_LAYOUT.margins.right - 13, badgeY + 6.5, { align: "center" });
    
    // Risk badge
    const riskColor = getRiskColor(project.riskLevel);
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(pageWidth - PDF_LAYOUT.margins.right - 45, badgeY, 20, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    const riskLabel = project.riskLevel.length > 6 ? project.riskLevel.substring(0, 6) : project.riskLevel;
    doc.text(riskLabel.toUpperCase(), pageWidth - PDF_LAYOUT.margins.right - 35, badgeY + 6.5, { align: "center" });
    
    yPos += cardHeight + 4;
    
    // Location
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_BRAND_COLORS.gray);
    const location = [project.city, project.province].filter(Boolean).join(", ") || "No location";
    doc.text(`Location: ${location}`, startX + 5, yPos);
    yPos += PDF_LAYOUT.spacing.line;
    
    // Progress bar with label
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
    doc.text("Progress:", startX + 5, yPos);
    drawProgressBar(doc, project.progress, startX + 30, yPos - 3, 55, 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${project.completedItems}/${project.totalItems} items`, startX + 90, yPos);
    yPos += PDF_LAYOUT.spacing.line + 1;
    
    // Metrics row - compact
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    const metricsText = `Velocity: ${project.velocityLast7Days}/wk  •  Overdue: ${project.overdueCount}  •  Due Soon: ${project.dueSoonCount}`;
    doc.text(metricsText, startX + 5, yPos);
    yPos += PDF_LAYOUT.spacing.line;
    
    // Priority distribution bar
    if (project.priorityDistribution.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
      doc.text("Priority:", startX + 5, yPos);
      drawPriorityBar(doc, project.priorityDistribution, startX + 28, yPos - 2.5, 55, 4);
      yPos += PDF_LAYOUT.spacing.line;
    }
    
    // Team members (compact)
    if (project.teamMembers.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
      doc.text("Team:", startX + 5, yPos);
      doc.setFont("helvetica", "normal");
      const teamText = project.teamMembers.slice(0, 3).map(m => m.name.split(' ')[0]).join(", ");
      const suffix = project.teamMembers.length > 3 ? ` +${project.teamMembers.length - 3}` : "";
      doc.text(teamText + suffix, startX + 22, yPos);
      yPos += PDF_LAYOUT.spacing.line;
    }
    
    // Upcoming items table - improved styling for readability
    if (project.upcomingItems.length > 0) {
      yPos += 4;
      autoTable(doc, {
        startY: yPos,
        head: [["Task", "Due", "Priority", "Status"]],
        body: project.upcomingItems.slice(0, 5).map((item) => [
          item.title,
          item.dueDate ? format(new Date(item.dueDate), "MMM d") : "-",
          (item.priority || "Normal").charAt(0).toUpperCase() + (item.priority || "Normal").slice(1).toLowerCase(),
          getDueDateStatus(item.dueDate) === "overdue" ? "LATE" : 
            getDueDateStatus(item.dueDate) === "soon" ? "Soon" : "OK",
        ]),
        theme: "striped",
        headStyles: { 
          fillColor: PDF_BRAND_COLORS.primary as any, 
          textColor: [255, 255, 255] as any, 
          fontSize: PDF_TYPOGRAPHY.sizes.small, 
          fontStyle: 'bold',
          cellPadding: 3,
          overflow: 'linebreak',
          minCellHeight: 8,
        },
        bodyStyles: { 
          fontSize: PDF_TYPOGRAPHY.sizes.small,
          cellPadding: 2.5,
          overflow: 'linebreak',
          minCellHeight: 7,
          textColor: PDF_BRAND_COLORS.text as any,
        },
        alternateRowStyles: { 
          fillColor: PDF_BRAND_COLORS.lightGray as any 
        },
        margin: { left: startX + 3, right: PDF_LAYOUT.margins.right + 3 },
        tableWidth: contentWidth - 6,
        columnStyles: {
          0: { cellWidth: (contentWidth - 6) * 0.45, overflow: 'linebreak' },
          1: { cellWidth: (contentWidth - 6) * 0.18, halign: 'center' },
          2: { cellWidth: (contentWidth - 6) * 0.18, halign: 'center' },
          3: { cellWidth: (contentWidth - 6) * 0.19, halign: 'center' },
        },
        styles: {
          lineColor: PDF_BRAND_COLORS.tableBorder as any,
          lineWidth: 0.2,
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 5;
    }
    
    // Add roadmap snapshot chart for this project
    if (projectChart) {
      // Check if we need a new page for the chart
      const chartDisplayHeight = 52;
      yPos = checkPageBreak(doc, yPos, chartDisplayHeight + 10, 'Project Details', companyLogo, companyName);
      
      yPos += 3;
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_BRAND_COLORS.primary);
      doc.text("Roadmap Snapshot", startX + 5, yPos);
      yPos += 4;
      
      // Calculate chart dimensions maintaining aspect ratio
      const chartNaturalWidth = projectChart.width;
      const chartNaturalHeight = projectChart.height;
      const aspectRatio = chartNaturalWidth / chartNaturalHeight;
      
      // Scale to fit within content width, with max height
      let chartWidth = contentWidth - 10;
      let chartHeight = chartWidth / aspectRatio;
      
      if (chartHeight > chartDisplayHeight) {
        chartHeight = chartDisplayHeight;
        chartWidth = chartHeight * aspectRatio;
      }
      
      // Center the chart
      const chartX = startX + 5 + (contentWidth - 10 - chartWidth) / 2;
      
      // Add chart with border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.rect(chartX - 1, yPos - 1, chartWidth + 2, chartHeight + 2);
      
      addHighQualityImage(
        doc,
        projectChart,
        chartX,
        yPos,
        chartWidth,
        chartHeight,
        'PNG',
        0.92
      );
      
      yPos += chartHeight + 5;
    }
    
    // Add meeting notes section for this project
    if (includeMeetingNotes) {
      yPos += 2;
      yPos = drawCompactMeetingNotes(doc, startX, yPos, contentWidth);
    }
    
    // Separator line between projects
    yPos += PDF_LAYOUT.spacing.element;
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.setLineWidth(0.3);
    doc.line(startX, yPos, pageWidth - PDF_LAYOUT.margins.right, yPos);
    yPos += PDF_LAYOUT.spacing.paragraph;
  }
}

/**
 * Main function to generate the complete enhanced PDF report
 */
export async function generateEnhancedRoadmapPDF(
  projects: EnhancedProjectSummary[],
  metrics: PortfolioMetrics,
  options: Partial<RoadmapPDFExportOptions> = {},
  allRoadmapItems?: any[]
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
    includeFullRoadmapItems: options.includeFullRoadmapItems ?? false,
    companyLogo: options.companyLogo ?? null,
    companyName: options.companyName ?? 'Roadmap Review',
    confidentialNotice: options.confidentialNotice ?? true,
    reportType: options.reportType ?? 'meeting-review',
    chartLayout: options.chartLayout ?? 'stacked',
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
    // Extract project names for TOC
    const projectNames = projects.map(p => p.projectName);
    
    const tocEntries = buildTocEntries(projects.length, {
      includeCoverPage: config.includeCoverPage,
      includeTableOfContents: true,
      includeAnalytics: config.includeAnalytics,
      includeDetailedProjects: config.includeDetailedProjects,
      includeSummaryMinutes: config.includeSummaryMinutes,
    }, projectNames);
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
  
  // 5. Project Details with Meeting Notes and Roadmap Snapshots
  if (config.includeDetailedProjects && projects.length > 0) {
    // Capture individual project roadmap charts
    const projectCharts = new Map<number, HTMLCanvasElement>();
    
    for (let i = 0; i < projects.length; i++) {
      const chartCanvas = await captureChartById(`project-roadmap-chart-${i}`);
      if (chartCanvas) {
        projectCharts.set(i, chartCanvas);
      }
    }
    
    generateProjectPages(
      doc, 
      projects, 
      config.includeMeetingNotes && config.reportType === 'meeting-review',
      config.companyLogo,
      config.companyName,
      projectCharts.size > 0 ? projectCharts : undefined
    );
  }
  
  // 5.5 Full Roadmap Items Pages (optional - for meeting reviews)
  if (config.includeFullRoadmapItems && config.reportType === 'meeting-review' && allRoadmapItems) {
    const { generateFullRoadmapPage } = await import('./roadmapReviewPdfSections/fullRoadmapPage');
    
    for (const project of projects) {
      generateFullRoadmapPage(
        doc,
        project,
        allRoadmapItems,
        config.companyLogo,
        config.companyName
      );
    }
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
