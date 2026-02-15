/**
 * Project Outline / Baseline Document SVG-to-PDF Builder
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  addPageHeader, applyPageFooters, applyRunningHeaders, buildTextPages,
  buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H,
  WHITE, TEXT_DARK, TEXT_MUTED, BRAND_PRIMARY,
  type StandardCoverPageData, type TocEntry,
} from './sharedSvgHelpers';

export interface ProjectOutlinePdfData {
  outline: any;
  sections: any[];
  coverData: StandardCoverPageData;
}

export function buildProjectOutlinePdf(data: ProjectOutlinePdfData): SVGSVGElement[] {
  const { outline, sections, coverData } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Index page
  const indexPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, indexPage);
  addPageHeader(indexPage, 'Index');

  let y = MARGIN_TOP + 16;
  for (const section of sections) {
    textEl(indexPage, MARGIN_LEFT + 5, y, `${section.section_number}. ${section.section_title}`, {
      size: 3.5, fill: TEXT_DARK,
    });
    y += 6;
  }

  // Footer info
  textEl(indexPage, MARGIN_LEFT, PAGE_H - 30, `Created by: ${outline.contact_person || ''}`, { size: 2.8, fill: TEXT_MUTED });
  textEl(indexPage, MARGIN_LEFT, PAGE_H - 26, `Representing: ${outline.prepared_by || ''}`, { size: 2.8, fill: TEXT_MUTED });

  // 3. Section pages
  const sectionPages: SVGSVGElement[] = [];
  for (const section of sections) {
    const title = `${section.section_number}. ${section.section_title}`;
    const content = section.content || 'No content provided.';
    const pages = buildTextPages(title, content);
    sectionPages.push(...pages);
  }

  // Assemble with TOC
  const tocEntries: TocEntry[] = [
    { label: 'Index', pageNumber: 3 },
    ...sections.map((s: any, i: number) => ({
      label: `${s.section_number}. ${s.section_title}`,
      pageNumber: 4 + i,
    })),
  ];
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, indexPage, ...sectionPages];

  applyRunningHeaders(allPages, 'Baseline Document', coverData.projectName || '');
  applyPageFooters(allPages, 'Baseline Document');
  return allPages;
}
