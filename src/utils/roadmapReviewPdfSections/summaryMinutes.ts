/**
 * Summary Minutes Page - Final page with consolidated meeting summary
 */
import jsPDF from "jspdf";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";
import { addPageHeader, drawCard } from "./pageDecorations";

interface SummaryMinutesOptions {
  companyLogo?: string | null;
  companyName?: string;
  generationDate: string;
  projectCount: number;
}

/**
 * Draw a labeled input field
 */
const drawInputField = (
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  labelWidth: number,
  fieldWidth: number
): void => {
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  doc.text(label, x, y);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.gray);
  doc.setLineWidth(0.2);
  doc.line(x + labelWidth, y, x + labelWidth + fieldWidth, y);
};

/**
 * Generate the Summary Minutes page
 */
export const generateSummaryMinutesPage = (
  doc: jsPDF,
  options: SummaryMinutesOptions
): void => {
  const { companyLogo, companyName, generationDate, projectCount } = options;
  const { margins, pageWidth } = PDF_LAYOUT;
  const { width: contentWidth, startX, startY } = getContentDimensions();
  
  // Add new page
  doc.addPage();
  addPageHeader(doc, 'Meeting Summary', companyLogo, companyName);
  
  let currentY = startY + 5;
  
  // Page title
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('ROADMAP REVIEW - MEETING MINUTES', pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;
  
  // Meeting details card
  drawCard(doc, startX, currentY, contentWidth, 45, {
    fillColor: PDF_BRAND_COLORS.lightGray,
  });
  
  const detailsY = currentY + 8;
  const col1X = startX + 8;
  const col2X = startX + contentWidth / 2;
  
  drawInputField(doc, 'Date:', col1X, detailsY, 15, 50);
  drawInputField(doc, 'Location:', col2X, detailsY, 25, 50);
  
  drawInputField(doc, 'Attendees:', col1X, detailsY + 12, 25, contentWidth - 40);
  drawInputField(doc, '', col1X, detailsY + 22, 0, contentWidth - 20);
  drawInputField(doc, 'Facilitator:', col1X, detailsY + 32, 25, 50);
  drawInputField(doc, 'Scribe:', col2X, detailsY + 32, 18, 50);
  
  currentY += 55;
  
  // Portfolio Overview Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Portfolio Overview', startX, currentY);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, currentY + 2, startX + 50, currentY + 2);
  currentY += 10;
  
  // Overview notes box
  drawCard(doc, startX, currentY, contentWidth, 35);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'italic');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.text(`${projectCount} projects reviewed. Key observations:`, startX + 5, currentY + 8);
  
  // Note lines
  for (let i = 0; i < 3; i++) {
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.setLineWidth(0.2);
    doc.line(startX + 5, currentY + 15 + i * 7, startX + contentWidth - 5, currentY + 15 + i * 7);
  }
  currentY += 45;
  
  // Key Decisions Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Key Decisions', startX, currentY);
  doc.line(startX, currentY + 2, startX + 40, currentY + 2);
  currentY += 10;
  
  // Decisions table
  const decisionRows = 4;
  const tableStartY = currentY;
  
  // Table header
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(startX, currentY, contentWidth, 8, 'F');
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.text('#', startX + 3, currentY + 5);
  doc.text('Decision', startX + 12, currentY + 5);
  doc.text('Owner', startX + contentWidth - 40, currentY + 5);
  currentY += 8;
  
  // Table rows
  for (let i = 0; i < decisionRows; i++) {
    const rowY = currentY + i * 8;
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
      doc.rect(startX, rowY, contentWidth, 8, 'F');
    }
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.setLineWidth(0.1);
    doc.rect(startX, rowY, contentWidth, 8, 'S');
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(`${i + 1}.`, startX + 3, rowY + 5);
  }
  currentY += decisionRows * 8 + 10;
  
  // Priority Actions Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Priority Action Items', startX, currentY);
  doc.line(startX, currentY + 2, startX + 55, currentY + 2);
  currentY += 10;
  
  // Actions table header
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(startX, currentY, contentWidth, 8, 'F');
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  
  const actionCols = { check: 8, project: 45, action: 60, owner: 30, due: 25, status: 20 };
  let colX = startX + 2;
  doc.text('✓', colX, currentY + 5);
  colX += actionCols.check;
  doc.text('Project', colX, currentY + 5);
  colX += actionCols.project;
  doc.text('Action', colX, currentY + 5);
  colX += actionCols.action;
  doc.text('Owner', colX, currentY + 5);
  colX += actionCols.owner;
  doc.text('Due', colX, currentY + 5);
  colX += actionCols.due;
  doc.text('Status', colX, currentY + 5);
  currentY += 8;
  
  // Action rows
  const actionRows = 6;
  for (let i = 0; i < actionRows; i++) {
    const rowY = currentY + i * 8;
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
      doc.rect(startX, rowY, contentWidth, 8, 'F');
    }
    
    // Checkbox
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.rect(startX + 3, rowY + 2, 4, 4, 'S');
    
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.rect(startX, rowY, contentWidth, 8, 'S');
  }
  currentY += actionRows * 8 + 10;
  
  // Next Steps Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Next Steps & Follow-ups', startX, currentY);
  doc.line(startX, currentY + 2, startX + 60, currentY + 2);
  currentY += 10;
  
  // Next review date
  drawCard(doc, startX, currentY, contentWidth, 20);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  drawInputField(doc, 'Next Review Date:', startX + 5, currentY + 8, 42, 40);
  drawInputField(doc, 'Escalations Required:', startX + contentWidth / 2, currentY + 8, 48, 40);
  drawInputField(doc, 'Notes:', startX + 5, currentY + 16, 15, contentWidth - 25);
  currentY += 30;
  
  // Signature Block
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Sign-off', startX, currentY);
  doc.line(startX, currentY + 2, startX + 25, currentY + 2);
  currentY += 10;
  
  // Signature rows
  const sigWidth = (contentWidth - 20) / 3;
  const sigY = currentY;
  
  const signatureFields = ['Prepared by', 'Reviewed by', 'Approved by'];
  signatureFields.forEach((label, i) => {
    const sigX = startX + i * (sigWidth + 10);
    drawCard(doc, sigX, sigY, sigWidth, 30);
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(label, sigX + 5, sigY + 8);
    
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.setLineWidth(0.2);
    doc.line(sigX + 5, sigY + 18, sigX + sigWidth - 5, sigY + 18);
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.text('Name:', sigX + 5, sigY + 22);
    doc.text('Date:', sigX + sigWidth / 2, sigY + 22);
    doc.line(sigX + 15, sigY + 22, sigX + sigWidth / 2 - 5, sigY + 22);
    doc.line(sigX + sigWidth / 2 + 12, sigY + 22, sigX + sigWidth - 5, sigY + 22);
  });
};
