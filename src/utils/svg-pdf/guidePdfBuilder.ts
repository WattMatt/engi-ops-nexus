/**
 * Generic Calculation-Guide SVG-to-PDF Builder
 *
 * Renders static reference guides (title + numbered sections of text lines
 * and tables) on the shared SVG engine. Migrated from the legacy inline
 * jsPDF+autoTable guides in BulkServicesSettingsOverview
 * (SANS 204 / SANS 10142-1 / Residential ADMD).
 */
import {
  createSvgElement, el, textEl, applyPageFooters,
  MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, BORDER_COLOR, TEXT_DARK, TEXT_MUTED,
} from './sharedSvgHelpers';

export interface GuideTableColumn {
  header: string;
  width: number; // mm
  align?: 'left' | 'right' | 'center';
}

export interface GuideBlock {
  /** Section heading, e.g. "1. Overview" */
  heading?: string;
  /** Bold intro line, e.g. "Project: Office Building" */
  subheading?: string;
  /** Pre-formatted text lines (leading spaces preserved for indent). */
  lines?: string[];
  /** Simple striped table. */
  table?: { columns: GuideTableColumn[]; rows: string[][] };
  /** Force this block onto a fresh page. */
  pageBreakBefore?: boolean;
}

export interface GuidePdfData {
  title: string;
  subtitle?: string;
  /** Shown in the running footer, e.g. "SANS 204 Guide". */
  footerTitle: string;
  blocks: GuideBlock[];
}

const ROW_HEIGHT = 6;
const LINE_HEIGHT = 4.6;

export function buildGuidePdf(data: GuidePdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const maxY = PAGE_H - MARGIN_BOTTOM - 10;
  const startY = MARGIN_TOP;

  const newPage = (): SVGSVGElement => {
    const page = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
    el('rect', { x: 0, y: 0, width: PAGE_W, height: 1.5, fill: BRAND_ACCENT }, page);
    pages.push(page);
    return page;
  };

  let page = newPage();
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      page = newPage();
      y = startY;
    }
  };

  // Title block
  textEl(page, PAGE_W / 2, y + 4, data.title, {
    size: 7, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });
  y += 11;
  if (data.subtitle) {
    textEl(page, PAGE_W / 2, y, data.subtitle, { size: 3.5, fill: TEXT_MUTED, anchor: 'middle' });
    y += 8;
  } else {
    y += 3;
  }

  const drawTableHeader = (columns: GuideTableColumn[]) => {
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: ROW_HEIGHT, fill: BRAND_PRIMARY }, page);
    let x = MARGIN_LEFT + 1.5;
    for (const col of columns) {
      const anchor = col.align === 'right' ? 'end' : col.align === 'center' ? 'middle' : 'start';
      const tx = col.align === 'right' ? x + col.width - 2 : col.align === 'center' ? x + col.width / 2 : x;
      textEl(page, tx, y, col.header, { size: 3, fill: WHITE, weight: 'bold', anchor });
      x += col.width;
    }
    y += ROW_HEIGHT;
  };

  for (const block of data.blocks) {
    if (block.pageBreakBefore) {
      page = newPage();
      y = startY;
    }

    if (block.heading) {
      ensureSpace(12);
      textEl(page, MARGIN_LEFT, y, block.heading, { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
      y += 7;
    }

    if (block.subheading) {
      ensureSpace(8);
      textEl(page, MARGIN_LEFT, y, block.subheading, { size: 3.8, fill: TEXT_DARK, weight: 'bold' });
      y += 6;
    }

    if (block.lines) {
      for (const line of block.lines) {
        ensureSpace(LINE_HEIGHT);
        // Preserve indentation: 2mm per leading double-space
        const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
        const indent = leadingSpaces * 1;
        if (line.trim()) {
          textEl(page, MARGIN_LEFT + indent, y, line.trim(), { size: 3.2, fill: TEXT_DARK });
        }
        y += LINE_HEIGHT;
      }
      y += 3;
    }

    if (block.table) {
      const { columns, rows } = block.table;
      ensureSpace(ROW_HEIGHT * 2);
      drawTableHeader(columns);
      rows.forEach((row, r) => {
        if (y + ROW_HEIGHT > maxY) {
          page = newPage();
          y = startY;
          drawTableHeader(columns);
        }
        const bg = r % 2 === 0 ? WHITE : BRAND_LIGHT;
        el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: ROW_HEIGHT, fill: bg }, page);
        let x = MARGIN_LEFT + 1.5;
        columns.forEach((col, c) => {
          const anchor = col.align === 'right' ? 'end' : col.align === 'center' ? 'middle' : 'start';
          const tx = col.align === 'right' ? x + col.width - 2 : col.align === 'center' ? x + col.width / 2 : x;
          textEl(page, tx, y, String(row[c] ?? ''), { size: 2.9, fill: TEXT_DARK, anchor });
          x += col.width;
        });
        el('line', {
          x1: MARGIN_LEFT, y1: y + ROW_HEIGHT - 3.5,
          x2: PAGE_W - MARGIN_RIGHT, y2: y + ROW_HEIGHT - 3.5,
          stroke: BORDER_COLOR, 'stroke-width': 0.15,
        }, page);
        y += ROW_HEIGHT;
      });
      y += 5;
    }
  }

  applyPageFooters(pages, data.footerTitle, false);
  return pages;
}
