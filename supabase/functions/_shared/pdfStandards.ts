/**
 * Shared PDF Standards for all PDFShift Edge Functions
 * 
 * @see src/utils/pdfmake/PDF_GENERATION_SPEC.md
 * 
 * EVERY PDFShift edge function MUST use these helpers to ensure
 * consistent headers, footers, page numbers, and table integrity.
 * 
 * PDFShift API uses `header: { source: html }` and `footer: { source: html }`
 * with variables: {{ page }}, {{ total }}, {{ title }}, {{ url }}, {{ date }}
 */

/**
 * Standard header HTML for PDFShift.
 * Displays report title (left) and project name (right).
 * Uses {{ page }} variable to hide on cover page (page 1).
 */
export function getStandardHeaderSource(reportTitle: string, projectName: string): string {
  return `<div id="hdr" style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:5px 15mm 4px 15mm;display:flex;justify-content:space-between;align-items:center;color:#6b7280;border-bottom:1px solid #e5e7eb;">
    <span style="font-weight:600;color:#374151;">${escapeHtml(reportTitle)}</span>
    <span>${escapeHtml(projectName)}</span>
  </div>
  <script>var p='{{ page }}';if(parseInt(p)===1){document.getElementById('hdr').style.display='none';}</script>`;
}

/**
 * Standard footer HTML for PDFShift.
 * Displays report date (left) and automatic Page X of Y (right).
 * Uses PDFShift's {{ page }} and {{ total }} variables for automatic page numbering.
 */
export function getStandardFooterSource(reportDate: string): string {
  return `<div id="ftr" style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:4px 15mm 5px 15mm;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;border-top:1px solid #e5e7eb;">
    <span>${escapeHtml(reportDate)}</span>
    <span>Page {{ page }} of {{ total }}</span>
  </div>
  <script>var p='{{ page }}';if(parseInt(p)===1){document.getElementById('ftr').style.display='none';}</script>`;
}

/**
 * Standard CSS rules that MUST be injected into every PDFShift HTML document.
 * Ensures table integrity, header repetition, and row-break protection.
 */
export function getStandardCSS(): string {
  return `
    /* === PDF STANDARDS (from _shared/pdfStandards.ts) === */
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    /* === END PDF STANDARDS === */
  `;
}

/**
 * Standard margins for PDFShift API requests.
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
 * Slightly tighter horizontally for landscape documents.
 */
export const LANDSCAPE_MARGINS = {
  top: '22mm',
  right: '10mm',
  bottom: '20mm',
  left: '10mm',
};

/**
 * Build a complete PDFShift API payload with enforced standards.
 * 
 * Uses PDFShift's native `header` and `footer` objects with `source` property.
 * See: https://docs.pdfshift.io/docs/header-footer
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
      spacing: '5mm',
    },
    footer: {
      source: getStandardFooterSource(reportDate),
      spacing: '5mm',
    },
  };
}

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
