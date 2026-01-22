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
  
  // 6. BOQ Sections & Items
  sections.push(buildBoqSummaryPage(data));
  data.sections.forEach((section, index) => {
    sections.push(buildSectionDetailPage(section, index + 1, data));
  });
  
  // 7. Exclusions (if available)
  if (data.budget.exclusions && data.budget.exclusions !== '<p></p>') {
    sections.push(buildExclusionsPage(data));
  }
  
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
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    
    .page {
      page-break-after: always;
      padding: 50px;
      min-height: 100vh;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Cover Page Styles */
    .cover-page {
      display: flex;
      flex-direction: column;
      padding: 0;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    
    .cover-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 12px;
      background: linear-gradient(180deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
    }
    
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 40px 50px;
    }
    
    .cover-logo {
      max-width: 160px;
      max-height: 70px;
      object-fit: contain;
    }
    
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px 50px;
      text-align: center;
    }
    
    .cover-doc-type {
      font-size: 14pt;
      font-weight: 500;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 20px;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 15px;
      line-height: 1.2;
    }
    
    .cover-project {
      font-size: 16pt;
      color: #475569;
      margin-bottom: 50px;
    }
    
    .cover-meta {
      display: flex;
      gap: 40px;
      margin-bottom: 50px;
    }
    
    .cover-meta-item {
      text-align: center;
    }
    
    .cover-meta-label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    
    .cover-meta-value {
      font-size: 14pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    .cover-footer {
      display: flex;
      justify-content: space-between;
      padding: 40px 50px;
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
    }
    
    .cover-contact {
      flex: 1;
    }
    
    .cover-contact-title {
      font-size: 10pt;
      font-weight: 700;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    
    .cover-contact-name {
      font-size: 12pt;
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 5px;
    }
    
    .cover-contact-detail {
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 3px;
    }
    
    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      margin-bottom: 25px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .page-header-left {
      font-size: 9pt;
      color: #64748b;
    }
    
    .page-header-right {
      font-size: 9pt;
      font-weight: 600;
      color: #1e3a5f;
    }
    
    /* Section Titles */
    .section-title {
      font-size: 20pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3b82f6;
    }
    
    .section-subtitle {
      font-size: 11pt;
      color: #64748b;
      margin-bottom: 25px;
    }
    
    /* Index Page */
    .index-list {
      list-style: none;
      padding: 0;
    }
    
    .index-item {
      display: flex;
      align-items: baseline;
      padding: 12px 0;
      border-bottom: 1px dotted #d1d5db;
    }
    
    .index-number {
      font-size: 14pt;
      font-weight: 700;
      color: #3b82f6;
      min-width: 40px;
    }
    
    .index-title {
      flex: 1;
      font-size: 12pt;
      color: #1f2937;
    }
    
    .index-page {
      font-size: 12pt;
      color: #64748b;
      font-weight: 500;
    }
    
    /* Rich Text Content */
    .rich-content {
      font-size: 11pt;
      line-height: 1.7;
      color: #374151;
    }
    
    .rich-content h1 { font-size: 18pt; font-weight: 700; margin: 20px 0 10px; color: #1e3a5f; }
    .rich-content h2 { font-size: 14pt; font-weight: 600; margin: 18px 0 8px; color: #1e3a5f; }
    .rich-content h3 { font-size: 12pt; font-weight: 600; margin: 15px 0 8px; color: #374151; }
    .rich-content p { margin-bottom: 12px; }
    .rich-content ul, .rich-content ol { margin: 10px 0 15px 25px; }
    .rich-content li { margin-bottom: 6px; }
    .rich-content blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 15px;
      margin: 15px 0;
      color: #64748b;
      font-style: italic;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th, td {
      padding: 10px 12px;
      font-size: 9pt;
      border: 1px solid #e5e7eb;
      text-align: left;
    }
    
    th {
      background: #1e3a5f;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 8pt;
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
    
    tbody tr:hover {
      background: #f1f5f9;
    }
    
    .total-row {
      background: #1e3a5f !important;
      color: white;
      font-weight: 700;
    }
    
    .total-row td {
      border-color: #1e3a5f;
    }
    
    .subtotal-row {
      background: #e2e8f0 !important;
      font-weight: 600;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 25px 0;
    }
    
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .summary-card-label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .summary-card-value {
      font-size: 18pt;
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
    
    /* Reference Drawings Table */
    .drawings-table th:first-child { width: 10%; }
    .drawings-table th:nth-child(2) { width: 20%; }
    .drawings-table th:nth-child(3) { width: 50%; }
    .drawings-table th:nth-child(4) { width: 20%; }
    
    /* Section Header Badge */
    .section-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    /* Info Box */
    .info-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 4px solid #0284c7;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .info-box-title {
      font-weight: 600;
      color: #0369a1;
      margin-bottom: 5px;
    }
    
    .info-box-content {
      color: #0c4a6e;
      font-size: 10pt;
    }
    
    /* Footer */
    .page-footer {
      position: absolute;
      bottom: 30px;
      left: 50px;
      right: 50px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
${sections.join('\n')}
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
  let pageNum = 1;
  
  items.push({ number: '1', title: 'Introduction' });
  pageNum++;
  
  if (data.budget.baseline_allowances && data.budget.baseline_allowances !== '<p></p>') {
    pageNum++;
    items.push({ number: '2', title: 'Baseline Allowances' });
  }
  
  if (data.referenceDrawings.length > 0) {
    pageNum++;
    items.push({ number: String(items.length + 1), title: 'Reference Drawings' });
  }
  
  const boqStartNum = items.length + 1;
  items.push({ number: String(boqStartNum), title: 'Bill of Quantities - Summary' });
  
  data.sections.forEach((section, idx) => {
    items.push({ 
      number: `${boqStartNum}.${idx + 1}`, 
      title: `${section.section_code} - ${section.section_name}` 
    });
  });
  
  if (data.budget.exclusions && data.budget.exclusions !== '<p></p>') {
    items.push({ number: String(boqStartNum + 1), title: 'Exclusions' });
  }
  
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
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">2. Baseline Allowances</h1>
    <p class="section-subtitle">Standard allowances and assumptions included in this budget</p>
    
    <div class="rich-content">
      ${data.budget.baseline_allowances || ''}
    </div>
    
    ${buildPageFooter(data, '2')}
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

function buildBoqSummaryPage(data: ElectricalBudgetPdfData): string {
  const sectionTotals = data.sections.map(section => ({
    code: section.section_code,
    name: section.section_name,
    items: section.items.length,
    total: section.items.reduce((sum, item) => sum + (item.total || 0), 0)
  }));
  
  const grandTotal = sectionTotals.reduce((sum, s) => sum + s.total, 0);
  
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">Bill of Quantities - Summary</h1>
    <p class="section-subtitle">Overview of all budget sections</p>
    
    <table>
      <thead>
        <tr>
          <th>Section Code</th>
          <th>Description</th>
          <th class="center">Items</th>
          <th class="right">Total (Excl. VAT)</th>
        </tr>
      </thead>
      <tbody>
        ${sectionTotals.map(section => `
          <tr>
            <td><strong>${section.code}</strong></td>
            <td>${section.name}</td>
            <td class="center">${section.items}</td>
            <td class="right">${formatCurrency(section.total)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="3"><strong>GRAND TOTAL (Excl. VAT)</strong></td>
          <td class="right"><strong>${formatCurrency(grandTotal)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    ${buildPageFooter(data, '4')}
  </div>`;
}

function buildSectionDetailPage(
  section: ElectricalBudgetPdfData['sections'][0], 
  sectionNum: number,
  data: ElectricalBudgetPdfData
): string {
  const sectionTotal = section.items.reduce((sum, item) => sum + (item.total || 0), 0);
  
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <span class="section-badge">Section ${section.section_code}</span>
    <h1 class="section-title">${section.section_name}</h1>
    <p class="section-subtitle">Detailed line items and pricing</p>
    
    <table>
      <thead>
        <tr>
          <th style="width: 8%">Item</th>
          <th style="width: 42%">Description</th>
          <th class="right" style="width: 12%">Area</th>
          <th class="right" style="width: 12%">Base Rate</th>
          <th class="right" style="width: 12%">TI Rate</th>
          <th class="right" style="width: 14%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${section.items.map((item, idx) => `
          <tr>
            <td>${item.item_number || (idx + 1)}</td>
            <td>${item.description}</td>
            <td class="right">${item.area ? `${item.area.toLocaleString()} ${item.area_unit || 'm²'}` : '-'}</td>
            <td class="right">${item.base_rate ? formatCurrency(item.base_rate) : '-'}</td>
            <td class="right">${item.ti_rate ? formatCurrency(item.ti_rate) : '-'}</td>
            <td class="right"><strong>${formatCurrency(item.total)}</strong></td>
          </tr>
        `).join('')}
        <tr class="subtotal-row">
          <td colspan="5"><strong>Section Total</strong></td>
          <td class="right"><strong>${formatCurrency(sectionTotal)}</strong></td>
        </tr>
      </tbody>
    </table>
    
    ${buildPageFooter(data, String(4 + sectionNum))}
  </div>`;
}

function buildExclusionsPage(data: ElectricalBudgetPdfData): string {
  return `
  <div class="page">
    ${buildPageHeader(data)}
    
    <h1 class="section-title">Exclusions</h1>
    <p class="section-subtitle">Items and scope not included in this budget estimate</p>
    
    <div class="rich-content">
      ${data.budget.exclusions || ''}
    </div>
    
    <div class="info-box" style="margin-top: 40px;">
      <div class="info-box-title">Important Notice</div>
      <div class="info-box-content">
        The items listed above are explicitly excluded from this budget estimate. 
        Should any of these items be required, separate quotations should be requested.
      </div>
    </div>
    
    ${buildPageFooter(data, 'E')}
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
