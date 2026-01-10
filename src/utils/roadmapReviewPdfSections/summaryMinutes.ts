/**
 * Summary Minutes Page - Final page with consolidated meeting summary
 * Implements proper page break handling to prevent content cramming
 * 
 * MIGRATION STATUS: Phase 4 - pdfmake compatibility layer added
 * - jsPDF: Full support (current implementation)
 * - pdfmake: Content builders for summary minutes
 */
import jsPDF from "jspdf";
import type { Content, ContentTable, TableCell } from "pdfmake/interfaces";
import { 
  PDF_BRAND_COLORS, 
  PDF_COLORS_HEX,
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";
import { addPageHeader, drawCard, checkPageBreak, buildCardContent } from "./pageDecorations";

// Alias for cleaner code
const PDF_BRAND_COLORS_HEX = PDF_COLORS_HEX;

// ============================================================================
// PDFMAKE CONTENT BUILDERS  
// ============================================================================

interface SummaryMinutesOptions {
  companyLogo?: string | null;
  companyName?: string;
  generationDate: string;
  projectCount: number;
}

/**
 * Build pdfmake summary minutes page content
 */
export const buildSummaryMinutesContent = (options: SummaryMinutesOptions): Content => {
  const { projectCount } = options;
  
  // Build decisions table
  const decisionsTableBody: TableCell[][] = [
    [
      { text: '#', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Decision', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Owner', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
    ],
    ...Array(3).fill(null).map((_, i) => [
      { text: `${i + 1}.`, fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
    ]),
  ];

  // Build action items table  
  const actionsTableBody: TableCell[][] = [
    [
      { text: '✓', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Project', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Action', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Owner', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Due', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
      { text: 'Status', bold: true, color: '#FFFFFF', fillColor: PDF_BRAND_COLORS_HEX.primary, fontSize: PDF_TYPOGRAPHY.sizes.tiny },
    ],
    ...Array(5).fill(null).map((_, i) => [
      { text: '☐', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
      { text: '', fontSize: PDF_TYPOGRAPHY.sizes.tiny, fillColor: i % 2 === 0 ? PDF_BRAND_COLORS_HEX.lightGray : '#FFFFFF' },
    ]),
  ];

  // Build signature section
  const signatureFields = ['Prepared by', 'Reviewed by', 'Approved by'];

  return {
    stack: [
      // Page title
      {
        text: 'ROADMAP REVIEW - MEETING MINUTES',
        fontSize: PDF_TYPOGRAPHY.sizes.h1,
        bold: true,
        alignment: 'center',
        color: PDF_BRAND_COLORS_HEX.primary,
        margin: [0, 0, 0, 14],
      },
      
      // Meeting details card
      buildCardContent({
        columns: [
          { text: 'Date: ______________', fontSize: PDF_TYPOGRAPHY.sizes.small },
          { text: 'Location: ______________', fontSize: PDF_TYPOGRAPHY.sizes.small },
        ],
      }, { fillColor: PDF_BRAND_COLORS_HEX.lightGray }),
      
      // Portfolio Overview
      { text: 'Portfolio Overview', fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 4] },
      buildCardContent({
        stack: [
          { text: `${projectCount} projects reviewed. Key observations:`, fontSize: PDF_TYPOGRAPHY.sizes.tiny, italics: true, color: PDF_BRAND_COLORS_HEX.gray },
          { text: '_______________________________________________', fontSize: PDF_TYPOGRAPHY.sizes.small, margin: [0, 6, 0, 0] },
          { text: '_______________________________________________', fontSize: PDF_TYPOGRAPHY.sizes.small, margin: [0, 6, 0, 0] },
        ],
      }),
      
      // Key Decisions
      { text: 'Key Decisions', fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 4] },
      {
        table: { headerRows: 1, widths: ['5%', '70%', '25%'], body: decisionsTableBody },
        layout: { hLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder, vLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder, hLineWidth: () => 0.2, vLineWidth: () => 0.2 },
      },
      
      // Priority Action Items
      { text: 'Priority Action Items', fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 4] },
      {
        table: { headerRows: 1, widths: ['5%', '22%', '35%', '15%', '12%', '11%'], body: actionsTableBody },
        layout: { hLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder, vLineColor: () => PDF_BRAND_COLORS_HEX.tableBorder, hLineWidth: () => 0.2, vLineWidth: () => 0.2 },
      },
      
      // Next Steps
      { text: 'Next Steps & Follow-ups', fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 4] },
      buildCardContent({
        columns: [
          { text: 'Next Review Date: __________', fontSize: PDF_TYPOGRAPHY.sizes.small },
          { text: 'Escalations Required: __________', fontSize: PDF_TYPOGRAPHY.sizes.small },
        ],
      }),
      
      // Sign-off
      { text: 'Sign-off', fontSize: PDF_TYPOGRAPHY.sizes.h2, bold: true, color: PDF_BRAND_COLORS_HEX.primary, margin: [0, 12, 0, 4] },
      {
        columns: signatureFields.map(label => 
          buildCardContent({
            stack: [
              { text: label, bold: true, fontSize: PDF_TYPOGRAPHY.sizes.tiny, color: PDF_BRAND_COLORS_HEX.darkGray },
              { text: '_______________', fontSize: PDF_TYPOGRAPHY.sizes.small, margin: [0, 10, 0, 4] },
              { 
                columns: [
                  { text: 'Name: ______', fontSize: 5 },
                  { text: 'Date: ______', fontSize: 5 },
                ],
              },
            ],
          })
        ),
        columnGap: 8,
      },
    ],
  };
};

// ============================================================================
// JSPDF IMPLEMENTATIONS (Original - kept for backward compatibility)
// ============================================================================

// Re-export interface for backward compatibility
export type { SummaryMinutesOptions };

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
 * Generate the Summary Minutes page with proper page break handling
 */
export const generateSummaryMinutesPage = (
  doc: jsPDF,
  options: SummaryMinutesOptions
): void => {
  const { companyLogo, companyName, projectCount } = options;
  const { pageWidth, pageHeight } = PDF_LAYOUT;
  const { width: contentWidth, startX, startY, endY } = getContentDimensions();
  
  // Add new page
  doc.addPage();
  addPageHeader(doc, 'Meeting Summary', companyLogo, companyName);
  
  let currentY = startY + 5;
  
  // Page title
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('ROADMAP REVIEW - MEETING MINUTES', pageWidth / 2, currentY, { align: 'center' });
  currentY += 14;
  
  // Meeting details card
  const detailsCardHeight = 42;
  drawCard(doc, startX, currentY, contentWidth, detailsCardHeight, {
    fillColor: PDF_BRAND_COLORS.lightGray,
  });
  
  const detailsY = currentY + 8;
  const col1X = startX + 8;
  const col2X = startX + contentWidth / 2;
  
  drawInputField(doc, 'Date:', col1X, detailsY, 15, 50);
  drawInputField(doc, 'Location:', col2X, detailsY, 25, 50);
  
  drawInputField(doc, 'Attendees:', col1X, detailsY + 12, 25, contentWidth - 40);
  drawInputField(doc, '', col1X, detailsY + 20, 0, contentWidth - 20);
  drawInputField(doc, 'Facilitator:', col1X, detailsY + 28, 25, 50);
  drawInputField(doc, 'Scribe:', col2X, detailsY + 28, 18, 50);
  
  currentY += detailsCardHeight + 8;
  
  // Portfolio Overview Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Portfolio Overview', startX, currentY);
  
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX, currentY + 2, startX + 50, currentY + 2);
  currentY += 8;
  
  // Overview notes box
  const overviewHeight = 28;
  drawCard(doc, startX, currentY, contentWidth, overviewHeight);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'italic');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.text(`${projectCount} projects reviewed. Key observations:`, startX + 5, currentY + 7);
  
  // Note lines
  for (let i = 0; i < 2; i++) {
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.setLineWidth(0.2);
    doc.line(startX + 5, currentY + 13 + i * 6, startX + contentWidth - 5, currentY + 13 + i * 6);
  }
  currentY += overviewHeight + 8;
  
  // Key Decisions Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Key Decisions', startX, currentY);
  doc.line(startX, currentY + 2, startX + 40, currentY + 2);
  currentY += 8;
  
  // Decisions table
  const decisionRows = 3;
  const rowHeight = 7;
  
  // Table header
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(startX, currentY, contentWidth, rowHeight, 'F');
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.text('#', startX + 3, currentY + 5);
  doc.text('Decision', startX + 12, currentY + 5);
  doc.text('Owner', startX + contentWidth - 35, currentY + 5);
  currentY += rowHeight;
  
  // Table rows
  for (let i = 0; i < decisionRows; i++) {
    const rowY = currentY + i * rowHeight;
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
      doc.rect(startX, rowY, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.setLineWidth(0.1);
    doc.rect(startX, rowY, contentWidth, rowHeight, 'S');
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(`${i + 1}.`, startX + 3, rowY + 5);
  }
  currentY += decisionRows * rowHeight + 8;
  
  // Check if Priority Actions section needs new page
  const actionsHeight = 60; // Estimated height for actions section
  currentY = checkPageBreak(doc, currentY, actionsHeight, 'Meeting Summary', companyLogo, companyName);
  
  // Priority Actions Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Priority Action Items', startX, currentY);
  doc.line(startX, currentY + 2, startX + 55, currentY + 2);
  currentY += 8;
  
  // Actions table header
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(startX, currentY, contentWidth, rowHeight, 'F');
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  
  // Column widths proportional to content width
  const colWidths = {
    check: contentWidth * 0.05,
    project: contentWidth * 0.22,
    action: contentWidth * 0.35,
    owner: contentWidth * 0.15,
    due: contentWidth * 0.12,
    status: contentWidth * 0.11
  };
  
  let colX = startX + 2;
  doc.text('✓', colX, currentY + 5);
  colX += colWidths.check;
  doc.text('Project', colX, currentY + 5);
  colX += colWidths.project;
  doc.text('Action', colX, currentY + 5);
  colX += colWidths.action;
  doc.text('Owner', colX, currentY + 5);
  colX += colWidths.owner;
  doc.text('Due', colX, currentY + 5);
  colX += colWidths.due;
  doc.text('Status', colX, currentY + 5);
  currentY += rowHeight;
  
  // Action rows - calculate how many fit
  const spaceForActions = endY - currentY - 80; // Reserve space for remaining sections
  const maxActionRows = Math.max(3, Math.floor(spaceForActions / rowHeight));
  const actionRows = Math.min(5, maxActionRows);
  
  for (let i = 0; i < actionRows; i++) {
    const rowY = currentY + i * rowHeight;
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
      doc.rect(startX, rowY, contentWidth, rowHeight, 'F');
    }
    
    // Checkbox
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.rect(startX + 2, rowY + 2, 3.5, 3.5, 'S');
    
    doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
    doc.rect(startX, rowY, contentWidth, rowHeight, 'S');
  }
  currentY += actionRows * rowHeight + 8;
  
  // Check if Next Steps section needs new page
  const nextStepsHeight = 35;
  currentY = checkPageBreak(doc, currentY, nextStepsHeight, 'Meeting Summary', companyLogo, companyName);
  
  // Next Steps Section
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Next Steps & Follow-ups', startX, currentY);
  doc.line(startX, currentY + 2, startX + 60, currentY + 2);
  currentY += 8;
  
  // Next review date
  const nextStepsCardHeight = 18;
  drawCard(doc, startX, currentY, contentWidth, nextStepsCardHeight);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
  drawInputField(doc, 'Next Review Date:', startX + 5, currentY + 7, 40, 35);
  drawInputField(doc, 'Escalations Required:', startX + contentWidth / 2, currentY + 7, 45, 35);
  drawInputField(doc, 'Notes:', startX + 5, currentY + 14, 15, contentWidth - 25);
  currentY += nextStepsCardHeight + 8;
  
  // Check if Signature section needs new page
  const signatureHeight = 40;
  currentY = checkPageBreak(doc, currentY, signatureHeight, 'Meeting Summary', companyLogo, companyName);
  
  // Signature Block
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('Sign-off', startX, currentY);
  doc.line(startX, currentY + 2, startX + 25, currentY + 2);
  currentY += 8;
  
  // Signature rows - compact version
  const sigGap = 8;
  const sigWidth = (contentWidth - sigGap * 2) / 3;
  const sigHeight = 25;
  const sigY = currentY;
  
  const signatureFields = ['Prepared by', 'Reviewed by', 'Approved by'];
  signatureFields.forEach((label, i) => {
    const sigX = startX + i * (sigWidth + sigGap);
    drawCard(doc, sigX, sigY, sigWidth, sigHeight);
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.darkGray);
    doc.text(label, sigX + 4, sigY + 6);
    
    // Signature line
    doc.setDrawColor(...PDF_BRAND_COLORS.gray);
    doc.setLineWidth(0.2);
    doc.line(sigX + 4, sigY + 15, sigX + sigWidth - 4, sigY + 15);
    
    // Name and Date row - compact
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
    doc.setFontSize(5);
    doc.text('Name:', sigX + 4, sigY + 20);
    doc.text('Date:', sigX + sigWidth / 2, sigY + 20);
    doc.line(sigX + 14, sigY + 20, sigX + sigWidth / 2 - 3, sigY + 20);
    doc.line(sigX + sigWidth / 2 + 10, sigY + 20, sigX + sigWidth - 4, sigY + 20);
  });
};
