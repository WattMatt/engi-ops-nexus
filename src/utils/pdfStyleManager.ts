import jsPDF from "jspdf";

export interface ElementPosition {
  x: number;
  y: number;
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
}

export class PDFStyleManager {
  constructor(private settings: PDFStyleSettings) {}

  getSettings(): PDFStyleSettings {
    return this.settings;
  }

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
    
    // Add subtle line under header
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
}
