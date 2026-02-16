/**
 * Comparison Matrix PDF Builder — SVG engine
 */
import {
  createSvgElement, el, textEl, addPageHeader, applyPageFooters,
  MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, PAGE_W, PAGE_H,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED, BORDER_COLOR, WHITE,
  formatCurrencyValue,
} from './sharedSvgHelpers';

interface ComparisonRow {
  property: string;
  values: (string | number | null)[];
  format?: 'currency' | 'number' | 'text';
}

export interface ComparisonPdfData {
  fittings: { fitting_code: string }[];
  generalRows: ComparisonRow[];
  performanceRows: ComparisonRow[];
  costRows: ComparisonRow[];
  physicalRows: ComparisonRow[];
}

function fmtVal(v: string | number | null, fmt?: string): string {
  if (v === null || v === '-') return '-';
  if (fmt === 'currency' && typeof v === 'number') return formatCurrencyValue(v);
  return String(v);
}

function drawTable(
  svg: SVGSVGElement,
  startY: number,
  headers: string[],
  rows: ComparisonRow[],
  colWidths: number[]
): number {
  let y = startY;
  const rowH = 7;
  const fontSize = 3;

  // Header row
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: rowH, fill: BRAND_PRIMARY }, svg);
  let cx = MARGIN_LEFT;
  headers.forEach((h, i) => {
    textEl(svg, cx + 2, y + 4.5, h, { size: fontSize, fill: WHITE, weight: 'bold' });
    cx += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    const fill = ri % 2 === 0 ? '#f8fafc' : WHITE;
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: rowH, fill }, svg);
    cx = MARGIN_LEFT;
    // Property column
    textEl(svg, cx + 2, y + 4.5, row.property, { size: fontSize, fill: TEXT_DARK, weight: 'bold' });
    cx += colWidths[0];
    // Value columns
    row.values.forEach((v, vi) => {
      textEl(svg, cx + colWidths[vi + 1] / 2, y + 4.5, fmtVal(v, row.format), {
        size: fontSize, fill: TEXT_MUTED, anchor: 'middle',
      });
      cx += colWidths[vi + 1];
    });
    y += rowH;
  });

  // Bottom border
  el('line', { x1: MARGIN_LEFT, y1: y, x2: PAGE_W - MARGIN_RIGHT, y2: y, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
  return y;
}

export function buildComparisonPdf(data: ComparisonPdfData): SVGSVGElement[] {
  const { fittings, generalRows, performanceRows, costRows, physicalRows } = data;
  // Landscape A4
  const pw = PAGE_H; // 297
  const ph = PAGE_W; // 210
  const ml = 15, mr = 15;
  const cw = pw - ml - mr;

  const propW = 40;
  const valW = (cw - propW) / fittings.length;
  const colWidths = [propW, ...fittings.map(() => valW)];
  const headers = ['Property', ...fittings.map(f => f.fitting_code)];

  const sections: { title: string; rows: ComparisonRow[] }[] = [
    { title: 'General Information', rows: generalRows },
    { title: 'Performance', rows: performanceRows },
    { title: 'Costs', rows: costRows },
    { title: 'Physical Specifications', rows: physicalRows },
  ];

  const pages: SVGSVGElement[] = [];

  const makePage = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', `0 0 ${pw} ${ph}`);
    svg.setAttribute('width', `${pw}mm`);
    svg.setAttribute('height', `${ph}mm`);
    return svg;
  };

  let svg = makePage();
  // Title
  el('rect', { x: 0, y: 0, width: pw, height: 1.5, fill: BRAND_ACCENT }, svg);
  textEl(svg, ml, 18, 'LIGHTING FITTING COMPARISON', { size: 8, fill: BRAND_PRIMARY, weight: 'bold' });
  textEl(svg, ml, 24, `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
    size: 3.5, fill: TEXT_MUTED,
  });

  let curY = 32;

  for (const section of sections) {
    const neededH = 10 + section.rows.length * 7 + 10;
    if (curY + neededH > ph - 15) {
      pages.push(svg);
      svg = makePage();
      el('rect', { x: 0, y: 0, width: pw, height: 1.5, fill: BRAND_ACCENT }, svg);
      curY = 18;
    }

    textEl(svg, ml, curY + 5, section.title, { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
    curY += 8;

    // Re-use drawTable but override margins for landscape
    // Inline mini-table since landscape dims differ
    const rowH = 6;
    const fontSize = 2.8;
    // Header
    el('rect', { x: ml, y: curY, width: cw, height: rowH, fill: BRAND_PRIMARY }, svg);
    let cx = ml;
    headers.forEach((h, i) => {
      textEl(svg, cx + 2, curY + 4, h, { size: fontSize, fill: WHITE, weight: 'bold' });
      cx += colWidths[i];
    });
    curY += rowH;

    section.rows.forEach((row, ri) => {
      const fill = ri % 2 === 0 ? '#f8fafc' : WHITE;
      el('rect', { x: ml, y: curY, width: cw, height: rowH, fill }, svg);
      cx = ml;
      textEl(svg, cx + 2, curY + 4, row.property, { size: fontSize, fill: TEXT_DARK, weight: 'bold' });
      cx += colWidths[0];
      row.values.forEach((v, vi) => {
        textEl(svg, cx + colWidths[vi + 1] / 2, curY + 4, fmtVal(v, row.format), {
          size: fontSize, fill: TEXT_MUTED, anchor: 'middle',
        });
        cx += colWidths[vi + 1];
      });
      curY += rowH;
    });

    el('line', { x1: ml, y1: curY, x2: pw - mr, y2: curY, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
    curY += 8;
  }

  pages.push(svg);

  // Footers on all pages
  pages.forEach((p, i) => {
    el('line', { x1: ml, y1: ph - 10, x2: pw - mr, y2: ph - 10, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, p);
    textEl(p, ml, ph - 6, 'Lighting Comparison', { size: 2.5, fill: '#94a3b8' });
    textEl(p, pw - mr, ph - 6, `Page ${i + 1} of ${pages.length}`, { size: 2.5, fill: '#94a3b8', anchor: 'end' });
  });

  return pages;
}
