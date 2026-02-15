/**
 * Generator Report SVG PDF Builder
 * Phase 3 migration: replaces PDFShift-based generate-generator-report-pdf
 * Features: load distribution donut chart, zone schedules, financial tables
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTableOfContentsSvg, applyRunningHeaders, applyPageFooters,
  addPageHeader, buildTablePages, drawStatCards,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, formatCurrencyValue, wrapText, truncate,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';
import { drawDonutChart, type DonutSegment } from './svgChartHelpers';

export interface GeneratorReportData {
  coverData: StandardCoverPageData;
  projectName: string;
  generatorSize?: string;
  fuelType?: string;
  zones: GeneratorZone[];
  loadSummary: { totalConnected: number; totalDemand: number; diversityFactor: number };
  financials?: { capitalCost: number; monthlyFuel: number; maintenanceAnnual: number; amortizationYears: number };
}

interface GeneratorZone {
  name: string;
  color?: string;
  loads: { description: string; kw: number; priority: string }[];
  totalKw: number;
}

export function buildGeneratorReportPdf(data: GeneratorReportData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Executive summary
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Generator Summary');

  let y = MARGIN_TOP + 14;
  const stats: StatCard[] = [
    { label: 'Connected Load', value: `${data.loadSummary.totalConnected} kW`, color: BRAND_PRIMARY },
    { label: 'Max Demand', value: `${data.loadSummary.totalDemand} kW`, color: BRAND_ACCENT },
    { label: 'Diversity Factor', value: `${(data.loadSummary.diversityFactor * 100).toFixed(0)}%`, color: '#16a34a' },
  ];
  if (data.generatorSize) stats.push({ label: 'Generator Size', value: data.generatorSize, color: '#f59e0b' });
  y = drawStatCards(summaryPage, stats, y);
  y += 6;

  // Donut chart — load distribution by zone
  if (data.zones.length > 0) {
    textEl(summaryPage, MARGIN_LEFT, y, 'Load Distribution by Zone', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 6;
    const segments: DonutSegment[] = data.zones.map(z => ({ label: z.name, value: z.totalKw, color: z.color }));
    y = drawDonutChart(summaryPage, segments, PAGE_W / 3, y + 25, 22, { showLegend: true, legendX: PAGE_W / 3 + 30, legendY: y + 10 });
    y += 10;
  }

  // Generator specs
  if (data.fuelType) {
    textEl(summaryPage, MARGIN_LEFT, y, `Fuel Type: ${data.fuelType}`, { size: 3, fill: TEXT_MUTED });
    y += 5;
  }
  pages.push(summaryPage);

  // 3. Zone loading schedules
  for (const zone of data.zones) {
    const cols: TableColumn[] = [
      { header: 'Description', width: 80, key: 'description' },
      { header: 'Load (kW)', width: 30, align: 'right', key: 'kw' },
      { header: 'Priority', width: 30, align: 'center', key: 'priority' },
    ];
    const rows = zone.loads.map(l => ({
      description: l.description,
      kw: l.kw.toFixed(1),
      priority: l.priority,
    }));
    rows.push({ description: 'TOTAL', kw: zone.totalKw.toFixed(1), priority: '', _bold: true, _bgColor: BRAND_LIGHT } as any);
    const zonePages = buildTablePages(`Zone: ${zone.name}`, cols, rows);
    pages.push(...zonePages);
  }

  // 4. Financial analysis
  if (data.financials) {
    const finPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, finPage);
    addPageHeader(finPage, 'Financial Analysis');
    let fy = MARGIN_TOP + 14;

    const finStats: StatCard[] = [
      { label: 'Capital Cost', value: formatCurrencyValue(data.financials.capitalCost), color: BRAND_PRIMARY },
      { label: 'Monthly Fuel', value: formatCurrencyValue(data.financials.monthlyFuel), color: '#f59e0b' },
      { label: 'Annual Maintenance', value: formatCurrencyValue(data.financials.maintenanceAnnual), color: '#dc2626' },
    ];
    fy = drawStatCards(finPage, finStats, fy);
    fy += 8;

    // Amortization table
    textEl(finPage, MARGIN_LEFT, fy, 'Capital Recovery Schedule', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    fy += 6;
    const annualCost = data.financials.monthlyFuel * 12 + data.financials.maintenanceAnnual;
    for (let yr = 1; yr <= data.financials.amortizationYears; yr++) {
      const cumulative = annualCost * yr;
      textEl(finPage, MARGIN_LEFT + 5, fy, `Year ${yr}`, { size: 3 });
      textEl(finPage, MARGIN_LEFT + 60, fy, formatCurrencyValue(cumulative), { size: 3, anchor: 'end' });
      // Progress bar
      const pct = Math.min(cumulative / (data.financials.capitalCost || 1), 1);
      el('rect', { x: MARGIN_LEFT + 65, y: fy - 2.5, width: 80, height: 3, fill: BRAND_LIGHT, rx: 0.5 }, finPage);
      el('rect', { x: MARGIN_LEFT + 65, y: fy - 2.5, width: 80 * pct, height: 3, fill: pct >= 1 ? '#16a34a' : BRAND_ACCENT, rx: 0.5 }, finPage);
      fy += 5;
    }
    pages.push(finPage);
  }

  // 5. TOC (insert at position 1)
  const tocEntries: TocEntry[] = [
    { label: 'Generator Summary', pageNumber: 2 },
    ...data.zones.map((z, i) => ({ label: `Zone: ${z.name}`, pageNumber: 3 + i, indent: true })),
  ];
  if (data.financials) tocEntries.push({ label: 'Financial Analysis', pageNumber: pages.length });
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  // Apply headers & footers
  applyRunningHeaders(pages, 'Generator Report', data.projectName);
  applyPageFooters(pages, 'Generator Report');

  return pages;
}
