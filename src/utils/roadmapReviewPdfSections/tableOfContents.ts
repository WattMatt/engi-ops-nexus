/**
 * Table of Contents Page
 * 
 * MIGRATION STATUS: Phase 4 - pdfmake compatibility layer added
 * - jsPDF: Full support (current implementation)
 * - pdfmake: Content builder available for TOC generation
 */
import jsPDF from "jspdf";
import type { Content, ContentText } from "pdfmake/interfaces";
import { 
  PDF_BRAND_COLORS, 
  PDF_COLORS_HEX,
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";
import { addPageHeader, drawCard, buildCardContent } from "./pageDecorations";

// Alias for cleaner code
const PDF_BRAND_COLORS_HEX = PDF_COLORS_HEX;

// ============================================================================
// PDFMAKE CONTENT BUILDERS
// ============================================================================

interface TocEntry {
  title: string;
  page: number;
  level: 1 | 2;
}

/**
 * Build pdfmake TOC content
 */
export const buildTocContent = (entries: TocEntry[]): Content => {
  const tocItems: Content[] = entries.map((entry) => {
    const isMainSection = entry.level === 1;
    return {
      columns: [
        {
          text: entry.title,
          fontSize: isMainSection ? PDF_TYPOGRAPHY.sizes.h3 : PDF_TYPOGRAPHY.sizes.body,
          bold: isMainSection,
          color: isMainSection ? PDF_BRAND_COLORS_HEX.primary : PDF_BRAND_COLORS_HEX.text,
          margin: [isMainSection ? 0 : 10, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: entry.page.toString(),
          fontSize: isMainSection ? PDF_TYPOGRAPHY.sizes.h3 : PDF_TYPOGRAPHY.sizes.body,
          bold: isMainSection,
          alignment: 'right' as const,
          color: isMainSection ? PDF_BRAND_COLORS_HEX.primary : PDF_BRAND_COLORS_HEX.text,
        },
      ],
      margin: [0, isMainSection ? 6 : 3, 0, 0] as [number, number, number, number],
    };
  });

  return {
    stack: [
      {
        text: 'TABLE OF CONTENTS',
        style: 'h1',
        alignment: 'center',
        color: PDF_BRAND_COLORS_HEX.primary,
        margin: [0, 0, 0, 15],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 40,
            y1: 0,
            x2: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margins.right - 40,
            y2: 0,
            lineWidth: 0.5,
            lineColor: PDF_BRAND_COLORS_HEX.primary,
          },
        ],
        margin: [0, 0, 0, 15],
      },
      ...tocItems,
    ],
  };
};

// ============================================================================
// JSPDF IMPLEMENTATIONS (Original - kept for backward compatibility)
// ============================================================================

interface TocEntry {
  title: string;
  page: number;
  level: 1 | 2;
}

/**
 * Generate Table of Contents page
 */
export const generateTableOfContents = (
  doc: jsPDF,
  entries: TocEntry[],
  companyLogo?: string | null,
  companyName?: string
): void => {
  const { margins, pageWidth } = PDF_LAYOUT;
  const { width: contentWidth, startX, startY } = getContentDimensions();
  
  // Add new page
  doc.addPage();
  addPageHeader(doc, 'Contents', companyLogo, companyName);
  
  let currentY = startY + 10;
  
  // Page title
  doc.setFont(PDF_TYPOGRAPHY.fonts.heading, 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.sizes.h1);
  doc.setTextColor(...PDF_BRAND_COLORS.primary);
  doc.text('TABLE OF CONTENTS', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;
  
  // Decorative line
  doc.setDrawColor(...PDF_BRAND_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(startX + 40, currentY, pageWidth - margins.right - 40, currentY);
  currentY += 15;
  
  // TOC entries
  entries.forEach((entry) => {
    const isMainSection = entry.level === 1;
    const indent = isMainSection ? 0 : 10;
    const fontSize = isMainSection ? PDF_TYPOGRAPHY.sizes.h3 : PDF_TYPOGRAPHY.sizes.body;
    const fontStyle = isMainSection ? 'bold' : 'normal';
    
    doc.setFont(PDF_TYPOGRAPHY.fonts.body, fontStyle);
    doc.setFontSize(fontSize);
    const textColor = isMainSection ? PDF_BRAND_COLORS.primary : PDF_BRAND_COLORS.text;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Entry title
    doc.text(entry.title, startX + indent, currentY);
    
    // Page number
    const pageText = entry.page.toString();
    doc.text(pageText, pageWidth - margins.right, currentY, { align: 'right' });
    
    // Dotted line between title and page number
    const titleWidth = doc.getTextWidth(entry.title);
    const pageWidth2 = doc.getTextWidth(pageText);
    const dotsStartX = startX + indent + titleWidth + 5;
    const dotsEndX = pageWidth - margins.right - pageWidth2 - 5;
    
    doc.setTextColor(PDF_BRAND_COLORS.gray[0], PDF_BRAND_COLORS.gray[1], PDF_BRAND_COLORS.gray[2]);
    doc.setFontSize(PDF_TYPOGRAPHY.sizes.small);
    
    let dotX = dotsStartX;
    while (dotX < dotsEndX) {
      doc.text('.', dotX, currentY);
      dotX += 3;
    }
    
    currentY += isMainSection ? 10 : 7;
  });
};

/**
 * Build TOC entries based on report configuration
 */
export const buildTocEntries = (
  projectCount: number,
  options: {
    includeCoverPage: boolean;
    includeTableOfContents: boolean;
    includeAnalytics: boolean;
    includeDetailedProjects: boolean;
    includeSummaryMinutes: boolean;
  },
  projectNames?: string[]
): TocEntry[] => {
  const entries: TocEntry[] = [];
  let currentPage = 1;
  
  // Cover page
  if (options.includeCoverPage) {
    currentPage++;
  }
  
  // TOC itself
  if (options.includeTableOfContents) {
    entries.push({ title: 'Table of Contents', page: currentPage, level: 1 });
    currentPage++;
  }
  
  // Executive Summary (always on the page after TOC or cover)
  entries.push({ title: 'Executive Summary', page: currentPage, level: 1 });
  currentPage++;
  
  // Analytics section - each chart gets its own page now
  if (options.includeAnalytics) {
    entries.push({ title: 'Portfolio Analytics', page: currentPage, level: 1 });
    entries.push({ title: 'Project Comparison Chart', page: currentPage, level: 2 });
    currentPage++;
    entries.push({ title: 'Priority Heat Map', page: currentPage, level: 2 });
    entries.push({ title: 'Team Workload Distribution', page: currentPage, level: 2 });
    currentPage++;
  }
  
  // Project details with actual project names
  if (options.includeDetailedProjects) {
    entries.push({ title: 'Project Details', page: currentPage, level: 1 });
    
    // Each project gets its own entry with real name
    const maxProjectsInToc = 15; // Limit to prevent TOC overflow
    const projectsToShow = Math.min(projectCount, maxProjectsInToc);
    
    for (let i = 0; i < projectsToShow; i++) {
      // Use actual project name or fallback to numbered
      let projectName = projectNames?.[i] || `Project ${i + 1}`;
      
      // Truncate long names for TOC
      if (projectName.length > 35) {
        projectName = projectName.substring(0, 32) + '...';
      }
      
      entries.push({ 
        title: projectName, 
        page: currentPage + Math.floor(i / 2), 
        level: 2 
      });
    }
    
    if (projectCount > maxProjectsInToc) {
      entries.push({ 
        title: `... and ${projectCount - maxProjectsInToc} more projects`, 
        page: currentPage + Math.floor(maxProjectsInToc / 2), 
        level: 2 
      });
    }
    
    // Estimate ~2 projects per page
    const projectPages = Math.ceil(projectCount / 2);
    currentPage += projectPages;
  }
  
  // Summary minutes
  if (options.includeSummaryMinutes) {
    entries.push({ title: 'Meeting Summary & Minutes', page: currentPage, level: 1 });
  }
  
  return entries;
};
