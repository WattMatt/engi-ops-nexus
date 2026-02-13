/**
 * SVG Cost Report Builder
 * 
 * Builds SVG elements for:
 * 1. Cover Page - branded with company info
 * 2. Executive Summary - category table
 * 3. Category Details - line items per category with subtotals
 * 4. Variations - variation items with status and amounts
 */

// A4 in mm for SVG viewBox
const PAGE_W = 210;
const PAGE_H = 297;

// Margins
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 15;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

// Brand colors
const BRAND_PRIMARY = '#1e3a5f';
const BRAND_ACCENT = '#2563eb';
const BRAND_LIGHT = '#f0f4f8';
const TEXT_DARK = '#1a1a2e';
const TEXT_MUTED = '#64748b';
const BORDER_COLOR = '#e2e8f0';
const WHITE = '#ffffff';
const SUCCESS_COLOR = '#16a34a';
const DANGER_COLOR = '#dc2626';
const WARNING_BG = '#fef3c7';

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

export interface CategoryLineItem {
  description: string;
  original_budget: number;
  previous_report: number;
  anticipated_final: number;
}

export interface CategoryDetailData {
  code: string;
  description: string;
  lineItems: CategoryLineItem[];
  subtotals: {
    originalBudget: number;
    previousReport: number;
    anticipatedFinal: number;
    variance: number;
  };
}

export interface VariationItem {
  code: string;
  description: string;
  amount: number;
  status: string;
  tenantName?: string;
}

export interface VariationsData {
  items: VariationItem[];
  totalAmount: number;
}

// ─── Shared helpers ───

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

function addPageFooter(svg: SVGSVGElement, pageNum: number, totalPages: number) {
  // Bottom accent line
  el('line', {
    x1: MARGIN_LEFT, y1: PAGE_H - 10,
    x2: PAGE_W - MARGIN_RIGHT, y2: PAGE_H - 10,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);
  textEl(svg, MARGIN_LEFT, PAGE_H - 6, 'SVG Engine (Beta)', {
    size: 2.5, fill: '#94a3b8',
  });
  textEl(svg, PAGE_W - MARGIN_RIGHT, PAGE_H - 6, `Page ${pageNum} of ${totalPages}`, {
    size: 2.5, fill: '#94a3b8', anchor: 'end',
  });
}

function addPageHeader(svg: SVGSVGElement, title: string) {
  el('rect', { x: 0, y: 0, width: PAGE_W, height: 1.5, fill: BRAND_ACCENT }, svg);
  textEl(svg, MARGIN_LEFT, MARGIN_TOP + 3, title, {
    size: 7, fill: BRAND_PRIMARY, weight: 'bold',
  });
  el('line', {
    x1: MARGIN_LEFT, y1: MARGIN_TOP + 7,
    x2: PAGE_W - MARGIN_RIGHT, y2: MARGIN_TOP + 7,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);
}

// ─── 1. Cover Page ───

export function buildCoverPageSvg(data: CoverPageData): SVGSVGElement {
  const svg = createSvgElement();

  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  el('rect', { x: 0, y: 0, width: PAGE_W, height: 8, fill: BRAND_PRIMARY }, svg);
  el('rect', { x: 0, y: 8, width: PAGE_W, height: 2, fill: BRAND_ACCENT }, svg);

  textEl(svg, PAGE_W / 2, 45, data.companyName.toUpperCase(), {
    size: 8, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  el('line', { x1: 60, y1: 55, x2: 150, y2: 55, stroke: BRAND_ACCENT, 'stroke-width': 0.5 }, svg);

  textEl(svg, PAGE_W / 2, 90, 'COST REPORT', {
    size: 14, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  el('rect', { x: 70, y: 100, width: 70, height: 12, rx: 2, fill: BRAND_ACCENT }, svg);
  textEl(svg, PAGE_W / 2, 108, `Report #${data.reportNumber}  •  Rev ${data.revision}`, {
    size: 4.5, fill: WHITE, weight: 'bold', anchor: 'middle',
  });

  const cardY = 135;
  el('rect', { x: 30, y: cardY, width: 150, height: 50, rx: 3, fill: BRAND_LIGHT, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
  textEl(svg, 40, cardY + 12, 'PROJECT', { size: 3, fill: TEXT_MUTED, weight: 'bold' });
  textEl(svg, 40, cardY + 20, data.projectName, { size: 5, fill: TEXT_DARK, weight: 'bold' });
  if (data.projectNumber) {
    textEl(svg, 40, cardY + 28, `Project No: ${data.projectNumber}`, { size: 3.5, fill: TEXT_MUTED });
  }
  textEl(svg, 40, cardY + 40, `Date: ${data.date}`, { size: 3.5, fill: TEXT_MUTED });

  el('rect', { x: 0, y: PAGE_H - 10, width: PAGE_W, height: 2, fill: BRAND_ACCENT }, svg);
  el('rect', { x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, fill: BRAND_PRIMARY }, svg);
  textEl(svg, PAGE_W / 2, PAGE_H - 3, 'Generated via SVG Engine (Beta)', {
    size: 2.5, fill: '#94a3b8', anchor: 'middle',
  });

  return svg;
}

// ─── 2. Executive Summary ───

export function buildExecutiveSummarySvg(data: ExecutiveSummaryData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'EXECUTIVE SUMMARY');

  const tableX = MARGIN_LEFT;
  const tableW = CONTENT_W;
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
    textEl(svg, tableX + c.x + 2, y + 5.5, c.label, { size: 2.8, fill: WHITE, weight: 'bold' });
  });
  y += rowH;

  // Data rows
  data.rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: tableX, y, width: tableW, height: rowH, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.15 }, svg);
    textEl(svg, tableX + cols[0].x + 2, y + 5.5, row.code, { size: 3 });
    textEl(svg, tableX + cols[1].x + 2, y + 5.5, row.description, { size: 3 });
    textEl(svg, tableX + cols[2].x + cols[2].w - 2, y + 5.5, formatCurrency(row.originalBudget), { size: 3, anchor: 'end' });
    textEl(svg, tableX + cols[3].x + cols[3].w - 2, y + 5.5, formatCurrency(row.anticipatedFinal), { size: 3, anchor: 'end' });
    const varColor = row.currentVariance >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    const varSign = row.currentVariance >= 0 ? '+' : '-';
    textEl(svg, tableX + cols[4].x + cols[4].w - 2, y + 5.5, `${varSign}${formatCurrency(row.currentVariance)}`, { size: 3, anchor: 'end', fill: varColor });
    y += rowH;
  });

  // Grand total row
  el('rect', { x: tableX, y, width: tableW, height: rowH + 1, fill: BRAND_PRIMARY }, svg);
  textEl(svg, tableX + cols[1].x + 2, y + 5.5, 'GRAND TOTAL', { size: 3.2, fill: WHITE, weight: 'bold' });
  textEl(svg, tableX + cols[2].x + cols[2].w - 2, y + 5.5, formatCurrency(data.grandTotal.originalBudget), { size: 3.2, fill: WHITE, weight: 'bold', anchor: 'end' });
  textEl(svg, tableX + cols[3].x + cols[3].w - 2, y + 5.5, formatCurrency(data.grandTotal.anticipatedFinal), { size: 3.2, fill: WHITE, weight: 'bold', anchor: 'end' });
  const gtColor = data.grandTotal.currentVariance >= 0 ? '#86efac' : '#fca5a5';
  const gtSign = data.grandTotal.currentVariance >= 0 ? '+' : '-';
  textEl(svg, tableX + cols[4].x + cols[4].w - 2, y + 5.5, `${gtSign}${formatCurrency(data.grandTotal.currentVariance)}`, { size: 3.2, fill: gtColor, weight: 'bold', anchor: 'end' });

  return svg;
}

// ─── 3. Category Details (multi-page) ───

const CATEGORY_ROW_H = 6.5;
const CATEGORY_HEADER_H = 8;
const MAX_Y = PAGE_H - MARGIN_BOTTOM - 12; // leave room for footer

export function buildCategoryDetailsSvg(categories: CategoryDetailData[]): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  let svg = createNewCategoryPage(pages);
  let y = 30;

  categories.forEach((cat) => {
    // Estimate space needed: category header + all items + subtotal + gap
    const spaceNeeded = CATEGORY_HEADER_H + (cat.lineItems.length + 1) * CATEGORY_ROW_H + 10;

    // If category won't fit, start a new page
    if (y + CATEGORY_HEADER_H + CATEGORY_ROW_H * 2 > MAX_Y) {
      svg = createNewCategoryPage(pages);
      y = 30;
    }

    // Category header bar
    el('rect', {
      x: MARGIN_LEFT, y,
      width: CONTENT_W, height: CATEGORY_HEADER_H,
      fill: BRAND_PRIMARY, rx: 1,
    }, svg);
    textEl(svg, MARGIN_LEFT + 3, y + 5.5, `${cat.code} — ${cat.description}`, {
      size: 3.5, fill: WHITE, weight: 'bold',
    });
    y += CATEGORY_HEADER_H;

    // Column headers
    const cols = [
      { label: 'DESCRIPTION', x: 0, w: 72 },
      { label: 'ORIGINAL', x: 72, w: 30 },
      { label: 'PREVIOUS', x: 102, w: 30 },
      { label: 'ANTICIPATED', x: 132, w: 30 },
      { label: 'VARIANCE', x: 162, w: 18 },
    ];

    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: CATEGORY_ROW_H, fill: '#f1f5f9' }, svg);
    cols.forEach(c => {
      textEl(svg, MARGIN_LEFT + c.x + 2, y + 4.5, c.label, { size: 2.4, fill: TEXT_MUTED, weight: 'bold' });
    });
    y += CATEGORY_ROW_H;

    // Line items
    cat.lineItems.forEach((item, i) => {
      if (y + CATEGORY_ROW_H > MAX_Y) {
        svg = createNewCategoryPage(pages);
        y = 30;
        // Repeat column headers on new page
        el('rect', {
          x: MARGIN_LEFT, y,
          width: CONTENT_W, height: CATEGORY_HEADER_H,
          fill: BRAND_PRIMARY, rx: 1,
        }, svg);
        textEl(svg, MARGIN_LEFT + 3, y + 5.5, `${cat.code} — ${cat.description} (continued)`, {
          size: 3.5, fill: WHITE, weight: 'bold',
        });
        y += CATEGORY_HEADER_H;
        el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: CATEGORY_ROW_H, fill: '#f1f5f9' }, svg);
        cols.forEach(c => {
          textEl(svg, MARGIN_LEFT + c.x + 2, y + 4.5, c.label, { size: 2.4, fill: TEXT_MUTED, weight: 'bold' });
        });
        y += CATEGORY_ROW_H;
      }

      const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
      el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: CATEGORY_ROW_H, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.1 }, svg);

      // Truncate long descriptions
      const desc = item.description.length > 45 ? item.description.slice(0, 42) + '...' : item.description;
      textEl(svg, MARGIN_LEFT + 2, y + 4.5, desc, { size: 2.8 });
      textEl(svg, MARGIN_LEFT + cols[1].x + cols[1].w - 2, y + 4.5, formatCurrency(item.original_budget), { size: 2.8, anchor: 'end' });
      textEl(svg, MARGIN_LEFT + cols[2].x + cols[2].w - 2, y + 4.5, formatCurrency(item.previous_report), { size: 2.8, anchor: 'end' });
      textEl(svg, MARGIN_LEFT + cols[3].x + cols[3].w - 2, y + 4.5, formatCurrency(item.anticipated_final), { size: 2.8, anchor: 'end' });
      
      const variance = item.anticipated_final - item.previous_report;
      const vColor = variance >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
      const vSign = variance >= 0 ? '+' : '-';
      textEl(svg, MARGIN_LEFT + cols[4].x + cols[4].w - 2, y + 4.5, `${vSign}${formatCurrency(variance)}`, { size: 2.8, anchor: 'end', fill: vColor });

      y += CATEGORY_ROW_H;
    });

    // Subtotal row
    if (y + CATEGORY_ROW_H > MAX_Y) {
      svg = createNewCategoryPage(pages);
      y = 30;
    }
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: CATEGORY_ROW_H + 1, fill: '#e2e8f0' }, svg);
    textEl(svg, MARGIN_LEFT + 2, y + 4.5, `${cat.code} SUBTOTAL`, { size: 2.8, weight: 'bold' });
    textEl(svg, MARGIN_LEFT + cols[1].x + cols[1].w - 2, y + 4.5, formatCurrency(cat.subtotals.originalBudget), { size: 2.8, weight: 'bold', anchor: 'end' });
    textEl(svg, MARGIN_LEFT + cols[2].x + cols[2].w - 2, y + 4.5, formatCurrency(cat.subtotals.previousReport), { size: 2.8, weight: 'bold', anchor: 'end' });
    textEl(svg, MARGIN_LEFT + cols[3].x + cols[3].w - 2, y + 4.5, formatCurrency(cat.subtotals.anticipatedFinal), { size: 2.8, weight: 'bold', anchor: 'end' });
    const sColor = cat.subtotals.variance >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    const sSign = cat.subtotals.variance >= 0 ? '+' : '-';
    textEl(svg, MARGIN_LEFT + cols[4].x + cols[4].w - 2, y + 4.5, `${sSign}${formatCurrency(cat.subtotals.variance)}`, { size: 2.8, weight: 'bold', anchor: 'end', fill: sColor });
    y += CATEGORY_ROW_H + 8; // extra gap between categories
  });

  return pages;
}

function createNewCategoryPage(pages: SVGSVGElement[]): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, pages.length === 0 ? 'CATEGORY DETAILS' : 'CATEGORY DETAILS (cont.)');
  pages.push(svg);
  return svg;
}

// ─── 4. Variations (multi-page) ───

const VARIATION_ROW_H = 7;

export function buildVariationsSvg(data: VariationsData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  let svg = createNewVariationsPage(pages);
  let y = 30;

  const cols = [
    { label: 'CODE', x: 0, w: 20 },
    { label: 'DESCRIPTION', x: 20, w: 60 },
    { label: 'TENANT', x: 80, w: 35 },
    { label: 'STATUS', x: 115, w: 25 },
    { label: 'AMOUNT', x: 140, w: 40 },
  ];

  // Table header
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: VARIATION_ROW_H, fill: BRAND_PRIMARY }, svg);
  cols.forEach(c => {
    textEl(svg, MARGIN_LEFT + c.x + 2, y + 5, c.label, { size: 2.8, fill: WHITE, weight: 'bold' });
  });
  y += VARIATION_ROW_H;

  // Variation rows
  data.items.forEach((item, i) => {
    if (y + VARIATION_ROW_H > MAX_Y) {
      svg = createNewVariationsPage(pages);
      y = 30;
      // Repeat headers
      el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: VARIATION_ROW_H, fill: BRAND_PRIMARY }, svg);
      cols.forEach(c => {
        textEl(svg, MARGIN_LEFT + c.x + 2, y + 5, c.label, { size: 2.8, fill: WHITE, weight: 'bold' });
      });
      y += VARIATION_ROW_H;
    }

    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: VARIATION_ROW_H, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.1 }, svg);

    textEl(svg, MARGIN_LEFT + cols[0].x + 2, y + 5, item.code || '-', { size: 3 });
    const desc = item.description.length > 38 ? item.description.slice(0, 35) + '...' : item.description;
    textEl(svg, MARGIN_LEFT + cols[1].x + 2, y + 5, desc, { size: 3 });
    textEl(svg, MARGIN_LEFT + cols[2].x + 2, y + 5, item.tenantName || '-', { size: 3, fill: TEXT_MUTED });

    // Status badge
    const statusColors: Record<string, { bg: string; fg: string }> = {
      approved: { bg: '#dcfce7', fg: SUCCESS_COLOR },
      pending: { bg: WARNING_BG, fg: '#d97706' },
      rejected: { bg: '#fee2e2', fg: DANGER_COLOR },
    };
    const sc = statusColors[item.status?.toLowerCase()] || { bg: BRAND_LIGHT, fg: TEXT_MUTED };
    const badgeX = MARGIN_LEFT + cols[3].x + 2;
    el('rect', { x: badgeX, y: y + 1.5, width: 20, height: 4, rx: 1, fill: sc.bg }, svg);
    textEl(svg, badgeX + 10, y + 4.5, (item.status || 'N/A').toUpperCase(), { size: 2.2, fill: sc.fg, weight: 'bold', anchor: 'middle' });

    // Amount
    const amtColor = item.amount >= 0 ? TEXT_DARK : DANGER_COLOR;
    textEl(svg, MARGIN_LEFT + cols[4].x + cols[4].w - 2, y + 5, formatCurrency(item.amount), { size: 3, anchor: 'end', fill: amtColor });

    y += VARIATION_ROW_H;
  });

  // Total row
  if (y + VARIATION_ROW_H + 2 > MAX_Y) {
    svg = createNewVariationsPage(pages);
    y = 30;
  }
  y += 2;
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: VARIATION_ROW_H + 1, fill: BRAND_PRIMARY, rx: 1 }, svg);
  textEl(svg, MARGIN_LEFT + 3, y + 5, `TOTAL VARIATIONS (${data.items.length} items)`, { size: 3.2, fill: WHITE, weight: 'bold' });
  textEl(svg, MARGIN_LEFT + cols[4].x + cols[4].w - 2, y + 5, formatCurrency(data.totalAmount), { size: 3.2, fill: WHITE, weight: 'bold', anchor: 'end' });

  return pages;
}

function createNewVariationsPage(pages: SVGSVGElement[]): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, pages.length === 0 ? 'VARIATIONS' : 'VARIATIONS (cont.)');
  pages.push(svg);
  return svg;
}
