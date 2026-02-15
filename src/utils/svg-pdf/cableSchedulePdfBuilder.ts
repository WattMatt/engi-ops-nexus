/**
 * Cable Schedule SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-cable-schedule-pdf)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  drawStatCards, buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR, SUCCESS_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry,
} from './sharedSvgHelpers';

export interface CableEntry {
  cable_tag: string;
  from_location: string;
  to_location: string;
  voltage: number;
  load_amps?: number;
  cable_type?: string;
  cable_size?: string;
  measured_length?: number;
  extra_length?: number;
  total_length?: number;
  ohm_per_km?: number;
  volt_drop?: number;
  notes?: string;
}

export interface OptimizationRecommendation {
  cableTag: string;
  fromLocation: string;
  toLocation: string;
  currentConfig: string;
  recommendedConfig: string;
}

export interface CableSchedulePdfData {
  coverData: StandardCoverPageData;
  entries: CableEntry[];
  optimizations?: OptimizationRecommendation[];
  scheduleName: string;
}

function sortByTag(entries: CableEntry[]): CableEntry[] {
  return [...entries].sort((a, b) => {
    const numA = parseFloat((a.cable_tag || '').match(/[\d.]+/)?.[0] || '0');
    const numB = parseFloat((b.cable_tag || '').match(/[\d.]+/)?.[0] || '0');
    if (numA !== numB) return numA - numB;
    return (a.cable_tag || '').localeCompare(b.cable_tag || '', undefined, { numeric: true });
  });
}

function fmt(v?: number, d = 2): string {
  return v != null ? v.toFixed(d) : '-';
}

export function buildCableSchedulePdf(data: CableSchedulePdfData): SVGSVGElement[] {
  const { coverData, entries, optimizations } = data;
  const sorted = sortByTag(entries);

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Schedule Summary');

  const totalLength = sorted.reduce((s, e) => s + (e.total_length || 0), 0);
  const voltageGroups = new Map<number, { count: number; length: number }>();
  sorted.forEach(e => {
    const v = e.voltage || 0;
    const g = voltageGroups.get(v) || { count: 0, length: 0 };
    voltageGroups.set(v, { count: g.count + 1, length: g.length + (e.total_length || 0) });
  });

  const sizedCount = sorted.filter(e => e.cable_size).length;

  let y = drawStatCards(summaryPage, [
    { label: 'Total Cables', value: String(sorted.length), color: BRAND_PRIMARY },
    { label: 'Total Length', value: `${fmt(totalLength, 1)}m`, color: '#2563eb' },
    { label: 'Sized', value: `${sizedCount}/${sorted.length}`, color: SUCCESS_COLOR },
    { label: 'Voltage Levels', value: String(voltageGroups.size), color: '#f59e0b' },
  ], MARGIN_TOP + 12);

  // Voltage summary mini-table
  y += 6;
  textEl(summaryPage, MARGIN_LEFT + 2, y, 'Summary by Voltage Level', { size: 4, weight: 'bold', fill: TEXT_DARK });
  y += 6;
  Array.from(voltageGroups.entries()).sort((a, b) => a[0] - b[0]).forEach(([voltage, stats]) => {
    textEl(summaryPage, MARGIN_LEFT + 4, y, `${voltage}V`, { size: 3, weight: 'bold', fill: TEXT_DARK });
    textEl(summaryPage, MARGIN_LEFT + 30, y, `${stats.count} cables`, { size: 3, fill: TEXT_MUTED });
    textEl(summaryPage, MARGIN_LEFT + 60, y, `${fmt(stats.length, 1)} m`, { size: 3, fill: TEXT_MUTED });
    y += 5;
  });

  // 3. Cable table
  const columns: TableColumn[] = [
    { header: 'Tag', width: 20, key: 'tag' },
    { header: 'From', width: 28, key: 'from' },
    { header: 'To', width: 28, key: 'to' },
    { header: 'V', width: 10, align: 'center', key: 'voltage' },
    { header: 'Load(A)', width: 14, align: 'right', key: 'load' },
    { header: 'Type', width: 18, key: 'type' },
    { header: 'Size', width: 16, key: 'size' },
    { header: 'Total(m)', width: 16, align: 'right', key: 'total' },
    { header: 'V.Drop', width: 14, align: 'right', key: 'vdrop' },
  ];

  const rows = sorted.map(e => ({
    tag: e.cable_tag || '-',
    from: e.from_location || '-',
    to: e.to_location || '-',
    voltage: `${e.voltage || '-'}`,
    load: fmt(e.load_amps, 1),
    type: e.cable_type || '-',
    size: e.cable_size || '-',
    total: fmt(e.total_length),
    vdrop: e.volt_drop != null ? `${fmt(e.volt_drop)}%` : '-',
  }));

  const tablePages = buildTablePages('Cable Schedule', columns, rows);

  // 4. Optimizations table (if any)
  let optimPages: SVGSVGElement[] = [];
  if (optimizations && optimizations.length > 0) {
    const optCols: TableColumn[] = [
      { header: 'Cable Tag', width: 25, key: 'tag' },
      { header: 'Route', width: 50, key: 'route' },
      { header: 'Current', width: 40, key: 'current' },
      { header: 'Recommended', width: 40, key: 'recommended' },
    ];
    const optRows = optimizations.map(o => ({
      tag: o.cableTag,
      route: `${o.fromLocation} → ${o.toLocation}`,
      current: o.currentConfig,
      recommended: o.recommendedConfig,
    }));
    optimPages = buildTablePages('Cable Sizing Recommendations', optCols, optRows);
  }

  // Assemble
  const contentPages = [summaryPage, ...tablePages, ...optimPages];
  const tocEntries: TocEntry[] = [
    { label: 'Schedule Summary', pageNumber: 3 },
    { label: 'Cable Schedule', pageNumber: 4 },
  ];
  if (optimPages.length > 0) {
    tocEntries.push({ label: 'Sizing Recommendations', pageNumber: 4 + tablePages.length });
  }
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, ...contentPages];

  applyRunningHeaders(allPages, 'Cable Schedule', data.scheduleName);
  applyPageFooters(allPages, 'Cable Schedule');
  return allPages;
}
