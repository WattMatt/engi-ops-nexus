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

// Typography settings
export const PDF_TYPOGRAPHY = {
  fonts: {
    heading: 'helvetica' as const,
    body: 'helvetica' as const,
  },
  sizes: {
    title: 24,
    h1: 18,
    h2: 14,
    h3: 12,
    body: 10,
    small: 8,
    tiny: 7,
  },
  lineHeight: 1.4,
};

// Page layout constants (in mm)
export const PDF_LAYOUT = {
  pageWidth: 210,  // A4 width
  pageHeight: 297, // A4 height
  margins: {
    top: 20,
    bottom: 20,
    left: 15,
    right: 15,
  },
  header: {
    height: 15,
    logoHeight: 10,
    logoMaxWidth: 40,
  },
  footer: {
    height: 12,
    padding: 5,
  },
  spacing: {
    section: 12,
    paragraph: 6,
    line: 4,
    element: 3,
  },
};

// Get content area dimensions
export const getContentDimensions = () => ({
  width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margins.left - PDF_LAYOUT.margins.right,
  startX: PDF_LAYOUT.margins.left,
  startY: PDF_LAYOUT.margins.top + PDF_LAYOUT.header.height,
  endY: PDF_LAYOUT.pageHeight - PDF_LAYOUT.margins.bottom - PDF_LAYOUT.footer.height,
});

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
