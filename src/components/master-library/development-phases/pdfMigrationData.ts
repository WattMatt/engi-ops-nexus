/**
 * PDF Migration Phase Data
 * Tracks migration from jsPDF to pdfmake across all files
 */

export interface MigrationFile {
  id: string;
  path: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface MigrationPhase {
  id: string;
  number: number;
  name: string;
  description: string;
  category: string;
  files: MigrationFile[];
  dependencies: string[];
}

export const pdfMigrationPhases: MigrationPhase[] = [
  // ============ PHASE 1: Core Utilities (COMPLETED) ============
  {
    id: 'core-utilities',
    number: 1,
    name: 'Core Utilities',
    description: 'Base pdfmake configuration, styles, helpers, and document builder',
    category: 'Foundation',
    dependencies: [],
    files: [
      { id: 'pdfmake-config', path: 'src/utils/pdfmake/config.ts', description: 'pdfmake initialization with fonts', complexity: 'low', dependencies: [] },
      { id: 'pdfmake-styles', path: 'src/utils/pdfmake/styles.ts', description: 'Brand colors, font sizes, table layouts', complexity: 'low', dependencies: ['pdfmake-config'] },
      { id: 'pdfmake-helpers', path: 'src/utils/pdfmake/helpers.ts', description: 'Common helper functions (heading, table, etc)', complexity: 'medium', dependencies: ['pdfmake-styles'] },
      { id: 'pdfmake-builder', path: 'src/utils/pdfmake/documentBuilder.ts', description: 'Fluent document builder API', complexity: 'medium', dependencies: ['pdfmake-helpers'] },
      { id: 'pdfmake-cover', path: 'src/utils/pdfmake/coverPage.ts', description: 'Cover page generator', complexity: 'medium', dependencies: ['pdfmake-helpers'] },
      { id: 'pdfmake-index', path: 'src/utils/pdfmake/index.ts', description: 'Main export barrel', complexity: 'low', dependencies: [] },
    ],
  },

  // ============ PHASE 2: Base PDF Utilities ============
  {
    id: 'base-utilities',
    number: 2,
    name: 'Base PDF Utilities',
    description: 'Migrate core utility files used by multiple components',
    category: 'Foundation',
    dependencies: ['core-utilities'],
    files: [
      { id: 'pdf-export-base', path: 'src/utils/pdfExportBase.ts', description: 'Standard margins, table styles, helpers', complexity: 'medium', dependencies: [] },
      { id: 'pdf-quality', path: 'src/utils/pdfQualitySettings.ts', description: 'Quality presets, canvas capture utilities', complexity: 'high', dependencies: [] },
      { id: 'pdf-cover-page', path: 'src/utils/pdfCoverPage.ts', description: 'Main cover page with Word template support', complexity: 'high', dependencies: [] },
      { id: 'pdf-cover-simple', path: 'src/utils/pdfCoverPageSimple.ts', description: 'Simplified cover page variant', complexity: 'medium', dependencies: [] },
      { id: 'pdf-standards', path: 'src/utils/pdfStandardsHelper.ts', description: 'Headers, footers, page layout helpers', complexity: 'medium', dependencies: [] },
      { id: 'pdf-style-manager', path: 'src/utils/pdfStyleManager.ts', description: 'Element positioning and styling', complexity: 'medium', dependencies: [] },
      { id: 'pdf-compliance', path: 'src/utils/pdfComplianceChecker.ts', description: 'PDF compliance validation', complexity: 'low', dependencies: [] },
    ],
  },

  // ============ PHASE 3: Report Utilities ============
  {
    id: 'report-utilities',
    number: 3,
    name: 'Report Utilities',
    description: 'Migrate shared report generation utilities',
    category: 'Utilities',
    dependencies: ['base-utilities'],
    files: [
      { id: 'roadmap-styles', path: 'src/utils/roadmapReviewPdfStyles.ts', description: 'Brand colors, typography, layout for roadmap', complexity: 'low', dependencies: [] },
      { id: 'section-export', path: 'src/utils/sectionPdfExport.ts', description: 'Section-based PDF export', complexity: 'medium', dependencies: [] },
      { id: 'template-export', path: 'src/utils/templatePDFExport.ts', description: 'Template-based PDF generation', complexity: 'medium', dependencies: [] },
      { id: 'prediction-export', path: 'src/utils/exportPredictionPDF.ts', description: 'AI prediction PDF export', complexity: 'high', dependencies: [] },
      { id: 'lighting-report', path: 'src/utils/lightingReportPDF.ts', description: 'Lighting report PDF generation', complexity: 'high', dependencies: [] },
    ],
  },

  // ============ PHASE 4: Roadmap PDF Sections ============
  {
    id: 'roadmap-sections',
    number: 4,
    name: 'Roadmap PDF Sections',
    description: 'Migrate roadmap review PDF section generators',
    category: 'Roadmap Reports',
    dependencies: ['report-utilities'],
    files: [
      { id: 'roadmap-main', path: 'src/utils/roadmapReviewPdfExport.ts', description: 'Main roadmap PDF export orchestrator', complexity: 'high', dependencies: [] },
      { id: 'roadmap-decorations', path: 'src/utils/roadmapReviewPdfSections/pageDecorations.ts', description: 'Page headers, footers, branding', complexity: 'medium', dependencies: [] },
      { id: 'roadmap-toc', path: 'src/utils/roadmapReviewPdfSections/tableOfContents.ts', description: 'Table of contents generation', complexity: 'medium', dependencies: [] },
      { id: 'roadmap-meeting', path: 'src/utils/roadmapReviewPdfSections/meetingNotes.ts', description: 'Meeting notes section', complexity: 'medium', dependencies: [] },
      { id: 'roadmap-full', path: 'src/utils/roadmapReviewPdfSections/fullRoadmapPage.ts', description: 'Full roadmap page layout', complexity: 'high', dependencies: [] },
    ],
  },

  // ============ PHASE 5: Cost Report PDF Sections ============
  {
    id: 'cost-report-sections',
    number: 5,
    name: 'Cost Report PDF Sections',
    description: 'Migrate cost report PDF generation components',
    category: 'Cost Reports',
    dependencies: ['report-utilities'],
    files: [
      { id: 'cost-types', path: 'src/components/cost-reports/pdf-export/types.ts', description: 'PDF export types and interfaces', complexity: 'low', dependencies: [] },
      { id: 'cost-chart', path: 'src/components/cost-reports/pdf-export/utils/chartCapture.ts', description: 'Chart capture utilities', complexity: 'medium', dependencies: [] },
      { id: 'cost-exec', path: 'src/components/cost-reports/pdf-export/sections/executiveSummarySection.ts', description: 'Executive summary section', complexity: 'medium', dependencies: [] },
      { id: 'cost-category', path: 'src/components/cost-reports/pdf-export/sections/categoryDetailsSection.ts', description: 'Category details section', complexity: 'medium', dependencies: [] },
    ],
  },

  // ============ PHASE 6: Project Export Buttons ============
  {
    id: 'project-exports',
    number: 6,
    name: 'Project Export Buttons',
    description: 'Migrate project-level PDF export components',
    category: 'Export Components',
    dependencies: ['base-utilities'],
    files: [
      { id: 'outline-export', path: 'src/components/project-outline/ProjectOutlineExportPDFButton.tsx', description: 'Project outline PDF export', complexity: 'medium', dependencies: [] },
      { id: 'roadmap-export', path: 'src/components/dashboard/roadmap/RoadmapExportPDFButton.tsx', description: 'Roadmap PDF export button', complexity: 'medium', dependencies: [] },
      { id: 'spec-export', path: 'src/components/specifications/SpecificationExportPDFButton.tsx', description: 'Specification PDF export', complexity: 'medium', dependencies: [] },
      { id: 'cable-export', path: 'src/components/cable-schedules/CableScheduleExportPDFButton.tsx', description: 'Cable schedule PDF export', complexity: 'medium', dependencies: [] },
    ],
  },

  // ============ PHASE 7: Tenant & Handover Exports ============
  {
    id: 'tenant-exports',
    number: 7,
    name: 'Tenant & Handover Exports',
    description: 'Migrate tenant tracking and handover PDF components',
    category: 'Export Components',
    dependencies: ['base-utilities'],
    files: [
      { id: 'tenant-report', path: 'src/components/tenant/TenantReportGenerator.tsx', description: 'Tenant report generator', complexity: 'high', dependencies: [] },
      { id: 'generator-report', path: 'src/components/tenant/GeneratorReportExportPDFButton.tsx', description: 'Generator report PDF export', complexity: 'medium', dependencies: [] },
      { id: 'handover-completion', path: 'src/components/handover/TenantCompletionExportPDFButton.tsx', description: 'Tenant completion PDF export', complexity: 'high', dependencies: [] },
    ],
  },

  // ============ PHASE 8: Lighting & Bulk Services ============
  {
    id: 'lighting-bulk',
    number: 8,
    name: 'Lighting & Bulk Services',
    description: 'Migrate lighting and bulk services PDF exports',
    category: 'Export Components',
    dependencies: ['report-utilities'],
    files: [
      { id: 'lighting-handover', path: 'src/components/lighting/handover/LightingHandoverGenerator.tsx', description: 'Lighting handover PDF generator', complexity: 'high', dependencies: [] },
      { id: 'lighting-analytics', path: 'src/components/lighting/analytics/ReportBuilder.tsx', description: 'Lighting analytics report builder', complexity: 'high', dependencies: [] },
      { id: 'lighting-comparison', path: 'src/components/lighting/comparison/ComparisonMatrix.tsx', description: 'Lighting comparison matrix export', complexity: 'medium', dependencies: [] },
      { id: 'bulk-export', path: 'src/components/bulk-services/BulkServicesExportPDFButton.tsx', description: 'Bulk services PDF export', complexity: 'medium', dependencies: [] },
      { id: 'bulk-settings', path: 'src/components/bulk-services/BulkServicesSettingsOverview.tsx', description: 'Bulk services settings export', complexity: 'medium', dependencies: [] },
    ],
  },

  // ============ PHASE 9: HR & Admin Exports ============
  {
    id: 'hr-admin',
    number: 9,
    name: 'HR & Admin Exports',
    description: 'Migrate HR and admin PDF generation',
    category: 'Export Components',
    dependencies: ['base-utilities'],
    files: [
      { id: 'payslip', path: 'src/components/hr/GeneratePayslipDialog.tsx', description: 'Payslip PDF generation', complexity: 'medium', dependencies: [] },
      { id: 'site-diary', path: 'src/pages/SiteDiary.tsx', description: 'Site diary PDF export', complexity: 'medium', dependencies: [] },
      { id: 'admin-export', path: 'src/components/admin/roadmap-review/PDFExportDialog.tsx', description: 'Admin roadmap PDF export dialog', complexity: 'medium', dependencies: [] },
    ],
  },

  // ============ PHASE 10: Cleanup & Documentation ============
  {
    id: 'cleanup',
    number: 10,
    name: 'Cleanup & Documentation',
    description: 'Remove jsPDF, update docs, deprecate old utilities',
    category: 'Finalization',
    dependencies: ['hr-admin', 'lighting-bulk', 'tenant-exports', 'project-exports', 'cost-report-sections', 'roadmap-sections'],
    files: [
      { id: 'remove-jspdf', path: 'package.json', description: 'Remove jsPDF and jspdf-autotable dependencies', complexity: 'low', dependencies: [] },
      { id: 'update-docs', path: 'src/utils/PDF_QUICK_START.md', description: 'Update documentation for pdfmake', complexity: 'low', dependencies: [] },
      { id: 'deprecate-old', path: 'src/utils/pdfExportBase.ts', description: 'Mark old utilities as deprecated', complexity: 'low', dependencies: [] },
    ],
  },
];

// Calculate statistics
export const getMigrationStats = () => {
  const totalFiles = pdfMigrationPhases.reduce((sum, p) => sum + p.files.length, 0);
  const highComplexity = pdfMigrationPhases.reduce(
    (sum, p) => sum + p.files.filter(f => f.complexity === 'high').length, 0
  );
  const mediumComplexity = pdfMigrationPhases.reduce(
    (sum, p) => sum + p.files.filter(f => f.complexity === 'medium').length, 0
  );
  const lowComplexity = pdfMigrationPhases.reduce(
    (sum, p) => sum + p.files.filter(f => f.complexity === 'low').length, 0
  );
  
  return { totalFiles, highComplexity, mediumComplexity, lowComplexity };
};
