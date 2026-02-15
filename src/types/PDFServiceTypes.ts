export interface PDFReportConfig {
  includeCoverPage?: boolean;
  includeExecutiveSummary?: boolean;
  includeFinancialOverview?: boolean;
  includeInspectionLog?: boolean;
  includeSignOffSheet?: boolean;
}

export interface PDFOptions {
  fileName?: string;
  openInNewTab?: boolean;
}

export interface CostReportData {
  report: any;
  categoryTotals: any[];
  grandTotals: any;
  companyDetails: any;
  categoriesData: any[];
  variationsData: any[];
  detailsData: any[];
}

export interface InspectionData {
  siteDetails: {
    location: string;
    inspector: string;
    date: string;
  };
  issues: any[];
}
