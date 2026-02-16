/**
 * PDF Constants
 * 
 * Standalone constants previously in pdfmake/styles.ts.
 * Used by compliance checker, style manager, quality settings, etc.
 */

export const PDF_COLORS = {
  primary: '#1e3a8a',
  secondary: '#3b82f6',
  accent: '#6366f1',
  text: '#0f172a',
  textMuted: '#475569',
  textLight: '#64748b',
  background: '#f8fafc',
  backgroundAlt: '#f1f5f9',
  panelBg: '#f8fafc',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  white: '#ffffff',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
  primaryLight: '#dbeafe',
  successLight: '#dcfce7',
  warningLight: '#fef3c7',
  dangerLight: '#fee2e2',
} as const;

export const FONT_SIZES = {
  xs: 8, sm: 9, base: 10, md: 11, lg: 12,
  h3: 13, h2: 16, h1: 20, title: 24, display: 32,
  caption: 8, small: 9, body: 10, table: 9,
} as const;

export const STANDARD_MARGINS = {
  top: 40, bottom: 40, left: 40, right: 40,
} as const;

export const QUALITY_PRESETS = {
  draft: { imageQuality: 0.6, dpi: 72, tableStripes: false },
  standard: { imageQuality: 0.8, dpi: 150, tableStripes: true },
  high: { imageQuality: 0.95, dpi: 300, tableStripes: true },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
