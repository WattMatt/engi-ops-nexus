/**
 * Shared SVG-to-PDF helpers for all report types.
 * Extracted from costReportPdfBuilder.ts for reuse across
 * Final Account, Specification, Tenant Completion, Project Outline, and Site Diary.
 */

// A4 in mm for SVG viewBox
export const PAGE_W = 210;
export const PAGE_H = 297;

// Margins — aligned with Hardened PDF Standard (pdfStandards.ts)
export const MARGIN_TOP = 25;
export const MARGIN_BOTTOM = 22;
export const MARGIN_LEFT = 15;
export const MARGIN_RIGHT = 15;
export const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

// Brand colors
export const BRAND_PRIMARY = '#1e3a5f';
export const BRAND_ACCENT = '#2563eb';
export const BRAND_LIGHT = '#f0f4f8';
export const TEXT_DARK = '#1a1a2e';
export const TEXT_MUTED = '#64748b';
export const BORDER_COLOR = '#e2e8f0';
export const WHITE = '#ffffff';
export const SUCCESS_COLOR = '#16a34a';
export const DANGER_COLOR = '#dc2626';

// ─── SVG Element Helpers ───

export function createSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', `0 0 ${PAGE_W} ${PAGE_H}`);
  svg.setAttribute('width', `${PAGE_W}mm`);
  svg.setAttribute('height', `${PAGE_H}mm`);
  return svg;
}

export function el(tag: string, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
  parent.appendChild(e);
  return e;
}

export function textEl(
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

export function formatCurrencyValue(amount: number): string {
  return `R${Math.abs(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

/**
 * Truncate text to a max character length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}

/**
 * Word-wrap text into lines that fit within a given mm width at a given font size.
 * Approximation: each character is ~0.5 * fontSize mm wide.
 */
export function wrapText(text: string, maxWidthMm: number, fontSize: number): string[] {
  if (!text) return [''];
  const charWidth = fontSize * 0.5;
  const maxChars = Math.floor(maxWidthMm / charWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Page Structure ───

export function addPageHeader(svg: SVGSVGElement, title: string) {
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

function addPageFooter(svg: SVGSVGElement, reportTitle: string, pageNum: number, totalPages: number) {
  el('line', {
    x1: MARGIN_LEFT, y1: PAGE_H - 10,
    x2: PAGE_W - MARGIN_RIGHT, y2: PAGE_H - 10,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);
  textEl(svg, MARGIN_LEFT, PAGE_H - 6, reportTitle, {
    size: 2.5, fill: '#94a3b8',
  });
  textEl(svg, PAGE_W - MARGIN_RIGHT, PAGE_H - 6, `Page ${pageNum} of ${totalPages}`, {
    size: 2.5, fill: '#94a3b8', anchor: 'end',
  });
}

/**
 * Apply page footers to all assembled pages.
 * Skips page index 0 (cover page) by default.
 */
export function applyPageFooters(pages: SVGSVGElement[], reportTitle: string, skipCover: boolean = true) {
  const total = pages.length;
  pages.forEach((svg, i) => {
    if (skipCover && i === 0) return;
    addPageFooter(svg, reportTitle, i + 1, total);
  });
}

// ─── Standard Cover Page ───

export interface StandardCoverPageData {
  reportTitle: string;         // e.g. "FINAL ACCOUNT"
  reportSubtitle?: string;     // e.g. "Financial Summary"
  projectName: string;
  projectNumber?: string;
  revision?: string;
  date: string;
  companyLogoBase64?: string | null;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  contactName?: string;
  contactOrganization?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export function buildStandardCoverPageSvg(data: StandardCoverPageData): SVGSVGElement {
  const svg = createSvgElement();

  // White background
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);

  // Left accent bar
  el('rect', { x: 0, y: 0, width: 4, height: PAGE_H / 2, fill: BRAND_PRIMARY }, svg);
  el('rect', { x: 0, y: PAGE_H / 2, width: 4, height: PAGE_H / 2, fill: BRAND_ACCENT }, svg);

  // Logo
  let logoBottomY = 40;
  if (data.companyLogoBase64) {
    el('image', {
      x: PAGE_W / 2 - 20, y: 30, width: 40, height: 22,
      href: data.companyLogoBase64,
      preserveAspectRatio: 'xMidYMid meet',
    }, svg);
    logoBottomY = 58;
  }

  // Divider
  el('rect', {
    x: PAGE_W / 2 - 25, y: logoBottomY + 4, width: 50, height: 1.2,
    fill: BRAND_ACCENT, rx: 0.3,
  }, svg);

  // Report title
  const titleFontSize = data.reportTitle.length > 20 ? 10 : 14;
  textEl(svg, PAGE_W / 2, logoBottomY + 20, data.reportTitle.toUpperCase(), {
    size: titleFontSize, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  // Subtitle
  if (data.reportSubtitle) {
    textEl(svg, PAGE_W / 2, logoBottomY + 28, data.reportSubtitle, {
      size: 5, fill: TEXT_MUTED, anchor: 'middle',
    });
  }

  // Project name
  const projNameFontSize = data.projectName.length > 35 ? 7 : 9;
  textEl(svg, PAGE_W / 2, logoBottomY + 42, data.projectName, {
    size: projNameFontSize, fill: BRAND_ACCENT, weight: 'bold', anchor: 'middle',
  });

  if (data.projectNumber) {
    textEl(svg, PAGE_W / 2, logoBottomY + 50, data.projectNumber, {
      size: 4, fill: TEXT_MUTED, anchor: 'middle',
    });
  }

  // PREPARED FOR / PREPARED BY section
  const detailsY = 185;
  el('line', {
    x1: MARGIN_LEFT + 10, y1: detailsY,
    x2: PAGE_W - MARGIN_RIGHT - 10, y2: detailsY,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);

  const leftX = MARGIN_LEFT + 15;
  const rightX = PAGE_W / 2 + 10;

  textEl(svg, leftX, detailsY + 8, 'PREPARED FOR', {
    size: 2.8, fill: BRAND_ACCENT, weight: 'bold',
  });
  textEl(svg, leftX, detailsY + 14, data.contactOrganization || '-', { size: 3, weight: 'bold' });
  textEl(svg, leftX, detailsY + 19, data.contactName || '', { size: 2.8, fill: TEXT_MUTED });
  textEl(svg, leftX, detailsY + 24, data.contactPhone ? `Tel: ${data.contactPhone}` : '', { size: 2.8, fill: TEXT_MUTED });
  textEl(svg, leftX, detailsY + 29, data.contactEmail || '', { size: 2.8, fill: TEXT_MUTED });

  textEl(svg, rightX, detailsY + 8, 'PREPARED BY', {
    size: 2.8, fill: BRAND_ACCENT, weight: 'bold',
  });
  textEl(svg, rightX, detailsY + 14, data.companyName || 'Watson Mattheus Engineering', { size: 3, weight: 'bold' });
  textEl(svg, rightX, detailsY + 19, data.companyAddress || '', { size: 2.8, fill: TEXT_MUTED });
  textEl(svg, rightX, detailsY + 24, data.companyPhone ? `Tel: ${data.companyPhone}` : '', { size: 2.8, fill: TEXT_MUTED });

  // Date & Revision at bottom
  textEl(svg, MARGIN_LEFT + 15, PAGE_H - 20, `Date: ${data.date}`, {
    size: 3, fill: TEXT_MUTED,
  });
  if (data.revision) {
    textEl(svg, PAGE_W - MARGIN_RIGHT - 15, PAGE_H - 20, `Revision: ${data.revision}`, {
      size: 3, fill: TEXT_MUTED, anchor: 'end',
    });
  }

  return svg;
}

// ─── Table Builder ───

export interface TableColumn {
  header: string;
  width: number;       // in mm
  align?: 'left' | 'right' | 'center';
  key: string;
}

export interface TableRow {
  [key: string]: string | number | boolean | undefined;
  _bold?: boolean;
  _bgColor?: string;
}

/**
 * Build a table SVG page (or multiple pages if rows overflow).
 * Returns an array of SVG elements.
 */
export function buildTablePages(
  title: string,
  columns: TableColumn[],
  rows: any[],
  options?: { startY?: number; rowHeight?: number; fontSize?: number; headerFontSize?: number }
): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const rowHeight = options?.rowHeight || 5.5;
  const fontSize = options?.fontSize || 2.8;
  const headerFontSize = options?.headerFontSize || 3;
  const maxY = PAGE_H - MARGIN_BOTTOM - 10;
  const startY = options?.startY || MARGIN_TOP + 12;

  let currentPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
  addPageHeader(currentPage, title);
  pages.push(currentPage);

  let y = startY;

  // Character width factor for truncation (mm per character at given font size)
  const CHAR_WIDTH_FACTOR = 0.6;

  // Table header
  const drawHeader = (svg: SVGSVGElement, yPos: number) => {
    el('rect', { x: MARGIN_LEFT, y: yPos - 3.5, width: CONTENT_W, height: rowHeight, fill: BRAND_PRIMARY }, svg);
    let xOffset = MARGIN_LEFT + 1;
    for (const col of columns) {
      const anchor = col.align === 'right' ? 'end' : col.align === 'center' ? 'middle' : 'start';
      const textX = col.align === 'right' ? xOffset + col.width - 1 : col.align === 'center' ? xOffset + col.width / 2 : xOffset;
      const maxChars = Math.floor((col.width - 2) / (headerFontSize * CHAR_WIDTH_FACTOR));
      textEl(svg, textX, yPos, truncate(col.header, maxChars), {
        size: headerFontSize, fill: WHITE, weight: 'bold', anchor,
      });
      xOffset += col.width;
    }
    return yPos + rowHeight;
  };

  y = drawHeader(currentPage, y);

  // Table rows
  for (let r = 0; r < rows.length; r++) {
    if (y + rowHeight > maxY) {
      // New page
      currentPage = createSvgElement();
      el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
      addPageHeader(currentPage, title);
      pages.push(currentPage);
      y = startY;
      y = drawHeader(currentPage, y);
    }

    const row = rows[r];
    const bgColor = row._bgColor || (r % 2 === 0 ? WHITE : BRAND_LIGHT);
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: rowHeight, fill: bgColor }, currentPage);

    let xOffset = MARGIN_LEFT + 1;
    for (const col of columns) {
      const value = String(row[col.key] ?? '');
      const anchor = col.align === 'right' ? 'end' : col.align === 'center' ? 'middle' : 'start';
      const textX = col.align === 'right' ? xOffset + col.width - 1 : col.align === 'center' ? xOffset + col.width / 2 : xOffset;
      const displayValue = truncate(value, Math.floor((col.width - 2) / (fontSize * CHAR_WIDTH_FACTOR)));
      textEl(currentPage, textX, y, displayValue, {
        size: fontSize,
        fill: TEXT_DARK,
        weight: row._bold ? 'bold' : 'normal',
        anchor,
      });
      xOffset += col.width;
    }

    // Bottom border
    el('line', {
      x1: MARGIN_LEFT, y1: y + rowHeight - 3.5,
      x2: PAGE_W - MARGIN_RIGHT, y2: y + rowHeight - 3.5,
      stroke: BORDER_COLOR, 'stroke-width': 0.15,
    }, currentPage);

    y += rowHeight;
  }

  return pages;
}

// ─── Content Page (Text) ───

/**
 * Build pages with text content (e.g. notes, specifications, outlines).
 * Handles word-wrapping and pagination.
 */
export function buildTextPages(
  title: string,
  textContent: string,
  options?: { fontSize?: number; lineSpacing?: number }
): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const fontSize = options?.fontSize || 3.5;
  const lineSpacing = options?.lineSpacing || 5;
  const maxY = PAGE_H - MARGIN_BOTTOM - 10;
  const startY = MARGIN_TOP + 14;
  const lines = wrapText(textContent, CONTENT_W, fontSize);

  let currentPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
  addPageHeader(currentPage, title);
  pages.push(currentPage);
  let y = startY;

  for (const line of lines) {
    if (y + lineSpacing > maxY) {
      currentPage = createSvgElement();
      el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
      addPageHeader(currentPage, title);
      pages.push(currentPage);
      y = startY;
    }
    textEl(currentPage, MARGIN_LEFT, y, line, { size: fontSize });
    y += lineSpacing;
  }

  return pages;
}

// ─── Summary Stats Card ───

export interface StatCard {
  label: string;
  value: string;
  color?: string;
}

export function drawStatCards(svg: SVGSVGElement, stats: StatCard[], y: number): number {
  const cardW = (CONTENT_W - 6) / stats.length;
  stats.forEach((stat, i) => {
    const x = MARGIN_LEFT + i * (cardW + 2);
    el('rect', { x, y, width: cardW, height: 18, fill: BRAND_LIGHT, rx: 1.5 }, svg);
    textEl(svg, x + cardW / 2, y + 7, stat.value, {
      size: 5.5, fill: stat.color || BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
    });
    textEl(svg, x + cardW / 2, y + 13, stat.label, {
      size: 2.5, fill: TEXT_MUTED, anchor: 'middle',
    });
  });
  return y + 22;
}

// ─── Running Header (PDF Spec §1 — All Pages Except Cover) ───

/**
 * Apply running headers to all pages except the cover (index 0).
 * Left: report title. Right: project name.
 */
export function applyRunningHeaders(
  pages: SVGSVGElement[],
  reportTitle: string,
  projectName: string,
  skipCover: boolean = true
) {
  pages.forEach((svg, i) => {
    if (skipCover && i === 0) return;
    // Top accent line
    el('rect', { x: 0, y: 0, width: PAGE_W, height: 0.8, fill: BRAND_ACCENT }, svg);
    // Report title — left
    textEl(svg, MARGIN_LEFT, 6, reportTitle, {
      size: 2.8, fill: TEXT_MUTED, weight: 'bold',
    });
    // Project name — right
    textEl(svg, PAGE_W - MARGIN_RIGHT, 6, truncate(projectName, 50), {
      size: 2.8, fill: TEXT_MUTED, anchor: 'end',
    });
    // Separator line below header
    el('line', {
      x1: MARGIN_LEFT, y1: 8,
      x2: PAGE_W - MARGIN_RIGHT, y2: 8,
      stroke: BORDER_COLOR, 'stroke-width': 0.2,
    }, svg);
  });
}

// ─── Executive Summary Template ───

export interface ExecutiveSummaryData {
  items: { label: string; value: string; color?: string }[];
  narrative?: string;
}

export function buildExecutiveSummarySvg(data: ExecutiveSummaryData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Executive Summary');

  let y = MARGIN_TOP + 16;

  // KPI cards (up to 4 per row)
  if (data.items.length > 0) {
    const perRow = Math.min(data.items.length, 4);
    const cardW = (CONTENT_W - (perRow - 1) * 2) / perRow;
    data.items.forEach((item, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = MARGIN_LEFT + col * (cardW + 2);
      const cy = y + row * 22;
      el('rect', { x, y: cy, width: cardW, height: 18, fill: BRAND_LIGHT, rx: 1.5 }, svg);
      textEl(svg, x + cardW / 2, cy + 7, item.value, {
        size: 5, fill: item.color || BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
      });
      textEl(svg, x + cardW / 2, cy + 13, item.label, {
        size: 2.5, fill: TEXT_MUTED, anchor: 'middle',
      });
    });
    y += Math.ceil(data.items.length / perRow) * 22 + 6;
  }

  // Narrative text
  if (data.narrative) {
    const lines = wrapText(data.narrative, CONTENT_W, 3.5);
    for (const line of lines) {
      textEl(svg, MARGIN_LEFT, y, line, { size: 3.5 });
      y += 5;
    }
  }

  return svg;
}

// ─── Table of Contents ───

export interface TocEntry {
  label: string;
  pageNumber: number;
  indent?: boolean;
}

export function buildTableOfContentsSvg(entries: TocEntry[], reportTitle?: string): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Table of Contents');

  let y = MARGIN_TOP + 16;
  for (const entry of entries) {
    const x = entry.indent ? MARGIN_LEFT + 8 : MARGIN_LEFT + 2;
    const size = entry.indent ? 3 : 3.5;
    const weight = entry.indent ? 'normal' : 'bold';

    textEl(svg, x, y, entry.label, { size, weight, fill: TEXT_DARK });

    // Dot leader
    const dotsEndX = PAGE_W - MARGIN_RIGHT - 12;
    const textEndX = x + entry.label.length * size * 0.5 + 2;
    if (textEndX < dotsEndX) {
      const dots = '.'.repeat(Math.floor((dotsEndX - textEndX) / (size * 0.3)));
      textEl(svg, textEndX, y, dots, { size: 2, fill: BORDER_COLOR });
    }

    textEl(svg, PAGE_W - MARGIN_RIGHT - 2, y, String(entry.pageNumber), {
      size, fill: TEXT_MUTED, anchor: 'end',
    });

    y += entry.indent ? 5 : 6;
  }

  return svg;
}
