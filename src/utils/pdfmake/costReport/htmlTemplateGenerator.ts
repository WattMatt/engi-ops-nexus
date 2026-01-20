/**
 * HTML Template Generator for Cost Report PDF
 * 
 * This generates an HTML document that mirrors the exact Cost Report template
 * for use with PDFShift as a fallback to pdfmake.
 */

// South African currency format with spaces
const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return 'R0,00';
  const formatted = Math.abs(value).toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `R${formatted.replace(/,/g, ' ')}`;
};

// Variance format: savings = no sign, extras = + sign
const formatVariance = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return 'R0,00';
  const absFormatted = Math.abs(value).toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).replace(/,/g, ' ');
  // Negative variance (extra cost) shows + sign
  if (value < 0) {
    return `+R${absFormatted}`;
  }
  return `R${absFormatted}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatLongDate = (dateStr: string | null): string => {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Category colors for cards
const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
];

export interface CostReportHtmlData {
  report: {
    id: string;
    project_name: string;
    project_number?: string;
    report_number?: number;
    revision?: string;
    report_date?: string;
    project_id?: string;
  };
  categoriesData: Array<{
    id: string;
    code?: string;
    category_code?: string;
    description?: string;
    name?: string;
    cost_line_items?: Array<{
      id: string;
      description?: string;
      original_budget?: number;
      contract_sum?: number;
      previous_report?: number;
      anticipated_final?: number;
    }>;
  }>;
  variationsData: Array<{
    id: string;
    code?: string;
    description?: string;
    total_amount?: number;
    amount?: number;
    is_credit?: boolean;
    tenants?: { shop_name?: string; shop_number?: string };
    variation_line_items?: Array<{
      line_number?: number;
      description?: string;
      comments?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
    }>;
  }>;
  categoryTotals: Array<{
    code: string;
    description: string;
    originalBudget: number;
    previousReport?: number;
    anticipatedFinal: number;
  }>;
  grandTotals: {
    originalBudget: number;
    previousReport?: number;
    anticipatedFinal: number;
  };
  companyDetails: {
    companyName?: string;
    contactName?: string;
    company_logo_url?: string | null;
    client_logo_url?: string | null;
  };
  options?: {
    includeCoverPage?: boolean;
    includeExecutiveSummary?: boolean;
    includeCategoryDetails?: boolean;
    includeDetailedLineItems?: boolean;
    includeVariations?: boolean;
  };
}

/**
 * Generate complete HTML document for Cost Report
 */
export function generateCostReportHtml(data: CostReportHtmlData): string {
  const { report, categoriesData, variationsData, categoryTotals, grandTotals, companyDetails, options = {} } = data;
  
  const {
    includeCoverPage = true,
    includeExecutiveSummary = true,
    includeCategoryDetails = true,
    includeDetailedLineItems = true,
    includeVariations = true,
  } = options;

  const sections: string[] = [];

  // Cover Page
  if (includeCoverPage) {
    sections.push(buildCoverPage(report, companyDetails));
  }

  // Executive Summary
  if (includeExecutiveSummary && categoryTotals?.length > 0) {
    sections.push(buildExecutiveSummary(report, categoryTotals, grandTotals));
  }

  // Category Performance Details
  if (includeCategoryDetails && categoryTotals?.length > 0) {
    sections.push(buildCategoryDetails(report, categoryTotals));
  }

  // Detailed Line Items
  if (includeDetailedLineItems && categoriesData?.length > 0) {
    sections.push(buildDetailedLineItems(report, categoriesData));
  }

  // Variation Orders
  if (includeVariations && variationsData?.length > 0) {
    sections.push(buildVariationsSummary(report, variationsData));
    sections.push(...buildVariationSheets(report, variationsData));
  }

  return buildFullDocument(sections);
}

/**
 * Build the full HTML document with styles
 */
function buildFullDocument(sections: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cost Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }
    
    .page {
      page-break-after: always;
      padding: 40px;
      min-height: 100vh;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding-top: 80px;
    }
    
    .cover-logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 60px;
      margin-bottom: 60px;
    }
    
    .company-logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 60px;
    }
    
    .cover-logos .company-logo {
      margin-bottom: 0;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 20px;
    }
    
    .cover-project {
      font-size: 18pt;
      color: #374151;
      margin-bottom: 60px;
    }
    
    .cover-meta-table {
      border-collapse: collapse;
      margin-bottom: 80px;
    }
    
    .cover-meta-table td {
      padding: 5px 15px;
      font-size: 10pt;
    }
    
    .cover-meta-table td:first-child {
      font-weight: 700;
      color: #6b7280;
      text-align: right;
    }
    
    .cover-company {
      font-size: 11pt;
      color: #374151;
    }
    
    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #374151;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    /* Section Headers */
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      text-align: center;
      margin-bottom: 5px;
      color: #1f2937;
    }
    
    .section-subtitle {
      font-size: 9pt;
      color: #6b7280;
      text-align: center;
      margin-bottom: 15px;
    }
    
    .section-divider {
      border-top: 1px solid #d1d5db;
      margin-bottom: 20px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      padding: 6px 8px;
      font-size: 8pt;
      border: 0.5px solid #e5e7eb;
    }
    
    th {
      background-color: #1e3a5f;
      color: white;
      font-weight: 700;
      text-align: left;
    }
    
    th.right, td.right {
      text-align: right;
    }
    
    th.center, td.center {
      text-align: center;
    }
    
    /* Zebra striping */
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    tbody tr:nth-child(odd) {
      background-color: white;
    }
    
    .total-row {
      background-color: #f3f4f6 !important;
      font-weight: 700;
    }
    
    .variance-positive {
      color: #16a34a;
    }
    
    .variance-negative {
      color: #dc2626;
    }
    
    /* Category Cards */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }
    
    .category-card {
      border: 1px solid #e5e7eb;
      padding: 12px;
      border-radius: 4px;
    }
    
    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .card-code {
      padding: 2px 8px;
      color: white;
      font-size: 8pt;
      font-weight: 700;
      border-radius: 2px;
      margin-right: 8px;
    }
    
    .card-description {
      font-size: 8pt;
      font-weight: 700;
    }
    
    .card-body {
      display: flex;
      justify-content: space-between;
    }
    
    .card-metrics label {
      font-size: 6pt;
      color: #6b7280;
      display: block;
      margin-top: 5px;
    }
    
    .card-metrics .value {
      font-size: 9pt;
      font-weight: 700;
    }
    
    .card-variance {
      text-align: right;
    }
    
    .card-variance .amount {
      font-size: 9pt;
      font-weight: 700;
    }
    
    .card-variance .label {
      font-size: 6pt;
      font-weight: 700;
      margin-top: 3px;
    }
    
    /* Category Section Header */
    .category-header {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a5f;
      margin: 15px 0 10px;
    }
    
    /* Tenant Account (Variation Sheet) */
    .tenant-header {
      font-size: 14pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 15px;
    }
    
    .tenant-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    
    .tenant-meta-item {
      font-size: 9pt;
    }
    
    .tenant-meta-item strong {
      font-weight: 700;
    }
    
    .tenant-name {
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 15px;
    }
    
    .tenant-table th {
      background-color: #06b6d4;
    }
    
    .tenant-total {
      font-size: 10pt;
      font-weight: 700;
      text-align: right;
      margin-top: 15px;
    }
    
    /* Page Footer */
    .page-footer {
      position: absolute;
      bottom: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
${sections.join('\n')}
</body>
</html>`;
}

/**
 * Build Cover Page
 */
function buildCoverPage(report: CostReportHtmlData['report'], companyDetails: CostReportHtmlData['companyDetails']): string {
  // Build logo section - show both logos side by side if both exist
  let logoHtml = '';
  
  if (companyDetails.company_logo_url && companyDetails.client_logo_url) {
    // Both logos - side by side
    logoHtml = `
      <div class="cover-logos">
        <img src="${companyDetails.company_logo_url}" alt="Company Logo" class="company-logo" />
        <img src="${companyDetails.client_logo_url}" alt="Client Logo" class="company-logo" />
      </div>
    `;
  } else if (companyDetails.company_logo_url) {
    logoHtml = `<img src="${companyDetails.company_logo_url}" alt="Company Logo" class="company-logo" />`;
  } else if (companyDetails.client_logo_url) {
    logoHtml = `<img src="${companyDetails.client_logo_url}" alt="Client Logo" class="company-logo" />`;
  }

  return `
<div class="page cover-page">
  ${logoHtml}
  <h1 class="cover-title">COST REPORT</h1>
  <h2 class="cover-project">${report.project_name || 'Project Name'}</h2>
  <table class="cover-meta-table">
    <tr>
      <td>Report No:</td>
      <td>${report.report_number || '1'}</td>
    </tr>
    <tr>
      <td>Revision:</td>
      <td>${report.revision || 'A'}</td>
    </tr>
    <tr>
      <td>Date:</td>
      <td>${formatLongDate(report.report_date || null)}</td>
    </tr>
  </table>
  <div class="cover-company">${companyDetails.companyName || ''}</div>
</div>`;
}

/**
 * Build Executive Summary
 */
function buildExecutiveSummary(
  report: CostReportHtmlData['report'], 
  categoryTotals: CostReportHtmlData['categoryTotals'],
  grandTotals: CostReportHtmlData['grandTotals']
): string {
  const totalAnticipated = grandTotals?.anticipatedFinal || categoryTotals.reduce((sum, c) => sum + (c.anticipatedFinal || 0), 0);

  const rows = categoryTotals.map((cat, idx) => {
    const pct = totalAnticipated > 0 ? ((cat.anticipatedFinal || 0) / totalAnticipated * 100).toFixed(1) : '0.0';
    const originalVar = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
    const currentVar = (cat.previousReport || cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
    const varClass = originalVar >= 0 ? 'variance-positive' : 'variance-negative';
    const curVarClass = currentVar >= 0 ? 'variance-positive' : 'variance-negative';

    return `
      <tr>
        <td class="center"><strong>${cat.code || '-'}</strong></td>
        <td>${cat.description || '-'}</td>
        <td class="right">${formatCurrency(cat.originalBudget)}</td>
        <td class="right">${formatCurrency(cat.previousReport || cat.originalBudget)}</td>
        <td class="right">${formatCurrency(cat.anticipatedFinal)}</td>
        <td class="center">${pct}%</td>
        <td class="right ${varClass}">${formatVariance(originalVar)}</td>
        <td class="right ${curVarClass}">${formatVariance(currentVar)}</td>
      </tr>`;
  }).join('');

  const grandOriginalBudget = grandTotals?.originalBudget || categoryTotals.reduce((s, c) => s + (c.originalBudget || 0), 0);
  const grandPreviousReport = grandTotals?.previousReport || grandOriginalBudget;
  const grandAnticipatedFinal = grandTotals?.anticipatedFinal || categoryTotals.reduce((s, c) => s + (c.anticipatedFinal || 0), 0);
  const grandOriginalVar = grandOriginalBudget - grandAnticipatedFinal;
  const grandCurrentVar = grandPreviousReport - grandAnticipatedFinal;
  const grandVarClass = grandOriginalVar >= 0 ? 'variance-positive' : 'variance-negative';
  const grandCurVarClass = grandCurrentVar >= 0 ? 'variance-positive' : 'variance-negative';

  return `
<div class="page">
  <div class="page-header">
    <span>${report.project_name || 'Cost Report'} - ${report.revision || 'A'}</span>
    <span>${formatDate(report.report_date || null)}</span>
  </div>
  
  <h1 class="section-title">EXECUTIVE SUMMARY</h1>
  <p class="section-subtitle">Key Performance Indicators &amp; Financial Overview</p>
  <div class="section-divider"></div>
  
  <table>
    <thead>
      <tr>
        <th class="center" style="width: 30px;">CODE</th>
        <th>CATEGORY</th>
        <th class="right" style="width: 90px;">ORIGINAL BUDGET</th>
        <th class="right" style="width: 90px;">PREVIOUS REPORT</th>
        <th class="right" style="width: 90px;">ANTICIPATED FINAL</th>
        <th class="center" style="width: 70px;">% OF CURRENT TOTAL</th>
        <th class="right" style="width: 85px;">ORIGINAL VARIANCE</th>
        <th class="right" style="width: 75px;">VARIANCE</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2"><strong>GRAND TOTAL</strong></td>
        <td class="right"><strong>${formatCurrency(grandOriginalBudget)}</strong></td>
        <td class="right"><strong>${formatCurrency(grandPreviousReport)}</strong></td>
        <td class="right"><strong>${formatCurrency(grandAnticipatedFinal)}</strong></td>
        <td class="center"><strong>100.0%</strong></td>
        <td class="right ${grandVarClass}"><strong>${formatVariance(grandOriginalVar)}</strong></td>
        <td class="right ${grandCurVarClass}"><strong>${formatVariance(grandCurrentVar)}</strong></td>
      </tr>
    </tbody>
  </table>
</div>`;
}

/**
 * Build Category Performance Details
 */
function buildCategoryDetails(
  report: CostReportHtmlData['report'],
  categoryTotals: CostReportHtmlData['categoryTotals']
): string {
  const cards = categoryTotals.map((cat, idx) => {
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const variance = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
    const isSaving = variance >= 0;
    const varColor = isSaving ? '#16a34a' : '#dc2626';
    const varLabel = isSaving ? 'SAVING' : 'EXTRA';
    const varDisplay = isSaving ? `-${formatCurrency(Math.abs(variance))}` : `+${formatCurrency(Math.abs(variance))}`;

    return `
      <div class="category-card">
        <div class="card-header">
          <span class="card-code" style="background-color: ${color};">${cat.code || '-'}</span>
          <span class="card-description">${cat.description || '-'}</span>
        </div>
        <div class="card-body">
          <div class="card-metrics">
            <label>ORIGINAL BUDGET</label>
            <span class="value">${formatCurrency(cat.originalBudget)}</span>
            <label>ANTICIPATED FINAL</label>
            <span class="value">${formatCurrency(cat.anticipatedFinal)}</span>
          </div>
          <div class="card-variance">
            <div class="amount" style="color: ${varColor};">${varDisplay}</div>
            <div class="label" style="color: ${varColor};">${varLabel}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
<div class="page">
  <div class="page-header">
    <span>${report.project_name || 'Cost Report'} - ${report.revision || 'A'}</span>
    <span>${formatDate(report.report_date || null)}</span>
  </div>
  
  <h1 class="section-title">CATEGORY PERFORMANCE DETAILS</h1>
  <div class="section-divider"></div>
  
  <div class="cards-grid">
    ${cards}
  </div>
</div>`;
}

/**
 * Build Detailed Line Items
 */
function buildDetailedLineItems(
  report: CostReportHtmlData['report'],
  categoriesData: CostReportHtmlData['categoriesData']
): string {
  const sortedCategories = [...categoriesData].sort((a, b) => {
    const codeA = a.code || a.category_code || '';
    const codeB = b.code || b.category_code || '';
    return codeA.localeCompare(codeB);
  });

  const categoryTables = sortedCategories.map(category => {
    const lineItems = category.cost_line_items || [];
    const catCode = category.code || category.category_code || '';
    const catDesc = category.description || category.name || 'Category';

    if (lineItems.length === 0) return '';

    let categoryTotal = 0;
    const rows = lineItems.map((item, idx) => {
      const anticipated = item.anticipated_final ?? item.contract_sum ?? 0;
      categoryTotal += anticipated;
      return `
        <tr>
          <td>${item.description || '-'}</td>
          <td class="right">${formatCurrency(item.original_budget ?? item.contract_sum ?? 0)}</td>
          <td class="right">${formatCurrency(item.previous_report ?? item.contract_sum ?? 0)}</td>
          <td class="right">${formatCurrency(anticipated)}</td>
        </tr>`;
    }).join('');

    return `
      <h3 class="category-header">${catCode}  ${catDesc}</h3>
      <table>
        <thead>
          <tr>
            <th style="background-color: #374151;">Description</th>
            <th class="right" style="width: 100px; background-color: #374151;">Original Budget</th>
            <th class="right" style="width: 100px; background-color: #374151;">Previous Report</th>
            <th class="right" style="width: 100px; background-color: #374151;">Anticipated Final</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td><strong>${catCode} Total</strong></td>
            <td></td>
            <td></td>
            <td class="right"><strong>${formatCurrency(categoryTotal)}</strong></td>
          </tr>
        </tbody>
      </table>`;
  }).join('');

  return `
<div class="page">
  <div class="page-header">
    <span>${report.project_name || 'Cost Report'} - ${report.revision || 'A'}</span>
    <span>${formatDate(report.report_date || null)}</span>
  </div>
  
  <h1 class="section-title">DETAILED LINE ITEMS</h1>
  <p class="section-subtitle">Complete Breakdown by Category</p>
  <div class="section-divider"></div>
  
  ${categoryTables}
</div>`;
}

/**
 * Build Variation Orders Summary
 */
function buildVariationsSummary(
  report: CostReportHtmlData['report'],
  variationsData: CostReportHtmlData['variationsData']
): string {
  const rows = variationsData.map((v, idx) => {
    const typeClass = v.is_credit ? 'variance-positive' : 'variance-negative';
    const typeLabel = v.is_credit ? 'Credit' : 'Debit';
    return `
      <tr>
        <td class="center"><strong>${v.code || '-'}</strong></td>
        <td>${v.description || '-'}</td>
        <td class="right">${formatCurrency(v.total_amount || v.amount || 0)}</td>
        <td class="center ${typeClass}"><strong>${typeLabel}</strong></td>
      </tr>`;
  }).join('');

  return `
<div class="page">
  <div class="page-header">
    <span>${report.project_name || 'Cost Report'} - ${report.revision || 'A'}</span>
    <span>${formatDate(report.report_date || null)}</span>
  </div>
  
  <h1 class="section-title">VARIATION ORDERS SUMMARY</h1>
  <p class="section-subtitle">Overview of All Variation Orders</p>
  <div class="section-divider"></div>
  
  <table>
    <thead>
      <tr>
        <th class="center" style="width: 40px;">No.</th>
        <th>Description</th>
        <th class="right" style="width: 100px;">Amount</th>
        <th class="center" style="width: 60px;">Type</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>`;
}

/**
 * Build Individual Variation Sheets (TENANT ACCOUNT format)
 */
function buildVariationSheets(
  report: CostReportHtmlData['report'],
  variationsData: CostReportHtmlData['variationsData']
): string[] {
  return variationsData.map(variation => {
    const lineItems = variation.variation_line_items || [];
    const tenantName = variation.tenants?.shop_name || variation.description || 'Variation';

    const rows = lineItems.length > 0 
      ? lineItems.map((item, idx) => `
          <tr>
            <td class="center">${item.line_number || idx + 1}</td>
            <td>${item.description || '-'}</td>
            <td>${item.comments || ''}</td>
            <td class="center">${item.quantity ?? 1}</td>
            <td class="right">${formatCurrency(item.rate || 0)}</td>
            <td class="right">${formatCurrency(item.amount || 0)}</td>
          </tr>`).join('')
      : '<tr><td colspan="6" class="center">No line items</td></tr>';

    const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0) || variation.total_amount || 0;

    return `
<div class="page">
  <h2 class="tenant-header">TENANT ACCOUNT</h2>
  
  <div class="tenant-meta">
    <div>
      <div class="tenant-meta-item"><strong>PROJECT:</strong> ${report.project_name || ''}</div>
      <div class="tenant-meta-item" style="margin-top: 5px;"><strong>VARIATION ORDER NO.:</strong> ${variation.code || ''}</div>
    </div>
    <div style="text-align: right;">
      <div class="tenant-meta-item"><strong>DATE:</strong> ${formatDate(report.report_date || null)}</div>
      <div class="tenant-meta-item" style="margin-top: 5px;"><strong>REVISION:</strong> 0</div>
    </div>
  </div>
  
  <div class="tenant-name">${tenantName}</div>
  
  <table class="tenant-table">
    <thead>
      <tr>
        <th class="center" style="width: 25px;">N</th>
        <th>DESCRIPTION</th>
        <th>COMMENTS/DETAIL</th>
        <th class="center" style="width: 40px;">QTY</th>
        <th class="right" style="width: 70px;">RATE:</th>
        <th class="right" style="width: 80px;">AMOUNT:</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  
  <div class="tenant-total">TOTAL ADDITIONAL WORKS EXCLUSIVE OF VAT    ${formatCurrency(totalAmount)}</div>
</div>`;
  });
}
