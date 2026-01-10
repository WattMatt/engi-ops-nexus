/**
 * PDF Page Decorations - Headers, Footers, and Branding Elements
 * Implements consistent margins, alignment, and brand compliance
 * 
 * MIGRATION STATUS: Phase 4 - pdfmake compatibility layer added
 * - jsPDF: Full support (current implementation)
 * - pdfmake: Content builder helpers available
 */
import jsPDF from "jspdf";
import type { Content, ContentText, ContentColumns, ContentCanvas } from "pdfmake/interfaces";
import { 
  PDF_BRAND_COLORS, 
  PDF_COLORS_HEX,
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";

// Alias for cleaner code
const PDF_BRAND_COLORS_HEX = PDF_COLORS_HEX;

// ============================================================================
// PDFMAKE CONTENT BUILDERS
// ============================================================================

/**
 * Build pdfmake page header content
 */
export const buildPageHeaderContent = (
  sectionTitle: string,
  companyName?: string
): Content => {
  return {
    columns: [
      {
        text: companyName || 'Roadmap Review',
        style: 'headerCompany',
        color: '#FFFFFF',
        bold: true,
        fontSize: PDF_TYPOGRAPHY.sizes.h3,
      },
      {
        text: sectionTitle,
        style: 'headerSection',
        color: '#FFFFFF',
        alignment: 'right',
        fontSize: PDF_TYPOGRAPHY.sizes.small,
      },
    ],
    margin: [PDF_LAYOUT.margins.left, 5, PDF_LAYOUT.margins.right, 5],
  };
};

/**
 * Build pdfmake page footer content
 */
export const buildPageFooterContent = (
  currentPage: number,
  pageCount: number,
  generationDate: string,
  confidential: boolean = true
): Content => {
  return {
    columns: [
      {
        text: confidential ? 'CONFIDENTIAL - For Internal Use Only' : '',
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        color: PDF_BRAND_COLORS_HEX.gray,
        italics: true,
      },
      {
        text: `Generated: ${generationDate}`,
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        color: PDF_BRAND_COLORS_HEX.gray,
        alignment: 'center',
      },
      {
        text: `Page ${currentPage} of ${pageCount}`,
        fontSize: PDF_TYPOGRAPHY.sizes.tiny,
        color: PDF_BRAND_COLORS_HEX.gray,
        alignment: 'right',
      },
    ],
    margin: [PDF_LAYOUT.margins.left, 0, PDF_LAYOUT.margins.right, 5],
  };
};

/**
 * Build pdfmake card container
 */
export const buildCardContent = (
  content: Content,
  options?: {
    fillColor?: string;
    borderColor?: string;
    margin?: [number, number, number, number];
  }
): Content => {
  const {
    fillColor = '#FFFFFF',
    borderColor = PDF_BRAND_COLORS_HEX.tableBorder,
    margin = [0, 4, 0, 4],
  } = options || {};

  return {
    table: {
      widths: ['*'],
      body: [[content]],
    },
    layout: {
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      fillColor: () => fillColor,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin,
  };
};

/**
 * Build pdfmake badge content
 */
export const buildBadgeContent = (
  text: string,
  bgColor: string,
  textColor: string = '#FFFFFF'
): Content => {
  return {
    table: {
      body: [[{ text, color: textColor, fontSize: PDF_TYPOGRAPHY.sizes.tiny, bold: true }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => bgColor,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
  };
};

/**
 * Build pdfmake progress bar content
 */
export const buildProgressBarContent = (
  progress: number,
  width: number = 100
): Content => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  let progressColor = PDF_BRAND_COLORS_HEX.danger;
  if (clampedProgress >= 75) progressColor = PDF_BRAND_COLORS_HEX.success;
  else if (clampedProgress >= 50) progressColor = PDF_BRAND_COLORS_HEX.primaryLight;
  else if (clampedProgress >= 25) progressColor = PDF_BRAND_COLORS_HEX.warning;

  return {
    canvas: [
      // Background bar
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: width,
        h: 6,
        r: 3,
        color: PDF_BRAND_COLORS_HEX.lightGray,
      },
      // Progress fill
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: (clampedProgress / 100) * width,
        h: 6,
        r: 3,
        color: progressColor,
      },
    ],
  };
};

// ============================================================================
// JSPDF IMPLEMENTATIONS (Original)
// ============================================================================

/**
 * Add branded header to a page with proper logo sizing and alignment
 */
export const addPageHeader = (
  doc: jsPDF,
  sectionTitle: string,
  companyLogo?: string | null,
  companyName?: string
): void => {
  const { margins, pageWidth, header } = PDF_LAYOUT;
  
  // Header background band with gradient effect
  doc.setFillColor(...PDF_BRAND_COLORS.primary);
  doc.rect(0, 0, pageWidth, header.height + 2, 'F');
  
  // Subtle accent stripe at bottom of header
  doc.setFillColor(...PDF_BRAND_COLORS.primaryLight);
  doc.rect(0, header.height, pageWidth, 2, 'F');
  
  // Logo or company name - maintain clear space
  if (companyLogo) {
    try {
      // Create temp image to get actual dimensions for aspect ratio calculation
      const img = new Image();
      img.src = companyLogo;
      
      // Calculate proportional dimensions maintaining aspect ratio
      const maxWidth = header.logoMaxWidth;
      const maxHeight = header.logoHeight;
      
      // Get natural aspect ratio (default to 2:1 if unknown)
      const aspectRatio = img.naturalWidth && img.naturalHeight 
        ? img.naturalWidth / img.naturalHeight 
        : 2;
      
      let logoWidth = maxWidth;
      let logoHeight = logoWidth / aspectRatio;
      
      // Scale down if height exceeds max
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = logoHeight * aspectRatio;
      }
      
      // Center vertically in header
      const logoY = (header.height - logoHeight) / 2;
      const logoX = margins.left + header.clearSpace;
      
      doc.addImage(companyLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // Fallback to text if logo fails
      doc.setTextColor(...PDF_BRAND_COLORS.white);
      doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
      doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
      doc.text(companyName || 'Roadmap Review', margins.left + header.clearSpace, header.height / 2 + 3);
    }
  } else {
    // Company name text
    doc.setTextColor(...PDF_BRAND_COLORS.white);
    doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.h3);
    doc.text(companyName || 'Roadmap Review', margins.left + header.clearSpace, header.height / 2 + 3);
  }
  
  // Section title on the right - aligned with margin
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setTextColor(...PDF_BRAND_COLORS.white);
  doc.text(sectionTitle, pageWidth - margins.right - 2, header.height / 2 + 3, { align: 'right' });
};

/**
 * Add page footer with consistent placement and proper spacing
 */
export const addPageFooter = (
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  generationDate: string,
  confidential: boolean = true
): void => {
  const { margins, pageWidth, pageHeight, footer } = PDF_LAYOUT;
  const footerY = pageHeight - footer.height - margins.bottom / 2;
  
  // Footer separator line
  doc.setDrawColor(...PDF_BRAND_COLORS.tableBorder);
  doc.setLineWidth(0.4);
  doc.line(margins.left, footerY, pageWidth - margins.right, footerY);
  
  const textY = footerY + footer.padding;
  
  // Left: Confidential notice (italic, gray)
  if (confidential) {
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
    doc.setTextColor(...PDF_BRAND_COLORS.gray);
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'italic');
    doc.text('CONFIDENTIAL - For Internal Use Only', margins.left, textY);
  }
  
  // Center: Generation date
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.tiny);
  doc.setTextColor(...PDF_BRAND_COLORS.gray);
  doc.text(`Generated: ${generationDate}`, pageWidth / 2, textY, { align: 'center' });
  
  // Right: Page number with proper formatting
  doc.setFont(PDF_TYPOGRAPHY.fonts.body, 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margins.right, textY, { align: 'right' });
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
 * Draw a card container with shadow effect - ensures no edge cropping
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
  
  // Ensure card doesn't extend beyond page margins
  const { startX, width: contentWidth } = getContentDimensions();
  const safeWidth = Math.min(width, contentWidth - (x - startX));
  
  // Shadow effect - offset to create depth without cropping
  if (shadow) {
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(x + 0.8, y + 0.8, safeWidth, height, radius, radius, 'F');
  }
  
  // Main card background
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, safeWidth, height, radius, radius, 'F');
  
  // Border
  if (borderWidth > 0) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(borderWidth);
    doc.roundedRect(x, y, safeWidth, height, radius, radius, 'S');
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
 * Includes buffer for safe zone and prevents orphaned headings
 */
export const checkPageBreak = (
  doc: jsPDF,
  currentY: number,
  requiredSpace: number,
  sectionTitle?: string,
  companyLogo?: string | null,
  companyName?: string
): number => {
  const { endY, startY } = getContentDimensions();
  
  // Add safety buffer to prevent edge cropping
  const safetyBuffer = PDF_LAYOUT.spacing.section;
  
  if (currentY + requiredSpace + safetyBuffer > endY) {
    doc.addPage();
    if (sectionTitle) {
      addPageHeader(doc, sectionTitle, companyLogo, companyName);
    }
    return startY;
  }
  
  return currentY;
};

/**
 * Ensure minimum space remains on page, otherwise start new page
 * Useful for preventing widows and orphans
 */
export const ensureMinimumSpace = (
  doc: jsPDF,
  currentY: number,
  minimumSpace: number,
  sectionTitle?: string,
  companyLogo?: string | null,
  companyName?: string
): number => {
  const { endY, startY } = getContentDimensions();
  
  if (endY - currentY < minimumSpace) {
    doc.addPage();
    if (sectionTitle) {
      addPageHeader(doc, sectionTitle, companyLogo, companyName);
    }
    return startY;
  }
  
  return currentY;
};
