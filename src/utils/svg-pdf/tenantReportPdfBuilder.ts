/**
 * Tenant Tracker Report SVG PDF Builder
 * Replaces legacy 1020-line jsPDF-based TenantReportGenerator
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTableOfContentsSvg, applyRunningHeaders, applyPageFooters,
  addPageHeader, buildTablePages, drawStatCards,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, wrapText,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';
import { drawDonutChart, drawBarChart, type DonutSegment, type BarChartItem } from './svgChartHelpers';

export interface TenantForPdf {
  shopNumber: string;
  shopName: string;
  category: string;
  area: number | null;
  dbAllowance: string | null;
  dbScopeOfWork: string | null;
  sowReceived: boolean;
  layoutReceived: boolean;
  dbOrdered: boolean;
  dbCost: number | null;
  lightingOrdered: boolean;
  lightingCost: number | null;
  costReported: boolean;
}

export interface TenantReportOptions {
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includeKPIPage: boolean;
  includeFloorPlan: boolean;
  includeTenantSchedule: boolean;
  floorPlanImageBase64?: string;
}

export interface TenantReportPdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  tenants: TenantForPdf[];
  options: TenantReportOptions;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    standard: 'Standard',
    fast_food: 'Fast Food',
    restaurant: 'Restaurant',
    national: 'National',
  };
  return labels[category] || category;
}

function buildKpiPage(data: TenantReportPdfData): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Project Overview');

  const { tenants } = data;
  const total = tenants.length;
  const totalArea = tenants.reduce((s, t) => s + (t.area || 0), 0);
  const totalDbCost = tenants.reduce((s, t) => s + (t.dbCost || 0), 0);
  const totalLightingCost = tenants.reduce((s, t) => s + (t.lightingCost || 0), 0);
  const totalCost = totalDbCost + totalLightingCost;

  let y = drawStatCards(svg, [
    { label: 'Total Units', value: String(total), color: BRAND_ACCENT },
    { label: 'Total Area', value: `${totalArea.toFixed(0)} m²`, color: '#16a34a' },
    { label: 'Total Cost', value: `R${(totalCost / 1000).toFixed(0)}k`, color: '#8b5cf6' },
  ], MARGIN_TOP + 14);

  y += 6;

  // Category distribution donut
  const categoryCounts: Record<string, number> = {};
  tenants.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  const catColors: Record<string, string> = {
    standard: '#3b82f6', fast_food: '#ef4444', restaurant: '#22c55e', national: '#a855f7',
  };
  const segments: DonutSegment[] = Object.entries(categoryCounts).map(([cat, count]) => ({
    label: getCategoryLabel(cat),
    value: count,
    color: catColors[cat] || '#64748b',
  }));

  if (segments.length > 0) {
    textEl(svg, MARGIN_LEFT, y, 'Category Distribution', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 4;
    y = drawDonutChart(svg, segments, MARGIN_LEFT + 30, y + 22, 20, {
      legendX: MARGIN_LEFT + 60, legendY: y + 8,
    });
    y += 6;
  }

  // Progress bars
  const sowReceived = tenants.filter(t => t.sowReceived).length;
  const layoutReceived = tenants.filter(t => t.layoutReceived).length;
  const dbOrdered = tenants.filter(t => t.dbOrdered).length;
  const lightingOrdered = tenants.filter(t => t.lightingOrdered).length;

  textEl(svg, MARGIN_LEFT + CONTENT_W / 2 + 5, MARGIN_TOP + 44, 'Task Progress', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
  
  const progressItems: BarChartItem[] = [
    { label: 'Scope of Work', value: Math.round((sowReceived / total) * 100), color: sowReceived / total >= 0.75 ? '#22c55e' : '#f59e0b' },
    { label: 'Layout Plans', value: Math.round((layoutReceived / total) * 100), color: layoutReceived / total >= 0.75 ? '#22c55e' : '#f59e0b' },
    { label: 'DB Orders', value: Math.round((dbOrdered / total) * 100), color: dbOrdered / total >= 0.75 ? '#22c55e' : '#f59e0b' },
    { label: 'Lighting Orders', value: Math.round((lightingOrdered / total) * 100), color: lightingOrdered / total >= 0.75 ? '#22c55e' : '#f59e0b' },
  ];
  drawBarChart(svg, progressItems, MARGIN_LEFT + CONTENT_W / 2 + 5, MARGIN_TOP + 50, CONTENT_W / 2 - 10, { barHeight: 6, gap: 4 });

  return svg;
}

function buildFloorPlanPage(imageBase64: string): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Floor Plan with Tenant Zones');

  const imgW = CONTENT_W;
  const imgH = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - 40;
  el('image', {
    x: MARGIN_LEFT, y: MARGIN_TOP + 14,
    width: imgW, height: imgH,
    href: imageBase64,
    preserveAspectRatio: 'xMidYMid meet',
  }, svg);

  // Legend
  const legendY = PAGE_H - MARGIN_BOTTOM - 18;
  textEl(svg, MARGIN_LEFT, legendY, 'Legend:', { size: 3, fill: TEXT_MUTED });
  el('rect', { x: MARGIN_LEFT, y: legendY + 2, width: 4, height: 4, fill: '#16a34a', rx: 0.5 }, svg);
  textEl(svg, MARGIN_LEFT + 6, legendY + 5, 'Complete', { size: 2.5, fill: TEXT_DARK });
  el('rect', { x: MARGIN_LEFT + 30, y: legendY + 2, width: 4, height: 4, fill: '#dc2626', rx: 0.5 }, svg);
  textEl(svg, MARGIN_LEFT + 36, legendY + 5, 'In Progress', { size: 2.5, fill: TEXT_DARK });
  el('rect', { x: MARGIN_LEFT + 65, y: legendY + 2, width: 4, height: 4, fill: '#9ca3af', rx: 0.5 }, svg);
  textEl(svg, MARGIN_LEFT + 71, legendY + 5, 'Unassigned', { size: 2.5, fill: TEXT_DARK });

  return svg;
}

export function buildTenantReportPdf(data: TenantReportPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const { options, tenants } = data;

  // 1. Cover
  if (options.includeCoverPage) {
    pages.push(buildStandardCoverPageSvg(data.coverData));
  }

  // 2. KPI Page
  if (options.includeKPIPage) {
    pages.push(buildKpiPage(data));
  }

  // 3. Floor Plan
  if (options.includeFloorPlan && options.floorPlanImageBase64) {
    pages.push(buildFloorPlanPage(options.floorPlanImageBase64));
  }

  // 4. Tenant Schedule
  if (options.includeTenantSchedule) {
    const cols: TableColumn[] = [
      { header: 'Shop #', width: 16, key: 'shop' },
      { header: 'Name', width: 32, key: 'name' },
      { header: 'Category', width: 20, key: 'cat' },
      { header: 'Area', width: 14, align: 'right', key: 'area' },
      { header: 'SOW', width: 12, align: 'center', key: 'sow' },
      { header: 'Layout', width: 12, align: 'center', key: 'layout' },
      { header: 'DB Ord', width: 12, align: 'center', key: 'db' },
      { header: 'DB Cost', width: 18, align: 'right', key: 'dbCost' },
      { header: 'Light', width: 12, align: 'center', key: 'light' },
      { header: 'L.Cost', width: 18, align: 'right', key: 'lightCost' },
    ];
    const rows = tenants.map(t => ({
      shop: t.shopNumber,
      name: t.shopName,
      cat: getCategoryLabel(t.category),
      area: t.area?.toFixed(0) || '-',
      sow: t.sowReceived ? 'Y' : 'N',
      layout: t.layoutReceived ? 'Y' : 'N',
      db: t.dbOrdered ? 'Y' : 'N',
      dbCost: t.dbCost ? `R${t.dbCost.toFixed(0)}` : (t.dbOrdered ? 'By Tenant' : '-'),
      light: t.lightingOrdered ? 'Y' : 'N',
      lightCost: t.lightingCost ? `R${t.lightingCost.toFixed(0)}` : (t.lightingOrdered ? 'By Tenant' : '-'),
    }));
    pages.push(...buildTablePages('Tenant Schedule', cols, rows));
  }

  // TOC
  if (options.includeTableOfContents && pages.length > 1) {
    const tocEntries: TocEntry[] = [];
    let pn = 2;
    if (options.includeKPIPage) tocEntries.push({ label: 'Project Overview & KPIs', pageNumber: pn++ });
    if (options.includeFloorPlan && options.floorPlanImageBase64) tocEntries.push({ label: 'Floor Plan with Tenant Zones', pageNumber: pn++ });
    if (options.includeTenantSchedule) tocEntries.push({ label: 'Tenant Schedule', pageNumber: pn });
    const tocPage = buildTableOfContentsSvg(tocEntries);
    pages.splice(1, 0, tocPage);
  }

  applyRunningHeaders(pages, 'Tenant Tracker Report', data.projectName);
  applyPageFooters(pages, 'Tenant Tracker Report');

  return pages;
}
