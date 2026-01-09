import jsPDF from "jspdf";
import { PDF_BRAND_COLORS, PDF_TYPOGRAPHY, PDF_LAYOUT } from "./roadmapReviewPdfStyles";
import { fetchCompanyDetails } from "./pdfCoverPage";

// Standard page dimensions (A4)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Standard margins per PDF_DESIGN_STANDARDS.md
export const STANDARD_MARGINS = {
  top: 25,
  bottom: 22,
  left: 18,
  right: 18,
  headerHeight: 18,
  footerHeight: 15,
};

// Calculate content area
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

/**
 * Add standard header to a page (not cover page)
 */
export const addStandardHeader = async (
  doc: jsPDF,
  documentTitle: string,
  projectName?: string
) => {
  const pageWidth = doc.internal.pageSize.width;
  const headerY = STANDARD_MARGINS.top;

  // Try to add logo
  try {
    const companyDetails = await fetchCompanyDetails();
    if (companyDetails?.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Max logo size: 45mm × 18mm per standards
          const maxWidth = 45;
          const maxHeight = 15;
          const aspectRatio = img.width / img.height;
          let logoWidth = maxWidth;
          let logoHeight = logoWidth / aspectRatio;
          if (logoHeight > maxHeight) {
            logoHeight = maxHeight;
            logoWidth = logoHeight * aspectRatio;
          }
          doc.addImage(
            img,
            "PNG",
            STANDARD_MARGINS.left,
            headerY - 12,
            logoWidth,
            logoHeight
          );
          resolve();
        };
        img.onerror = reject;
        img.src = companyDetails.logoUrl;
      });
    }
  } catch (e) {
    // No logo - that's fine
  }

  // Document title right-aligned
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(
    PDF_BRAND_COLORS.text[0],
    PDF_BRAND_COLORS.text[1],
    PDF_BRAND_COLORS.text[2]
  );
  doc.text(documentTitle, pageWidth - STANDARD_MARGINS.right, headerY - 8, {
    align: "right",
  });

  // Project name if provided
  if (projectName) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(projectName, pageWidth - STANDARD_MARGINS.right, headerY - 3, {
      align: "right",
    });
  }

  // Separator line (0.5pt, 50% opacity)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.18);
  doc.line(
    STANDARD_MARGINS.left,
    headerY,
    pageWidth - STANDARD_MARGINS.right,
    headerY
  );
};

/**
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

  // Separator line above footer
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.18);
  doc.line(
    STANDARD_MARGINS.left,
    footerY - 8,
    pageWidth - STANDARD_MARGINS.right,
    footerY - 8
  );

  // Confidentiality notice (left, 7pt italic)
  if (includeConfidentiality) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("CONFIDENTIAL", STANDARD_MARGINS.left, footerY);
  }

  // Page numbers centered
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, footerY, {
    align: "center",
  });

  // Date right-aligned
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(7);
  doc.text(dateStr, pageWidth - STANDARD_MARGINS.right, footerY, {
    align: "right",
  });
};

/**
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
 * Draw a styled card (simplified without GState for compatibility)
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

  // Card background
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, CARD_STYLE.borderRadius, CARD_STYLE.borderRadius, "FD");

  // Left indicator stripe
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
  const {
    color = [180, 180, 180],
    dashed = false,
    lineWidth = 0.5,
  } = options;

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

/**
 * Get phase color from brand colors
 */
export const getPhaseColor = (phase: string): number[] => {
  const phaseColors: Record<string, number[]> = {
    "Planning & Preparation": PDF_BRAND_COLORS.primaryLight,
    "Design Phase": [138, 43, 226], // Purple
    "Construction": PDF_BRAND_COLORS.warning,
    "Commissioning": [0, 128, 128], // Teal
    "Handover": PDF_BRAND_COLORS.success,
  };

  return phaseColors[phase] || PDF_BRAND_COLORS.primary;
};
