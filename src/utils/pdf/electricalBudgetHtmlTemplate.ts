/**
 * HTML Template Generator for Electrical Budget PDF
 * 
 * Generates a professional HTML document for use with PDFShift.
 * Structure: Cover Page → Index → Introduction → Baseline Allowances → 
 * Reference Drawings → BOQ Sections & Items → Exclusions
 */

// South African currency format
const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return 'R0,00';
  const formatted = Math.abs(value).toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `R${formatted.replace(/,/g, ' ')}`;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ============================================================================
// DATA TYPES
// ============================================================================

export interface ElectricalBudgetPdfData {
  budget: {
    id: string;
    budget_number: string;
    revision: string;
    budget_date: string;
    notes?: string | null;
    baseline_allowances?: string | null;
    exclusions?: string | null;
    prepared_for_company?: string | null;
    prepared_for_contact?: string | null;
    prepared_for_tel?: string | null;
    prepared_by_contact?: string | null;
    client_logo_url?: string | null;
    consultant_logo_url?: string | null;
  };
  project?: {
    name?: string;
    project_number?: string;
    address?: string;
  } | null;
  sections: Array<{
    id: string;
    section_code: string;
    section_name: string;
    display_order: number;
    items: Array<{
      id: string;
      item_number?: string | null;
      description: string;
      area?: number | null;
      area_unit?: string | null;
      base_rate?: number | null;
      ti_rate?: number | null;
      total: number;
      display_order: number;
    }>;
  }>;
  referenceDrawings: Array<{
    id: string;
    file_name: string;
    drawing_number?: string | null;
    revision?: string | null;
    description?: string | null;
  }>;
  companySettings?: {
    company_name?: string | null;
    company_logo_url?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    company_address?: string | null;
  } | null;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function generateElectricalBudgetHtml(data: ElectricalBudgetPdfData): string {
  const sections: string[] = [];
  
  // 1. Cover Page
  sections.push(buildCoverPage(data));
  
  // 2. Index Page
  sections.push(buildIndexPage(data));
  
  // 3. Introduction
  sections.push(buildIntroductionPage(data));
  
  // 4. Baseline Allowances (if available)
  if (data.budget.baseline_allowances && data.budget.baseline_allowances !== '<p></p>') {
    sections.push(buildBaselineAllowancesPage(data));
  }
  
  // 5. Reference Drawings (if available)
  if (data.referenceDrawings.length > 0) {
    sections.push(buildReferenceDrawingsPage(data));
  }
  
  // 6. Combined BOQ - All sections in one continuous table with exclusions at bottom
  sections.push(buildCombinedBoqPage(data));
  
  return buildFullDocument(sections, data);
}

// ============================================================================
// DOCUMENT STRUCTURE
// ============================================================================

function buildFullDocument(sections: string[], data: ElectricalBudgetPdfData): string {
  const projectName = data.project?.name || 'Electrical Budget';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Electrical Budget</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    /* ============================================================
       PDF PRINT OPTIMIZATION - Core Reset
       ============================================================ */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    /* @page rules are consolidated in the footer section */
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ============================================================
       PAGE STRUCTURE & BREAKS
       ============================================================ */
    .page {
      page-break-after: always;
      page-break-inside: avoid;
      position: relative;
      padding: 0 0 50px 0;
      min-height: 100vh;
      box-sizing: border-box;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Content-flow pages allow content to span multiple pages naturally */
    .content-flow-page {
      page-break-after: always;
      page-break-inside: auto;
      min-height: 100vh;
      padding: 0 0 50px 0;
    }
    
    /* Prevent orphans/widows in text content */
    p, li {
      orphans: 3;
      widows: 3;
    }
    
    /* Keep headings with their content */
    h1, h2, h3, .section-title, .section-badge {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* ============================================================
       COVER PAGE - Fixed Full Page Layout
       ============================================================ */
    .cover-page {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 0;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      page-break-after: always;
    }
    
    .cover-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 10px;
      background: linear-gradient(180deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
    }
    
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 30px 40px;
    }
    
    .cover-logo {
      max-width: 140px;
      max-height: 60px;
      object-fit: contain;
    }
    
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 30px 40px;
      text-align: center;
    }
    
    .cover-doc-type {
      font-size: 12pt;
      font-weight: 500;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }
    
    .cover-title {
      font-size: 26pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    
    .cover-project {
      font-size: 13pt;
      color: #475569;
      margin-bottom: 35px;
    }
    
    .cover-meta {
      display: flex;
      gap: 30px;
      margin-bottom: 35px;
    }
    
    .cover-meta-item {
      text-align: center;
    }
    
    .cover-meta-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    
    .cover-meta-value {
      font-size: 12pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    .cover-footer {
      display: flex;
      justify-content: space-between;
      padding: 30px 40px;
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
    }
    
    .cover-contact {
      flex: 1;
    }
    
    .cover-contact-title {
      font-size: 9pt;
      font-weight: 700;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .cover-contact-name {
      font-size: 11pt;
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 4px;
    }
    
    .cover-contact-detail {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 2px;
    }
    
    /* ============================================================
       PAGE HEADER (non-cover pages)
       ============================================================ */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .page-header-left {
      font-size: 8pt;
      color: #64748b;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .page-header-right {
      font-size: 8pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    /* ============================================================
       SECTION TITLES & HEADINGS
       ============================================================ */
    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 3px solid #3b82f6;
      page-break-after: avoid;
    }
    
    .section-subtitle {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 15px;
    }
    
    .section-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 3px 10px;
      border-radius: 3px;
      font-size: 8pt;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    /* ============================================================
       INDEX PAGE
       ============================================================ */
    .index-list {
      list-style: none;
      padding: 0;
    }
    
    .index-item {
      display: flex;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px dotted #d1d5db;
      page-break-inside: avoid;
    }
    
    .index-number {
      font-size: 9pt;
      font-weight: 700;
      color: #3b82f6;
      min-width: 30px;
    }
    
    .index-title {
      flex: 1;
      font-size: 8pt;
      color: #1f2937;
    }
    
    /* ============================================================
       RICH TEXT CONTENT (Baseline Allowances, Exclusions)
       ============================================================ */
    .rich-content {
      font-size: 8pt;
      line-height: 1.45;
      color: #374151;
    }
    
    .rich-content h1 { 
      font-size: 12pt; 
      font-weight: 700; 
      margin: 10px 0 6px; 
      color: #1e3a5f; 
      page-break-after: avoid;
    }
    .rich-content h2 { 
      font-size: 10pt; 
      font-weight: 600; 
      margin: 8px 0 5px; 
      color: #1e3a5f; 
      page-break-after: avoid;
    }
    .rich-content h3 { 
      font-size: 9pt; 
      font-weight: 600; 
      margin: 6px 0 4px; 
      color: #374151; 
      page-break-after: avoid;
    }
    .rich-content p { 
      margin-bottom: 6px; 
    }
    .rich-content ul, .rich-content ol { 
      margin: 4px 0 8px 18px; 
    }
    .rich-content li { 
      margin-bottom: 3px;
      page-break-inside: avoid;
    }
    .rich-content blockquote {
      border-left: 3px solid #3b82f6;
      padding-left: 12px;
      margin: 10px 0;
      color: #64748b;
      font-style: italic;
    }
    
    /* ============================================================
       TABLES - Optimized for PDF Print
       ============================================================ */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 7pt;
      table-layout: fixed;
    }
    
    thead {
      display: table-header-group;
    }
    
    tbody {
      display: table-row-group;
    }
    
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    th, td {
      padding: 4px 6px;
      border: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    th {
      background: #1e3a5f;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-size: 6.5pt;
      white-space: nowrap;
    }
    
    th.right, td.right {
      text-align: right;
    }
    
    th.center, td.center {
      text-align: center;
    }
    
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    tbody tr:nth-child(odd) {
      background: white;
    }
    
    .total-row {
      background: #1e3a5f !important;
      color: white;
      font-weight: 700;
    }
    
    .total-row td {
      border-color: #1e3a5f;
      padding: 8px;
    }
    
    .subtotal-row {
      background: #e2e8f0 !important;
      font-weight: 600;
    }
    
    .subtotal-row td {
      padding: 7px 8px;
    }
    
    /* ============================================================
       SUMMARY CARDS
       ============================================================ */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .summary-card-label {
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .summary-card-value {
      font-size: 14pt;
      font-weight: 700;
      color: #1e3a5f;
    }
    
    .summary-card-highlight {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
    }
    
    .summary-card-highlight .summary-card-label {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .summary-card-highlight .summary-card-value {
      color: white;
    }
    
    /* ============================================================
       REFERENCE DRAWINGS TABLE - Specific Widths
       ============================================================ */
    .drawings-table th:first-child { width: 6%; }
    .drawings-table th:nth-child(2) { width: 18%; }
    .drawings-table th:nth-child(3) { width: 62%; }
    .drawings-table th:nth-child(4) { width: 14%; }
    
    .drawings-table td {
      font-size: 7.5pt;
    }
    
    /* ============================================================
       INFO BOX
       ============================================================ */
    .info-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 3px solid #0284c7;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
    }
    
    .info-box-title {
      font-weight: 600;
      color: #0369a1;
      margin-bottom: 3px;
      font-size: 9pt;
    }
    
    .info-box-content {
      color: #0c4a6e;
      font-size: 8pt;
      line-height: 1.4;
    }
    
    /* ============================================================
       COMBINED BOQ TABLE - Continuous Flow with Reduced Font
       ============================================================ */
    .combined-boq-table {
      font-size: 7pt;
    }
    
    .combined-boq-table .section-header-row {
      background: #f1f5f9 !important;
      border-top: 2px solid #1e3a5f;
    }
    
    .combined-boq-table .section-header-row td {
      padding: 5px 6px;
      font-weight: 700;
      color: #1e3a5f;
      font-size: 7.5pt;
    }
    
    .combined-boq-table .item-code {
      color: #64748b;
      font-size: 6.5pt;
    }
    
    .combined-boq-table .spacer-row td {
      padding: 2px;
      border: none;
      background: white !important;
    }
    
    .combined-boq-table .exclusions-content {
      padding: 8px;
      background: #fefce8 !important;
      border-left: 3px solid #eab308;
    }
    
    .combined-boq-table .exclusions-content .rich-content {
      font-size: 7pt;
    }
    
    /* ============================================================
       PAGE FOOTER - Fixed at Bottom
       ============================================================ */
    .page-footer {
      display: none; /* Hide inline footers - use running footer instead */
    }
    
    /* Running footer for all pages */
    .running-footer {
      position: running(footer);
      font-size: 7pt;
      color: #94a3b8;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
      
      @bottom-center {
        content: element(footer);
      }
    }
    
    /* First page (cover) has no footer */
    @page :first {
      margin-bottom: 15mm;
      
      @bottom-center {
        content: none;
      }
    }
    
    /* ============================================================
       PRINT-SPECIFIC OVERRIDES
       ============================================================ */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .page {
        page-break-after: always;
        margin: 0;
        padding: 0;
        min-height: auto;
      }
      
      .cover-page {
        height: 100vh;
        padding-bottom: 0;
      }
      
      table {
        page-break-inside: auto;
      }
      
      thead {
        display: table-header-group;
      }
      
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
${sections.join('\n')}

<!-- Running footer element - placed after content, CSS running() extracts it -->
<div class="running-footer">
  <span>${data.companySettings?.company_name || 'Electrical Budget Report'}</span>
  <span>${data.project?.name || ''}</span>
  <span>${formatDate(new Date().toISOString())}</span>
</div>
</body>
</html>`;
}

// ============================================================================
// PAGE BUILDERS
// ============================================================================

function buildCoverPage(data: ElectricalBudgetPdfData): string {
  const projectName = data.project?.name || 'Electrical Budget';
  const companyName = data.companySettings?.company_name || '';
  const companyLogo = data.companySettings?.company_logo_url || data.budget.consultant_logo_url;
  const clientLogo = data.budget.client_logo_url;
  
  return `
  <div class="page cover-page">
    <div class="cover-accent"></div>
    
    <div class="cover-header">
      ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" class="cover-logo">` : '<div></div>'}
      ${clientLogo ? `<img src="${clientLogo}" alt="Client Logo" class="cover-logo">` : '<div></div>'}
    </div>
    
    <div class="cover-content">
      <div class="cover-doc-type">Electrical Budget</div>
      <h1 class="cover-title">${projectName}</h1>
      <p class="cover-project">${data.project?.address || 'Budget Estimate Document'}</p>
      
      <div class="cover-meta">
        <div class="cover-meta-item">
          <div class="cover-meta-label">Budget No.</div>
          <div class="cover-meta-value">${data.budget.budget_number}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Revision</div>
          <div class="cover-meta-value">${data.budget.revision}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Date</div>
          <div class="cover-meta-value">${formatDate(data.budget.budget_date)}</div>
        </div>
      </div>
    </div>
    
    <div class="cover-footer">
      <div class="cover-contact">
        <div class="cover-contact-title">Prepared By</div>
        <div class="cover-contact-name">${companyName}</div>
        ${data.budget.prepared_by_contact ? `<div class="cover-contact-detail">${data.budget.prepared_by_contact}</div>` : ''}
        ${data.companySettings?.contact_phone ? `<div class="cover-contact-detail">${data.companySettings.contact_phone}</div>` : ''}
        ${data.companySettings?.contact_email ? `<div class="cover-contact-detail">${data.companySettings.contact_email}</div>` : ''}
      </div>
      
      ${data.budget.prepared_for_company ? `
      <div class="cover-contact">
        <div class="cover-contact-title">Prepared For</div>
        <div class="cover-contact-name">${data.budget.prepared_for_company}</div>
        ${data.budget.prepared_for_contact ? `<div class="cover-contact-detail">${data.budget.prepared_for_contact}</div>` : ''}
        ${data.budget.prepared_for_tel ? `<div class="cover-contact-detail">${data.budget.prepared_for_tel}</div>` : ''}
      </div>
      ` : ''}
    </div>
  </div>`;
}

function buildIndexPage(data: ElectricalBudgetPdfData): string {
  const items: Array<{ number: string; title: string }> = [];
  let sectionNum = 1;
  
  items.push({ number: String(sectionNum++), title: 'Introduction' });
  
  if (data.budget.baseline_allowances && data.budget.baseline_allowances !== '<p></p>') {
    items.push({ number: String(sectionNum++), title: 'Baseline Allowances' });
  }
  
  if (data.referenceDrawings.length > 0) {
    items.push({ number: String(sectionNum++), title: 'Reference Drawings' });
  }
  
  // Combined BOQ with all sections
  items.push({ number: String(sectionNum++), title: 'Bill of Quantities' });
  
  // List individual sections as sub-items
  data.sections.forEach((section, idx) => {
    items.push({ 
      number: `${sectionNum - 1}.${idx + 1}`, 
      title: `${section.section_code} - ${section.section_name}` 
    });
  });
  
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">Table of Contents</h1>
    <p class="section-subtitle">Document structure and navigation</p>
    
    <ul class="index-list">
      ${items.map(item => `
        <li class="index-item">
          <span class="index-number">${item.number}</span>
          <span class="index-title">${item.title}</span>
        </li>
      `).join('')}
    </ul>
    
    ${buildPageFooter(data, 'i')}
  </div>`;
}

function buildIntroductionPage(data: ElectricalBudgetPdfData): string {
  const projectName = data.project?.name || 'the project';
  const totalBudget = data.sections.reduce((sum, section) => 
    sum + section.items.reduce((itemSum, item) => itemSum + (item.total || 0), 0), 0
  );
  
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">1. Introduction</h1>
    <p class="section-subtitle">Project overview and budget summary</p>
    
    <div class="rich-content">
      <p>This document presents the electrical budget estimate for <strong>${projectName}</strong>. 
      The budget has been prepared in accordance with the project specifications and drawings provided.</p>
      
      ${data.budget.notes ? `
      <div class="info-box">
        <div class="info-box-title">Project Notes</div>
        <div class="info-box-content">${data.budget.notes}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">Budget Number</div>
        <div class="summary-card-value">${data.budget.budget_number}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Revision</div>
        <div class="summary-card-value">${data.budget.revision}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Budget Date</div>
        <div class="summary-card-value">${formatDate(data.budget.budget_date)}</div>
      </div>
    </div>
    
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">Total Sections</div>
        <div class="summary-card-value">${data.sections.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Total Line Items</div>
        <div class="summary-card-value">${data.sections.reduce((sum, s) => sum + s.items.length, 0)}</div>
      </div>
      <div class="summary-card summary-card-highlight">
        <div class="summary-card-label">Total Budget</div>
        <div class="summary-card-value">${formatCurrency(totalBudget)}</div>
      </div>
    </div>
    
    ${buildPageFooter(data, '1')}
  </div>`;
}

function buildBaselineAllowancesPage(data: ElectricalBudgetPdfData): string {
  // Rich content can span multiple pages - use a content-flow approach
  return `
  <div class="page content-flow-page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">2. Baseline Allowances</h1>
    <p class="section-subtitle">Standard allowances and assumptions included in this budget</p>
    
    <div class="rich-content">
      ${data.budget.baseline_allowances || ''}
    </div>
  </div>`;
}

function buildReferenceDrawingsPage(data: ElectricalBudgetPdfData): string {
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">Reference Drawings</h1>
    <p class="section-subtitle">Drawings and documents used for this budget estimate</p>
    
    <table class="drawings-table">
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Drawing Number</th>
          <th>File Name</th>
          <th class="center">Revision</th>
        </tr>
      </thead>
      <tbody>
        ${data.referenceDrawings.map((drawing, idx) => `
          <tr>
            <td class="center">${idx + 1}</td>
            <td>${drawing.drawing_number || '-'}</td>
            <td>${drawing.file_name}</td>
            <td class="center">${drawing.revision || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    ${data.referenceDrawings.length > 0 ? `
    <div class="info-box">
      <div class="info-box-title">Note</div>
      <div class="info-box-content">
        This budget is based on the above referenced drawings. Any changes to these drawings 
        may result in adjustments to the budget figures.
      </div>
    </div>
    ` : ''}
    
    ${buildPageFooter(data, '3')}
  </div>`;
}

function buildCombinedBoqPage(data: ElectricalBudgetPdfData): string {
  const grandTotal = data.sections.reduce((sum, section) => 
    sum + section.items.reduce((itemSum, item) => itemSum + (item.total || 0), 0), 0
  );
  
  // Build all section rows continuously
  let tableRows = '';
  
  data.sections.forEach((section) => {
    const sectionTotal = section.items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Sort items numerically by item_number
    const sortedItems = [...section.items].sort((a, b) => {
      const numA = parseInt(a.item_number || '0', 10) || a.display_order || 0;
      const numB = parseInt(b.item_number || '0', 10) || b.display_order || 0;
      return numA - numB;
    });
    
    // Section header row
    tableRows += `
      <tr class="section-header-row">
        <td><strong>${section.section_code}</strong></td>
        <td colspan="2"><strong>${section.section_name.toUpperCase()}</strong></td>
        <td class="right"><strong>${formatCurrency(sectionTotal)}</strong></td>
      </tr>
    `;
    
    // Section items
    sortedItems.forEach((item) => {
      tableRows += `
        <tr>
          <td class="item-code">${section.section_code}${item.item_number || ''}</td>
          <td>${item.description}</td>
          <td class="right">${item.area ? `${item.area.toLocaleString()} ${item.area_unit || 'm²'}` : ''}</td>
          <td class="right">${formatCurrency(item.total)}</td>
        </tr>
      `;
    });
    
    // Empty row for spacing between sections
    tableRows += `<tr class="spacer-row"><td colspan="4"></td></tr>`;
  });
  
  // Build exclusions list if available
  let exclusionsHtml = '';
  if (data.budget.exclusions && data.budget.exclusions !== '<p></p>') {
    exclusionsHtml = `
      <tr class="spacer-row"><td colspan="4"></td></tr>
      <tr class="section-header-row">
        <td colspan="4"><strong>EXCLUSIONS:</strong></td>
      </tr>
      <tr>
        <td colspan="4" class="exclusions-content">
          <div class="rich-content">${data.budget.exclusions}</div>
        </td>
      </tr>
    `;
  }
  
  return `
  <div class="content-flow-page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">Bill of Quantities</h1>
    <p class="section-subtitle">Detailed breakdown of all budget sections</p>
    
    <table class="combined-boq-table">
      <thead>
        <tr>
          <th style="width: 10%;">Item</th>
          <th style="width: 50%;">Description</th>
          <th class="right" style="width: 15%;">Area</th>
          <th class="right" style="width: 25%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${exclusionsHtml}
        <tr class="total-row">
          <td colspan="3"><strong>TOTAL EXCLUSIVE OF VAT</strong></td>
          <td class="right"><strong>${formatCurrency(grandTotal)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function buildPageHeader(data: ElectricalBudgetPdfData): string {
  const projectName = data.project?.name || 'Electrical Budget';
  return `
    <div class="page-header">
      <div class="page-header-left">${projectName}</div>
      <div class="page-header-right">${data.budget.budget_number} Rev ${data.budget.revision}</div>
    </div>`;
}

function buildPageFooter(data: ElectricalBudgetPdfData, pageNum: string): string {
  const companyName = data.companySettings?.company_name || '';
  const date = formatDate(data.budget.budget_date);
  
  return `
    <div class="page-footer">
      <div>${companyName}</div>
      <div>Page ${pageNum}</div>
      <div>${date}</div>
    </div>`;
}
