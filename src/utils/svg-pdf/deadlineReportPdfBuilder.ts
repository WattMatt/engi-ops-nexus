/**
 * Deadline Report SVG PDF Builder
 * Migrated from pdfmake to unified SVG engine
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, applyRunningHeaders, applyPageFooters,
  drawStatCards, addPageHeader,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H,
  WHITE, BRAND_PRIMARY, TEXT_MUTED,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type StatCard,
} from './sharedSvgHelpers';

interface DeadlineTenant {
  shopNumber: string;
  tenantName: string;
  dbOrderDeadline: string;
  dbStatus: string;
  lightingOrderDeadline: string;
  lightingStatus: string;
}

export interface DeadlineReportPdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  tenants: DeadlineTenant[];
}

function statusColor(status: string): string {
  if (status === 'Overdue') return DANGER_COLOR;
  if (status === 'Approaching') return '#d97706';
  return SUCCESS_COLOR;
}

export function buildDeadlineReportPdf(data: DeadlineReportPdfData): SVGSVGElement[] {
  const { coverData, tenants, projectName } = data;

  const coverSvg = buildStandardCoverPageSvg(coverData);

  // Summary
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Deadline Summary');

  const overdue = tenants.filter(t => t.dbStatus === 'Overdue' || t.lightingStatus === 'Overdue').length;
  const approaching = tenants.filter(t => t.dbStatus === 'Approaching' || t.lightingStatus === 'Approaching').length;
  const onTrack = tenants.length - overdue - approaching;

  const y = drawStatCards(summaryPage, [
    { label: 'Total Tenants', value: String(tenants.length), color: BRAND_PRIMARY },
    { label: 'Overdue', value: String(overdue), color: DANGER_COLOR },
    { label: 'Approaching', value: String(approaching), color: '#d97706' },
    { label: 'On Track', value: String(onTrack), color: SUCCESS_COLOR },
  ] as StatCard[], MARGIN_TOP + 12);

  // Table
  const columns: TableColumn[] = [
    { header: 'Shop', width: 20, key: 'shopNumber' },
    { header: 'Tenant', width: 40, key: 'tenantName' },
    { header: 'DB Order', width: 25, key: 'dbOrderDeadline' },
    { header: 'DB Status', width: 22, key: 'dbStatus' },
    { header: 'Lighting Order', width: 25, key: 'lightingOrderDeadline' },
    { header: 'Lighting Status', width: 22, key: 'lightingStatus' },
  ];

  const tablePages = buildTablePages('Deadline Details', columns, tenants as any);

  const allPages = [coverSvg, summaryPage, ...tablePages];
  applyRunningHeaders(allPages, 'Deadline Report', projectName);
  applyPageFooters(allPages, 'Deadline Report');
  return allPages;
}
