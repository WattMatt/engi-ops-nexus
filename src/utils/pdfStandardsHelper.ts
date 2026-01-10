/**
 * PDF Standards Helper
 * 
 * MIGRATED TO PDFMAKE: This file now provides pdfmake-compatible utilities.
 * Legacy jsPDF functions are kept for backward compatibility.
 * 
 * @see src/utils/pdfmake/documentBuilder.ts for the new API
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { 
  createDocument, 
  PDF_COLORS, 
  FONT_SIZES,
  spacer,
  horizontalLine,
  fetchCompanyDetails,
  type DocumentBuilderOptions
} from './pdfmake';
import { format } from 'date-fns';

// Standard page dimensions (A4) in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Standard margins per PDF_DESIGN_STANDARDS.md (in mm)
export const STANDARD_MARGINS = {
  top: 25,
  bottom: 22,
  left: 18,
  right: 18,
  headerHeight: 18,
  footerHeight: 15,
};

// Calculate content area in mm
export const getContentArea = () => ({
  startY: STANDARD_MARGINS.top + STANDARD_MARGINS.headerHeight,
  endY: PAGE_HEIGHT - STANDARD_MARGINS.bottom - STANDARD_MARGINS.footerHeight,
  startX: STANDARD_MARGINS.left,
  endX: PAGE_WIDTH - STANDARD_MARGINS.right,
  width: PAGE_WIDTH - STANDARD_MARGINS.left - STANDARD_MARGINS.right,
});

// Card styling per standards
export const CARD_STYLE = {
  borderRadius: 2,
  padding: 4,
  spacing: 5,
  safeZone: 5,
};

// ============ NEW PDFMAKE API ============

/**
 * Create a document with standard headers and footers
 */
export const createStandardDocument = (
  documentTitle: string,
  projectName?: string,
  options?: Partial<DocumentBuilderOptions>
) => {
  return createDocument(options)
    .withStandardHeader(documentTitle, projectName)
    .withStandardFooter();
};

/**
 * Create a header content block for pdfmake
 */
export const createHeaderContent = (
  documentTitle: string,
  projectName?: string,
  logoBase64?: string
): Content => {
  const columns: Content[] = [];
  
  // Logo on left
  if (logoBase64) {
    columns.push({
      image: logoBase64,
      width: 35,
      margin: [0, 0, 10, 0] as Margins,
    });
  }
  
  // Title and project on right
  columns.push({
    stack: [
      { text: documentTitle, fontSize: FONT_SIZES.body, bold: true, color: PDF_COLORS.text },
      ...(projectName ? [{ text: projectName, fontSize: FONT_SIZES.caption, color: PDF_COLORS.textLight }] : []),
    ],
    alignment: 'right' as const,
  });
  
  return {
    columns,
    margin: [STANDARD_MARGINS.left, STANDARD_MARGINS.top - STANDARD_MARGINS.headerHeight, STANDARD_MARGINS.right, 5] as Margins,
  };
};

/**
 * Create a footer content block for pdfmake
 */
export const createFooterContent = (
  pageNum: number,
  totalPages: number,
  includeConfidentiality: boolean = true
): Content => {
  return {
    columns: [
      includeConfidentiality 
        ? { text: 'CONFIDENTIAL', fontSize: FONT_SIZES.caption, italics: true, color: PDF_COLORS.textLight }
        : { text: '' },
      { text: `Page ${pageNum} of ${totalPages}`, fontSize: FONT_SIZES.caption, alignment: 'center', color: PDF_COLORS.textMuted },
      { 
        text: format(new Date(), 'd MMM yyyy'), 
        fontSize: FONT_SIZES.caption, 
        alignment: 'right', 
        color: PDF_COLORS.textLight 
      },
    ],
    margin: [STANDARD_MARGINS.left, 0, STANDARD_MARGINS.right, STANDARD_MARGINS.bottom] as Margins,
  };
};

/**
 * Create a styled card content block for pdfmake
 */
export const createStyledCard = (
  content: Content,
  options: {
    fillColor?: string;
    borderColor?: string;
    indicatorColor?: string;
    width?: number | string;
  } = {}
): Content => {
  const { 
    fillColor = PDF_COLORS.background, 
    borderColor = PDF_COLORS.border,
    indicatorColor,
    width = '*'
  } = options;
  
  // Create a table-based card layout
  const cardBody: Content[][] = indicatorColor
    ? [[
        { text: '', fillColor: indicatorColor, width: 3 },
        { stack: Array.isArray(content) ? content : [content], margin: [CARD_STYLE.padding, CARD_STYLE.padding, CARD_STYLE.padding, CARD_STYLE.padding] as Margins }
      ]]
    : [[{ stack: Array.isArray(content) ? content : [content], margin: [CARD_STYLE.padding, CARD_STYLE.padding, CARD_STYLE.padding, CARD_STYLE.padding] as Margins }]];
  
  return {
    table: {
      widths: indicatorColor ? [3, '*'] : ['*'],
      body: cardBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => borderColor,
      vLineColor: () => borderColor,
      fillColor: () => fillColor,
    },
  };
};

/**
 * Get phase color for roadmap styling
 */
export const getPhaseColor = (phase: string): string => {
  const phaseColors: Record<string, string> = {
    "Planning & Preparation": '#334155',    // Slate-700
    "Budget & Assessment": '#475569',       // Slate-600
    "Tender & Procurement": '#64748b',      // Slate-500
    "Design Phase": '#52525b',              // Zinc-600
    "Construction": '#374151',              // Gray-700
    "Documentation": '#4b5563',             // Gray-600
    "Commissioning": '#3f3f46',             // Zinc-700
    "Handover": '#1e293b',                  // Slate-800
  };

  return phaseColors[phase] || '#334155';   // Default: Slate-700
};

// ============ LEGACY JSPDF COMPATIBILITY ============
// These functions are kept for backward compatibility

import jsPDF from "jspdf";
import { PDF_BRAND_COLORS, PDF_TYPOGRAPHY, PDF_LAYOUT } from "./roadmapReviewPdfStyles";
import { fetchCompanyDetails as fetchCompanyDetailsLegacy } from "./pdfCoverPage";

/**
 * @deprecated Use createStandardDocument().withStandardHeader() instead
 * Add standard header to a page (not cover page)
 */
export const addStandardHeader = async (
  doc: jsPDF,
  documentTitle: string,
  projectName?: string
) => {
  console.warn('addStandardHeader is deprecated. Use createStandardDocument() from pdfmake instead.');
  const pageWidth = doc.internal.pageSize.width;
  const headerY = STANDARD_MARGINS.top;
  const headerTopY = headerY - STANDARD_MARGINS.headerHeight;

  let logoHeight = 0;
  try {
    const companyDetails = await fetchCompanyDetailsLegacy();
    if (companyDetails?.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const maxWidth = 35;
          const maxHeight = 12;
          const aspectRatio = img.width / img.height;
          let calcLogoWidth = maxWidth;
          let calcLogoHeight = calcLogoWidth / aspectRatio;
          if (calcLogoHeight > maxHeight) {
            calcLogoHeight = maxHeight;
            calcLogoWidth = calcLogoHeight * aspectRatio;
          }
          logoHeight = calcLogoHeight;
          
          const logoY = headerTopY + (STANDARD_MARGINS.headerHeight - calcLogoHeight) / 2;
          
          doc.addImage(img, "PNG", STANDARD_MARGINS.left, logoY, calcLogoWidth, calcLogoHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = companyDetails.logoUrl;
      });
    }
  } catch (e) {
    // No logo - that's fine
  }

  const textCenterY = headerTopY + STANDARD_MARGINS.headerHeight / 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_BRAND_COLORS.text[0], PDF_BRAND_COLORS.text[1], PDF_BRAND_COLORS.text[2]);
  doc.text(documentTitle, pageWidth - STANDARD_MARGINS.right, textCenterY - 2, { align: "right" });

  if (projectName) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(projectName, pageWidth - STANDARD_MARGINS.right, textCenterY + 4, { align: "right" });
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.18);
  doc.line(STANDARD_MARGINS.left, headerY, pageWidth - STANDARD_MARGINS.right, headerY);
};

/**
 * @deprecated Use createStandardDocument().withStandardFooter() instead
 * Add standard footer to a page
 */
export const addStandardFooter = (
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  includeConfidentiality: boolean = true
) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - STANDARD_MARGINS.bottom;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.18);
  doc.line(STANDARD_MARGINS.left, footerY - 8, pageWidth - STANDARD_MARGINS.right, footerY - 8);

  if (includeConfidentiality) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("CONFIDENTIAL", STANDARD_MARGINS.left, footerY);
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, { align: "center" });

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(dateStr, pageWidth - STANDARD_MARGINS.right, footerY, { align: "right" });
};

/**
 * @deprecated Use withStandardHeader/withStandardFooter on document builder instead
 * Add headers and footers to all pages (except cover)
 */
export const addAllHeadersAndFooters = async (
  doc: jsPDF,
  documentTitle: string,
  projectName?: string,
  startFromPage: number = 2
) => {
  const totalPages = doc.getNumberOfPages();

  for (let i = startFromPage; i <= totalPages; i++) {
    doc.setPage(i);
    await addStandardHeader(doc, documentTitle, projectName);
    addStandardFooter(doc, i - startFromPage + 1, totalPages - startFromPage + 1);
  }
};

/**
 * @deprecated pdfmake handles page breaks automatically
 * Check if we need a page break and handle it properly
 */
export const checkSafePageBreak = (
  doc: jsPDF,
  currentY: number,
  requiredSpace: number
): number => {
  const contentArea = getContentArea();

  if (currentY + requiredSpace > contentArea.endY) {
    doc.addPage();
    return contentArea.startY;
  }

  return currentY;
};

/**
 * @deprecated Use createStyledCard() instead
 * Draw a styled card
 */
export const drawStyledCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fillColor?: number[];
    borderColor?: number[];
    indicatorColor?: number[];
  } = {}
) => {
  const {
    fillColor = [255, 255, 255],
    borderColor = [220, 220, 220],
    indicatorColor,
  } = options;

  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, CARD_STYLE.borderRadius, CARD_STYLE.borderRadius, "FD");

  if (indicatorColor) {
    doc.setFillColor(indicatorColor[0], indicatorColor[1], indicatorColor[2]);
    doc.rect(x, y + CARD_STYLE.borderRadius, 3, height - CARD_STYLE.borderRadius * 2, "F");
  }
};

/**
 * Draw a connection line (for flow diagrams)
 */
export const drawConnectionLine = (
  doc: jsPDF,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  options: {
    color?: number[];
    dashed?: boolean;
    lineWidth?: number;
  } = {}
) => {
  const { color = [180, 180, 180], dashed = false, lineWidth = 0.5 } = options;

  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lineWidth);

  if (dashed) {
    const dashLength = 2;
    const gapLength = 1;
    const totalLength = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const dx = (toX - fromX) / totalLength;
    const dy = (toY - fromY) / totalLength;
    let currentLength = 0;
    let drawing = true;

    while (currentLength < totalLength) {
      const segmentLength = drawing ? dashLength : gapLength;
      const endLength = Math.min(currentLength + segmentLength, totalLength);
      
      if (drawing) {
        doc.line(
          fromX + dx * currentLength,
          fromY + dy * currentLength,
          fromX + dx * endLength,
          fromY + dy * endLength
        );
      }
      
      currentLength = endLength;
      drawing = !drawing;
    }
  } else {
    doc.line(fromX, fromY, toX, toY);
  }
};

/**
 * Draw a connection node (circle at branch points)
 */
export const drawConnectionNode = (
  doc: jsPDF,
  x: number,
  y: number,
  radius: number = 1.5,
  color: number[] = [100, 100, 100]
) => {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y, radius, "F");
};
