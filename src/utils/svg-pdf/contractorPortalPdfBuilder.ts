/**
 * Contractor Portal Report SVG PDF Builder
 * Aggregates all portal sections into a comprehensive PDF report.
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  drawStatCards, buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';
import { drawDonutChart } from './svgChartHelpers';

// ─── Data Interfaces ───

export interface PortalTenantRow {
  shop_number: string;
  shop_name: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  lighting_ordered: boolean;
}

export interface PortalDrawingRow {
  drawing_number: string | null;
  drawing_title: string | null;
  discipline: string | null;
  current_revision: string | null;
  status: string | null;
}

export interface PortalCableRow {
  cable_tag: string | null;
  from_location: string | null;
  to_location: string | null;
  cable_type: string | null;
  contractor_confirmed: boolean | null;
  contractor_installed: boolean | null;
}

export interface PortalProcurementRow {
  item_name: string | null;
  supplier: string | null;
  status: string | null;
  order_date: string | null;
  delivery_date: string | null;
}

export interface PortalInspectionRow {
  location: string | null;
  inspection_type: string | null;
  status: string | null;
  scheduled_date: string | null;
}

export interface PortalRfiRow {
  rfi_number: string | null;
  subject: string | null;
  status: string | null;
  submitted_date: string | null;
}

export interface ContractorPortalPdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  contractorName: string;
  tenants: PortalTenantRow[];
  drawings: PortalDrawingRow[];
  cables: PortalCableRow[];
  procurement: PortalProcurementRow[];
  inspections: PortalInspectionRow[];
  rfis: PortalRfiRow[];
}

// ─── Helpers ───

const WARN_COLOR = '#d97706';

function pct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

// ─── Builder ───

export function buildContractorPortalPdf(data: ContractorPortalPdfData): SVGSVGElement[] {
  const {
    coverData, projectName, contractorName,
    tenants, drawings, cables, procurement, inspections, rfis,
  } = data;

  const pages: SVGSVGElement[] = [];

  // ── Cover Page ──
  pages.push(buildStandardCoverPageSvg(coverData));

  // ── Table of Contents ──
  const tocEntries: TocEntry[] = [
    { label: 'Project Overview', pageNumber: 3 },
    { label: 'Tenant Status', pageNumber: 4 },
    { label: 'Drawing Register', pageNumber: 5 },
    { label: 'Cable Status', pageNumber: 6 },
    { label: 'Procurement Status', pageNumber: 7 },
    { label: 'Inspections', pageNumber: 8 },
    { label: 'RFIs', pageNumber: 9 },
  ];
  pages.push(buildTableOfContentsSvg(tocEntries, 'Contractor Portal Report'));

  // ── Overview / Summary Page ──
  const overviewPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, overviewPage);
  addPageHeader(overviewPage, 'Project Overview');

  const sowCount = tenants.filter(t => t.sow_received).length;
  const dbCount = tenants.filter(t => t.db_ordered).length;
  const cableInstalled = cables.filter(c => c.contractor_installed).length;
  const inspComplete = inspections.filter(i => i.status === 'completed' || i.status === 'passed').length;

  let y = drawStatCards(overviewPage, [
    { label: 'Tenants', value: String(tenants.length), color: BRAND_PRIMARY },
    { label: 'Drawings', value: String(drawings.length), color: BRAND_ACCENT },
    { label: 'Cables', value: String(cables.length), color: '#7c3aed' },
    { label: 'Procurement', value: String(procurement.length), color: '#0891b2' },
  ] as StatCard[], MARGIN_TOP + 12);

  y += 4;
  y = drawStatCards(overviewPage, [
    { label: 'SOW Received', value: `${sowCount}/${tenants.length}`, color: SUCCESS_COLOR },
    { label: 'DB Ordered', value: `${dbCount}/${tenants.length}`, color: BRAND_PRIMARY },
    { label: 'Cables Installed', value: `${cableInstalled}/${cables.length}`, color: SUCCESS_COLOR },
    { label: 'Inspections Done', value: `${inspComplete}/${inspections.length}`, color: BRAND_ACCENT },
  ] as StatCard[], y);

  // Donut chart for overall progress
  y += 8;
  const progressItems = [
    { label: 'SOW', count: sowCount, total: tenants.length },
    { label: 'Layouts', count: tenants.filter(t => t.layout_received).length, total: tenants.length },
    { label: 'DB Orders', count: dbCount, total: tenants.length },
    { label: 'Lighting', count: tenants.filter(t => t.lighting_ordered).length, total: tenants.length },
    { label: 'Cables', count: cableInstalled, total: cables.length },
  ];

  const donutData = progressItems.map(p => ({
    label: p.label,
    value: p.total > 0 ? Math.round((p.count / p.total) * 100) : 0,
    color: p.count === p.total ? SUCCESS_COLOR : p.count > 0 ? WARN_COLOR : DANGER_COLOR,
  }));

  drawDonutChart(overviewPage, donutData, PAGE_W / 2, y + 30, 22);

  // Legend below donut
  const legendY = y + 58;
  progressItems.forEach((p, i) => {
    const lx = MARGIN_LEFT + (i % 3) * 60;
    const ly = legendY + Math.floor(i / 3) * 6;
    el('circle', { cx: lx, cy: ly - 1, r: 1.5, fill: donutData[i].color }, overviewPage);
    textEl(overviewPage, lx + 3, ly, `${p.label}: ${p.count}/${p.total} (${pct(p.count, p.total)})`, { size: 2.8, fill: TEXT_MUTED });
  });

  pages.push(overviewPage);

  // ── Tenant Status Table ──
  const tenantCols: TableColumn[] = [
    { header: 'Shop #', width: 18, key: 'shop_number' },
    { header: 'Tenant', width: 42, key: 'shop_name' },
    { header: 'SOW', width: 18, key: 'sow_status' },
    { header: 'Layout', width: 18, key: 'layout_status' },
    { header: 'DB', width: 18, key: 'db_status' },
    { header: 'Lighting', width: 18, key: 'lighting_status' },
  ];
  const tenantRows = tenants.map(t => ({
    shop_number: t.shop_number,
    shop_name: t.shop_name || '—',
    sow_status: t.sow_received ? '✓' : '—',
    layout_status: t.layout_received ? '✓' : '—',
    db_status: t.db_ordered ? '✓' : '—',
    lighting_status: t.lighting_ordered ? '✓' : '—',
  }));
  pages.push(...buildTablePages('Tenant Status', tenantCols, tenantRows as any));

  // ── Drawing Register Table ──
  const drawingCols: TableColumn[] = [
    { header: 'Number', width: 25, key: 'drawing_number' },
    { header: 'Title', width: 55, key: 'drawing_title' },
    { header: 'Discipline', width: 25, key: 'discipline' },
    { header: 'Rev', width: 12, key: 'current_revision' },
    { header: 'Status', width: 20, key: 'status' },
  ];
  const drawingRows = drawings.map(d => ({
    drawing_number: d.drawing_number || '—',
    drawing_title: d.drawing_title || '—',
    discipline: d.discipline || '—',
    current_revision: d.current_revision || '—',
    status: d.status || '—',
  }));
  pages.push(...buildTablePages('Drawing Register', drawingCols, drawingRows as any));

  // ── Cable Status Table ──
  const cableCols: TableColumn[] = [
    { header: 'Tag', width: 22, key: 'cable_tag' },
    { header: 'From', width: 30, key: 'from_location' },
    { header: 'To', width: 30, key: 'to_location' },
    { header: 'Type', width: 25, key: 'cable_type' },
    { header: 'Confirmed', width: 16, key: 'confirmed' },
    { header: 'Installed', width: 16, key: 'installed' },
  ];
  const cableRows = cables.map(c => ({
    cable_tag: c.cable_tag || '—',
    from_location: c.from_location || '—',
    to_location: c.to_location || '—',
    cable_type: c.cable_type || '—',
    confirmed: c.contractor_confirmed ? '✓' : '—',
    installed: c.contractor_installed ? '✓' : '—',
  }));
  pages.push(...buildTablePages('Cable Status', cableCols, cableRows as any));

  // ── Procurement Table ──
  const procCols: TableColumn[] = [
    { header: 'Item', width: 45, key: 'item_name' },
    { header: 'Supplier', width: 30, key: 'supplier' },
    { header: 'Status', width: 22, key: 'status' },
    { header: 'Order Date', width: 22, key: 'order_date' },
    { header: 'Delivery', width: 22, key: 'delivery_date' },
  ];
  const procRows = procurement.map(p => ({
    item_name: p.item_name || '—',
    supplier: p.supplier || '—',
    status: p.status || '—',
    order_date: p.order_date || '—',
    delivery_date: p.delivery_date || '—',
  }));
  pages.push(...buildTablePages('Procurement Status', procCols, procRows as any));

  // ── Inspections Table ──
  const inspCols: TableColumn[] = [
    { header: 'Location', width: 40, key: 'location' },
    { header: 'Type', width: 35, key: 'inspection_type' },
    { header: 'Status', width: 25, key: 'status' },
    { header: 'Date', width: 25, key: 'scheduled_date' },
  ];
  const inspRows = inspections.map(i => ({
    location: i.location || '—',
    inspection_type: i.inspection_type || '—',
    status: i.status || '—',
    scheduled_date: i.scheduled_date || '—',
  }));
  pages.push(...buildTablePages('Inspections', inspCols, inspRows as any));

  // ── RFI Table ──
  const rfiCols: TableColumn[] = [
    { header: 'RFI #', width: 18, key: 'rfi_number' },
    { header: 'Subject', width: 60, key: 'subject' },
    { header: 'Status', width: 25, key: 'status' },
    { header: 'Submitted', width: 25, key: 'submitted_date' },
  ];
  const rfiRows = rfis.map(r => ({
    rfi_number: r.rfi_number || '—',
    subject: r.subject || '—',
    status: r.status || '—',
    submitted_date: r.submitted_date || '—',
  }));
  pages.push(...buildTablePages('RFI Register', rfiCols, rfiRows as any));

  // ── Apply headers & footers ──
  applyRunningHeaders(pages, 'Contractor Portal Report', projectName);
  applyPageFooters(pages, 'Contractor Portal Report');

  return pages;
}
