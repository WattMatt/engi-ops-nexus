/**
 * ============================================================================
 * CANONICAL PDF REPORT TEMPLATE
 * ============================================================================
 * 
 * This is THE SINGLE SOURCE OF TRUTH for PDF generation in this application.
 * Copy this file and modify for any new PDF export.
 * 
 * ============================================================================
 * MANDATORY RULES - NEVER VIOLATE THESE:
 * ============================================================================
 * 
 * 1. IMPORTS: Always import from '@/utils/pdfmake' - NEVER from 'jspdf'
 * 2. DOCUMENT: Always use createDocument() to build documents
 * 3. FONT: Only Roboto is available - NEVER use Courier, monospace, or custom fonts
 * 4. COLORS: Always use PDF_COLORS from styles - NEVER hardcode colors
 * 5. TIMEOUT: Always use .toBlob(90000) for blob generation (90s timeout)
 * 6. IMAGES: Always validate images before adding - filter out 'data:,' or empty URLs
 * 7. TABLES: Use dataTable() or infoTable() helpers - NEVER build tables manually
 * 8. HEADERS/FOOTERS: Use .withStandardHeader() and .withStandardFooter()
 * 
 * ============================================================================
 * QUICK START CHECKLIST:
 * ============================================================================
 * 
 * [ ] Import createDocument and helpers from '@/utils/pdfmake'
 * [ ] Define your data interface
 * [ ] Build content using helpers (heading, paragraph, dataTable, buildMetricCard)
 * [ ] Add standard header/footer
 * [ ] Generate with 90s timeout
 * [ ] Handle errors gracefully with fallback download
 * 
 * ============================================================================
 */

import { 
  // Core document builder
  createDocument,
  
  // Text helpers
  heading,
  paragraph,
  keyValue,
  sectionHeader,
  
  // Table helpers
  dataTable,
  infoTable,
  
  // Layout helpers
  twoColumns,
  stack,
  horizontalLine,
  spacer,
  pageBreak,
  
  // Panel/card helpers
  buildPanel,
  buildInfoBox,
  buildStatusBadge,
  buildMetricCard,
  
  // Styling
  PDF_COLORS,
  FONT_SIZES,
  SPACING,
  tableLayouts,
  
  // Margin utilities
  mt, mb, mx, my,
  
  // Image helpers
  image,
  imageToBase64,
  
  // Cover page
  fetchCompanyDetails,
  generateCoverPageContent,
  
  // Formatting
  formatCurrency,
  formatDate,
  formatPercentage,
  
  // Types
  type Content,
  type TableColumn,
  type DocumentBuilderOptions,
} from '@/utils/pdfmake';
import { format } from 'date-fns';

// ============================================================================
// 1. DEFINE YOUR DATA INTERFACE
// ============================================================================

/**
 * Define the shape of data your report needs.
 * Be explicit about types - avoid 'any'.
 */
export interface CanonicalReportData {
  title: string;
  projectName?: string;
  generatedAt: Date;
  
  // Summary metrics
  metrics: {
    label: string;
    value: string | number;
    status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  }[];
  
  // Table data
  items: {
    id: string;
    name: string;
    category: string;
    value: number;
    status: string;
  }[];
  
  // Optional charts (base64 data URLs)
  charts?: {
    title: string;
    dataUrl: string;
  }[];
}

/**
 * Generation options
 */
export interface CanonicalReportOptions {
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
  confidential?: boolean;
}

// ============================================================================
// 2. CONTENT BUILDER FUNCTIONS
// ============================================================================

/**
 * Build the executive summary section
 */
function buildExecutiveSummary(data: CanonicalReportData): Content[] {
  const content: Content[] = [
    heading('Executive Summary', 1),
    { text: '', margin: [0, 0, 0, SPACING.sm] },
  ];
  
  // Build metrics row using columns
  if (data.metrics.length > 0) {
    const metricsRow = data.metrics.slice(0, 5).map(metric => 
      buildMetricCard(metric.value, metric.label, {
        valueColor: metric.status === 'danger' ? PDF_COLORS.danger :
                    metric.status === 'warning' ? PDF_COLORS.warning :
                    metric.status === 'success' ? PDF_COLORS.success :
                    PDF_COLORS.primary
      })
    );
    
    content.push({
      columns: metricsRow,
      columnGap: SPACING.md,
      margin: [0, 0, 0, SPACING.lg],
    } as Content);
  }
  
  return content;
}

/**
 * Build the main data table section
 */
function buildDataTable(data: CanonicalReportData): Content[] {
  const columns: TableColumn[] = [
    { header: 'ID', field: 'id', width: 60 },
    { header: 'Name', field: 'name', width: '*' },
    { header: 'Category', field: 'category', width: 100 },
    { header: 'Value', field: 'value', width: 80, align: 'right', format: (v) => formatCurrency(v) },
    { header: 'Status', field: 'status', width: 80, align: 'center' },
  ];
  
  return [
    heading('Detailed Data', 2),
    dataTable(columns, data.items, { layout: 'zebra' }),
    spacer(SPACING.lg),
  ];
}

/**
 * Build charts section (if charts provided and valid)
 * CRITICAL: Always validate image data URLs before adding
 */
function buildChartsSection(data: CanonicalReportData): Content[] {
  if (!data.charts || data.charts.length === 0) {
    return [];
  }
  
  // CRITICAL: Filter out invalid images
  const validCharts = data.charts.filter(chart => 
    chart.dataUrl && 
    chart.dataUrl.length > 100 && 
    !chart.dataUrl.startsWith('data:,') // Empty data URL
  );
  
  if (validCharts.length === 0) {
    return [];
  }
  
  const content: Content[] = [
    pageBreak(),
    heading('Charts & Visualizations', 1),
  ];
  
  // Add charts in pairs
  for (let i = 0; i < validCharts.length; i += 2) {
    const chart1 = validCharts[i];
    const chart2 = validCharts[i + 1];
    
    if (chart2) {
      content.push({
        columns: [
          {
            width: '48%',
            stack: [
              { text: chart1.title, style: 'label', margin: [0, 0, 0, 4] },
              image(chart1.dataUrl, { width: 240 }),
            ],
          },
          {
            width: '48%',
            stack: [
              { text: chart2.title, style: 'label', margin: [0, 0, 0, 4] },
              image(chart2.dataUrl, { width: 240 }),
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, SPACING.lg],
      } as Content);
    } else {
      content.push({
        stack: [
          { text: chart1.title, style: 'label', margin: [0, 0, 0, 4] },
          image(chart1.dataUrl, { width: 400, alignment: 'center' }),
        ],
        margin: [0, 0, 0, SPACING.lg],
      } as Content);
    }
  }
  
  return content;
}

// ============================================================================
// 3. MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate the PDF as a Blob
 * 
 * CRITICAL: Always uses 90s timeout for reliability
 */
export async function generateCanonicalReportPDF(
  data: CanonicalReportData,
  options: CanonicalReportOptions = {}
): Promise<Blob> {
  const { orientation = 'portrait', includeCharts = true, confidential = false } = options;
  
  console.log('[CanonicalReport] Starting PDF generation...');
  
  // Create document with standard options
  const doc = createDocument({
    orientation,
    pageSize: 'A4',
  });
  
  // 1. Add cover page (optional - for formal reports)
  try {
    const companyDetails = await fetchCompanyDetails();
    const coverContent = await generateCoverPageContent(
      { 
        title: data.title, 
        projectName: data.projectName,
        subtitle: `Generated: ${format(data.generatedAt, 'dd MMMM yyyy')}`,
      },
      companyDetails
    );
    doc.add(coverContent);
  } catch (error) {
    console.warn('[CanonicalReport] Cover page failed, using simple header:', error);
    doc.add(heading(data.title, 1));
    doc.add(paragraph(`Generated: ${format(data.generatedAt, 'dd MMMM yyyy')}`));
    doc.add(spacer(SPACING.xl));
  }
  
  // 2. Add executive summary
  doc.add(buildExecutiveSummary(data));
  
  // 3. Add data table
  doc.add(buildDataTable(data));
  
  // 4. Add charts (if enabled and available)
  if (includeCharts) {
    doc.add(buildChartsSection(data));
  }
  
  // 5. Configure header and footer
  doc.withStandardHeader(data.title, data.projectName);
  doc.withStandardFooter(confidential);
  
  // 6. Generate with 90s timeout
  console.log('[CanonicalReport] Building PDF...');
  return doc.toBlob(90000);
}

/**
 * Download the PDF directly (most reliable method)
 * 
 * Use this for large/complex reports or when toBlob() times out
 */
export async function downloadCanonicalReportPDF(
  data: CanonicalReportData,
  filename: string,
  options: CanonicalReportOptions = {}
): Promise<void> {
  const { orientation = 'portrait', includeCharts = true, confidential = false } = options;
  
  console.log('[CanonicalReport] Starting direct download...');
  
  const doc = createDocument({
    orientation,
    pageSize: 'A4',
  });
  
  // Build same content as generateCanonicalReportPDF
  doc.add(heading(data.title, 1));
  doc.add(paragraph(`Generated: ${format(data.generatedAt, 'dd MMMM yyyy')}`));
  doc.add(spacer(SPACING.md));
  doc.add(buildExecutiveSummary(data));
  doc.add(buildDataTable(data));
  
  if (includeCharts) {
    doc.add(buildChartsSection(data));
  }
  
  doc.withStandardHeader(data.title, data.projectName);
  doc.withStandardFooter(confidential);
  
  // Direct download - most reliable
  return doc.download(filename);
}

// ============================================================================
// 4. USAGE EXAMPLE
// ============================================================================

/**
 * Example usage:
 * 
 * ```typescript
 * import { generateCanonicalReportPDF, downloadCanonicalReportPDF } from '@/utils/pdfmake/CANONICAL_REPORT';
 * 
 * const data: CanonicalReportData = {
 *   title: 'Monthly Report',
 *   projectName: 'Project Alpha',
 *   generatedAt: new Date(),
 *   metrics: [
 *     { label: 'Total Items', value: 150 },
 *     { label: 'Completed', value: '85%', status: 'success' },
 *     { label: 'At Risk', value: 12, status: 'warning' },
 *   ],
 *   items: [
 *     { id: '001', name: 'Task A', category: 'Development', value: 5000, status: 'Complete' },
 *     { id: '002', name: 'Task B', category: 'Design', value: 3000, status: 'In Progress' },
 *   ],
 * };
 * 
 * // Method 1: Get as Blob (for preview or storage)
 * const blob = await generateCanonicalReportPDF(data);
 * const url = URL.createObjectURL(blob);
 * 
 * // Method 2: Direct download (most reliable)
 * await downloadCanonicalReportPDF(data, 'monthly-report.pdf');
 * ```
 */
