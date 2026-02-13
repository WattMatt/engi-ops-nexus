/**
 * SVG Cost Report Builder (Proof of Concept)
 * 
 * Builds SVG elements for:
 * 1. Cover Page - branded with company info
 * 2. Executive Summary - category table
 */

// A4 in mm for SVG viewBox
const PAGE_W = 210;
const PAGE_H = 297;

// Brand colors
const BRAND_PRIMARY = '#1e3a5f';
const BRAND_ACCENT = '#2563eb';
const BRAND_LIGHT = '#f0f4f8';
const TEXT_DARK = '#1a1a2e';
const TEXT_MUTED = '#64748b';
const BORDER_COLOR = '#e2e8f0';
const WHITE = '#ffffff';

interface CoverPageData {
  companyName: string;
  projectName: string;
  reportNumber: number;
  revision: string;
  date: string;
  projectNumber?: string;
}

interface SummaryRow {
  code: string;
  description: string;
  originalBudget: number;
  anticipatedFinal: number;
  currentVariance: number;
}

interface ExecutiveSummaryData {
  rows: SummaryRow[];
  grandTotal: SummaryRow;
}

function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', `0 0 ${PAGE_W} ${PAGE_H}`);
  svg.setAttribute('width', `${PAGE_W}mm`);
  svg.setAttribute('height', `${PAGE_H}mm`);
  return svg;
}

function el(tag: string, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
  parent.appendChild(e);
  return e;
}

function textEl(
  parent: Element,
  x: number,
  y: number,
  content: string,
  opts: { size?: number; fill?: string; weight?: string; anchor?: string } = {}
) {
  const t = el('text', {
    x,
    y,
    fill: opts.fill || TEXT_DARK,
    'font-family': 'Helvetica, Arial, sans-serif',
    'font-size': opts.size || 3.5,
    'font-weight': opts.weight || 'normal',
    'text-anchor': opts.anchor || 'start',
  }, parent);
  t.textContent = content;
  return t;
}

function formatCurrency(amount: number): string {
  return `R${Math.abs(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

/**
 * Build the Cover Page SVG
 */
export function buildCoverPageSvg(data: CoverPageData): SVGSVGElement {
  const svg = createSvgElement();

  // Background
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);

  // Top accent bar
  el('rect', { x: 0, y: 0, width: PAGE_W, height: 8, fill: BRAND_PRIMARY }, svg);
  el('rect', { x: 0, y: 8, width: PAGE_W, height: 2, fill: BRAND_ACCENT }, svg);

  // Company name
  textEl(svg, PAGE_W / 2, 45, data.companyName.toUpperCase(), {
    size: 8,
    fill: BRAND_PRIMARY,
    weight: 'bold',
    anchor: 'middle',
  });

  // Decorative line
  el('line', {
    x1: 60, y1: 55, x2: 150, y2: 55,
    stroke: BRAND_ACCENT, 'stroke-width': 0.5,
  }, svg);

  // Report title
  textEl(svg, PAGE_W / 2, 90, 'COST REPORT', {
    size: 14,
    fill: BRAND_PRIMARY,
    weight: 'bold',
    anchor: 'middle',
  });

  // Report number badge
  el('rect', {
    x: 70, y: 100, width: 70, height: 12, rx: 2,
    fill: BRAND_ACCENT,
  }, svg);
  textEl(svg, PAGE_W / 2, 108, `Report #${data.reportNumber}  •  Rev ${data.revision}`, {
    size: 4.5,
    fill: WHITE,
    weight: 'bold',
    anchor: 'middle',
  });

  // Project details card
  const cardY = 135;
  el('rect', {
    x: 30, y: cardY, width: 150, height: 50, rx: 3,
    fill: BRAND_LIGHT, stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);

  textEl(svg, 40, cardY + 12, 'PROJECT', { size: 3, fill: TEXT_MUTED, weight: 'bold' });
  textEl(svg, 40, cardY + 20, data.projectName, { size: 5, fill: TEXT_DARK, weight: 'bold' });

  if (data.projectNumber) {
    textEl(svg, 40, cardY + 28, `Project No: ${data.projectNumber}`, { size: 3.5, fill: TEXT_MUTED });
  }

  textEl(svg, 40, cardY + 40, `Date: ${data.date}`, { size: 3.5, fill: TEXT_MUTED });

  // Bottom accent bar
  el('rect', { x: 0, y: PAGE_H - 10, width: PAGE_W, height: 2, fill: BRAND_ACCENT }, svg);
  el('rect', { x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, fill: BRAND_PRIMARY }, svg);

  // Footer text
  textEl(svg, PAGE_W / 2, PAGE_H - 3, 'Generated via SVG Engine (Beta)', {
    size: 2.5,
    fill: '#94a3b8',
    anchor: 'middle',
  });

  return svg;
}

/**
 * Build the Executive Summary SVG
 */
export function buildExecutiveSummarySvg(data: ExecutiveSummaryData): SVGSVGElement {
  const svg = createSvgElement();

  // Background
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);

  // Header bar
  el('rect', { x: 0, y: 0, width: PAGE_W, height: 1.5, fill: BRAND_ACCENT }, svg);

  // Title
  textEl(svg, 15, 18, 'EXECUTIVE SUMMARY', {
    size: 7,
    fill: BRAND_PRIMARY,
    weight: 'bold',
  });

  el('line', {
    x1: 15, y1: 22, x2: 195, y2: 22,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);

  // Table setup
  const tableX = 15;
  const tableW = 180;
  const cols = [
    { label: 'CODE', x: 0, w: 18 },
    { label: 'CATEGORY', x: 18, w: 52 },
    { label: 'ORIGINAL BUDGET', x: 70, w: 38 },
    { label: 'ANTICIPATED FINAL', x: 108, w: 38 },
    { label: 'VARIANCE', x: 146, w: 34 },
  ];
  const rowH = 8;
  let y = 30;

  // Header row
  el('rect', { x: tableX, y, width: tableW, height: rowH, fill: BRAND_PRIMARY }, svg);
  cols.forEach(c => {
    textEl(svg, tableX + c.x + 2, y + 5.5, c.label, {
      size: 2.8,
      fill: WHITE,
      weight: 'bold',
    });
  });
  y += rowH;

  // Data rows
  data.rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: tableX, y, width: tableW, height: rowH, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.15 }, svg);

    textEl(svg, tableX + cols[0].x + 2, y + 5.5, row.code, { size: 3 });
    textEl(svg, tableX + cols[1].x + 2, y + 5.5, row.description, { size: 3 });
    textEl(svg, tableX + cols[2].x + cols[2].w - 2, y + 5.5, formatCurrency(row.originalBudget), {
      size: 3, anchor: 'end',
    });
    textEl(svg, tableX + cols[3].x + cols[3].w - 2, y + 5.5, formatCurrency(row.anticipatedFinal), {
      size: 3, anchor: 'end',
    });
    const varColor = row.currentVariance >= 0 ? '#16a34a' : '#dc2626';
    const varSign = row.currentVariance >= 0 ? '+' : '-';
    textEl(svg, tableX + cols[4].x + cols[4].w - 2, y + 5.5,
      `${varSign}${formatCurrency(row.currentVariance)}`, {
        size: 3, anchor: 'end', fill: varColor,
      });

    y += rowH;
  });

  // Grand total row
  el('rect', { x: tableX, y, width: tableW, height: rowH + 1, fill: BRAND_PRIMARY }, svg);
  textEl(svg, tableX + cols[1].x + 2, y + 5.5, 'GRAND TOTAL', {
    size: 3.2, fill: WHITE, weight: 'bold',
  });
  textEl(svg, tableX + cols[2].x + cols[2].w - 2, y + 5.5,
    formatCurrency(data.grandTotal.originalBudget), {
      size: 3.2, fill: WHITE, weight: 'bold', anchor: 'end',
    });
  textEl(svg, tableX + cols[3].x + cols[3].w - 2, y + 5.5,
    formatCurrency(data.grandTotal.anticipatedFinal), {
      size: 3.2, fill: WHITE, weight: 'bold', anchor: 'end',
    });
  const gtColor = data.grandTotal.currentVariance >= 0 ? '#86efac' : '#fca5a5';
  const gtSign = data.grandTotal.currentVariance >= 0 ? '+' : '-';
  textEl(svg, tableX + cols[4].x + cols[4].w - 2, y + 5.5,
    `${gtSign}${formatCurrency(data.grandTotal.currentVariance)}`, {
      size: 3.2, fill: gtColor, weight: 'bold', anchor: 'end',
    });

  // Footer
  textEl(svg, PAGE_W / 2, PAGE_H - 5, 'SVG Engine (Beta) — Proof of Concept', {
    size: 2.5, fill: '#94a3b8', anchor: 'middle',
  });

  return svg;
}
