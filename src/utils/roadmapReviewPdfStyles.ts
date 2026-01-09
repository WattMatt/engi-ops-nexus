/**
 * Centralized PDF styling constants for Roadmap Review Reports
 * Provides consistent branding, colors, typography, and layout spacing
 */

// Brand color palette (RGB format for jsPDF)
export const PDF_BRAND_COLORS = {
  // Primary brand colors
  primary: [30, 58, 138] as [number, number, number],      // Deep blue
  primaryLight: [59, 130, 246] as [number, number, number], // Accent blue
  primaryDark: [17, 24, 39] as [number, number, number],    // Near black
  
  // Status colors
  success: [34, 197, 94] as [number, number, number],       // Green
  warning: [245, 158, 11] as [number, number, number],      // Amber
  danger: [239, 68, 68] as [number, number, number],        // Red
  
  // Neutral colors
  white: [255, 255, 255] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],   // Background
  gray: [148, 163, 184] as [number, number, number],        // Muted text
  darkGray: [71, 85, 105] as [number, number, number],      // Secondary text
  text: [15, 23, 42] as [number, number, number],           // Primary text
  
  // Table colors
  tableHeader: [30, 58, 138] as [number, number, number],
  tableAltRow: [241, 245, 249] as [number, number, number],
  tableBorder: [226, 232, 240] as [number, number, number],
  
  // Risk level colors
  riskCritical: [220, 38, 38] as [number, number, number],
  riskHigh: [249, 115, 22] as [number, number, number],
  riskMedium: [234, 179, 8] as [number, number, number],
  riskLow: [34, 197, 94] as [number, number, number],
};


// Typography settings - Standardized type scale
export const PDF_TYPOGRAPHY = {
  fonts: {
    heading: 'helvetica' as const,
    body: 'helvetica' as const,
  },
  sizes: {
    title: 28,       // Cover page main title
    h1: 18,          // Section headings
    h2: 14,          // Subsection headings
    h3: 11,          // Card headers
    body: 10,        // Standard body text
    small: 8,        // Secondary text, labels
    tiny: 7,         // Footnotes, table cells
    caption: 6,      // Micro text
  },
  lineHeight: 1.5,   // Improved line height for readability
  letterSpacing: 0.02, // Slight letter spacing for headings
};

// Page layout constants (in mm) - A4 with proper margins
export const PDF_LAYOUT = {
  pageWidth: 210,  // A4 width
  pageHeight: 297, // A4 height
  margins: {
    top: 25,       // Increased top margin for header
    bottom: 22,    // Increased bottom margin for footer
    left: 18,      // Increased left margin
    right: 18,     // Increased right margin
  },
  header: {
    height: 18,    // Taller header for proper logo display
    logoHeight: 12,
    logoMaxWidth: 35,  // Proportional logo width
    clearSpace: 5,     // Clear space around logo
  },
  footer: {
    height: 14,
    padding: 6,
  },
  spacing: {
    section: 14,     // Space between major sections
    paragraph: 8,    // Space between paragraphs
    line: 5,         // Line spacing
    element: 4,      // Space between UI elements
    card: 10,        // Space after cards
  },
  // Content safe zones
  safeZone: {
    top: 5,          // Safe zone from header
    bottom: 8,       // Safe zone from footer
  },
};

// Get content area dimensions with safe zones
export const getContentDimensions = () => {
  const headerEnd = PDF_LAYOUT.margins.top + PDF_LAYOUT.header.height + PDF_LAYOUT.safeZone.top;
  const footerStart = PDF_LAYOUT.pageHeight - PDF_LAYOUT.margins.bottom - PDF_LAYOUT.footer.height - PDF_LAYOUT.safeZone.bottom;
  
  return {
    width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margins.left - PDF_LAYOUT.margins.right,
    startX: PDF_LAYOUT.margins.left,
    startY: headerEnd,
    endY: footerStart,
    usableHeight: footerStart - headerEnd,
  };
};


// Risk level to color mapping
export const getRiskColor = (riskLevel: string): [number, number, number] => {
  switch (riskLevel) {
    case 'critical': return PDF_BRAND_COLORS.riskCritical;
    case 'high': return PDF_BRAND_COLORS.riskHigh;
    case 'medium': return PDF_BRAND_COLORS.riskMedium;
    case 'low': return PDF_BRAND_COLORS.riskLow;
    default: return PDF_BRAND_COLORS.gray;
  }
};

// Health score to color mapping
export const getHealthColor = (score: number): [number, number, number] => {
  if (score >= 80) return PDF_BRAND_COLORS.success;
  if (score >= 60) return PDF_BRAND_COLORS.warning;
  if (score >= 40) return PDF_BRAND_COLORS.riskHigh;
  return PDF_BRAND_COLORS.danger;
};

// Priority to color mapping
export const getPriorityColor = (priority: string): [number, number, number] => {
  switch (priority?.toLowerCase()) {
    case 'critical': return PDF_BRAND_COLORS.riskCritical;
    case 'high': return PDF_BRAND_COLORS.riskHigh;
    case 'medium': return PDF_BRAND_COLORS.riskMedium;
    case 'normal':
    case 'low': return PDF_BRAND_COLORS.success;
    default: return PDF_BRAND_COLORS.gray;
  }
};

// Meeting notes section configuration
export const MEETING_NOTES_CONFIG = {
  discussionLines: 3,
  decisionLines: 2,
  actionItemRows: 3,
  lineHeight: 8,
  boxPadding: 4,
  labelWidth: 35,
};

// PDF export options interface
export interface RoadmapPDFExportOptions {
  includeCharts: boolean;
  includeAnalytics: boolean;
  includeDetailedProjects: boolean;
  includeMeetingNotes: boolean;
  includeSummaryMinutes: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  companyLogo?: string | null;
  companyName?: string;
  confidentialNotice?: boolean;
  reportType: 'standard' | 'meeting-review' | 'executive-summary';
}

// Default export options
export const DEFAULT_EXPORT_OPTIONS: RoadmapPDFExportOptions = {
  includeCharts: true,
  includeAnalytics: true,
  includeDetailedProjects: true,
  includeMeetingNotes: true,
  includeSummaryMinutes: true,
  includeTableOfContents: true,
  includeCoverPage: true,
  companyLogo: null,
  companyName: 'Roadmap Review',
  confidentialNotice: true,
  reportType: 'meeting-review',
};
