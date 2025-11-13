/**
 * Base utilities for all PDF exports
 * Provides standardized settings, styling, and helper functions
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getQualitySettings, QualityPreset, createHighQualityPDF } from "./pdfQualitySettings";
import { getUserQualityPreset } from "./pdfUserPreferences";

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
 */
export const STANDARD_MARGINS: PageMargins = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15
};

/**
 * Initialize a PDF document with standardized settings
 * Automatically uses user's quality preference from Settings
 */
export const initializePDF = (options: PDFExportOptions = {}): jsPDF => {
  // Use user's preferred quality if not explicitly specified
  const quality = options.quality || getUserQualityPreset();
  const { orientation = 'portrait', compress = true } = options;
  
  return createHighQualityPDF(orientation, compress);
};

/**
 * Get standardized table styles for autoTable
 * Automatically uses user's quality preference from Settings
 */
export const getStandardTableStyles = (quality?: QualityPreset) => {
  // Use user's preferred quality if not explicitly specified
  const effectiveQuality = quality || getUserQualityPreset();
  const settings = getQualitySettings(effectiveQuality);
  
  return {
    theme: 'grid' as const,
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: [255, 255, 255],
      fontSize: settings.fontSize.table,
      fontStyle: 'bold',
      halign: 'left' as const,
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: settings.fontSize.table,
      textColor: [30, 41, 59], // slate-800
      cellPadding: 2.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    styles: {
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.1,
      overflow: 'linebreak' as const,
      cellWidth: 'auto' as const
    },
    margin: STANDARD_MARGINS
  };
};

/**
 * Add a standardized section header to the PDF
 * Automatically uses user's quality preference from Settings
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
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(text, STANDARD_MARGINS.left, y);
  
  // Add underline
  const textWidth = doc.getTextWidth(text);
  doc.setDrawColor(71, 85, 105); // slate-600
  doc.setLineWidth(0.5);
  doc.line(
    STANDARD_MARGINS.left,
    y + 2,
    STANDARD_MARGINS.left + textWidth,
    y + 2
  );
  
  return y + 10; // Return next Y position
};

/**
 * Add standardized body text to the PDF
 * Automatically uses user's quality preference from Settings
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
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(text, x, y);
};

/**
 * Add page numbers to all pages except cover
 * Automatically uses user's quality preference from Settings
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
    doc.setTextColor(100, 116, 139); // slate-500
    
    const pageText = `Page ${i - (startPage - 1)} of ${pageCount - (startPage - 1)}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - textWidth - STANDARD_MARGINS.right, pageHeight - 10);
  }
};

/**
 * Add a key-value pair to the PDF
 * Automatically uses user's quality preference from Settings
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
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`${key}:`, x, y);
  
  const keyWidth = doc.getTextWidth(`${key}: `);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(value, x + keyWidth, y);
  
  return y + 6; // Return next Y position
};

/**
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
 * Wrap text to fit within a specified width
 */
export const wrapText = (
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] => {
  return doc.splitTextToSize(text, maxWidth);
};
