/**
 * DB Legend Card SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-legend-card-pdf)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  addPageHeader, applyPageFooters, applyRunningHeaders,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  type StandardCoverPageData,
} from './sharedSvgHelpers';

export interface Circuit {
  cb_no: number;
  description: string;
  amp_rating: string;
}

export interface Contactor {
  name: string;
  amps: string;
  controlling: string;
  kw: string;
  coil: string;
  poles: string;
}

export interface LegendCardPdfData {
  coverData: StandardCoverPageData;
  dbName: string;
  address?: string;
  cardDate?: string;
  phone?: string;
  email?: string;
  telNumber?: string;
  dolRegNo?: string;
  cocNo?: string;
  addendumNo?: string;
  sectionName?: string;
  fedFrom?: string;
  feedingBreakerId?: string;
  feedingSystemInfo?: string;
  circuits: Circuit[];
  contactors: Contactor[];
}

function drawFieldRow(svg: SVGSVGElement, x: number, y: number, label: string, value: string, width: number): number {
  textEl(svg, x, y, label, { size: 2.5, weight: 'bold', fill: '#475569' });
  textEl(svg, x + 22, y, value, { size: 2.8, fill: TEXT_DARK });
  el('line', { x1: x, y1: y + 2, x2: x + width, y2: y + 2, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, svg);
  return y + 5;
}

function drawCircuitTable(svg: SVGSVGElement, x: number, y: number, circuits: Circuit[], startIdx: number, count: number, colWidth: number): number {
  // Header
  el('rect', { x, y, width: colWidth, height: 5, fill: '#334155' }, svg);
  textEl(svg, x + 2, y + 3.5, 'CB#', { size: 2, weight: 'bold', fill: WHITE });
  textEl(svg, x + 12, y + 3.5, 'Description', { size: 2, weight: 'bold', fill: WHITE });
  textEl(svg, x + colWidth - 10, y + 3.5, 'Amps', { size: 2, weight: 'bold', fill: WHITE });
  y += 5;

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    const circuit = idx < circuits.length ? circuits[idx] : null;
    const bg = i % 2 === 0 ? WHITE : '#f8fafc';
    el('rect', { x, y, width: colWidth, height: 4, fill: bg }, svg);
    el('rect', { x, y, width: colWidth, height: 4, fill: 'none', stroke: '#cbd5e1', 'stroke-width': 0.2 }, svg);
    
    textEl(svg, x + 2, y + 3, circuit ? String(circuit.cb_no) : String(startIdx + i + 1), { size: 2, fill: '#475569', weight: 'bold' });
    textEl(svg, x + 12, y + 3, circuit?.description || '', { size: 2, fill: TEXT_DARK });
    textEl(svg, x + colWidth - 10, y + 3, circuit?.amp_rating || '', { size: 2, fill: TEXT_DARK });
    y += 4;
  }
  return y;
}

export function buildLegendCardPdf(data: LegendCardPdfData): SVGSVGElement[] {
  const { coverData, circuits, contactors } = data;
  const half = Math.max(Math.ceil(circuits.length / 2), 25);

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Legend card content page
  const contentPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, contentPage);

  // Title bar
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.setAttribute('id', 'dbTitleGrad');
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
  const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', BRAND_PRIMARY);
  const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#3b82f6');
  grad.appendChild(s1); grad.appendChild(s2);
  defs.appendChild(grad);
  contentPage.appendChild(defs);

  let y = MARGIN_TOP;
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 8, rx: 1, fill: 'url(#dbTitleGrad)' }, contentPage);
  textEl(contentPage, MARGIN_LEFT + 4, y + 5.5, data.dbName || 'DISTRIBUTION BOARD', { size: 4.5, weight: 'bold', fill: WHITE });
  y += 12;

  // Header fields (2 columns)
  const colW = CONTENT_W / 2 - 2;
  const fields = [
    ['Address', data.address || ''], ['Date', data.cardDate || ''],
    ['Phone', data.phone || ''], ['Email', data.email || ''],
    ['Tel Number', data.telNumber || ''], ['DOL Reg No', data.dolRegNo || ''],
    ['COC No', data.cocNo || ''], ['Addendum No', data.addendumNo || ''],
  ];
  for (let i = 0; i < fields.length; i += 2) {
    drawFieldRow(contentPage, MARGIN_LEFT, y, fields[i][0], fields[i][1], colW);
    if (i + 1 < fields.length) {
      drawFieldRow(contentPage, MARGIN_LEFT + colW + 4, y, fields[i + 1][0], fields[i + 1][1], colW);
    }
    y += 5;
  }
  y += 2;

  // Section title
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 5, fill: BRAND_PRIMARY }, contentPage);
  textEl(contentPage, MARGIN_LEFT + 3, y + 3.5, data.sectionName || 'CIRCUIT SCHEDULE', { size: 2.8, weight: 'bold', fill: WHITE });
  y += 7;

  // Section info
  drawFieldRow(contentPage, MARGIN_LEFT, y, 'Fed From:', data.fedFrom || '', colW);
  drawFieldRow(contentPage, MARGIN_LEFT + colW + 4, y, 'Feeding Breaker:', data.feedingBreakerId || '', colW);
  y += 5;
  drawFieldRow(contentPage, MARGIN_LEFT, y, 'System/Cabling:', data.feedingSystemInfo || '', CONTENT_W);
  y += 6;

  // Two-column circuit tables
  const circuitColW = CONTENT_W / 2 - 2;
  drawCircuitTable(contentPage, MARGIN_LEFT, y, circuits, 0, half, circuitColW);
  drawCircuitTable(contentPage, MARGIN_LEFT + circuitColW + 4, y, circuits, half, half, circuitColW);
  y += 5 + half * 4 + 4;

  // Contactor details (if fits on same page, otherwise new page)
  const pages: SVGSVGElement[] = [coverSvg, contentPage];

  if (contactors.length > 0) {
    let contactorSvg = contentPage;
    if (y > PAGE_H - 40) {
      contactorSvg = createSvgElement();
      el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, contactorSvg);
      pages.push(contactorSvg);
      y = MARGIN_TOP;
    }

    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 5, fill: BRAND_PRIMARY }, contactorSvg);
    textEl(contactorSvg, MARGIN_LEFT + 3, y + 3.5, 'CONTACTOR DETAILS', { size: 2.8, weight: 'bold', fill: WHITE });
    y += 7;

    // Contactor table header
    const cHeaders = ['', 'Amps', 'Controlling', 'KW', 'Coil', 'Poles'];
    const cWidths = [12, 20, 50, 20, 25, 20];
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 5, fill: '#334155' }, contactorSvg);
    let hx = MARGIN_LEFT + 2;
    cHeaders.forEach((h, i) => {
      textEl(contactorSvg, hx, y + 3.5, h, { size: 2, weight: 'bold', fill: WHITE });
      hx += cWidths[i];
    });
    y += 5;

    contactors.forEach((c, ci) => {
      const bg = ci % 2 === 0 ? WHITE : '#f8fafc';
      el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 4.5, fill: bg }, contactorSvg);
      el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 4.5, fill: 'none', stroke: '#cbd5e1', 'stroke-width': 0.2 }, contactorSvg);
      let cx = MARGIN_LEFT + 2;
      const vals = [`C${ci + 1}`, c.amps, c.controlling, c.kw, c.coil, c.poles];
      vals.forEach((v, i) => {
        textEl(contactorSvg, cx, y + 3.2, v, { size: 2, fill: i === 0 ? BRAND_PRIMARY : TEXT_DARK, weight: i === 0 ? 'bold' : 'normal' });
        cx += cWidths[i];
      });
      y += 4.5;
    });
  }

  applyRunningHeaders(pages, 'DB Legend Card', data.dbName);
  applyPageFooters(pages, 'DB Legend Card');
  return pages;
}
