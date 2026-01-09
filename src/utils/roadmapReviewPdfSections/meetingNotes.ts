/**
 * Meeting Notes Section - Per-project notes areas with action items
 */
import jsPDF from "jspdf";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  MEETING_NOTES_CONFIG,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";
import { drawCard } from "./pageDecorations";

/**
 * Draw a blank line for handwritten notes
 */
const drawNoteLine = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number
): void => {
  doc.setDrawColor(...PDF_BRAND_COLORS.gray);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + width, y);
};

/**
 * Draw section label
 */
const drawLabel = (
  doc: jsPDF,
  label: string,
  x: number,
  y: number
): void => {
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  doc.text(label, x, y);
};

/**
 * Draw meeting notes section for a project
 */
export const drawProjectMeetingNotes = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  projectName: string
): number => {
  const { boxPadding, lineHeight, discussionLines, decisionLines, actionItemRows } = MEETING_NOTES_CONFIG;
  
  // Calculate total height
  const headerHeight = 12;
  const discussionHeight = discussionLines * lineHeight + 8;
  const decisionHeight = decisionLines * lineHeight + 8;
  const actionTableHeight = (actionItemRows + 1) * lineHeight + 12;
  const followUpHeight = 20;
  const totalHeight = headerHeight + discussionHeight + decisionHeight + actionTableHeight + followUpHeight + boxPadding * 2;
  
  // Draw container card
  drawCard(doc, x, y, width, totalHeight, {
    fillColor: [252, 252, 253],
    borderColor: PDF_BRAND_COLORS.primary,
    borderWidth: 0.5,
  });
  
  let currentY = y + boxPadding;
  
  // Header
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(x, y, width, headerHeight, 'F');
  
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.text('📝 MEETING NOTES', x + boxPadding, y + 8);
  
  currentY = y + headerHeight + boxPadding;
  
  // Discussion Points
  drawLabel(doc, 'Discussion Points:', x + boxPadding, currentY + 4);
  currentY += 8;
  
  const lineWidth = width - boxPadding * 2;
  for (let i = 0; i < discussionLines; i++) {
    drawNoteLine(doc, x + boxPadding, currentY + (i + 1) * lineHeight - 2, lineWidth);
  }
  currentY += discussionLines * lineHeight + 4;
  
  // Decisions Made
  drawLabel(doc, 'Decisions Made:', x + boxPadding, currentY + 4);
  currentY += 8;
  
  for (let i = 0; i < decisionLines; i++) {
    drawNoteLine(doc, x + boxPadding, currentY + (i + 1) * lineHeight - 2, lineWidth);
  }
  currentY += decisionLines * lineHeight + 4;
  
  // Action Items Table
  drawLabel(doc, 'Action Items:', x + boxPadding, currentY + 4);
  currentY += 10;
  
  // Table header
  const tableX = x + boxPadding;
  const actionColWidth = lineWidth * 0.55;
  const ownerColWidth = lineWidth * 0.25;
  const dueDateColWidth = lineWidth * 0.2;
  
  doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
  doc.rect(tableX, currentY, lineWidth, lineHeight, 'F');
  
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.text);
  doc.text('Action', tableX + 2, currentY + 5);
  doc.text('Owner', tableX + actionColWidth + 2, currentY + 5);
  doc.text('Due Date', tableX + actionColWidth + ownerColWidth + 2, currentY + 5);
  
  // Table borders
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.2);
  doc.rect(tableX, currentY, lineWidth, lineHeight, 'S');
  doc.line(tableX + actionColWidth, currentY, tableX + actionColWidth, currentY + lineHeight);
  doc.line(tableX + actionColWidth + ownerColWidth, currentY, tableX + actionColWidth + ownerColWidth, currentY + lineHeight);
  
  currentY += lineHeight;
  
  // Empty rows for action items
  for (let i = 0; i < actionItemRows; i++) {
    // Checkbox
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.rect(tableX + 2, currentY + 2, 4, 4, 'S');
    
    // Row borders
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.rect(tableX, currentY, lineWidth, lineHeight, 'S');
    doc.line(tableX + actionColWidth, currentY, tableX + actionColWidth, currentY + lineHeight);
    doc.line(tableX + actionColWidth + ownerColWidth, currentY, tableX + actionColWidth + ownerColWidth, currentY + lineHeight);
    
    currentY += lineHeight;
  }
  
  currentY += 4;
  
  // Follow-up row
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  
  // Follow-up checkboxes
  doc.text('Follow-up Required:', x + boxPadding, currentY + 4);
  doc.rect(x + boxPadding + 40, currentY, 4, 4, 'S');
  doc.text('Yes', x + boxPadding + 46, currentY + 4);
  doc.rect(x + boxPadding + 58, currentY, 4, 4, 'S');
  doc.text('No', x + boxPadding + 64, currentY + 4);
  
  // Next review date
  doc.text('Next Review:', x + boxPadding + 100, currentY + 4);
  drawNoteLine(doc, x + boxPadding + 128, currentY + 4, 40);
  
  return y + totalHeight + 8;
};

/**
 * Draw a compact meeting notes section (for use after project details)
 */
export const drawCompactMeetingNotes = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number
): number => {
  const boxPadding = 4;
  const lineHeight = 7;
  const totalHeight = 45;
  
  // Draw container
  drawCard(doc, x, y, width, totalHeight, {
    fillColor: [252, 252, 253],
    borderColor: PDF_BRAND_COLORS.primaryLight,
    borderWidth: 0.3,
  });
  
  let currentY = y + boxPadding;
  
  // Header
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Notes & Actions', x + boxPadding, currentY + 4);
  currentY += 8;
  
  // Two lines for notes
  const lineWidth = width - boxPadding * 2;
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.text('Notes:', x + boxPadding, currentY + 3);
  drawNoteLine(doc, x + boxPadding + 15, currentY + 3, lineWidth - 15);
  currentY += lineHeight;
  drawNoteLine(doc, x + boxPadding, currentY + 3, lineWidth);
  currentY += lineHeight;
  
  // Action row
  doc.text('Action:', x + boxPadding, currentY + 3);
  drawNoteLine(doc, x + boxPadding + 15, currentY + 3, 60);
  doc.text('Owner:', x + boxPadding + 80, currentY + 3);
  drawNoteLine(doc, x + boxPadding + 95, currentY + 3, 30);
  doc.text('Due:', x + boxPadding + 130, currentY + 3);
  drawNoteLine(doc, x + boxPadding + 142, currentY + 3, 25);
  
  return y + totalHeight + 5;
};
