import jsPDF from "jspdf";
import { PDFMargins, PDFSectionOptions } from "../PDFExportSettings";

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

export interface CompanyDetails {
  companyName: string;
  contactName: string;
  contactPhone: string;
  company_logo_url: string | null;
  client_logo_url: string | null;
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

export interface TocEntry {
  title: string;
  page: number;
}

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

export const CATEGORY_COLORS = [
  [59, 130, 246],   // Blue
  [16, 185, 129],   // Green
  [251, 191, 36],   // Yellow
  [249, 115, 22],   // Orange
  [139, 92, 246],   // Purple
  [236, 72, 153],   // Pink
  [134, 239, 172],  // Light green
];
