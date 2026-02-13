/**
 * SVG Cost Report Builder
 * 
 * Builds SVG elements for:
 * 1. Cover Page - branded with company info
 * 2. Executive Summary - category table
 * 3. Category Details - line items per category with subtotals
 * 4. Variations - variation items with status and amounts
 * 5. Budget Distribution - donut chart
 * 6. Variance Comparison - side-by-side bar charts
 * 7. Project Health - KPI gauges dashboard
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
  companyLogoBase64?: string | null;
  clientLogoBase64?: string | null;
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

  // Logo(s) — rendered above company name
  const hasCompanyLogo = !!data.companyLogoBase64;
  const hasClientLogo = !!data.clientLogoBase64;
  let logoBottomY = 20; // default top position when no logos

  if (hasCompanyLogo && hasClientLogo) {
    // Both logos side by side
    el('image', {
      x: 45, y: 16, width: 30, height: 18,
      href: data.companyLogoBase64!,
      preserveAspectRatio: 'xMidYMid meet',
    }, svg);
    el('image', {
      x: 135, y: 16, width: 30, height: 18,
      href: data.clientLogoBase64!,
      preserveAspectRatio: 'xMidYMid meet',
    }, svg);
    logoBottomY = 38;
  } else if (hasCompanyLogo) {
    el('image', {
      x: PAGE_W / 2 - 20, y: 16, width: 40, height: 22,
      href: data.companyLogoBase64!,
      preserveAspectRatio: 'xMidYMid meet',
    }, svg);
    logoBottomY = 42;
  } else if (hasClientLogo) {
    el('image', {
      x: PAGE_W / 2 - 20, y: 16, width: 40, height: 22,
      href: data.clientLogoBase64!,
      preserveAspectRatio: 'xMidYMid meet',
    }, svg);
    logoBottomY = 42;
  }

  textEl(svg, PAGE_W / 2, logoBottomY + 8, data.companyName.toUpperCase(), {
    size: 8, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  el('line', { x1: 60, y1: logoBottomY + 18, x2: 150, y2: logoBottomY + 18, stroke: BRAND_ACCENT, 'stroke-width': 0.5 }, svg);

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

// ─── 5. Budget Distribution Donut Chart ───

const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#0891b2', '#4f46e5', '#c026d3', '#d97706', '#059669',
];

export interface BudgetDistributionData {
  categories: { code: string; description: string; amount: number }[];
  totalBudget: number;
}

export function buildBudgetDistributionSvg(data: BudgetDistributionData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'BUDGET DISTRIBUTION');

  const items = data.categories
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (items.length === 0) {
    textEl(svg, PAGE_W / 2, PAGE_H / 2, 'No budget data available', {
      size: 5, fill: TEXT_MUTED, anchor: 'middle',
    });
    return svg;
  }

  const total = items.reduce((s, c) => s + c.amount, 0);

  // Donut chart center and radii
  const cx = 70;
  const cy = 95;
  const outerR = 42;
  const innerR = 24;

  // Draw arcs
  let startAngle = -Math.PI / 2; // start at top

  items.forEach((item, i) => {
    const fraction = item.amount / total;
    const endAngle = startAngle + fraction * 2 * Math.PI;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    // Only draw if fraction is meaningful
    if (fraction < 0.001) { startAngle = endAngle; return; }

    const largeArc = fraction > 0.5 ? 1 : 0;

    // Outer arc points
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);

    // Inner arc points (reverse direction)
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');

    el('path', { d, fill: color, stroke: WHITE, 'stroke-width': 0.5 }, svg);

    // Percentage label on slice (for segments > 8%)
    if (fraction > 0.08) {
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      const labelR = (outerR + innerR) / 2;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      textEl(svg, lx, ly + 1, `${(fraction * 100).toFixed(1)}%`, {
        size: 2.5, fill: WHITE, weight: 'bold', anchor: 'middle',
      });
    }

    startAngle = endAngle;
  });

  // Center text
  textEl(svg, cx, cy - 2, 'TOTAL', { size: 2.5, fill: TEXT_MUTED, anchor: 'middle' });
  textEl(svg, cx, cy + 3, formatCurrency(total), {
    size: 3.5, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  // Legend on the right side
  const legendX = 125;
  let legendY = 45;
  const legendRowH = 9;

  // Legend header
  textEl(svg, legendX, legendY, 'CATEGORY BREAKDOWN', {
    size: 3, fill: BRAND_PRIMARY, weight: 'bold',
  });
  legendY += 6;

  items.forEach((item, i) => {
    if (legendY > PAGE_H - 40) return; // safety limit

    const color = CHART_COLORS[i % CHART_COLORS.length];
    const pct = ((item.amount / total) * 100).toFixed(1);

    // Color swatch
    el('rect', {
      x: legendX, y: legendY - 3,
      width: 4, height: 4, rx: 0.8,
      fill: color,
    }, svg);

    // Category code + description
    const label = `${item.code} — ${item.description}`;
    const truncLabel = label.length > 28 ? label.slice(0, 25) + '...' : label;
    textEl(svg, legendX + 6, legendY, truncLabel, { size: 2.6, fill: TEXT_DARK });

    // Amount + percentage
    textEl(svg, legendX + 6, legendY + 4, `${formatCurrency(item.amount)}  (${pct}%)`, {
      size: 2.4, fill: TEXT_MUTED,
    });

    legendY += legendRowH;
  });

  // Summary cards at bottom
  const cardY = 160;
  const cardW = (CONTENT_W - 6) / 3;

  // Largest category
  const largest = items[0];
  drawSummaryCard(svg, MARGIN_LEFT, cardY, cardW, 'Largest Category',
    `${largest.code} — ${largest.description}`,
    formatCurrency(largest.amount),
    `${((largest.amount / total) * 100).toFixed(1)}% of total`,
    CHART_COLORS[0]
  );

  // Number of categories
  drawSummaryCard(svg, MARGIN_LEFT + cardW + 3, cardY, cardW, 'Categories',
    `${items.length} active`,
    formatCurrency(total),
    'Total Original Budget',
    BRAND_ACCENT
  );

  // Smallest category
  const smallest = items[items.length - 1];
  drawSummaryCard(svg, MARGIN_LEFT + (cardW + 3) * 2, cardY, cardW, 'Smallest Category',
    `${smallest.code} — ${smallest.description}`,
    formatCurrency(smallest.amount),
    `${((smallest.amount / total) * 100).toFixed(1)}% of total`,
    CHART_COLORS[items.length - 1 < CHART_COLORS.length ? items.length - 1 : CHART_COLORS.length - 1]
  );

  return svg;
}

function drawSummaryCard(
  svg: SVGSVGElement,
  x: number, y: number, w: number,
  title: string, line1: string, line2: string, line3: string,
  accentColor: string
) {
  el('rect', { x, y, width: w, height: 30, rx: 2, fill: BRAND_LIGHT, stroke: BORDER_COLOR, 'stroke-width': 0.2 }, svg);
  el('rect', { x, y, width: w, height: 1.5, rx: 0.5, fill: accentColor }, svg);
  textEl(svg, x + 3, y + 6, title.toUpperCase(), { size: 2.2, fill: TEXT_MUTED, weight: 'bold' });
  const truncLine1 = line1.length > 22 ? line1.slice(0, 19) + '...' : line1;
  textEl(svg, x + 3, y + 12, truncLine1, { size: 2.8, fill: TEXT_DARK });
  textEl(svg, x + 3, y + 18, line2, { size: 3.5, fill: accentColor, weight: 'bold' });
  textEl(svg, x + 3, y + 24, line3, { size: 2.2, fill: TEXT_MUTED });
}

// ─── 6. Variance Comparison Bar Chart ───

export interface VarianceComparisonData {
  categories: {
    code: string;
    description: string;
    originalBudget: number;
    anticipatedFinal: number;
  }[];
}

export function buildVarianceComparisonSvg(data: VarianceComparisonData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'VARIANCE COMPARISON');

  const items = data.categories.filter(c => c.originalBudget > 0 || c.anticipatedFinal > 0);

  if (items.length === 0) {
    textEl(svg, PAGE_W / 2, PAGE_H / 2, 'No budget data available', {
      size: 5, fill: TEXT_MUTED, anchor: 'middle',
    });
    return svg;
  }

  // Chart area dimensions
  const chartLeft = MARGIN_LEFT + 30; // room for Y-axis labels
  const chartRight = PAGE_W - MARGIN_RIGHT - 5;
  const chartTop = 38;
  const chartBottom = 200;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;

  // Find max value for scale
  const maxVal = Math.max(...items.flatMap(c => [c.originalBudget, c.anticipatedFinal]));
  const niceMax = Math.ceil(maxVal / 1000000) * 1000000 || 1;

  // Y-axis gridlines and labels
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const yPos = chartBottom - (i / gridSteps) * chartH;
    const val = (i / gridSteps) * niceMax;

    // Gridline
    el('line', {
      x1: chartLeft, y1: yPos,
      x2: chartRight, y2: yPos,
      stroke: BORDER_COLOR, 'stroke-width': 0.2,
      'stroke-dasharray': i === 0 ? 'none' : '1,1',
    }, svg);

    // Y-axis label
    const label = val >= 1000000
      ? `R${(val / 1000000).toFixed(1)}M`
      : val >= 1000
        ? `R${(val / 1000).toFixed(0)}K`
        : `R${val.toFixed(0)}`;
    textEl(svg, chartLeft - 2, yPos + 1, label, {
      size: 2.2, fill: TEXT_MUTED, anchor: 'end',
    });
  }

  // Bar groups
  const groupW = chartW / items.length;
  const barW = Math.min(groupW * 0.3, 12); // each bar width
  const gap = 1.5; // gap between paired bars

  const ORIGINAL_COLOR = BRAND_ACCENT;
  const ANTICIPATED_COLOR = '#7c3aed';

  items.forEach((cat, i) => {
    const groupCenterX = chartLeft + groupW * i + groupW / 2;

    // Original Budget bar
    const origH = (cat.originalBudget / niceMax) * chartH;
    const origX = groupCenterX - barW - gap / 2;
    el('rect', {
      x: origX, y: chartBottom - origH,
      width: barW, height: Math.max(origH, 0.5),
      fill: ORIGINAL_COLOR, rx: 0.8,
    }, svg);

    // Anticipated Final bar
    const antH = (cat.anticipatedFinal / niceMax) * chartH;
    const antX = groupCenterX + gap / 2;
    el('rect', {
      x: antX, y: chartBottom - antH,
      width: barW, height: Math.max(antH, 0.5),
      fill: ANTICIPATED_COLOR, rx: 0.8,
    }, svg);

    // Value labels on top of bars (if tall enough)
    if (origH > 8) {
      textEl(svg, origX + barW / 2, chartBottom - origH - 2, formatCompact(cat.originalBudget), {
        size: 2, fill: ORIGINAL_COLOR, anchor: 'middle', weight: 'bold',
      });
    }
    if (antH > 8) {
      textEl(svg, antX + barW / 2, chartBottom - antH - 2, formatCompact(cat.anticipatedFinal), {
        size: 2, fill: ANTICIPATED_COLOR, anchor: 'middle', weight: 'bold',
      });
    }

    // X-axis label (category code)
    textEl(svg, groupCenterX, chartBottom + 5, cat.code, {
      size: 2.5, fill: TEXT_DARK, anchor: 'middle', weight: 'bold',
    });
  });

  // Legend
  const legendY = chartBottom + 14;
  el('rect', { x: chartLeft, y: legendY - 3, width: 4, height: 4, rx: 0.8, fill: ORIGINAL_COLOR }, svg);
  textEl(svg, chartLeft + 6, legendY, 'Original Budget', { size: 2.8, fill: TEXT_DARK });
  el('rect', { x: chartLeft + 40, y: legendY - 3, width: 4, height: 4, rx: 0.8, fill: ANTICIPATED_COLOR }, svg);
  textEl(svg, chartLeft + 46, legendY, 'Anticipated Final', { size: 2.8, fill: TEXT_DARK });

  // Variance detail table below chart
  const tableY = legendY + 12;
  const tableCols = [
    { label: 'CATEGORY', x: 0, w: 55 },
    { label: 'ORIGINAL BUDGET', x: 55, w: 35 },
    { label: 'ANTICIPATED FINAL', x: 90, w: 35 },
    { label: 'VARIANCE', x: 125, w: 27 },
    { label: '% CHANGE', x: 152, w: 28 },
  ];
  const tRowH = 6.5;

  // Table header
  el('rect', { x: MARGIN_LEFT, y: tableY, width: CONTENT_W, height: tRowH, fill: BRAND_PRIMARY }, svg);
  tableCols.forEach(c => {
    textEl(svg, MARGIN_LEFT + c.x + 2, tableY + 4.5, c.label, { size: 2.4, fill: WHITE, weight: 'bold' });
  });

  let ty = tableY + tRowH;
  items.forEach((cat, i) => {
    if (ty + tRowH > PAGE_H - 20) return; // safety

    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y: ty, width: CONTENT_W, height: tRowH, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.1 }, svg);

    const desc = `${cat.code} — ${cat.description}`;
    const truncDesc = desc.length > 35 ? desc.slice(0, 32) + '...' : desc;
    textEl(svg, MARGIN_LEFT + 2, ty + 4.5, truncDesc, { size: 2.6 });
    textEl(svg, MARGIN_LEFT + tableCols[1].x + tableCols[1].w - 2, ty + 4.5, formatCurrency(cat.originalBudget), { size: 2.6, anchor: 'end' });
    textEl(svg, MARGIN_LEFT + tableCols[2].x + tableCols[2].w - 2, ty + 4.5, formatCurrency(cat.anticipatedFinal), { size: 2.6, anchor: 'end' });

    const variance = cat.anticipatedFinal - cat.originalBudget;
    const vColor = variance >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    const vSign = variance >= 0 ? '+' : '-';
    textEl(svg, MARGIN_LEFT + tableCols[3].x + tableCols[3].w - 2, ty + 4.5, `${vSign}${formatCurrency(variance)}`, { size: 2.6, anchor: 'end', fill: vColor });

    const pctChange = cat.originalBudget > 0 ? ((variance / cat.originalBudget) * 100).toFixed(1) : '—';
    const pctStr = typeof pctChange === 'string' && pctChange !== '—' ? `${variance >= 0 ? '+' : ''}${pctChange}%` : pctChange;
    textEl(svg, MARGIN_LEFT + tableCols[4].x + tableCols[4].w - 2, ty + 4.5, pctStr, { size: 2.6, anchor: 'end', fill: vColor });

    ty += tRowH;
  });

  return svg;
}

function formatCompact(val: number): string {
  if (val >= 1000000) return `R${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R${(val / 1000).toFixed(0)}K`;
  return `R${val.toFixed(0)}`;
}

// ─── 7. Project Health KPI Dashboard ───

export interface ProjectHealthData {
  totalOriginalBudget: number;
  totalAnticipatedFinal: number;
  totalCurrentVariance: number;
  totalOriginalVariance: number;
  categoryCount: number;
  categoriesOverBudget: number;
  categoriesUnderBudget: number;
  categoriesOnTrack: number;
  variationsCount: number;
  variationsTotal: number;
}

export function buildProjectHealthSvg(data: ProjectHealthData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'PROJECT HEALTH DASHBOARD');

  // ── Row 1: Gauge cards ──
  const gaugeY = 35;
  const gaugeCardW = (CONTENT_W - 6) / 3;
  const gaugeCardH = 55;

  // 1. Budget Utilization gauge
  const utilization = data.totalOriginalBudget > 0
    ? (data.totalAnticipatedFinal / data.totalOriginalBudget) * 100
    : 0;
  drawGaugeCard(svg, MARGIN_LEFT, gaugeY, gaugeCardW, gaugeCardH,
    'Budget Utilization', utilization, '%',
    getUtilizationColor(utilization),
    `${formatCompact(data.totalAnticipatedFinal)} of ${formatCompact(data.totalOriginalBudget)}`
  );

  // 2. Variance Severity gauge
  const variancePct = data.totalOriginalBudget > 0
    ? Math.abs(data.totalOriginalVariance / data.totalOriginalBudget) * 100
    : 0;
  const varianceDirection = data.totalOriginalVariance >= 0 ? 'Over' : 'Under';
  drawGaugeCard(svg, MARGIN_LEFT + gaugeCardW + 3, gaugeY, gaugeCardW, gaugeCardH,
    'Variance Severity', Math.min(variancePct, 100), '%',
    getVarianceSeverityColor(variancePct),
    `${varianceDirection} by ${formatCompact(Math.abs(data.totalOriginalVariance))}`
  );

  // 3. Category Health gauge
  const healthPct = data.categoryCount > 0
    ? ((data.categoriesOnTrack + data.categoriesUnderBudget) / data.categoryCount) * 100
    : 100;
  drawGaugeCard(svg, MARGIN_LEFT + (gaugeCardW + 3) * 2, gaugeY, gaugeCardW, gaugeCardH,
    'Category Health', healthPct, '%',
    getHealthColor(healthPct),
    `${data.categoriesOnTrack + data.categoriesUnderBudget} of ${data.categoryCount} on track`
  );

  // ── Row 2: KPI metric cards ──
  const kpiY = gaugeY + gaugeCardH + 10;
  const kpiW = (CONTENT_W - 9) / 4;
  const kpiH = 28;

  drawKpiCard(svg, MARGIN_LEFT, kpiY, kpiW, kpiH,
    'Total Categories', String(data.categoryCount), BRAND_ACCENT, 'Active budget categories');
  drawKpiCard(svg, MARGIN_LEFT + kpiW + 3, kpiY, kpiW, kpiH,
    'Over Budget', String(data.categoriesOverBudget), DANGER_COLOR,
    `${data.categoryCount > 0 ? ((data.categoriesOverBudget / data.categoryCount) * 100).toFixed(0) : 0}% of categories`);
  drawKpiCard(svg, MARGIN_LEFT + (kpiW + 3) * 2, kpiY, kpiW, kpiH,
    'Under Budget', String(data.categoriesUnderBudget), SUCCESS_COLOR,
    `${data.categoryCount > 0 ? ((data.categoriesUnderBudget / data.categoryCount) * 100).toFixed(0) : 0}% of categories`);
  drawKpiCard(svg, MARGIN_LEFT + (kpiW + 3) * 3, kpiY, kpiW, kpiH,
    'Variations', String(data.variationsCount), '#7c3aed',
    `Total: ${formatCompact(data.variationsTotal)}`);

  // ── Row 3: Financial summary table ──
  const tableY = kpiY + kpiH + 12;
  textEl(svg, MARGIN_LEFT, tableY, 'FINANCIAL SUMMARY', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });

  const summaryRows = [
    { label: 'Original Budget', value: data.totalOriginalBudget, color: TEXT_DARK },
    { label: 'Anticipated Final', value: data.totalAnticipatedFinal, color: TEXT_DARK },
    { label: 'Current Period Variance', value: data.totalCurrentVariance, color: data.totalCurrentVariance >= 0 ? SUCCESS_COLOR : DANGER_COLOR },
    { label: 'Variance from Original', value: data.totalOriginalVariance, color: data.totalOriginalVariance >= 0 ? SUCCESS_COLOR : DANGER_COLOR },
  ];

  let sy = tableY + 8;
  summaryRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? BRAND_LIGHT : WHITE;
    el('rect', { x: MARGIN_LEFT, y: sy, width: CONTENT_W, height: 8, fill: bg, stroke: BORDER_COLOR, 'stroke-width': 0.1 }, svg);
    textEl(svg, MARGIN_LEFT + 4, sy + 5.5, row.label, { size: 3.2, fill: TEXT_DARK });
    const sign = row.value >= 0 ? '' : '-';
    textEl(svg, PAGE_W - MARGIN_RIGHT - 4, sy + 5.5, `${sign}${formatCurrency(Math.abs(row.value))}`, {
      size: 3.2, fill: row.color, weight: 'bold', anchor: 'end',
    });
    sy += 8;
  });

  // ── Row 4: Status indicator strip ──
  const stripY = sy + 10;
  textEl(svg, MARGIN_LEFT, stripY, 'RISK ASSESSMENT', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });

  const riskLevel = getRiskLevel(utilization, variancePct);
  const riskColors = { low: SUCCESS_COLOR, medium: '#d97706', high: DANGER_COLOR };
  const riskBgs = { low: '#dcfce7', medium: WARNING_BG, high: '#fee2e2' };

  const riskY = stripY + 8;
  el('rect', { x: MARGIN_LEFT, y: riskY, width: CONTENT_W, height: 16, rx: 2, fill: riskBgs[riskLevel], stroke: riskColors[riskLevel], 'stroke-width': 0.3 }, svg);

  // Risk icon (circle indicator)
  el('circle', { cx: MARGIN_LEFT + 8, cy: riskY + 8, r: 3, fill: riskColors[riskLevel] }, svg);
  textEl(svg, MARGIN_LEFT + 14, riskY + 9.5, `Overall Risk: ${riskLevel.toUpperCase()}`, {
    size: 3.5, fill: riskColors[riskLevel], weight: 'bold',
  });
  textEl(svg, MARGIN_LEFT + 14, riskY + 13.5, getRiskDescription(riskLevel, utilization, variancePct), {
    size: 2.5, fill: TEXT_MUTED,
  });

  return svg;
}

// ── Gauge drawing helper ──

function drawGaugeCard(
  svg: SVGSVGElement,
  x: number, y: number, w: number, h: number,
  title: string, value: number, unit: string,
  color: string, subtitle: string
) {
  el('rect', { x, y, width: w, height: h, rx: 2, fill: WHITE, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
  el('rect', { x, y, width: w, height: 1.5, rx: 0.5, fill: color }, svg);

  textEl(svg, x + w / 2, y + 8, title.toUpperCase(), {
    size: 2.5, fill: TEXT_MUTED, weight: 'bold', anchor: 'middle',
  });

  // Semi-circle gauge
  const cx = x + w / 2;
  const cy = y + 32;
  const r = 16;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - (value / 100) * Math.PI;

  // Background arc
  const bgX1 = cx + r * Math.cos(startAngle);
  const bgY1 = cy + r * Math.sin(startAngle);
  const bgX2 = cx + r * Math.cos(endAngle);
  const bgY2 = cy + r * Math.sin(endAngle);
  el('path', {
    d: `M ${bgX1} ${bgY1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}`,
    fill: 'none', stroke: '#e2e8f0', 'stroke-width': 3, 'stroke-linecap': 'round',
  }, svg);

  // Value arc
  if (value > 0) {
    const valAngle = startAngle - Math.min(value / 100, 1) * Math.PI;
    const vX2 = cx + r * Math.cos(valAngle);
    const vY2 = cy + r * Math.sin(valAngle);
    const largeArc = value > 50 ? 1 : 0;
    el('path', {
      d: `M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArc} 1 ${vX2} ${vY2}`,
      fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linecap': 'round',
    }, svg);
  }

  // Center value
  textEl(svg, cx, cy - 2, `${value.toFixed(1)}${unit}`, {
    size: 5, fill: color, weight: 'bold', anchor: 'middle',
  });

  // Subtitle
  textEl(svg, cx, y + h - 5, subtitle, {
    size: 2.3, fill: TEXT_MUTED, anchor: 'middle',
  });
}

// ── KPI card helper ──

function drawKpiCard(
  svg: SVGSVGElement,
  x: number, y: number, w: number, h: number,
  title: string, value: string, color: string, subtitle: string
) {
  el('rect', { x, y, width: w, height: h, rx: 2, fill: BRAND_LIGHT, stroke: BORDER_COLOR, 'stroke-width': 0.2 }, svg);
  el('rect', { x, y, width: 1.5, height: h, rx: 0.5, fill: color }, svg);
  textEl(svg, x + 5, y + 7, title.toUpperCase(), { size: 2.2, fill: TEXT_MUTED, weight: 'bold' });
  textEl(svg, x + 5, y + 16, value, { size: 6, fill: color, weight: 'bold' });
  textEl(svg, x + 5, y + 23, subtitle, { size: 2.2, fill: TEXT_MUTED });
}

// ── Color/status helpers ──

function getUtilizationColor(pct: number): string {
  if (pct <= 90) return SUCCESS_COLOR;
  if (pct <= 105) return '#d97706';
  return DANGER_COLOR;
}

function getVarianceSeverityColor(pct: number): string {
  if (pct <= 5) return SUCCESS_COLOR;
  if (pct <= 15) return '#d97706';
  return DANGER_COLOR;
}

function getHealthColor(pct: number): string {
  if (pct >= 75) return SUCCESS_COLOR;
  if (pct >= 50) return '#d97706';
  return DANGER_COLOR;
}

function getRiskLevel(utilization: number, variancePct: number): 'low' | 'medium' | 'high' {
  if (utilization > 110 || variancePct > 15) return 'high';
  if (utilization > 100 || variancePct > 5) return 'medium';
  return 'low';
}

function getRiskDescription(level: string, utilization: number, variancePct: number): string {
  if (level === 'high') return `Budget utilization at ${utilization.toFixed(1)}% with ${variancePct.toFixed(1)}% variance — immediate attention required.`;
  if (level === 'medium') return `Budget utilization at ${utilization.toFixed(1)}% with ${variancePct.toFixed(1)}% variance — monitor closely.`;
  return `Budget utilization at ${utilization.toFixed(1)}% with ${variancePct.toFixed(1)}% variance — project on track.`;
}
