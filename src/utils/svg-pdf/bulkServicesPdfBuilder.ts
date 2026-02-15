/**
 * Bulk Services Report SVG PDF Builder
 * Phase 3 migration: replaces PDFShift-based generate-bulk-services-pdf
 * Features: load calculation tables, SANS compliance, phase summaries
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
import { drawGaugeChart, drawBarChart, type BarChartItem } from './svgChartHelpers';

export interface BulkServicesData {
  coverData: StandardCoverPageData;
  projectName: string;
  documentNumber: string;
  supplyAuthority?: string;
  connectionSize?: string;
  totalConnectedLoad: number;
  maximumDemand: number;
  diversityFactor: number;
  transformerSize?: number;
  loadSchedule: LoadScheduleItem[];
  phases: BulkPhase[];
  notes?: string;
}

interface LoadScheduleItem {
  tenant: string;
  shopNumber: string;
  breakerSize: string;
  connectedLoad: number;
  demandLoad: number;
  category: string;
}

interface BulkPhase {
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  tasks: { title: string; completed: boolean }[];
}

export function buildBulkServicesPdf(data: BulkServicesData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Electrical Services Summary');

  let y = MARGIN_TOP + 14;
  const stats: StatCard[] = [
    { label: 'Connected Load', value: `${data.totalConnectedLoad} kVA`, color: BRAND_PRIMARY },
    { label: 'Maximum Demand', value: `${data.maximumDemand} kVA`, color: BRAND_ACCENT },
    { label: 'Diversity Factor', value: `${(data.diversityFactor * 100).toFixed(0)}%`, color: '#16a34a' },
  ];
  if (data.transformerSize) stats.push({ label: 'Transformer', value: `${data.transformerSize} kVA`, color: '#f59e0b' });
  y = drawStatCards(summaryPage, stats, y);
  y += 8;

  // Demand gauge
  const demandPct = data.transformerSize ? (data.maximumDemand / data.transformerSize) * 100 : 50;
  drawGaugeChart(summaryPage, demandPct, PAGE_W / 2, y + 20, 22, { label: 'Transformer Utilization' });
  y += 50;

  // Supply info
  if (data.supplyAuthority) {
    textEl(summaryPage, MARGIN_LEFT, y, `Supply Authority: ${data.supplyAuthority}`, { size: 3, fill: TEXT_DARK });
    y += 5;
  }
  if (data.connectionSize) {
    textEl(summaryPage, MARGIN_LEFT, y, `Connection Size: ${data.connectionSize}`, { size: 3, fill: TEXT_DARK });
    y += 5;
  }
  textEl(summaryPage, MARGIN_LEFT, y, `Document No: ${data.documentNumber}`, { size: 3, fill: TEXT_MUTED });
  pages.push(summaryPage);

  // 3. Load schedule table
  if (data.loadSchedule.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Shop #', width: 18, key: 'shopNumber' },
      { header: 'Tenant', width: 45, key: 'tenant' },
      { header: 'Breaker', width: 20, align: 'center', key: 'breakerSize' },
      { header: 'Connected (kVA)', width: 28, align: 'right', key: 'connectedLoad' },
      { header: 'Demand (kVA)', width: 28, align: 'right', key: 'demandLoad' },
      { header: 'Category', width: 25, align: 'center', key: 'category' },
    ];
    const rows = data.loadSchedule.map(l => ({
      ...l,
      connectedLoad: l.connectedLoad.toFixed(1),
      demandLoad: l.demandLoad.toFixed(1),
    }));
    pages.push(...buildTablePages('Load Schedule', cols, rows));
  }

  // 4. Workflow phases
  if (data.phases.length > 0) {
    const phasePage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, phasePage);
    addPageHeader(phasePage, 'Workflow Progress');
    let py = MARGIN_TOP + 14;

    const barItems: BarChartItem[] = data.phases.map(p => {
      const done = p.tasks.filter(t => t.completed).length;
      return { label: p.name, value: p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0 };
    });
    drawBarChart(phasePage, barItems, MARGIN_LEFT, py, CONTENT_W, { barHeight: 6, gap: 3, showValues: true });

    pages.push(phasePage);
  }

  // 5. Notes
  if (data.notes) {
    const notesPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, notesPage);
    addPageHeader(notesPage, 'Notes & Assumptions');
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
    { label: 'Electrical Services Summary', pageNumber: 2 },
    { label: 'Load Schedule', pageNumber: 3 },
  ];
  if (data.phases.length > 0) tocEntries.push({ label: 'Workflow Progress', pageNumber: pages.length - (data.notes ? 1 : 0) });
  if (data.notes) tocEntries.push({ label: 'Notes & Assumptions', pageNumber: pages.length });
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  applyRunningHeaders(pages, 'Bulk Services Report', data.projectName);
  applyPageFooters(pages, 'Bulk Services Report');

  return pages;
}
