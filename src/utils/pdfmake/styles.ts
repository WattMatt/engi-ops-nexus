/**
 * PDFMake Standard Styles
 * Defines consistent styling across all PDF exports
 */

import type { StyleDictionary, Style } from 'pdfmake/interfaces';

// Brand colors in RGB format (pdfmake uses RGB strings or arrays)
export const PDF_COLORS = {
  primary: '#1e3a8a',      // blue-900
  secondary: '#3b82f6',    // blue-500
  accent: '#6366f1',       // indigo-500
  text: '#0f172a',         // slate-900
  textMuted: '#475569',    // slate-600
  textLight: '#64748b',    // slate-500
  background: '#f8fafc',   // slate-50
  backgroundAlt: '#f1f5f9', // slate-100
  border: '#e2e8f0',       // slate-200
  white: '#ffffff',
  success: '#16a34a',      // green-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
} as const;

// Standard font sizes in points
export const FONT_SIZES = {
  title: 24,
  h1: 20,
  h2: 16,
  h3: 14,
  body: 10,
  small: 9,
  caption: 8,
  table: 9,
} as const;

// Default document styles
export const defaultStyles: StyleDictionary = {
  // Headers
  title: {
    fontSize: FONT_SIZES.title,
    bold: true,
    color: PDF_COLORS.primary,
    margin: [0, 0, 0, 10],
  },
  h1: {
    fontSize: FONT_SIZES.h1,
    bold: true,
    color: PDF_COLORS.text,
    margin: [0, 15, 0, 8],
  },
  h2: {
    fontSize: FONT_SIZES.h2,
    bold: true,
    color: PDF_COLORS.text,
    margin: [0, 12, 0, 6],
  },
  h3: {
    fontSize: FONT_SIZES.h3,
    bold: true,
    color: PDF_COLORS.textMuted,
    margin: [0, 10, 0, 4],
  },
  
  // Body text
  body: {
    fontSize: FONT_SIZES.body,
    color: PDF_COLORS.text,
    lineHeight: 1.4,
  },
  bodyMuted: {
    fontSize: FONT_SIZES.body,
    color: PDF_COLORS.textMuted,
    lineHeight: 1.4,
  },
  small: {
    fontSize: FONT_SIZES.small,
    color: PDF_COLORS.textLight,
  },
  caption: {
    fontSize: FONT_SIZES.caption,
    color: PDF_COLORS.textLight,
    italics: true,
  },
  
  // Labels
  label: {
    fontSize: FONT_SIZES.small,
    bold: true,
    color: PDF_COLORS.textMuted,
  },
  value: {
    fontSize: FONT_SIZES.body,
    color: PDF_COLORS.text,
  },
  
  // Table styles
  tableHeader: {
    fontSize: FONT_SIZES.table,
    bold: true,
    color: PDF_COLORS.white,
    fillColor: PDF_COLORS.textMuted,
  },
  tableCell: {
    fontSize: FONT_SIZES.table,
    color: PDF_COLORS.text,
  },
  tableCellMuted: {
    fontSize: FONT_SIZES.table,
    color: PDF_COLORS.textMuted,
  },
  
  // Status colors
  success: {
    color: PDF_COLORS.success,
  },
  warning: {
    color: PDF_COLORS.warning,
  },
  danger: {
    color: PDF_COLORS.danger,
  },
  
  // Links
  link: {
    color: PDF_COLORS.secondary,
    decoration: 'underline',
  },
};

// Table layout presets
export const tableLayouts = {
  // Standard table with borders
  standard: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
  
  // Borderless table
  noBorders: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 8,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  },
  
  // Header with bottom border only
  headerLine: {
    hLineWidth: (i: number, node: any) => (i === 1 ? 1 : 0),
    vLineWidth: () => 0,
    hLineColor: () => PDF_COLORS.primary,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
  
  // Zebra striping
  zebra: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    fillColor: (rowIndex: number) => 
      rowIndex > 0 && rowIndex % 2 === 0 ? PDF_COLORS.background : null,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
};

// Quality presets for image compression
export const QUALITY_PRESETS = {
  draft: { imageQuality: 0.6, scale: 1 },
  standard: { imageQuality: 0.8, scale: 1.5 },
  high: { imageQuality: 0.95, scale: 2 },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
