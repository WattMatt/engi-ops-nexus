/**
 * Template PDF SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-template-pdf)
 * Generates a cost report template with placeholder values
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry,
} from './sharedSvgHelpers';

export interface TemplateCategory {
  code: string;
  description: string;
}

export interface TemplateVariation {
  code: string;
  description: string;
}

export interface TemplateSection {
  title: string;
  content: string;
}

export interface TemplatePdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  categories: TemplateCategory[];
  variations: TemplateVariation[];
  sections: TemplateSection[];
}

export function buildTemplatePdf(data: TemplatePdfData): SVGSVGElement[] {
  const { coverData, categories, variations, sections } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Categories table
  const catColumns: TableColumn[] = [
    { header: 'Code', width: 30, key: 'code' },
    { header: 'Description', width: 55, key: 'description' },
    { header: 'Original Budget', width: 30, align: 'right', key: 'original' },
    { header: 'Previous Report', width: 30, align: 'right', key: 'previous' },
    { header: 'Anticipated Final', width: 30, align: 'right', key: 'final' },
  ];

  const catRows = categories.map((c, i) => ({
    code: c.code || `{Category_${i + 1}_Code}`,
    description: c.description || `{Category_${i + 1}_Desc}`,
    original: '{Original_Budget}',
    previous: '{Previous_Report}',
    final: '{Anticipated_Final}',
  }));

  const catPages = buildTablePages('Budget Categories (Template)', catColumns, catRows);

  // 3. Variations table
  let varPages: SVGSVGElement[] = [];
  if (variations.length > 0) {
    const varColumns: TableColumn[] = [
      { header: 'Code', width: 30, key: 'code' },
      { header: 'Description', width: 80, key: 'description' },
      { header: 'Amount', width: 30, align: 'right', key: 'amount' },
    ];
    const varRows = variations.map((v, i) => ({
      code: v.code || `{Variation_${i + 1}_Code}`,
      description: v.description || `{Variation_${i + 1}_Desc}`,
      amount: '{Amount}',
    }));
    varPages = buildTablePages('Variations (Template)', varColumns, varRows);
  }

  // 4. Sections
  const sectionPages: SVGSVGElement[] = [];
  sections.forEach(s => {
    const page = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
    addPageHeader(page, s.title || '{Section_Title}');
    
    let y = MARGIN_TOP + 14;
    textEl(page, MARGIN_LEFT + 2, y, s.content || '{Section_Content}', { size: 3, fill: TEXT_MUTED });
    sectionPages.push(page);
  });

  // Assemble
  const contentPages = [coverSvg, ...catPages, ...varPages, ...sectionPages];
  const tocEntries: TocEntry[] = [
    { label: 'Budget Categories', pageNumber: 3 },
  ];
  if (varPages.length > 0) {
    tocEntries.push({ label: 'Variations', pageNumber: 3 + catPages.length });
  }
  sections.forEach((s, i) => {
    tocEntries.push({ label: s.title || `Section ${i + 1}`, pageNumber: 3 + catPages.length + varPages.length + i, indent: true });
  });

  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, ...contentPages.slice(1)];

  applyRunningHeaders(allPages, 'Cost Report Template', data.projectName);
  applyPageFooters(allPages, 'Cost Report Template');
  return allPages;
}
