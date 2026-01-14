/**
 * Full Roadmap Page - Detailed project roadmap items
 * 
 * MIGRATION STATUS: Phase 4 - pdfmake compatibility layer added
 * - jsPDF: Full support with autoTable (current implementation)
 * - pdfmake: Content builders for roadmap tables
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Content, ContentTable, TableCell } from "pdfmake/interfaces";
import { format } from "date-fns";
import { EnhancedProjectSummary, getDueDateStatus } from "../roadmapReviewCalculations";
import { 
  PDF_BRAND_COLORS, 
  PDF_COLORS_HEX,
  PDF_LAYOUT, 
  PDF_TYPOGRAPHY,
  getContentDimensions,
  getRiskColor
} from "../roadmapReviewPdfStyles";
import { addPageHeader, checkPageBreak, drawCard, buildCardContent, buildBadgeContent } from "./pageDecorations";

// Alias for cleaner code
const PDF_BRAND_COLORS_HEX = PDF_COLORS_HEX;

// ============================================================================
// PDFMAKE CONTENT BUILDERS
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

/**
 * Build pdfmake roadmap items table content
 */
export const buildRoadmapTableContent = (
  items: RoadmapItem[],
  isPending: boolean = true
): Content => {
  const headerColor = isPending ? PDF_BRAND_COLORS_HEX.primary : PDF_BRAND_COLORS_HEX.success;
  
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: 'Task', bold: true, color: '#FFFFFF', fillColor: headerColor, fontSize: PDF_TYPOGRAPHY.sizes.small },
      { text: 'Due Date', bold: true, color: '#FFFFFF', fillColor: headerColor, fontSize: PDF_TYPOGRAPHY.sizes.small, alignment: 'center' },
      { text: 'Priority', bold: true, color: '#FFFFFF', fillColor: headerColor, fontSize: PDF_TYPOGRAPHY.sizes.small, alignment: 'center' },
      { text: 'Status', bold: true, color: '#FFFFFF', fillColor: headerColor, fontSize: PDF_TYPOGRAPHY.sizes.small, alignment: 'center' },
    ],
    // Data rows
    ...items.map((item, index) => {
      const dueStatus = getDueDateStatus(item.due_date || null);
      const statusLabel = item.is_completed ? '✓ Done' : 
        dueStatus === 'overdue' ? 'OVERDUE' : 
        dueStatus === 'soon' ? 'Due Soon' : 'Pending';
      
      const statusColor = item.is_completed ? PDF_BRAND_COLORS_HEX.success :
        dueStatus === 'overdue' ? PDF_BRAND_COLORS_HEX.danger :
        dueStatus === 'soon' ? PDF_BRAND_COLORS_HEX.warning : PDF_BRAND_COLORS_HEX.text;

      const rowFill = index % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF';

      return [
        { 
          text: item.title,
          fontSize: PDF_TYPOGRAPHY.sizes.small,
          fillColor: rowFill,
        },
        { 
          text: item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-', 
          fontSize: PDF_TYPOGRAPHY.sizes.small, 
          alignment: 'center' as const,
          fillColor: rowFill,
        },
        { 
          text: (item.priority || 'Normal').charAt(0).toUpperCase() + (item.priority || 'normal').slice(1), 
          fontSize: PDF_TYPOGRAPHY.sizes.small, 
          alignment: 'center' as const,
          fillColor: rowFill,
        },
        { 
          text: statusLabel, 
          fontSize: PDF_TYPOGRAPHY.sizes.small, 
          alignment: 'center' as const,
          color: statusColor,
          bold: dueStatus === 'overdue',
          fillColor: rowFill,
        },
      ];
    }),
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['45%', '20%', '15%', '20%'],
      body: tableBody,
    },
    layout: {
      hLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder,
      vLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder,
      hLineWidth: () => 0.3,
      vLineWidth: () => 0.3,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
};

/**
 * Build pdfmake full roadmap page content
 */
export const buildFullRoadmapPageContent = (
  project: EnhancedProjectSummary,
  allItems: RoadmapItem[]
): Content => {
  const projectItems = allItems.filter(item => item.project_id === project.projectId);
  const pendingItems = projectItems.filter(item => !item.is_completed);
  const completedItems = projectItems.filter(item => item.is_completed);

  const healthColor = project.healthScore >= 70 ? PDF_BRAND_COLORS_HEX.success : 
    project.healthScore >= 40 ? PDF_BRAND_COLORS_HEX.warning : PDF_BRAND_COLORS_HEX.danger;

  const sections: Content[] = [
    // Project header
    buildCardContent({
      columns: [
        {
          stack: [
            { text: project.projectName, fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary },
            { 
              text: `Total Items: ${projectItems.length}  |  Completed: ${project.completedItems}  |  Progress: ${project.progress}%  |  Overdue: ${project.overdueCount}`, 
              fontSize: PDF_TYPOGRAPHY.sizes.small, 
              color: PDF_BRAND_COLORS_HEX.darkGray,
              margin: [0, 4, 0, 0],
            },
          ],
        },
        buildBadgeContent(`${project.healthScore}%`, healthColor),
      ],
    }),
  ];

  // Pending items section
  if (pendingItems.length > 0) {
    sections.push(
      { text: `Pending Items (${pendingItems.length})`, fontSize: PDF_TYPOGRAPHY.sizes.h3, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 6] },
      buildRoadmapTableContent(pendingItems, true)
    );
  }

  // Completed items section
  if (completedItems.length > 0) {
    sections.push(
      { text: `Completed Items (${completedItems.length})`, fontSize: PDF_TYPOGRAPHY.sizes.h3, bold: true, color: PDF_BRAND_COLORS_HEX.success, margin: [0, 12, 0, 6] },
      buildRoadmapTableContent(completedItems.slice(0, 15), false)
    );
    
    if (completedItems.length > 15) {
      sections.push({
        text: `+ ${completedItems.length - 15} more completed items`,
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        italics: true,
        color: PDF_BRAND_COLORS_HEX.gray,
        margin: [0, 4, 0, 0],
      });
    }
  }

  return { stack: sections };
};

// ============================================================================
// JSPDF IMPLEMENTATIONS (Original - kept for backward compatibility)
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

/**
 * Generates a full roadmap items page for a single project
 * Shows ALL roadmap items with their status, priority, and due dates
 */
export function generateFullRoadmapPage(
  doc: jsPDF,
  project: EnhancedProjectSummary,
  allItems: RoadmapItem[],
  companyLogo?: string | null,
  companyName?: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { startX, startY, width: contentWidth, endY } = getContentDimensions();
  
  // Filter items for this project
  const projectItems = allItems.filter(item => item.project_id === project.projectId);
  
  if (projectItems.length === 0) return;
  
  // Start a new page for this project's full roadmap
  doc.addPage();
  addPageHeader(doc, `${project.projectName} - Full Roadmap`, companyLogo, companyName);
  
  let yPos = startY;
  
  // Project header card
  const cardHeight = 28;
  drawCard(doc, startX, yPos, contentWidth, cardHeight, { shadow: true });
  
  // Project name and badges - use text wrapping for long names
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  
  // Calculate max width for project name (leave space for badges)
  const maxNameWidth = contentWidth - 55;
  const nameLines = doc.splitTextToSize(project.projectName, maxNameWidth);
  doc.text(nameLines, startX + 5, yPos + 10);
  
  // Health badge
  const badgeY = yPos + 5;
  const healthColor = project.healthScore >= 70 ? PDF_BRAND_COLORS.success : 
    project.healthScore >= 40 ? PDF_BRAND_COLORS.warning : PDF_BRAND_COLORS.danger;
  doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
  doc.roundedRect(pageWidth - PDF_LAYOUT.margins.right - 22, badgeY, 18, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setFont("helvetica", "bold");
  doc.text(`${project.healthScore}%`, pageWidth - PDF_LAYOUT.margins.right - 13, badgeY + 6.5, { align: "center" });
  
  // Stats row
  yPos += 16;
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  const statsText = `Total Items: ${projectItems.length}  |  Completed: ${project.completedItems}  |  Progress: ${project.progress}%  |  Overdue: ${project.overdueCount}`;
  doc.text(statsText, startX + 5, yPos);
  
  yPos += cardHeight - 10;
  
  // Separate items by status
  const pendingItems = projectItems.filter(item => !item.is_completed);
  const completedItems = projectItems.filter(item => item.is_completed);
  
  // Sort pending items: overdue first, then by due date
  pendingItems.sort((a, b) => {
    const aStatus = getDueDateStatus(a.due_date || null);
    const bStatus = getDueDateStatus(b.due_date || null);
    
    // Overdue items first
    if (aStatus === 'overdue' && bStatus !== 'overdue') return -1;
    if (bStatus === 'overdue' && aStatus !== 'overdue') return 1;
    
    // Then by due date
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
  
  // Pending Items Section
  if (pendingItems.length > 0) {
    yPos += 8;
    yPos = checkPageBreak(doc, yPos, 50, `${project.projectName} - Full Roadmap`, companyLogo, companyName);
    
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.primary);
    doc.text(`Pending Items (${pendingItems.length})`, startX, yPos);
    yPos += 6;
    
    // Build table data for pending items - no truncation, use wrapping
    const pendingTableData = pendingItems.map(item => {
      const dueStatus = getDueDateStatus(item.due_date || null);
      const statusLabel = dueStatus === 'overdue' ? 'OVERDUE' : 
        dueStatus === 'soon' ? 'Due Soon' : 'Pending';
      
      return [
        item.title, // Full title - will wrap
        item.due_date ? format(new Date(item.due_date), "MMM d, yyyy") : "-",
        (item.priority || "Normal").charAt(0).toUpperCase() + (item.priority || "normal").slice(1),
        statusLabel,
      ];
    });
    
    autoTable(doc, {
      startY: yPos,
      head: [["Task", "Due Date", "Priority", "Status"]],
      body: pendingTableData,
      theme: "striped",
      headStyles: { 
        fillColor: PDF_BRAND_COLORS.primary as any, 
        textColor: [255, 255, 255],
        fontSize: PDF_TYPOGRAPHY.sizes.body, 
        fontStyle: 'bold',
        cellPadding: 4,
        minCellHeight: 10,
      },
      bodyStyles: { 
        fontSize: PDF_TYPOGRAPHY.sizes.small,
        cellPadding: 3,
        minCellHeight: 8,
        textColor: PDF_BRAND_COLORS.text as any,
      },
      alternateRowStyles: { fillColor: PDF_BRAND_COLORS.lightGray as any },
      margin: { left: startX, right: PDF_LAYOUT.margins.right },
      tableWidth: contentWidth,
      columnStyles: {
        0: { cellWidth: contentWidth * 0.45 },
        1: { cellWidth: contentWidth * 0.20, halign: 'center' },
        2: { cellWidth: contentWidth * 0.15, halign: 'center' },
        3: { cellWidth: contentWidth * 0.20, halign: 'center' },
      },
      styles: {
        lineColor: PDF_BRAND_COLORS.tableBorder as any,
        lineWidth: 0.3,
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const cellValue = data.cell.raw as string;
          if (cellValue === 'OVERDUE') {
            data.cell.styles.textColor = PDF_BRAND_COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          } else if (cellValue === 'Due Soon') {
            data.cell.styles.textColor = PDF_BRAND_COLORS.warning;
          }
        }
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Completed Items Section
  if (completedItems.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40, `${project.projectName} - Full Roadmap`, companyLogo, companyName);
    
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND_COLORS.success);
    doc.text(`Completed Items (${completedItems.length})`, startX, yPos);
    yPos += 6;
    
    // Build table data for completed items - no truncation, use wrapping
    const completedTableData = completedItems.slice(0, 15).map(item => [
      item.title, // Full title - will wrap
      (item.priority || "Normal").charAt(0).toUpperCase() + (item.priority || "normal").slice(1),
      "✓ Done",
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Task", "Priority", "Status"]],
      body: completedTableData,
      theme: "striped",
      headStyles: { 
        fillColor: PDF_BRAND_COLORS.success as any, 
        textColor: [255, 255, 255],
        fontSize: PDF_TYPOGRAPHY.sizes.body, 
        fontStyle: 'bold',
        cellPadding: 4,
        minCellHeight: 10,
      },
      bodyStyles: { 
        fontSize: PDF_TYPOGRAPHY.sizes.small,
        cellPadding: 3,
        textColor: [100, 100, 100],
        minCellHeight: 8,
      },
      alternateRowStyles: { fillColor: [245, 255, 245] as any },
      margin: { left: startX, right: PDF_LAYOUT.margins.right },
      tableWidth: contentWidth,
      columnStyles: {
        0: { cellWidth: contentWidth * 0.60 },
        1: { cellWidth: contentWidth * 0.20, halign: 'center' },
        2: { cellWidth: contentWidth * 0.20, halign: 'center' },
      },
      styles: {
        lineColor: PDF_BRAND_COLORS.tableBorder as any,
        lineWidth: 0.2,
      },
    });
    
    // Show note if more completed items exist
    if (completedItems.length > 15) {
      yPos = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...PDF_BRAND_COLORS.gray);
      doc.text(`+ ${completedItems.length - 15} more completed items`, startX, yPos);
    }
  }
}
