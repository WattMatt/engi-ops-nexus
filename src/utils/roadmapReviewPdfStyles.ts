/**
 * Centralized PDF styling constants for Roadmap Review Reports
 * Provides consistent branding, colors, typography, and layout spacing
 * 
 * PDFMAKE IMPLEMENTATION - Professional Engineering Report Styling
 * 
 * IMPORTANT: These values create a polished, professional report aesthetic
 */

import { PDF_COLORS as PDFMAKE_COLORS, FONT_SIZES } from './pdfmake/styles';
import type { StyleDictionary, Margins } from 'pdfmake/interfaces';

// ============ PDFMAKE FORMAT (PREFERRED) ============
// Enhanced professional color palette

export const PDF_COLORS_HEX = {
  // Primary brand - Deep professional blue-slate
  primary: '#1e3a5f',        // Deep blue-slate
  primaryLight: '#2d4a6f',   // Lighter primary
  primaryDark: '#0f2744',    // Darker primary for emphasis
  
  // Accent colors
  accent: '#3b82f6',         // Bright blue for highlights
  accentLight: '#60a5fa',    // Light accent
  
  // Status colors - Refined, professional tones
  success: '#059669',        // Emerald-600 - Crisp positive
  successLight: '#d1fae5',   // Success background
  warning: '#d97706',        // Amber-600 - Clear caution  
  warningLight: '#fef3c7',   // Warning background
  danger: '#dc2626',         // Red-600 - Clear critical
  dangerLight: '#fee2e2',    // Danger background
  
  // Neutral palette
  white: '#ffffff',
  offWhite: '#fafbfc',       // Subtle off-white for cards
  lightGray: '#f1f5f9',      // Slate-100 - Section backgrounds
  gray: '#94a3b8',           // Slate-400 - Borders, muted text
  darkGray: '#475569',       // Slate-600 - Secondary text
  text: '#0f172a',           // Slate-900 - Primary text
  textMuted: '#64748b',      // Slate-500 - Muted text
  
  // Table colors - Professional styling
  tableHeader: '#1e3a5f',    // Deep blue header
  tableHeaderText: '#ffffff',
  tableAltRow: '#f8fafc',    // Subtle stripe
  tableBorder: '#e2e8f0',    // Slate-200 - Light borders
  
  // Priority/Risk colors - Professional palette
  riskCritical: '#991b1b',   // Red-800
  riskHigh: '#c2410c',       // Orange-700
  riskMedium: '#b45309',     // Amber-700
  riskLow: '#15803d',        // Green-700
  
  // Chart/visual colors
  chartBlue: '#3b82f6',
  chartGreen: '#10b981',
  chartAmber: '#f59e0b',
  chartRed: '#ef4444',
  chartPurple: '#8b5cf6',
};

// Re-export pdfmake colors for convenience
export { PDFMAKE_COLORS, FONT_SIZES };

// ============ ENHANCED PDFMAKE STYLES ============

export const ROADMAP_PDF_STYLES: StyleDictionary = {
  // Headers - Bold, clear hierarchy
  reportTitle: {
    fontSize: 28,
    bold: true,
    color: PDF_COLORS_HEX.primary,
    margin: [0, 0, 0, 8] as Margins,
  },
  h1: {
    fontSize: 18,
    bold: true,
    color: PDF_COLORS_HEX.primary,
    margin: [0, 20, 0, 10] as Margins,
  },
  h2: {
    fontSize: 14,
    bold: true,
    color: PDF_COLORS_HEX.primaryLight,
    margin: [0, 15, 0, 8] as Margins,
  },
  h3: {
    fontSize: 12,
    bold: true,
    color: PDF_COLORS_HEX.darkGray,
    margin: [0, 10, 0, 6] as Margins,
  },
  
  // Body text
  body: {
    fontSize: 10,
    color: PDF_COLORS_HEX.text,
    lineHeight: 1.5,
  },
  bodyMuted: {
    fontSize: 10,
    color: PDF_COLORS_HEX.textMuted,
    lineHeight: 1.5,
  },
  small: {
    fontSize: 9,
    color: PDF_COLORS_HEX.darkGray,
  },
  caption: {
    fontSize: 8,
    color: PDF_COLORS_HEX.gray,
    italics: true,
  },
  
  // Metric/stats styles
  metricValue: {
    fontSize: 24,
    bold: true,
    color: PDF_COLORS_HEX.primary,
  },
  metricLabel: {
    fontSize: 9,
    color: PDF_COLORS_HEX.textMuted,
  },
  
  // Table styles
  tableHeader: {
    fontSize: 10,
    bold: true,
    color: PDF_COLORS_HEX.tableHeaderText,
    fillColor: PDF_COLORS_HEX.tableHeader,
  },
  tableCell: {
    fontSize: 10,
    color: PDF_COLORS_HEX.text,
  },
  tableCellBold: {
    fontSize: 10,
    bold: true,
    color: PDF_COLORS_HEX.text,
  },
  
  // Status badges
  statusSuccess: {
    fontSize: 9,
    bold: true,
    color: PDF_COLORS_HEX.success,
  },
  statusWarning: {
    fontSize: 9,
    bold: true,
    color: PDF_COLORS_HEX.warning,
  },
  statusDanger: {
    fontSize: 9,
    bold: true,
    color: PDF_COLORS_HEX.danger,
  },
};

// Enhanced table layout presets
export const ROADMAP_TABLE_LAYOUTS = {
  // Professional table with refined borders
  professional: {
    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0,
    hLineColor: (i: number) => i === 1 ? PDF_COLORS_HEX.primary : PDF_COLORS_HEX.tableBorder,
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 8,
    paddingBottom: () => 8,
  },
  
  // Minimal table - clean look
  minimal: {
    hLineWidth: (i: number, node: any) => (i === 1) ? 1 : 0,
    vLineWidth: () => 0,
    hLineColor: () => PDF_COLORS_HEX.primary,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
  },
  
  // Zebra striped table
  zebra: {
    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0,
    vLineWidth: () => 0,
    hLineColor: () => PDF_COLORS_HEX.tableBorder,
    fillColor: (rowIndex: number) => rowIndex > 0 && rowIndex % 2 === 0 ? PDF_COLORS_HEX.lightGray : null,
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 8,
    paddingBottom: () => 8,
  },
  
  // Card-style table
  card: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => PDF_COLORS_HEX.tableBorder,
    vLineColor: () => PDF_COLORS_HEX.tableBorder,
    paddingLeft: () => 12,
    paddingRight: () => 12,
    paddingTop: () => 10,
    paddingBottom: () => 10,
  },
};

// ============ LEGACY JSPDF FORMAT ============
// Kept for backward compatibility during migration

// Brand color palette (RGB format for jsPDF) - Professional Engineering Style
export const PDF_BRAND_COLORS = {
  primary: [30, 58, 95] as [number, number, number],        // Deep blue-slate
  primaryLight: [45, 74, 111] as [number, number, number],  // Lighter primary
  primaryDark: [15, 39, 68] as [number, number, number],    // Darker shade
  
  success: [5, 150, 105] as [number, number, number],       // Emerald-600
  warning: [217, 119, 6] as [number, number, number],       // Amber-600
  danger: [220, 38, 38] as [number, number, number],        // Red-600
  
  white: [255, 255, 255] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],   // Slate-100
  gray: [148, 163, 184] as [number, number, number],        // Slate-400
  darkGray: [71, 85, 105] as [number, number, number],      // Slate-600
  text: [15, 23, 42] as [number, number, number],           // Slate-900
  
  tableHeader: [30, 58, 95] as [number, number, number],    // Deep blue
  tableAltRow: [248, 250, 252] as [number, number, number], // Slate-50
  tableBorder: [226, 232, 240] as [number, number, number], // Slate-200
  
  riskCritical: [153, 27, 27] as [number, number, number],  // Red-800
  riskHigh: [194, 65, 12] as [number, number, number],      // Orange-700
  riskMedium: [180, 83, 9] as [number, number, number],     // Amber-700
  riskLow: [21, 128, 61] as [number, number, number],       // Green-700
};


// Typography settings - Enhanced for professional reports
export const PDF_TYPOGRAPHY = {
  fonts: {
    heading: 'helvetica' as const,
    body: 'helvetica' as const,
    mono: 'courier' as const,
  },
  sizes: {
    title: 28,       // Cover page main title
    h1: 18,          // Section headings
    h2: 14,          // Subsection headings
    h3: 12,          // Card headers
    body: 10,        // Standard body text
    caption: 9,      // Caption text
    small: 8,        // Small text
    tiny: 7,         // Minimal text
  },
  lineHeight: 1.5,
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
  chartLayout: 'stacked' | 'grid';
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
  chartLayout: 'stacked',
};
