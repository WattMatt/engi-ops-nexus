/**
 * Final Account SVG-to-PDF Builder
 * Uses shared SVG helpers for standardized cover page, tables, and footers.
 */
import {
  createSvgElement, el, textEl, formatCurrencyValue, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders, buildTableOfContentsSvg,
  drawStatCards, MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';

interface BillWithSections {
  bill_number: number;
  bill_name: string;
  contract_total: number;
  final_total: number;
  variation_total: number;
  sections: SectionWithItems[];
}

interface SectionWithItems {
  section_code: string;
  section_name: string;
  contract_total: number;
  final_total: number;
  variation_total: number;
  items: any[];
}

export interface FinalAccountPdfData {
  account: any;
  bills: BillWithSections[];
  coverData: StandardCoverPageData;
}

export function buildFinalAccountPdf(data: FinalAccountPdfData): SVGSVGElement[] {
  const { account, bills, coverData } = data;

  // 1. Cover Page
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary Page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Account Summary');

  const totals = bills.reduce((acc, b) => ({
    contract: acc.contract + Number(b.contract_total || 0),
    final: acc.final + Number(b.final_total || 0),
    variation: acc.variation + Number(b.variation_total || 0),
  }), { contract: 0, final: 0, variation: 0 });

  let y = drawStatCards(summaryPage, [
    { label: 'Contract Value', value: formatCurrencyValue(totals.contract) },
    { label: 'Final Value', value: formatCurrencyValue(totals.final) },
    { label: 'Variations', value: formatCurrencyValue(totals.variation), color: totals.variation >= 0 ? '#16a34a' : '#dc2626' },
    { label: 'Bills', value: String(bills.length) },
  ], MARGIN_TOP + 12);

  // Account info lines
  y += 4;
  const infoLines = [
    ['Account Number', account.account_number || '-'],
    ['Account Name', account.account_name || '-'],
    ['Client', account.client_name || '-'],
    ['Status', (account.status || 'draft').toUpperCase()],
  ];
  for (const [label, value] of infoLines) {
    textEl(summaryPage, MARGIN_LEFT + 2, y, label, { size: 3, weight: 'bold', fill: TEXT_MUTED });
    textEl(summaryPage, MARGIN_LEFT + 45, y, value, { size: 3 });
    y += 5.5;
  }

  // 3. Bills Summary Table
  const billsColumns: TableColumn[] = [
    { header: 'Bill #', width: 20, key: 'billNo' },
    { header: 'Name', width: 60, key: 'name' },
    { header: 'Contract Total', width: 35, align: 'right', key: 'contract' },
    { header: 'Final Total', width: 35, align: 'right', key: 'final' },
    { header: 'Variation', width: 30, align: 'right', key: 'variation' },
  ];

  const billsRows = bills.map(b => ({
    billNo: `Bill ${b.bill_number}`,
    name: b.bill_name,
    contract: formatCurrencyValue(b.contract_total),
    final: formatCurrencyValue(b.final_total),
    variation: formatCurrencyValue(b.variation_total),
  }));
  billsRows.push({
    billNo: '',
    name: 'TOTAL',
    contract: formatCurrencyValue(totals.contract),
    final: formatCurrencyValue(totals.final),
    variation: formatCurrencyValue(totals.variation),
    _bold: true,
    _bgColor: BRAND_LIGHT,
  } as any);

  const billsSummaryPages = buildTablePages('Bills Summary', billsColumns, billsRows);

  // 4. Detailed bill pages
  const detailPages: SVGSVGElement[] = [];
  const detailColumns: TableColumn[] = [
    { header: 'Code', width: 15, key: 'code' },
    { header: 'Description', width: 45, key: 'desc' },
    { header: 'Unit', width: 12, key: 'unit' },
    { header: 'Ctr Qty', width: 16, align: 'right', key: 'ctrQty' },
    { header: 'Fin Qty', width: 16, align: 'right', key: 'finQty' },
    { header: 'Supply', width: 20, align: 'right', key: 'supply' },
    { header: 'Install', width: 20, align: 'right', key: 'install' },
    { header: 'Contract', width: 20, align: 'right', key: 'contract' },
    { header: 'Final', width: 20, align: 'right', key: 'final' },
  ];

  for (const bill of bills) {
    for (const section of bill.sections) {
      if (section.items.length === 0) continue;
      const rows = section.items.map((item: any) => ({
        code: item.item_code || '-',
        desc: item.description || '',
        unit: item.unit || '',
        ctrQty: item.contract_quantity?.toString() || '-',
        finQty: item.final_quantity?.toString() || '-',
        supply: formatCurrencyValue(item.supply_rate || 0),
        install: formatCurrencyValue(item.install_rate || 0),
        contract: formatCurrencyValue(item.contract_amount || 0),
        final: formatCurrencyValue(item.final_amount || 0),
      }));
      const sectionTitle = `Bill ${bill.bill_number} - ${section.section_code} ${section.section_name}`;
      detailPages.push(...buildTablePages(sectionTitle, detailColumns, rows, { fontSize: 2.4, rowHeight: 5 }));
    }
  }

  // Assemble with TOC
  const contentPages = [coverSvg, summaryPage, ...billsSummaryPages, ...detailPages];
  const tocEntries: TocEntry[] = [
    { label: 'Account Summary', pageNumber: 3 },
    { label: 'Bills Summary', pageNumber: 4 },
    ...bills.map((b, i) => ({
      label: `Bill ${b.bill_number} - ${b.bill_name}`,
      pageNumber: 4 + billsSummaryPages.length + i,
      indent: true,
    })),
  ];
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, ...contentPages.slice(1)];

  applyRunningHeaders(allPages, 'Final Account', coverData.projectName || '');
  applyPageFooters(allPages, 'Final Account');
  return allPages;
}
