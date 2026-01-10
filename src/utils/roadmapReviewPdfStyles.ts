/**
 * Centralized PDF styling constants for Roadmap Review Reports
 * Provides consistent branding, colors, typography, and layout spacing
 * 
 * MIGRATED TO PDFMAKE: This file now provides both jsPDF (legacy) and pdfmake formats.
 * 
 * IMPORTANT: These values MUST match PDF_DESIGN_STANDARDS.md
 */

import { PDF_COLORS as PDFMAKE_COLORS, FONT_SIZES } from './pdfmake/styles';

// ============ PDFMAKE FORMAT (PREFERRED) ============
// Use these for new pdfmake implementations

export const PDF_COLORS_HEX = {
  primary: '#334155',        // Slate-700
  primaryLight: '#475569',   // Slate-600
  primaryDark: '#1e293b',    // Slate-800
  success: '#166534',        // Green-800
  warning: '#92400e',        // Amber-800
  danger: '#991b1b',         // Red-800
  white: '#ffffff',
  lightGray: '#f8fafc',      // Slate-50
  gray: '#94a3b8',           // Slate-400
  darkGray: '#475569',       // Slate-600
  text: '#0f172a',           // Slate-900
  tableHeader: '#334155',    // Slate-700
  tableAltRow: '#f8fafc',    // Slate-50
  tableBorder: '#cbd5e1',    // Slate-300
  riskCritical: '#7f1d1d',   // Red-900
  riskHigh: '#7c2d12',       // Orange-900
  riskMedium: '#713f12',     // Amber-900
  riskLow: '#14532d',        // Green-900
};

// Re-export pdfmake colors for convenience
export { PDFMAKE_COLORS, FONT_SIZES };

// ============ LEGACY JSPDF FORMAT ============
// Kept for backward compatibility during migration

// Brand color palette (RGB format for jsPDF) - Professional Engineering Style
// Muted, professional colors replacing vibrant accents
export const PDF_BRAND_COLORS = {
  // Primary brand colors - Professional slate/charcoal tones
  primary: [51, 65, 85] as [number, number, number],        // Slate-700 - Headers, accents
  primaryLight: [71, 85, 105] as [number, number, number],  // Slate-600 - Lighter accent
  primaryDark: [30, 41, 59] as [number, number, number],    // Slate-800 - Darker shade
  
  // Status colors - Muted professional tones
  success: [22, 101, 52] as [number, number, number],       // Green-800 - Subdued positive
  warning: [146, 64, 14] as [number, number, number],       // Amber-800 - Subdued caution  
  danger: [153, 27, 27] as [number, number, number],        // Red-800 - Subdued critical
  
  // Neutral colors - Engineering gray palette
  white: [255, 255, 255] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],   // Slate-50 - Background
  gray: [148, 163, 184] as [number, number, number],        // Slate-400 - Dividers
  darkGray: [71, 85, 105] as [number, number, number],      // Slate-600 - Subtext
  text: [15, 23, 42] as [number, number, number],           // Slate-900 - Primary text
  
  // Table colors - Professional muted styling
  tableHeader: [51, 65, 85] as [number, number, number],    // Slate-700
  tableAltRow: [248, 250, 252] as [number, number, number], // Slate-50
  tableBorder: [203, 213, 225] as [number, number, number], // Slate-300
  
  // Priority/Risk colors - Muted engineering palette
  riskCritical: [127, 29, 29] as [number, number, number],  // Red-900
  riskHigh: [124, 45, 18] as [number, number, number],      // Orange-900
  riskMedium: [113, 63, 18] as [number, number, number],    // Amber-900
  riskLow: [20, 83, 45] as [number, number, number],        // Green-900
};


// Typography settings - Per PDF_DESIGN_STANDARDS.md Section 4
export const PDF_TYPOGRAPHY = {
  fonts: {
    heading: 'helvetica' as const,  // Helvetica Bold for headings
    body: 'helvetica' as const,     // Helvetica Regular for body
    mono: 'courier' as const,       // Courier for code/data
  },
  sizes: {
    title: 28,       // Cover page main title
    h1: 18,          // Section headings (Bold, 1.3 line height)
    h2: 14,          // Subsection headings (Bold, 1.4 line height)
    h3: 12,          // Card headers (Bold, 1.4 line height) - FIXED: was 11
    body: 10,        // Standard body text (Normal, 1.5 line height)
    caption: 8,      // Caption text (Normal, 1.4 line height)
    small: 7,        // Small text (Normal, 1.3 line height)
    tiny: 6,         // Micro text
  },
  lineHeight: 1.5,   // Default line height for body text
  letterSpacing: 0.02,
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


// Risk level to color mapping (legacy jsPDF format)
export const getRiskColor = (riskLevel: string): [number, number, number] => {
  switch (riskLevel) {
    case 'critical': return PDF_BRAND_COLORS.riskCritical;
    case 'high': return PDF_BRAND_COLORS.riskHigh;
    case 'medium': return PDF_BRAND_COLORS.riskMedium;
    case 'low': return PDF_BRAND_COLORS.riskLow;
    default: return PDF_BRAND_COLORS.gray;
  }
};

// Risk level to hex color (pdfmake format)
export const getRiskColorHex = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'critical': return PDF_COLORS_HEX.riskCritical;
    case 'high': return PDF_COLORS_HEX.riskHigh;
    case 'medium': return PDF_COLORS_HEX.riskMedium;
    case 'low': return PDF_COLORS_HEX.riskLow;
    default: return PDF_COLORS_HEX.gray;
  }
};

// Health score to color mapping (legacy jsPDF format)
export const getHealthColor = (score: number): [number, number, number] => {
  if (score >= 80) return PDF_BRAND_COLORS.success;
  if (score >= 60) return PDF_BRAND_COLORS.warning;
  if (score >= 40) return PDF_BRAND_COLORS.riskHigh;
  return PDF_BRAND_COLORS.danger;
};

// Health score to hex color (pdfmake format)
export const getHealthColorHex = (score: number): string => {
  if (score >= 80) return PDF_COLORS_HEX.success;
  if (score >= 60) return PDF_COLORS_HEX.warning;
  if (score >= 40) return PDF_COLORS_HEX.riskHigh;
  return PDF_COLORS_HEX.danger;
};

// Priority to color mapping (legacy jsPDF format)
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

// Priority to hex color (pdfmake format)
export const getPriorityColorHex = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical': return PDF_COLORS_HEX.riskCritical;
    case 'high': return PDF_COLORS_HEX.riskHigh;
    case 'medium': return PDF_COLORS_HEX.riskMedium;
    case 'normal':
    case 'low': return PDF_COLORS_HEX.success;
    default: return PDF_COLORS_HEX.gray;
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
  includeFullRoadmapItems: boolean;
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
  includeFullRoadmapItems: false,
  companyLogo: null,
  companyName: 'Roadmap Review',
  confidentialNotice: true,
  reportType: 'meeting-review',
};
