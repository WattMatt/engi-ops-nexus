/**
 * Specification SVG-to-PDF Builder
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  addPageHeader, applyPageFooters, applyRunningHeaders, buildTextPages,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H,
  WHITE, TEXT_DARK, TEXT_MUTED, BRAND_LIGHT,
  type StandardCoverPageData,
} from './sharedSvgHelpers';

export interface SpecificationPdfData {
  specification: any;
  coverData: StandardCoverPageData;
}

export function buildSpecificationPdf(data: SpecificationPdfData): SVGSVGElement[] {
  const { specification, coverData } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Overview page
  const overviewPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, overviewPage);
  addPageHeader(overviewPage, 'Specification Overview');

  let y = MARGIN_TOP + 14;
  const info = [
    ['Specification Name', specification.specification_name || '-'],
    ['Specification Number', specification.spec_number || '-'],
    ['Project Name', specification.project_name || '-'],
    ['Type', specification.spec_type || '-'],
    ['Revision', specification.revision || 'Rev.0'],
  ];

  for (const [label, value] of info) {
    el('rect', { x: MARGIN_LEFT, y: y - 3, width: 180, height: 5.5, fill: y % 11 < 6 ? WHITE : BRAND_LIGHT }, overviewPage);
    textEl(overviewPage, MARGIN_LEFT + 2, y, label, { size: 3, weight: 'bold', fill: TEXT_MUTED });
    textEl(overviewPage, MARGIN_LEFT + 55, y, value as string, { size: 3, fill: TEXT_DARK });
    y += 5.5;
  }

  // 3. Notes pages
  const notesPages = specification.notes
    ? buildTextPages('Notes', specification.notes)
    : [];

  const allPages = [coverSvg, overviewPage, ...notesPages];
  applyRunningHeaders(allPages, 'Technical Specification', coverData.projectName || '');
  applyPageFooters(allPages, 'Technical Specification');
  return allPages;
}
