/**
 * Table of Contents Page
 */
import jsPDF from "jspdf";
import { 
  PDF_BRAND_COLORS, 
  PDF_TYPOGRAPHY, 
  PDF_LAYOUT,
  getContentDimensions 
} from "../roadmapReviewPdfStyles";
import { addPageHeader, drawCard } from "./pageDecorations";

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
  }
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
  
  // Analytics section
  if (options.includeAnalytics) {
    entries.push({ title: 'Portfolio Analytics', page: currentPage, level: 1 });
    entries.push({ title: 'Project Comparison Chart', page: currentPage, level: 2 });
    entries.push({ title: 'Priority Heat Map', page: currentPage, level: 2 });
    entries.push({ title: 'Team Workload Distribution', page: currentPage, level: 2 });
    currentPage++;
  }
  
  // Project details
  if (options.includeDetailedProjects) {
    entries.push({ title: 'Project Details', page: currentPage, level: 1 });
    
    // Estimate ~2 projects per page
    const projectPages = Math.ceil(projectCount / 2);
    for (let i = 0; i < Math.min(projectCount, 10); i++) {
      entries.push({ 
        title: `Project ${i + 1}`, 
        page: currentPage + Math.floor(i / 2), 
        level: 2 
      });
    }
    if (projectCount > 10) {
      entries.push({ title: '... and more', page: currentPage + 4, level: 2 });
    }
    currentPage += projectPages;
  }
  
  // Summary minutes
  if (options.includeSummaryMinutes) {
    entries.push({ title: 'Meeting Summary & Minutes', page: currentPage, level: 1 });
  }
  
  return entries;
};
