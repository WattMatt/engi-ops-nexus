/**
 * Conversation Export SVG PDF Builder
 * Migrated from pdfmake to unified SVG engine
 */
import {
  createSvgElement, el, textEl, addPageHeader, applyPageFooters,
  wrapText,
  MARGIN_LEFT, MARGIN_TOP, MARGIN_BOTTOM, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
} from './sharedSvgHelpers';

interface ConversationMessage {
  sender: string;
  content: string;
  timestamp: string;
}

export interface ConversationPdfData {
  title: string;
  exportDate: string;
  messages: ConversationMessage[];
}

export function buildConversationPdf(data: ConversationPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  let page = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
  addPageHeader(page, data.title);

  let y = MARGIN_TOP + 14;
  textEl(page, MARGIN_LEFT, y, `Exported: ${data.exportDate}`, { size: 2.8, fill: TEXT_MUTED });
  y += 6;

  const maxY = PAGE_H - MARGIN_BOTTOM - 10;

  for (const msg of data.messages) {
    // Check if we need a new page
    if (y > maxY - 20) {
      pages.push(page);
      page = createSvgElement();
      el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
      addPageHeader(page, data.title);
      y = MARGIN_TOP + 14;
    }

    // Sender + timestamp
    textEl(page, MARGIN_LEFT, y, msg.sender, { size: 3, fill: BRAND_PRIMARY, weight: 'bold' });
    textEl(page, PAGE_W - 15, y, msg.timestamp, { size: 2.5, fill: TEXT_MUTED, anchor: 'end' });
    y += 4;

    // Message content with wrapping
    const lines = wrapText(msg.content, CONTENT_W - 4, 2.8);
    for (const line of lines) {
      if (y > maxY) {
        pages.push(page);
        page = createSvgElement();
        el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
        addPageHeader(page, data.title);
        y = MARGIN_TOP + 14;
      }
      textEl(page, MARGIN_LEFT + 2, y, line, { size: 2.8, fill: TEXT_DARK });
      y += 3.8;
    }

    // Separator
    y += 2;
    el('line', { x1: MARGIN_LEFT, y1: y, x2: PAGE_W - 15, y2: y, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, page);
    y += 4;
  }

  pages.push(page);
  applyPageFooters(pages, 'Conversation Export');
  return pages;
}
