/**
 * Electrical Budget SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-electrical-budget-pdf)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  drawStatCards, buildTableOfContentsSvg, formatCurrencyValue,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry,
} from './sharedSvgHelpers';

export interface BudgetSection {
  section_code: string;
  section_name: string;
  items: BudgetItem[];
  total: number;
}

export interface BudgetItem {
  item_number?: string;
  description: string;
  area?: number;
  base_rate?: number;
  ti_rate?: number;
  total: number;
  is_tenant_item?: boolean;
  shop_number?: string;
}

export interface ElectricalBudgetPdfData {
  coverData: StandardCoverPageData;
  budgetName: string;
  projectName: string;
  sections: BudgetSection[];
  grandTotal: number;
  tenantTotal: number;
  landlordTotal: number;
}

export function buildElectricalBudgetPdf(data: ElectricalBudgetPdfData): SVGSVGElement[] {
  const { coverData, sections, grandTotal, tenantTotal, landlordTotal } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Budget Summary');

  let y = drawStatCards(summaryPage, [
    { label: 'Grand Total', value: formatCurrencyValue(grandTotal), color: BRAND_PRIMARY },
    { label: 'Landlord', value: formatCurrencyValue(landlordTotal), color: '#2563eb' },
    { label: 'Tenant', value: formatCurrencyValue(tenantTotal), color: '#f59e0b' },
    { label: 'Sections', value: String(sections.length), color: SUCCESS_COLOR },
  ], MARGIN_TOP + 12);

  // Section breakdown
  y += 8;
  textEl(summaryPage, MARGIN_LEFT + 2, y, 'Section Breakdown', { size: 4, weight: 'bold', fill: TEXT_DARK });
  y += 7;
  sections.forEach(s => {
    const pct = grandTotal > 0 ? (s.total / grandTotal * 100) : 0;
    textEl(summaryPage, MARGIN_LEFT + 4, y, `${s.section_code} — ${s.section_name}`, { size: 2.8, fill: TEXT_DARK });
    textEl(summaryPage, PAGE_W - MARGIN_LEFT - 2, y, formatCurrencyValue(s.total), { size: 2.8, fill: TEXT_DARK, anchor: 'end' });
    y += 3.5;
    el('rect', { x: MARGIN_LEFT + 4, y, width: CONTENT_W - 8, height: 1.5, rx: 0.75, fill: BORDER_COLOR }, summaryPage);
    el('rect', { x: MARGIN_LEFT + 4, y, width: Math.max(0.5, (CONTENT_W - 8) * pct / 100), height: 1.5, rx: 0.75, fill: BRAND_PRIMARY }, summaryPage);
    y += 4.5;
  });

  // 3. Section detail pages
  const sectionPages: SVGSVGElement[] = [];
  const sectionTocEntries: TocEntry[] = [];
  let pageOffset = 4; // cover, toc, summary = 3 pages

  sections.forEach(section => {
    const columns: TableColumn[] = [
      { header: 'Item', width: 15, key: 'itemNo' },
      { header: 'Description', width: 55, key: 'description' },
      { header: 'Area', width: 18, align: 'right', key: 'area' },
      { header: 'Rate', width: 22, align: 'right', key: 'rate' },
      { header: 'Total', width: 25, align: 'right', key: 'total' },
      { header: 'Type', width: 18, key: 'type' },
    ];

    const rows = section.items.map(item => ({
      itemNo: item.item_number || '-',
      description: item.description,
      area: item.area ? item.area.toFixed(1) : '-',
      rate: item.base_rate ? formatCurrencyValue(item.base_rate) : '-',
      total: formatCurrencyValue(item.total),
      type: item.is_tenant_item ? 'Tenant' : 'Landlord',
    }));

    const pages = buildTablePages(`${section.section_code} — ${section.section_name}`, columns, rows);
    sectionTocEntries.push({ label: `${section.section_code} — ${section.section_name}`, pageNumber: pageOffset, indent: true });
    pageOffset += pages.length;
    sectionPages.push(...pages);
  });

  // Assemble with TOC
  const tocEntries: TocEntry[] = [
    { label: 'Budget Summary', pageNumber: 3 },
    ...sectionTocEntries,
  ];
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, summaryPage, ...sectionPages];

  applyRunningHeaders(allPages, 'Electrical Budget', data.projectName);
  applyPageFooters(allPages, 'Electrical Budget');
  return allPages;
}
