/**
 * Base utilities for all PDF exports
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MIGRATION STATUS: TRANSITIONING TO PDFMAKE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file provides both pdfmake (preferred) and jsPDF (legacy) utilities.
 * 
 * NEW CODE SHOULD USE PDFMAKE:
 * ```typescript
 * import { createDocument, heading, paragraph, dataTable } from '@/utils/pdfmake';
 * ```
 * 
 * LEGACY JSPDF FUNCTIONS (deprecated, for backward compatibility):
 * - initializePDF() → use createDocument()
 * - addSectionHeader() → use sectionHeader()
 * - addBodyText() → use paragraph()
 * - addKeyValue() → use keyValue()
 * - getStandardTableStyles() → use getStandardTableLayout()
 * 
 * @see src/utils/pdfmake/README.md for migration guide
 * @see src/utils/pdfmake/index.ts for the new API
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { 
  createDocument, 
  heading, 
  paragraph, 
  keyValue, 
  sectionHeader,
  spacer,
  horizontalLine,
  STANDARD_MARGINS as PDFMAKE_MARGINS,
  PDF_COLORS,
  FONT_SIZES,
  QUALITY_PRESETS,
  type QualityPreset
} from './pdfmake';
import { getUserQualityPreset } from './pdfUserPreferences';

// Re-export the QualityPreset type for backward compatibility
export type { QualityPreset };

export interface PDFExportOptions {
  quality?: QualityPreset;
  orientation?: 'portrait' | 'landscape';
  compress?: boolean;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Standard page margins for all reports (in mm)
 * These match the pdfmake STANDARD_MARGINS
 */
export const STANDARD_MARGINS: PageMargins = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15
};

// ============ NEW PDFMAKE API ============

/**
 * Create a new PDF document builder
 * This is the preferred way to create PDFs
 */
export const createPDFDocument = (options: PDFExportOptions = {}) => {
  const quality = options.quality || getUserQualityPreset();
  return createDocument({
    orientation: options.orientation || 'portrait',
  });
};

/**
 * Create a section header content block
 */
export const createSectionHeader = (text: string): Content => {
  return sectionHeader(text);
};

/**
 * Create body text content block
 */
export const createBodyText = (text: string): Content => {
  return paragraph(text);
};

/**
 * Create a key-value pair content block
 */
export const createKeyValue = (key: string, value: string): Content => {
  return keyValue(key, value);
};

/**
 * Create a spacer content block
 */
export const createSpacer = (height: number = 10): Content => {
  return spacer(height);
};

/**
 * Create a horizontal line content block
 */
export const createHorizontalLine = (): Content => {
  return horizontalLine();
};

/**
 * Get quality-aware font sizes
 */
export const getQualityFontSizes = (quality?: QualityPreset) => {
  const preset = quality || getUserQualityPreset();
  const qualitySettings = QUALITY_PRESETS[preset];
  return {
    table: FONT_SIZES.table,
    body: FONT_SIZES.body,
    heading: FONT_SIZES.h2,
  };
};

/**
 * Get standardized table styles for pdfmake
 */
export const getStandardTableLayout = () => ({
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => PDF_COLORS.border,
  vLineColor: () => PDF_COLORS.border,
  fillColor: (rowIndex: number) => 
    rowIndex === 0 ? PDF_COLORS.textMuted : 
    rowIndex % 2 === 0 ? PDF_COLORS.background : null,
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 4,
  paddingBottom: () => 4,
});

// ============ LEGACY JSPDF COMPATIBILITY LAYER ============
// These functions are kept for backward compatibility during migration
// New code should use the pdfmake utilities above

import jsPDF from "jspdf";
import { getQualitySettings, createHighQualityPDF } from "./pdfQualitySettings";

/**
 * @deprecated Use createPDFDocument() instead
 * Initialize a PDF document with standardized settings
 */
export const initializePDF = (options: PDFExportOptions = {}): jsPDF => {
  const quality = options.quality || getUserQualityPreset();
  const { orientation = 'portrait', compress = true } = options;
  return createHighQualityPDF(orientation, compress);
};

/**
 * @deprecated Use getStandardTableLayout() instead
 * Get standardized table styles for autoTable
 */
export const getStandardTableStyles = (quality?: QualityPreset) => {
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  
  return {
    theme: 'grid' as const,
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: settings.fontSize.table,
      fontStyle: 'bold',
      halign: 'left' as const,
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: settings.fontSize.table,
      textColor: [30, 41, 59],
      cellPadding: 2.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak' as const,
      cellWidth: 'auto' as const
    },
    margin: STANDARD_MARGINS
  };
};

/**
 * @deprecated Use createSectionHeader() instead
 * Add a standardized section header to the PDF
 */
export const addSectionHeader = (
  doc: jsPDF,
  text: string,
  y: number,
  quality?: QualityPreset
): number => {
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(settings.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(text, STANDARD_MARGINS.left, y);
  
  const textWidth = doc.getTextWidth(text);
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(STANDARD_MARGINS.left, y + 2, STANDARD_MARGINS.left + textWidth, y + 2);
  
  return y + 10;
};

/**
 * @deprecated Use createBodyText() instead
 * Add standardized body text to the PDF
 */
export const addBodyText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  quality?: QualityPreset
): void => {
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  doc.setFontSize(settings.fontSize.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(text, x, y);
};

/**
 * @deprecated Use withStandardFooter() on PDFDocumentBuilder instead
 * Add page numbers to all pages except cover
 */
export const addPageNumbers = (
  doc: jsPDF,
  startPage: number = 2,
  quality?: QualityPreset
): void => {
  const pageCount = doc.getNumberOfPages();
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  
  for (let i = startPage; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFontSize(settings.fontSize.table);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    
    const pageText = `Page ${i - (startPage - 1)} of ${pageCount - (startPage - 1)}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - textWidth - STANDARD_MARGINS.right, pageHeight - 10);
  }
};

/**
 * @deprecated Use createKeyValue() instead
 * Add a key-value pair to the PDF
 */
export const addKeyValue = (
  doc: jsPDF,
  key: string,
  value: string,
  x: number,
  y: number,
  quality?: QualityPreset
): number => {
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  
  doc.setFontSize(settings.fontSize.body);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`${key}:`, x, y);
  
  const keyWidth = doc.getTextWidth(`${key}: `);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(value, x + keyWidth, y);
  
  return y + 6;
};

/**
 * @deprecated pdfmake handles page breaks automatically
 * Check if we need a new page and add one if necessary
 */
export const checkPageBreak = (
  doc: jsPDF,
  currentY: number,
  requiredSpace: number = 40
): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  
  if (currentY + requiredSpace > pageHeight - STANDARD_MARGINS.bottom) {
    doc.addPage();
    return STANDARD_MARGINS.top;
  }
  
  return currentY;
};

/**
 * @deprecated pdfmake handles text wrapping automatically
 * Wrap text to fit within a specified width
 */
export const wrapText = (
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] => {
  return doc.splitTextToSize(text, maxWidth);
};
