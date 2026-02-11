/**
 * Shared PDF Standards for all PDFShift Edge Functions
 * 
 * EVERY PDFShift edge function MUST use these helpers to ensure
 * consistent cover pages, headers, footers, page numbers, and table integrity.
 * 
 * PDFShift API uses `header: { source: html }` and `footer: { source: html }`
 * with variables: {{ page }}, {{ total }}, {{ title }}, {{ url }}, {{ date }}
 * 
 * IMPORTANT: PDFShift does NOT execute JavaScript in header/footer fragments.
 * Use `start_at: 2` to skip headers/footers on the cover page.
 */

// ─────────────────────────────────────────────────────────────
//  COVER PAGE
// ─────────────────────────────────────────────────────────────

export interface CoverPageOptions {
  reportTitle: string;        // e.g. "TENANT TRACKER REPORT"
  reportSubtitle?: string;    // e.g. "Tenant Schedule & Progress Analysis"
  projectName: string;
  projectNumber?: string;
  revision?: string;
  reportDate?: string;
  companyLogoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  contactName?: string;
  contactOrganization?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Generate a unified, branded cover page HTML block.
 * Includes `page-break-after: always` to push content to page 2.
 */
export function generateStandardCoverPage(options: CoverPageOptions): string {
  const reportDate = options.reportDate || new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="std-cover-page">
      <div class="std-cover-accent-bar"></div>
      <div class="std-cover-content">
        ${options.companyLogoUrl ? `
          <img src="${escapeHtml(options.companyLogoUrl)}" class="std-cover-logo" alt="Company Logo" />
        ` : ''}
        
        <div class="std-cover-divider"></div>
        
        <h1 class="std-cover-title">${escapeHtml(options.reportTitle)}</h1>
        ${options.reportSubtitle ? `<p class="std-cover-subtitle">${escapeHtml(options.reportSubtitle)}</p>` : ''}
        
        <h2 class="std-cover-project">${escapeHtml(options.projectName)}</h2>
        ${options.projectNumber ? `<p class="std-cover-number">${escapeHtml(options.projectNumber)}</p>` : ''}
        
        <div class="std-cover-details">
          <div class="std-cover-section">
            <h3>PREPARED FOR</h3>
            ${options.contactOrganization ? `<p>${escapeHtml(options.contactOrganization)}</p>` : ''}
            ${options.contactName ? `<p>${escapeHtml(options.contactName)}</p>` : ''}
            ${options.contactPhone ? `<p>Tel: ${escapeHtml(options.contactPhone)}</p>` : ''}
            ${options.contactEmail ? `<p>${escapeHtml(options.contactEmail)}</p>` : ''}
            ${!options.contactOrganization && !options.contactName ? '<p>—</p>' : ''}
          </div>
          <div class="std-cover-section">
            <h3>PREPARED BY</h3>
            <p>${escapeHtml(options.companyName || 'Watson Mattheus Engineering')}</p>
            ${options.companyAddress ? `<p>${escapeHtml(options.companyAddress)}</p>` : ''}
            ${options.companyPhone ? `<p>Tel: ${escapeHtml(options.companyPhone)}</p>` : ''}
          </div>
        </div>
        
        <div class="std-cover-footer">
          <span>Date: ${escapeHtml(reportDate)}</span>
          ${options.revision ? `<span>Revision: ${escapeHtml(options.revision)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * CSS for the standard cover page.
 * Must be included in the <style> block of every PDF HTML document.
 */
export function getStandardCoverPageCSS(): string {
  return `
    /* ===== STANDARD COVER PAGE ===== */
    .std-cover-page {
      page-break-after: always;
      min-height: 100vh;
      position: relative;
      padding: 40px 50px;
      background: #ffffff;
    }
    
    .std-cover-accent-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 10px;
      background: linear-gradient(to bottom, #1e3a5f 0%, #3b82f6 100%);
    }
    
    .std-cover-content {
      text-align: center;
      padding-top: 30px;
    }
    
    .std-cover-logo {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 25px;
    }
    
    .std-cover-divider {
      width: 100px;
      height: 3px;
      background: linear-gradient(90deg, #1e3a5f, #3b82f6);
      margin: 25px auto;
    }
    
    .std-cover-title {
      font-size: 28pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    
    .std-cover-subtitle {
      font-size: 13pt;
      color: #64748b;
      margin-bottom: 40px;
      font-weight: 300;
    }
    
    .std-cover-project {
      font-size: 22pt;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    
    .std-cover-number {
      font-size: 13pt;
      color: #64748b;
      margin-bottom: 50px;
    }
    
    .std-cover-details {
      display: flex;
      justify-content: space-between;
      text-align: left;
      margin-top: 80px;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
    }
    
    .std-cover-section {
      width: 45%;
    }
    
    .std-cover-section h3 {
      font-size: 9pt;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    
    .std-cover-section p {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 4px;
      line-height: 1.5;
    }
    
    .std-cover-footer {
      position: absolute;
      bottom: 30px;
      left: 50px;
      right: 50px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #64748b;
    }
    /* ===== END STANDARD COVER PAGE ===== */
  `;
}


// ─────────────────────────────────────────────────────────────
//  HEADERS & FOOTERS
// ─────────────────────────────────────────────────────────────

/**
 * Standard header HTML for PDFShift.
 * Displays report title (left) and project name (right).
 * 
 * NOTE: No JavaScript is used. Header visibility on page 1 is
 * controlled via `start_at: 2` in the PDFShift payload.
 */
export function getStandardHeaderSource(reportTitle: string, projectName: string): string {
  return `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:5px 15mm 4px 15mm;display:flex;justify-content:space-between;align-items:center;color:#6b7280;border-bottom:1px solid #e5e7eb;">
    <span style="font-weight:600;color:#374151;">${escapeHtml(reportTitle)}</span>
    <span>${escapeHtml(projectName)}</span>
  </div>`;
}

/**
 * Standard footer HTML for PDFShift.
 * Displays report date (left) and automatic Page X of Y (right).
 * Uses PDFShift's {{ page }} and {{ total }} variables for automatic page numbering.
 * 
 * NOTE: No JavaScript is used. Footer visibility on page 1 is
 * controlled via `start_at: 2` in the PDFShift payload.
 */
export function getStandardFooterSource(reportDate: string): string {
  return `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:4px 15mm 5px 15mm;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;border-top:1px solid #e5e7eb;">
    <span>${escapeHtml(reportDate)}</span>
    <span>Page {{ page }} of {{ total }}</span>
  </div>`;
}


// ─────────────────────────────────────────────────────────────
//  TABLE & LAYOUT CSS
// ─────────────────────────────────────────────────────────────

/**
 * Standard CSS rules that MUST be injected into every PDFShift HTML document.
 * Ensures table integrity, header repetition, and row-break protection.
 */
export function getStandardCSS(options?: { landscape?: boolean; format?: string }): string {
  const isLandscape = options?.landscape || false;
  const format = options?.format || 'A4';
  const margins = isLandscape ? LANDSCAPE_MARGINS : STANDARD_MARGINS;
  
  return `
    /* === PDF STANDARDS (from _shared/pdfStandards.ts) === */
    @page {
      size: ${format}${isLandscape ? ' landscape' : ''};
      margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
    }
    
    /* Cover page gets zero margin so it fills the page */
    @page :first {
      margin: 0;
    }
    
    /* Table integrity */
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    /* === END PDF STANDARDS === */
  `;
}


// ─────────────────────────────────────────────────────────────
//  MARGINS
// ─────────────────────────────────────────────────────────────

/**
 * Standard margins for PDFShift API requests (portrait).
 * Top: 25mm (header space), Bottom: 22mm (footer space)
 */
export const STANDARD_MARGINS = {
  top: '25mm',
  right: '15mm',
  bottom: '22mm',
  left: '15mm',
};

/**
 * Landscape-specific margins (e.g. cable schedule).
 */
export const LANDSCAPE_MARGINS = {
  top: '22mm',
  right: '10mm',
  bottom: '20mm',
  left: '10mm',
};


// ─────────────────────────────────────────────────────────────
//  PDFSHIFT PAYLOAD BUILDER
// ─────────────────────────────────────────────────────────────

/**
 * Build a complete PDFShift API payload with enforced standards.
 * 
 * Uses PDFShift's native `header` and `footer` objects with `source` property.
 * Headers and footers are skipped on page 1 (cover page) via `start_at: 2`.
 * 
 * Usage:
 * ```typescript
 * import { buildPDFShiftPayload } from '../_shared/pdfStandards.ts';
 * const payload = buildPDFShiftPayload(html, { reportTitle: 'Tenant Tracker', projectName: 'KINGSWALK' });
 * ```
 */
export function buildPDFShiftPayload(
  html: string,
  options: {
    reportTitle: string;
    projectName: string;
    reportDate?: string;
    landscape?: boolean;
    format?: string;
    usePrint?: boolean;
  }
): Record<string, unknown> {
  const reportDate = options.reportDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const margins = options.landscape ? LANDSCAPE_MARGINS : STANDARD_MARGINS;

  return {
    source: html,
    format: options.format || 'A4',
    landscape: options.landscape || false,
    use_print: options.usePrint !== false,
    margin: margins,
    header: {
      source: getStandardHeaderSource(options.reportTitle, options.projectName),
      height: '20mm',
      start_at: 2,
    },
    footer: {
      source: getStandardFooterSource(reportDate),
      height: '15mm',
      start_at: 2,
    },
  };
}


// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Escape HTML entities to prevent XSS in templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
