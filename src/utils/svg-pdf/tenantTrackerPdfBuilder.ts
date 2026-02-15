/**
 * Tenant Tracker SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-tenant-tracker-pdf)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  drawStatCards, buildExecutiveSummarySvg, buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry,
} from './sharedSvgHelpers';
import { drawDonutChart } from './svgChartHelpers';

export interface TenantForPdf {
  shop_name: string | null;
  shop_number: string | null;
  shop_category: string | null;
  area: number | null;
  db_size_allowance: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  db_cost: number | null;
  cost_reported: boolean;
}

export interface TenantTrackerPdfData {
  coverData: StandardCoverPageData;
  tenants: TenantForPdf[];
  projectName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard', fast_food: 'Fast Food', restaurant: 'Restaurant', national: 'National',
};

function getCatLabel(c: string | null): string {
  return c ? CATEGORY_LABELS[c] || c : '-';
}

export function buildTenantTrackerPdf(data: TenantTrackerPdfData): SVGSVGElement[] {
  const { coverData, tenants, projectName } = data;
  const total = tenants.length;

  // Stats
  const sowCount = tenants.filter(t => t.sow_received).length;
  const layoutCount = tenants.filter(t => t.layout_received).length;
  const dbCount = tenants.filter(t => t.db_ordered).length;
  const lightCount = tenants.filter(t => t.lighting_ordered).length;
  const totalArea = tenants.reduce((s, t) => s + (t.area || 0), 0);
  const totalDbCost = tenants.reduce((s, t) => s + (t.db_cost || 0), 0);
  const totalLightCost = tenants.reduce((s, t) => s + (t.lighting_cost || 0), 0);
  const overallProgress = total > 0 ? Math.round((sowCount + layoutCount + dbCount + lightCount) / (total * 4) * 100) : 0;

  // Category distribution
  const catCounts: Record<string, number> = {};
  tenants.forEach(t => { const c = t.shop_category || 'other'; catCounts[c] = (catCounts[c] || 0) + 1; });

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Project Overview');

  let y = drawStatCards(summaryPage, [
    { label: 'Total Units', value: String(total), color: BRAND_PRIMARY },
    { label: 'Total Area', value: `${totalArea.toFixed(0)} m²`, color: '#2563eb' },
    { label: 'Total Cost', value: `R${((totalDbCost + totalLightCost) / 1000).toFixed(0)}k`, color: '#a855f7' },
    { label: 'Progress', value: `${overallProgress}%`, color: SUCCESS_COLOR },
  ], MARGIN_TOP + 12);

  // Category donut
  y += 6;
  const catColors: Record<string, string> = { standard: '#3b82f6', fast_food: '#ef4444', restaurant: '#22c55e', national: '#a855f7' };
  const catSegments = Object.entries(catCounts).map(([cat, count]) => ({
    label: getCatLabel(cat), value: count, color: catColors[cat] || '#64748b',
  }));
  if (catSegments.length > 0) {
    drawDonutChart(summaryPage, catSegments, MARGIN_LEFT + CONTENT_W / 4, y + 25, 20);
  }

  // Task progress bars
  const taskX = MARGIN_LEFT + CONTENT_W / 2 + 10;
  textEl(summaryPage, taskX, y, 'Task Progress', { size: 4, weight: 'bold', fill: TEXT_DARK });
  y += 6;
  const tasks = [
    { label: 'SOW Received', done: sowCount },
    { label: 'Layout Received', done: layoutCount },
    { label: 'DB Ordered', done: dbCount },
    { label: 'Lighting Ordered', done: lightCount },
  ];
  tasks.forEach(task => {
    const pct = total > 0 ? (task.done / total) * 100 : 0;
    textEl(summaryPage, taskX, y, `${task.label}: ${task.done}/${total} (${Math.round(pct)}%)`, { size: 2.8, fill: TEXT_MUTED });
    y += 3.5;
    el('rect', { x: taskX, y, width: 60, height: 2, rx: 1, fill: BORDER_COLOR }, summaryPage);
    el('rect', { x: taskX, y, width: Math.max(0.5, 60 * pct / 100), height: 2, rx: 1, fill: SUCCESS_COLOR }, summaryPage);
    y += 5;
  });

  // 3. Tenant Schedule table
  const columns: TableColumn[] = [
    { header: 'Shop #', width: 18, key: 'shopNo' },
    { header: 'Shop Name', width: 35, key: 'shopName' },
    { header: 'Category', width: 22, key: 'category' },
    { header: 'Area', width: 16, align: 'right', key: 'area' },
    { header: 'DB Allow.', width: 18, key: 'dbAllow' },
    { header: 'SOW', width: 10, align: 'center', key: 'sow' },
    { header: 'Layout', width: 10, align: 'center', key: 'layout' },
    { header: 'DB', width: 10, align: 'center', key: 'db' },
    { header: 'Light', width: 10, align: 'center', key: 'light' },
    { header: 'Status', width: 20, key: 'status' },
  ];

  const rows = tenants.map(t => {
    const checks = [t.sow_received, t.layout_received, t.db_ordered, t.lighting_ordered].filter(Boolean).length;
    return {
      shopNo: t.shop_number || '-',
      shopName: t.shop_name || '-',
      category: getCatLabel(t.shop_category),
      area: t.area ? t.area.toFixed(1) : '-',
      dbAllow: t.db_size_allowance || '-',
      sow: t.sow_received ? '✓' : '✗',
      layout: t.layout_received ? '✓' : '✗',
      db: t.db_ordered ? '✓' : '✗',
      light: t.lighting_ordered ? '✓' : '✗',
      status: checks === 4 ? 'Complete' : checks > 0 ? 'In Progress' : 'Pending',
    };
  });

  const tablePages = buildTablePages('Tenant Schedule', columns, rows);

  // Assemble
  const tocEntries: TocEntry[] = [
    { label: 'Project Overview', pageNumber: 3 },
    { label: 'Tenant Schedule', pageNumber: 4 },
  ];
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, summaryPage, ...tablePages];

  applyRunningHeaders(allPages, 'Tenant Tracker', projectName);
  applyPageFooters(allPages, 'Tenant Tracker');
  return allPages;
}
