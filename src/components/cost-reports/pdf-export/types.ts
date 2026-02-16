import jsPDF from "jspdf";
import { PDFMargins, PDFSectionOptions } from "../PDFExportSettings";

// ============================================================================
// jsPDF Types (Legacy - to be deprecated)
// ============================================================================

export interface PDFGenerationContext {
  doc: jsPDF;
  report: any;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentStartX: number;
  contentStartY: number;
  margins: PDFMargins;
  sections: PDFSectionOptions;
  companyDetails: CompanyDetails;
  categoryTotals: CategoryTotal[];
  grandTotals: GrandTotals;
  categoriesData: any[];
  variationsData: any[];
  detailsData: any[];
  contactId?: string;
  templates?: {
    costReport?: any;
    coverPage?: any;
  };
}

// ============================================================================
// pdfmake Types (New - preferred)
// ============================================================================

export interface PdfmakeGenerationContext {
  report: any;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  margins: PDFMargins;
  sections: PDFSectionOptions;
  companyDetails: CompanyDetails;
  categoryTotals: CategoryTotal[];
  grandTotals: GrandTotals;
  categoriesData: any[];
  variationsData: any[];
  detailsData: any[];
  contactId?: string;
  templates?: {
    costReport?: any;
    coverPage?: any;
  };
}

export interface PdfmakeSectionResult {
  content: any[];
  pageBreakBefore?: boolean;
}

// ============================================================================
// Shared Types
// ============================================================================

export interface CompanyDetails {
  companyName: string;
  contactName: string;
  contactPhone: string;
  company_logo_url: string | null;
  client_logo_url: string | null;
  // Company address fields
  addressLine1?: string;
  addressLine2?: string;
  // Client fields
  clientName?: string;
  clientAddressLine1?: string;
  clientAddressLine2?: string;
  clientPhone?: string;
}

export interface CategoryTotal {
  code: string;
  description: string;
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  currentVariance: number;
  originalVariance: number;
}

export interface GrandTotals {
  originalBudget: number;
  previousReport: number;
  anticipatedFinal: number;
  currentVariance: number;
  originalVariance: number;
}

export interface PDFExportProgress {
  currentStep: number;
  totalSteps: number;
  currentSection: string;
  percentage: number;
}

export interface PDFSectionGenerator {
  name: string;
  key: keyof PDFSectionOptions;
  shouldInclude: (sections: PDFSectionOptions) => boolean;
  generate: (context: PDFGenerationContext) => Promise<void>;
  getEstimatedPages: () => number;
}

// pdfmake section generator interface
export interface PdfmakeSectionGenerator {
  name: string;
  key: keyof PDFSectionOptions;
  shouldInclude: (sections: PDFSectionOptions) => boolean;
  generate: (context: PdfmakeGenerationContext) => Promise<PdfmakeSectionResult>;
  getEstimatedPages: () => number;
}

export interface TocEntry {
  title: string;
  page: number;
}

// ============================================================================
// Color Constants
// ============================================================================

// RGB format for jsPDF (legacy)
export const PDF_COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  secondary: [59, 130, 246] as [number, number, number],
  accent: [99, 102, 241] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  warning: [251, 191, 36] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  neutral: [71, 85, 105] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  tableHeader: [41, 128, 185] as [number, number, number],
  categoryCyan: [34, 197, 218] as [number, number, number],
};

// Hex format for pdfmake (new)
export const PDF_COLORS_HEX = {
  primary: '#1e3a8a',
  secondary: '#3b82f6',
  accent: '#6366f1',
  success: '#10b981',
  warning: '#fbbf24',
  danger: '#ef4444',
  neutral: '#475569',
  light: '#f1f5f9',
  white: '#ffffff',
  text: '#0f172a',
  tableHeader: '#2980b9',
  categoryCyan: '#22c5da',
};

export const CATEGORY_COLORS = [
  [59, 130, 246],   // Blue
  [16, 185, 129],   // Green
  [251, 191, 36],   // Yellow
  [249, 115, 22],   // Orange
  [139, 92, 246],   // Purple
  [236, 72, 153],   // Pink
  [134, 239, 172],  // Light green
];

export const CATEGORY_COLORS_HEX = [
  '#3b82f6',  // Blue
  '#10b981',  // Green
  '#fbbf24',  // Yellow
  '#f97316',  // Orange
  '#8b5cf6',  // Purple
  '#ec4899',  // Pink
  '#86efac',  // Light green
];

// ============================================================================
// pdfmake Helper Functions
// ============================================================================

/**
 * Convert RGB array to hex string
 */
export function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Get default pdfmake styles for cost reports
 */
export function getCostReportStyles(): Record<string, any> {
  return {
    header: {
      fontSize: 16,
      bold: true,
      color: PDF_COLORS_HEX.text,
      margin: [0, 0, 0, 10],
    },
    subheader: {
      fontSize: 12,
      color: PDF_COLORS_HEX.neutral,
      margin: [0, 0, 0, 5],
    },
    tableHeader: {
      fontSize: 8,
      bold: true,
      color: PDF_COLORS_HEX.white,
      fillColor: PDF_COLORS_HEX.tableHeader,
    },
    tableCell: {
      fontSize: 8,
    },
    sectionTitle: {
      fontSize: 11,
      bold: true,
      color: PDF_COLORS_HEX.primary,
      margin: [0, 10, 0, 5],
    },
    categoryBadge: {
      fontSize: 8,
      bold: true,
      color: PDF_COLORS_HEX.white,
    },
    positive: {
      color: PDF_COLORS_HEX.success,
    },
    negative: {
      color: PDF_COLORS_HEX.danger,
    },
  };
}
