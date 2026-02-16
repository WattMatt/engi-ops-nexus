/**
 * PDFMake Standard Styles
 * Defines consistent styling across all PDF exports
 * 
 * Usage:
 * - Use getStyles() to get the complete style dictionary
 * - Use style arrays for composition: ['heading', 'h1'] or ['muted', 'small']
 * - All colors should come from PDF_COLORS
 * - All spacing should come from SPACING
 */

import type { StyleDictionary, Style, Margins } from 'pdfmake/interfaces';

// ============================================================================
// BRAND COLORS - Semantic color palette for all PDF elements
// ============================================================================

export const PDF_COLORS = {
  // Primary branding
  primary: '#1e3a8a',      // blue-900
  secondary: '#3b82f6',    // blue-500
  accent: '#6366f1',       // indigo-500
  
  // Text hierarchy
  text: '#0f172a',         // slate-900
  textMuted: '#475569',    // slate-600
  textLight: '#64748b',    // slate-500
  
  // Backgrounds
  background: '#f8fafc',   // slate-50
  backgroundAlt: '#f1f5f9', // slate-100
  panelBg: '#f8fafc',      // subtle panel background
  
  // Borders
  border: '#e2e8f0',       // slate-200
  borderLight: '#f1f5f9',  // slate-100
  
  // Core
  white: '#ffffff',
  
  // Status colors
  success: '#16a34a',      // green-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  info: '#0284c7',         // sky-600
  
  // Variants for subtle use
  primaryLight: '#dbeafe', // blue-100
  successLight: '#dcfce7', // green-100
  warningLight: '#fef3c7', // amber-100
  dangerLight: '#fee2e2',  // red-100
} as const;

// ============================================================================
// FONT SIZES - Consistent typography scale (in points)
// ============================================================================

export const FONT_SIZES = {
  // Named scale
  xs: 8,
  sm: 9,
  base: 10,
  md: 11,
  lg: 12,
  h3: 13,
  h2: 16,
  h1: 20,
  title: 24,
  display: 32,
  
  // Semantic aliases (for backward compatibility)
  caption: 8,
  small: 9,
  body: 10,
  table: 9,
} as const;

// ============================================================================
// SPACING SCALE - Consistent margins and padding (in points)
// ============================================================================

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ============================================================================
// MARGIN HELPERS - Utility functions for consistent spacing
// ============================================================================

/** All sides margin */
export const m = (v: number): Margins => [v, v, v, v];

/** Horizontal margin (left/right) */
export const mx = (h: number): Margins => [h, 0, h, 0];

/** Vertical margin (top/bottom) */
export const my = (v: number): Margins => [0, v, 0, v];

/** Top margin only */
export const mt = (t: number): Margins => [0, t, 0, 0];

/** Bottom margin only */
export const mb = (b: number): Margins => [0, 0, 0, b];

/** Left margin only */
export const ml = (l: number): Margins => [l, 0, 0, 0];

/** Right margin only */
export const mr = (r: number): Margins => [0, 0, r, 0];

// ============================================================================
// STYLE DICTIONARY FACTORY - Returns complete composable styles
// ============================================================================

/**
 * Get the complete style dictionary for pdfmake
 * Use style arrays for composition: ['heading', 'h1'], ['muted', 'small']
 */
export function getStyles(): StyleDictionary {
  return {
    // ========== Base Text Styles ==========
    text: { 
      color: PDF_COLORS.text,
      fontSize: FONT_SIZES.base,
    },
    muted: { 
      color: PDF_COLORS.textMuted,
    },
    light: {
      color: PDF_COLORS.textLight,
    },
    bold: { 
      bold: true,
    },
    italic: {
      italics: true,
    },
    small: { 
      fontSize: FONT_SIZES.sm,
    },
    tiny: { 
      fontSize: FONT_SIZES.xs,
    },
    link: { 
      color: PDF_COLORS.accent, 
      decoration: 'underline' as const,
    },

    // ========== Heading Styles (compose with ['heading', 'h1']) ==========
    heading: { 
      bold: true, 
      color: PDF_COLORS.text, 
      lineHeight: 1.2,
    },
    title: {
      fontSize: FONT_SIZES.title,
      bold: true,
      color: PDF_COLORS.primary,
      margin: [0, 0, 0, SPACING.md],
    },
    h1: { 
      fontSize: FONT_SIZES.h1, 
      margin: [0, SPACING.lg, 0, SPACING.sm],
    },
    h2: { 
      fontSize: FONT_SIZES.h2, 
      margin: [0, SPACING.md, 0, SPACING.xs],
    },
    h3: { 
      fontSize: FONT_SIZES.h3, 
      margin: [0, SPACING.sm, 0, SPACING.xs],
    },

    // ========== Paragraph/Section Styles ==========
    p: { 
      fontSize: FONT_SIZES.base, 
      margin: [0, 0, 0, SPACING.sm],
      lineHeight: 1.4,
    },
    section: { 
      margin: [0, SPACING.xl, 0, 0],
    },
    subsection: { 
      margin: [0, SPACING.lg, 0, 0],
    },
    body: {
      fontSize: FONT_SIZES.base,
      color: PDF_COLORS.text,
      lineHeight: 1.4,
    },
    bodyMuted: {
      fontSize: FONT_SIZES.base,
      color: PDF_COLORS.textMuted,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: FONT_SIZES.xs,
      color: PDF_COLORS.textLight,
      italics: true,
    },

    // ========== Label/Value Styles ==========
    label: {
      fontSize: FONT_SIZES.sm,
      bold: true,
      color: PDF_COLORS.textMuted,
    },
    labelMuted: {
      fontSize: FONT_SIZES.sm,
      color: PDF_COLORS.textMuted,
    },
    value: {
      fontSize: FONT_SIZES.base,
      color: PDF_COLORS.text,
    },

    // ========== Table Styles ==========
    tableHeader: {
      fontSize: FONT_SIZES.sm,
      bold: true,
      color: PDF_COLORS.white,
      fillColor: PDF_COLORS.primary,
    },
    tableCell: {
      fontSize: FONT_SIZES.sm,
      color: PDF_COLORS.text,
    },
    tableCellMuted: {
      fontSize: FONT_SIZES.sm,
      color: PDF_COLORS.textMuted,
    },

    // ========== Alignment Styles (compose with ['cellRight', 'bold']) ==========
    cellRight: { 
      alignment: 'right' as const,
    },
    cellCenter: { 
      alignment: 'center' as const,
    },
    cellLeft: {
      alignment: 'left' as const,
    },

    // ========== Numeric Style ==========
    numeric: {
      alignment: 'right' as const,
      font: 'Roboto',
    },

    // ========== Status Token Styles ==========
    success: { 
      color: PDF_COLORS.success,
    },
    warning: { 
      color: PDF_COLORS.warning,
    },
    danger: { 
      color: PDF_COLORS.danger,
    },
    info: {
      color: PDF_COLORS.info,
    },

    // ========== Header/Footer Styles ==========
    headerText: { 
      color: PDF_COLORS.textMuted, 
      fontSize: FONT_SIZES.sm,
    },
    footerText: { 
      color: PDF_COLORS.textMuted, 
      fontSize: FONT_SIZES.sm,
    },

    // ========== KPI/Metric Styles ==========
    kpiValue: {
      fontSize: FONT_SIZES.display,
      bold: true,
      color: PDF_COLORS.primary,
      alignment: 'center' as const,
    },
    kpiLabel: {
      fontSize: FONT_SIZES.sm,
      color: PDF_COLORS.textMuted,
      alignment: 'center' as const,
    },

    // ========== Panel/Card Styles ==========
    panelTitle: {
      fontSize: FONT_SIZES.h3,
      bold: true,
      color: PDF_COLORS.text,
      fillColor: PDF_COLORS.backgroundAlt,
    },
    panelBody: {
      fontSize: FONT_SIZES.base,
      color: PDF_COLORS.text,
    },
  };
}

// Legacy export for backward compatibility
export const defaultStyles: StyleDictionary = getStyles();

// ============================================================================
// TABLE LAYOUTS - Reusable table styling presets
// ============================================================================

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

  // Compact zebra for dense tables
  zebraCompact: {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    fillColor: (rowIndex: number) => 
      rowIndex > 0 && rowIndex % 2 === 0 ? PDF_COLORS.background : null,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  },

  // Professional table with header emphasis
  professional: {
    hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0.5,
    hLineColor: (i: number) => i <= 1 ? PDF_COLORS.primary : PDF_COLORS.border,
    vLineColor: () => PDF_COLORS.border,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
  },

  // Minimal - light borders only
  minimal: {
    hLineWidth: (i: number, node: any) => (i === 1 || i === node.table.body.length) ? 0.5 : 0,
    vLineWidth: () => 0,
    hLineColor: () => PDF_COLORS.border,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },

  // Light horizontal lines only (no vertical borders)
  lightHorizontalLines: {
    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
    vLineWidth: () => 0,
    hLineColor: (i: number) => i <= 1 ? PDF_COLORS.primary : PDF_COLORS.border,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
};

// ============================================================================
// QUALITY PRESETS - Image compression settings
// ============================================================================

export const QUALITY_PRESETS = {
  draft: { imageQuality: 0.6, scale: 1 },
  standard: { imageQuality: 0.8, scale: 1.5 },
  high: { imageQuality: 0.95, scale: 2 },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
