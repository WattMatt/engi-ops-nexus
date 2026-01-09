/**
 * PDF Page Decorations - Headers, Footers, and Branding Elements
 */
import jsPDF from "jspdf";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";

/**
 * Add branded header to a page
 */
export const addPageHeader = (
  doc: jsPDF,
  sectionTitle: string,
  companyLogo?: string | null,
  companyName?: string
): void => {
  const { margins, pageWidth, header } = PDF_LAYOUT;
  
  // Header background band
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, header.height + 5, 'F');
  
  // Gradient effect (lighter strip)
  doc.setFillColor(...PDF_BRAND_COLORS.primaryLight);
  doc.rect(0, header.height + 2, pageWidth, 3, 'F');
  
  // Company name or logo placeholder
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.body);
  
  let textX = margins.left;
  
  // If logo provided, add it
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', margins.left, 4, header.logoMaxWidth, header.logoHeight);
      textX = margins.left + header.logoMaxWidth + 5;
    } catch {
      // Fallback to text if logo fails
      doc.text(companyName || 'Roadmap Review', margins.left, 12);
    }
  } else {
    doc.text(companyName || 'Roadmap Review', margins.left, 12);
  }
  
  // Section title on the right
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.text(sectionTitle, pageWidth - margins.right, 12, { align: 'right' });
};

/**
 * Add page footer with page numbers and date
 */
export const addPageFooter = (
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  generationDate: string,
  confidential: boolean = true
): void => {
  const { margins, pageWidth, pageHeight, footer } = PDF_LAYOUT;
  const footerY = pageHeight - footer.height;
  
  // Footer separator line
  doc.setDrawColor(...PDF_BRAND_COLORS.gray);
  doc.setLineWidth(0.3);
  doc.line(margins.left, footerY, pageWidth - margins.right, footerY);
  
  // Left: Confidential notice
  if (confidential) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.gray);
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'italic');
    doc.text('CONFIDENTIAL - For Internal Use Only', margins.left, footerY + 6);
  }
  
  // Center: Generation date
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.text(`Generated: ${generationDate}`, pageWidth / 2, footerY + 6, { align: 'center' });
  
  // Right: Page number
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margins.right, footerY + 6, { align: 'right' });
};

/**
 * Add all page footers after document is complete
 */
export const addAllPageFooters = (
  doc: jsPDF,
  generationDate: string,
  startPage: number = 1,
  confidential: boolean = true
): void => {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = startPage; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages, generationDate, confidential);
  }
};

/**
 * Add section divider with title
 */
export const addSectionDivider = (
  doc: jsPDF,
  title: string,
  y: number
): number => {
  const { margins, pageWidth } = PDF_LAYOUT;
  const contentWidth = pageWidth - margins.left - margins.right;
  
  // Decorative line before title
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margins.left, y, margins.left + 20, y);
  
  // Section title
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h2);
  
  const titleWidth = doc.getTextWidth(title) + 16;
  doc.roundedRect(margins.left + 22, y - 5, titleWidth, 10, 2, 2, 'F');
  doc.text(title, margins.left + 30, y + 2);
  
  // Line after title
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.line(margins.left + 24 + titleWidth, y, pageWidth - margins.right, y);
  
  return y + 15;
};

/**
 * Draw a card container with shadow effect
 */
export const drawCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    fillColor?: [number, number, number];
    borderColor?: [number, number, number];
    borderWidth?: number;
    radius?: number;
    shadow?: boolean;
  }
): void => {
  const {
    fillColor = PDF_BRAND_COLORS.white,
    borderColor = PDF_BRAND_COLORS.tableBorder,
    borderWidth = 0.3,
    radius = 3,
    shadow = true,
  } = options || {};
  
  // Shadow effect
  if (shadow) {
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x + 1, y + 1, width, height, radius, radius, 'F');
  }
  
  // Main card
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, width, height, radius, radius, 'F');
  
  // Border
  if (borderWidth > 0) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(borderWidth);
    doc.roundedRect(x, y, width, height, radius, radius, 'S');
  }
};

/**
 * Draw a colored left border indicator on a card
 */
export const drawCardIndicator = (
  doc: jsPDF,
  x: number,
  y: number,
  height: number,
  color: [number, number, number],
  width: number = 4
): void => {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
};

/**
 * Draw a badge/pill
 */
export const drawBadge = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bgColor: [number, number, number],
  textColor: [number, number, number] = PDF_BRAND_COLORS.white
): number => {
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  const textWidth = doc.getTextWidth(text);
  const badgeWidth = textWidth + 6;
  const badgeHeight = 6;
  
  doc.setFillColor(...bgColor);
  doc.roundedRect(x, y - 4, badgeWidth, badgeHeight, 2, 2, 'F');
  
  doc.setTextColor(...textColor);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'bold');
  doc.text(text, x + 3, y);
  
  return badgeWidth + 3;
};

/**
 * Draw progress bar
 */
export const drawProgressBar = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  progress: number,
  height: number = 6
): void => {
  // Background
  doc.setFillColor(...PDF_BRAND_COLORS.lightGray);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Progress fill
  const fillWidth = Math.max(0, Math.min(progress, 100)) / 100 * width;
  if (fillWidth > 0) {
    let color: [number, number, number];
    if (progress >= 75) color = PDF_BRAND_COLORS.success;
    else if (progress >= 50) color = PDF_BRAND_COLORS.primaryLight;
    else if (progress >= 25) color = PDF_BRAND_COLORS.warning;
    else color = PDF_BRAND_COLORS.danger;
    
    doc.setFillColor(...color);
    doc.roundedRect(x, y, fillWidth, height, 2, 2, 'F');
  }
  
  // Border
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 2, 2, 'S');
};

/**
 * Check if content fits on current page, add new page if needed
 */
export const checkPageBreak = (
  doc: jsPDF,
  currentY: number,
  requiredSpace: number,
  sectionTitle?: string,
  companyLogo?: string | null,
  companyName?: string
): number => {
  const { endY } = getContentDimensions();
  
  if (currentY + requiredSpace > endY) {
    doc.addPage();
    if (sectionTitle) {
      addPageHeader(doc, sectionTitle, companyLogo, companyName);
    }
    return PDF_LAYOUT.margins.top + PDF_LAYOUT.header.height + 5;
  }
  
  return currentY;
};
