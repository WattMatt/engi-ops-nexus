/**
 * PDF Style Manager
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  MIGRATION STATUS: MIGRATED TO PDFMAKE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file provides style management for both pdfmake (new) and jsPDF (legacy).
 * 
 * RECOMMENDED USAGE (pdfmake):
 * ```typescript
 * import { PDF_COLORS, FONT_SIZES, defaultStyles } from '@/utils/pdfmake';
 * // Or use PDFStyleManager for custom styling
 * const styleManager = new PDFStyleManager(settings);
 * const pdfmakeStyles = styleManager.getPdfmakeStyles();
 * ```
 * 
 * LEGACY USAGE (jsPDF - deprecated):
 * ```typescript
 * const styleManager = new PDFStyleManager(settings);
 * styleManager.applyHeading(doc, 1, 'Title', x, y); // deprecated
 * ```
 * 
 * @see src/utils/pdfmake/styles.ts for the new styling system
 */

import { PDF_COLORS, FONT_SIZES } from './pdfConstants';
import jsPDF from "jspdf";

export interface ElementPosition {
  x: number;
  y: number;
  page?: number;
}

export interface ElementMetadata {
  visible: boolean;
  locked: boolean;
  zIndex: number;
  page?: number;
}

export interface PDFStyleSettings {
  typography: {
    headingFont: 'helvetica' | 'times' | 'courier';
    bodyFont: 'helvetica' | 'times' | 'courier';
    h1Size: number;
    h2Size: number;
    h3Size: number;
    bodySize: number;
    smallSize: number;
  };
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    text: [number, number, number];
    neutral: [number, number, number];
    success: [number, number, number];
    danger: [number, number, number];
    warning: [number, number, number];
    white: [number, number, number];
  };
  spacing: {
    lineSpacing: number;
    paragraphSpacing: number;
    sectionSpacing: number;
  };
  tables: {
    headerBg: [number, number, number];
    headerText: [number, number, number];
    alternateRowBg: [number, number, number];
    borderColor: [number, number, number];
    fontSize: number;
    cellPadding: number;
    showGridLines: boolean;
  };
  layout: {
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  positions?: {
    [elementKey: string]: ElementPosition;
  };
  grid?: {
    size: number;
    enabled: boolean;
    visible: boolean;
  };
  elements?: {
    [elementKey: string]: ElementMetadata;
  };
}

/**
 * Default style settings based on pdfmake styles
 */
export const getDefaultStyleSettings = (): PDFStyleSettings => ({
  typography: {
    headingFont: 'helvetica',
    bodyFont: 'helvetica',
    h1Size: FONT_SIZES.h1,
    h2Size: FONT_SIZES.h2,
    h3Size: FONT_SIZES.h3,
    bodySize: FONT_SIZES.body,
    smallSize: FONT_SIZES.small,
  },
  colors: {
    primary: hexToRgb(PDF_COLORS.primary),
    secondary: hexToRgb(PDF_COLORS.secondary),
    accent: hexToRgb(PDF_COLORS.accent),
    text: hexToRgb(PDF_COLORS.text),
    neutral: hexToRgb(PDF_COLORS.textMuted),
    success: hexToRgb(PDF_COLORS.success),
    danger: hexToRgb(PDF_COLORS.danger),
    warning: hexToRgb(PDF_COLORS.warning),
    white: [255, 255, 255],
  },
  spacing: {
    lineSpacing: 1.4,
    paragraphSpacing: 8,
    sectionSpacing: 15,
  },
  tables: {
    headerBg: hexToRgb(PDF_COLORS.textMuted),
    headerText: [255, 255, 255],
    alternateRowBg: hexToRgb(PDF_COLORS.background),
    borderColor: hexToRgb(PDF_COLORS.border),
    fontSize: FONT_SIZES.table,
    cellPadding: 4,
    showGridLines: true,
  },
  layout: {
    margins: { top: 20, bottom: 20, left: 15, right: 15 },
  },
});

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

/**
 * Convert RGB array to hex color
 */
function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export class PDFStyleManager {
  constructor(private settings: PDFStyleSettings) {}

  getSettings(): PDFStyleSettings {
    return this.settings;
  }

  /**
   * Get pdfmake-compatible styles dictionary
   */
  getPdfmakeStyles(): Record<string, any> {
    return {
      h1: {
        fontSize: this.settings.typography.h1Size,
        bold: true,
        color: rgbToHex(this.settings.colors.primary),
        margin: [0, 15, 0, 8] as [number, number, number, number],
      },
      h2: {
        fontSize: this.settings.typography.h2Size,
        bold: true,
        color: rgbToHex(this.settings.colors.text),
        margin: [0, 12, 0, 6] as [number, number, number, number],
      },
      h3: {
        fontSize: this.settings.typography.h3Size,
        bold: true,
        color: rgbToHex(this.settings.colors.neutral),
        margin: [0, 10, 0, 4] as [number, number, number, number],
      },
      body: {
        fontSize: this.settings.typography.bodySize,
        color: rgbToHex(this.settings.colors.text),
        lineHeight: this.settings.spacing.lineSpacing,
      },
      small: {
        fontSize: this.settings.typography.smallSize,
        color: rgbToHex(this.settings.colors.neutral),
      },
      tableHeader: {
        fontSize: this.settings.tables.fontSize,
        bold: true,
        color: rgbToHex(this.settings.tables.headerText),
        fillColor: rgbToHex(this.settings.tables.headerBg),
      },
      tableCell: {
        fontSize: this.settings.tables.fontSize,
        color: rgbToHex(this.settings.colors.text),
      },
    };
  }

  /**
   * Get pdfmake-compatible table layout
   */
  getPdfmakeTableLayout() {
    return {
      hLineWidth: () => this.settings.tables.showGridLines ? 0.5 : 0,
      vLineWidth: () => this.settings.tables.showGridLines ? 0.5 : 0,
      hLineColor: () => rgbToHex(this.settings.tables.borderColor),
      vLineColor: () => rgbToHex(this.settings.tables.borderColor),
      fillColor: (rowIndex: number) => 
        rowIndex === 0 ? rgbToHex(this.settings.tables.headerBg) : 
        rowIndex % 2 === 0 ? rgbToHex(this.settings.tables.alternateRowBg) : null,
      paddingLeft: () => this.settings.tables.cellPadding,
      paddingRight: () => this.settings.tables.cellPadding,
      paddingTop: () => this.settings.tables.cellPadding,
      paddingBottom: () => this.settings.tables.cellPadding,
    };
  }

  /**
   * Get pdfmake-compatible margins
   */
  getPdfmakeMargins(): [number, number, number, number] {
    const m = this.settings.layout.margins;
    return [m.left, m.top, m.right, m.bottom];
  }

  // Legacy jsPDF methods (kept for backward compatibility)
  
  applyHeading(doc: jsPDF, level: 1 | 2 | 3, text: string, x: number, y: number, options?: any) {
    const sizeKey = `h${level}Size` as 'h1Size' | 'h2Size' | 'h3Size';
    doc.setFont(this.settings.typography.headingFont, 'bold');
    doc.setFontSize(this.settings.typography[sizeKey]);
    doc.setTextColor(...this.settings.colors.primary);
    doc.text(text, x, y, options);
    return y + this.settings.typography[sizeKey] * 0.5;
  }

  applyBodyText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
    doc.setFont(this.settings.typography.bodyFont, 'normal');
    doc.setFontSize(this.settings.typography.bodySize);
    doc.setTextColor(...this.settings.colors.text);
    doc.text(text, x, y, options);
    return y + this.settings.typography.bodySize * 0.5;
  }

  applySmallText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
    doc.setFont(this.settings.typography.bodyFont, 'normal');
    doc.setFontSize(this.settings.typography.smallSize);
    doc.setTextColor(...this.settings.colors.secondary);
    doc.text(text, x, y, options);
    return y + this.settings.typography.smallSize * 0.5;
  }

  applySectionHeader(doc: jsPDF, text: string, x: number, y: number, pageWidth: number, margins: { left: number; right: number }) {
    this.applyHeading(doc, 1, text, pageWidth / 2, y + 5, { align: "center" });
    
    doc.setDrawColor(...this.settings.colors.neutral);
    doc.setLineWidth(0.5);
    doc.line(x, y + 8, pageWidth - margins.right, y + 8);
    
    return y + 20;
  }

  getTableStyles() {
    return {
      headStyles: {
        fillColor: this.settings.tables.headerBg,
        textColor: this.settings.tables.headerText,
        fontSize: this.settings.tables.fontSize,
        fontStyle: 'bold',
        cellPadding: this.settings.tables.cellPadding,
        halign: 'left' as const,
      },
      bodyStyles: {
        fontSize: this.settings.tables.fontSize,
        cellPadding: this.settings.tables.cellPadding,
        textColor: this.settings.colors.text,
      },
      alternateRowStyles: {
        fillColor: this.settings.tables.alternateRowBg,
      },
      styles: {
        lineColor: this.settings.tables.showGridLines ? this.settings.tables.borderColor : undefined,
        lineWidth: this.settings.tables.showGridLines ? 0.1 : 0,
      },
    };
  }

  getMargins() {
    return this.settings.layout.margins;
  }

  getLineSpacing() {
    return this.settings.spacing.lineSpacing;
  }

  getParagraphSpacing() {
    return this.settings.spacing.paragraphSpacing;
  }

  getSectionSpacing() {
    return this.settings.spacing.sectionSpacing;
  }

  getElementPosition(elementKey: string): ElementPosition | null {
    return this.settings.positions?.[elementKey] || null;
  }

  setElementPosition(elementKey: string, position: ElementPosition) {
    if (!this.settings.positions) {
      this.settings.positions = {};
    }
    this.settings.positions[elementKey] = position;
  }

  getGridSettings() {
    return this.settings.grid || { size: 10, enabled: true, visible: true };
  }

  snapToGrid(value: number): number {
    const grid = this.getGridSettings();
    if (!grid.enabled) return value;
    return Math.round(value / grid.size) * grid.size;
  }

  getElementMetadata(elementKey: string): ElementMetadata {
    return this.settings.elements?.[elementKey] || { 
      visible: true, 
      locked: false, 
      zIndex: 0 
    };
  }

  setElementMetadata(elementKey: string, metadata: Partial<ElementMetadata>) {
    if (!this.settings.elements) {
      this.settings.elements = {};
    }
    this.settings.elements[elementKey] = {
      ...this.getElementMetadata(elementKey),
      ...metadata
    };
  }

  getAllElements(): string[] {
    const positionKeys = Object.keys(this.settings.positions || {});
    const metadataKeys = Object.keys(this.settings.elements || {});
    return Array.from(new Set([...positionKeys, ...metadataKeys]));
  }
}
