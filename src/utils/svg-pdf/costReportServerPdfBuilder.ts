/**
 * Cost Report (Server) SVG PDF Builder
 * Phase 3 migration: replaces PDFShift-based generate-cost-report-pdf
 * This is the server-scheduled variant — simpler than the interactive cost report
 * Features: summary stats, category breakdown, variation summary
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTableOfContentsSvg, applyRunningHeaders, applyPageFooters,
  addPageHeader, buildTablePages, drawStatCards,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, formatCurrencyValue, wrapText,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';
import { drawDonutChart, drawBarChart, type DonutSegment, type BarChartItem } from './svgChartHelpers';

export interface CostReportServerData {
  coverData: StandardCoverPageData;
  projectName: string;
  budgetTotal: number;
  actualTotal: number;
  variationTotal: number;
  categories: CostCategory[];
  variations: CostVariation[];
  notes?: string;
}

interface CostCategory {
  name: string;
  budget: number;
  actual: number;
  variance: number;
}

interface CostVariation {
  reference: string;
  description: string;
  amount: number;
  status: string;
}

export function buildCostReportServerPdf(data: CostReportServerData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Executive Summary
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Cost Summary');

  let y = MARGIN_TOP + 14;
  const variance = data.actualTotal - data.budgetTotal;
  const variancePct = data.budgetTotal > 0 ? ((variance / data.budgetTotal) * 100).toFixed(1) : '0';
  const stats: StatCard[] = [
    { label: 'Budget', value: formatCurrencyValue(data.budgetTotal), color: BRAND_PRIMARY },
    { label: 'Actual', value: formatCurrencyValue(data.actualTotal), color: BRAND_ACCENT },
    { label: 'Variance', value: `${variance >= 0 ? '+' : ''}${variancePct}%`, color: variance > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Variations', value: formatCurrencyValue(data.variationTotal), color: '#f59e0b' },
  ];
  y = drawStatCards(summaryPage, stats, y);
  y += 10;

  // Donut — category distribution
  if (data.categories.length > 0) {
    textEl(summaryPage, MARGIN_LEFT, y, 'Budget Distribution', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 6;
    const segments: DonutSegment[] = data.categories.map(c => ({ label: c.name, value: c.budget }));
    y = drawDonutChart(summaryPage, segments, PAGE_W / 3, y + 25, 22, { showLegend: true, legendX: PAGE_W / 3 + 30, legendY: y + 10 });
  }
  pages.push(summaryPage);

  // 3. Category breakdown table
  if (data.categories.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Category', width: 50, key: 'name' },
      { header: 'Budget', width: 30, align: 'right', key: 'budget' },
      { header: 'Actual', width: 30, align: 'right', key: 'actual' },
      { header: 'Variance', width: 30, align: 'right', key: 'variance' },
    ];
    const rows = data.categories.map(c => ({
      name: c.name,
      budget: formatCurrencyValue(c.budget),
      actual: formatCurrencyValue(c.actual),
      variance: formatCurrencyValue(c.variance),
    }));
    rows.push({
      name: 'TOTAL', budget: formatCurrencyValue(data.budgetTotal),
      actual: formatCurrencyValue(data.actualTotal),
      variance: formatCurrencyValue(variance),
      _bold: true, _bgColor: BRAND_LIGHT,
    } as any);
    pages.push(...buildTablePages('Category Breakdown', cols, rows));
  }

  // 4. Variation summary
  if (data.variations.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Ref', width: 20, key: 'reference' },
      { header: 'Description', width: 65, key: 'description' },
      { header: 'Amount', width: 30, align: 'right', key: 'amount' },
      { header: 'Status', width: 25, align: 'center', key: 'status' },
    ];
    const rows = data.variations.map(v => ({
      reference: v.reference,
      description: v.description,
      amount: formatCurrencyValue(v.amount),
      status: v.status,
    }));
    pages.push(...buildTablePages('Variation Summary', cols, rows));
  }

  // 5. Notes
  if (data.notes) {
    const notesPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, notesPage);
    addPageHeader(notesPage, 'Notes');
    let ny = MARGIN_TOP + 14;
    const lines = wrapText(data.notes, CONTENT_W, 3.5);
    for (const line of lines) {
      textEl(notesPage, MARGIN_LEFT, ny, line, { size: 3.5 });
      ny += 5;
    }
    pages.push(notesPage);
  }

  // TOC
  const tocEntries: TocEntry[] = [
    { label: 'Cost Summary', pageNumber: 2 },
    { label: 'Category Breakdown', pageNumber: 3 },
  ];
  if (data.variations.length > 0) tocEntries.push({ label: 'Variation Summary', pageNumber: 4 });
  if (data.notes) tocEntries.push({ label: 'Notes', pageNumber: pages.length });
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  applyRunningHeaders(pages, 'Cost Report', data.projectName);
  applyPageFooters(pages, 'Cost Report');

  return pages;
}
