import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { EnhancedProjectSummary, getDueDateStatus } from "../roadmapReviewCalculations";
import { 
  PDF_BRAND_COLORS, 
  PDF_LAYOUT, 
  PDF_TYPOGRAPHY,
  getContentDimensions,
  getRiskColor
} from "../roadmapReviewPdfStyles";
import { addPageHeader, checkPageBreak, drawCard } from "./pageDecorations";

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
  
  // Project name and badges
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  const displayName = project.projectName.length > 40 
    ? project.projectName.substring(0, 37) + "..." 
    : project.projectName;
  doc.text(displayName, startX + 5, yPos + 10);
  
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
    
    // Build table data for pending items
    const pendingTableData = pendingItems.map(item => {
      const dueStatus = getDueDateStatus(item.due_date || null);
      const statusLabel = dueStatus === 'overdue' ? 'OVERDUE' : 
        dueStatus === 'soon' ? 'Due Soon' : 'Pending';
      
      return [
        item.title.length > 45 ? item.title.substring(0, 42) + "..." : item.title,
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
        fontSize: PDF_TYPOGRAPHY.sizes.small, 
        fontStyle: 'bold',
        cellPadding: 2,
      },
      bodyStyles: { 
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        cellPadding: 2,
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
      didDrawCell: (data) => {
        // Color the status column based on status
        if (data.column.index === 3 && data.section === 'body') {
          const cellValue = data.cell.raw as string;
          if (cellValue === 'OVERDUE') {
            doc.setTextColor(...PDF_BRAND_COLORS.danger);
          } else if (cellValue === 'Due Soon') {
            doc.setTextColor(...PDF_BRAND_COLORS.warning);
          }
        }
      },
      willDrawCell: (data) => {
        // Style overdue rows differently
        if (data.section === 'body') {
          const rowData = pendingTableData[data.row.index];
          if (rowData && rowData[3] === 'OVERDUE') {
            data.cell.styles.textColor = data.column.index === 3 
              ? PDF_BRAND_COLORS.danger 
              : [80, 80, 80];
          }
        }
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
    
    // Build table data for completed items
    const completedTableData = completedItems.slice(0, 15).map(item => [
      item.title.length > 50 ? item.title.substring(0, 47) + "..." : item.title,
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
        fontSize: PDF_TYPOGRAPHY.sizes.small, 
        fontStyle: 'bold',
        cellPadding: 2,
      },
      bodyStyles: { 
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        cellPadding: 1.5,
        textColor: [100, 100, 100],
      },
      alternateRowStyles: { fillColor: [245, 255, 245] as any },
      margin: { left: startX, right: PDF_LAYOUT.margins.right },
      tableWidth: contentWidth,
      columnStyles: {
        0: { cellWidth: contentWidth * 0.60 },
        1: { cellWidth: contentWidth * 0.20, halign: 'center' },
        2: { cellWidth: contentWidth * 0.20, halign: 'center' },
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
