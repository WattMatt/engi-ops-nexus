/**
 * Tenant Completion / Handover SVG-to-PDF Builder
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders, drawStatCards,
  buildTableOfContentsSvg,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, TEXT_DARK, TEXT_MUTED, BRAND_LIGHT,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn, type TocEntry, type StatCard,
} from './sharedSvgHelpers';

interface TenantData {
  id: string;
  shop_number: string;
  shop_name: string;
  completionPercentage: number;
  completedCount: number;
  totalCount: number;
}

export interface HandoverPdfData {
  coverData: StandardCoverPageData;
  tenants: TenantData[];
  stats: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
    overallPercentage: number;
  };
  allDocuments: any[];
  allExclusions: any[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  electrical_coc: 'Electrical COC',
  as_built_drawing: 'As Built Drawing',
  line_diagram: 'Line Diagram',
  qc_inspection_report: 'QC Inspection Report',
  lighting_guarantee: 'Lighting Guarantee',
  db_guarantee: 'DB Guarantee',
};
const DOC_TYPES = Object.keys(DOC_TYPE_LABELS);

export function buildHandoverCompletionPdf(data: HandoverPdfData): SVGSVGElement[] {
  const { coverData, tenants, stats } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Completion Summary');

  let y = drawStatCards(summaryPage, [
    { label: 'Overall', value: `${stats.overallPercentage}%`, color: BRAND_PRIMARY },
    { label: 'Complete', value: String(stats.complete), color: SUCCESS_COLOR },
    { label: 'In Progress', value: String(stats.inProgress), color: '#f59e0b' },
    { label: 'Not Started', value: String(stats.notStarted), color: DANGER_COLOR },
  ], MARGIN_TOP + 12);

  // 3. Overview table
  const overviewColumns: TableColumn[] = [
    { header: 'Shop No.', width: 25, key: 'shopNo' },
    { header: 'Shop Name', width: 55, key: 'shopName' },
    { header: 'Documents', width: 30, align: 'center', key: 'docs' },
    { header: 'Progress', width: 25, align: 'right', key: 'progress' },
    { header: 'Status', width: 30, key: 'status' },
  ];
  const overviewRows = tenants.map(t => ({
    shopNo: t.shop_number,
    shopName: t.shop_name,
    docs: `${t.completedCount}/${t.totalCount}`,
    progress: `${t.completionPercentage}%`,
    status: t.completionPercentage === 100 ? 'Complete' : t.completionPercentage > 0 ? 'In Progress' : 'Not Started',
  }));
  const overviewPages = buildTablePages('Completion Overview', overviewColumns, overviewRows);

  // 4. Tenant detail pages
  const tenantDetailPages: SVGSVGElement[] = [];
  const detailColumns: TableColumn[] = [
    { header: 'Document Type', width: 60, key: 'type' },
    { header: 'Status', width: 30, key: 'status' },
    { header: 'Details', width: 80, key: 'details' },
  ];

  for (const tenant of tenants) {
    const tenantDocs = data.allDocuments.filter((d: any) => d.source_id === tenant.id);
    const tenantExcl = data.allExclusions.filter((e: any) => e.tenant_id === tenant.id);

    const rows = DOC_TYPES.map(type => {
      const doc = tenantDocs.find((d: any) => d.document_type === type);
      const excl = tenantExcl.find((e: any) => e.document_type === type);
      let status = 'Missing';
      let details = '-';
      if (doc) { status = 'Uploaded'; details = doc.file_name || 'File available'; }
      else if (excl) { status = 'By Tenant'; details = excl.notes || 'Tenant responsibility'; }
      return { type: DOC_TYPE_LABELS[type] || type, status, details };
    });

    const pages = buildTablePages(`${tenant.shop_number} - ${tenant.shop_name}`, detailColumns, rows);
    tenantDetailPages.push(...pages);
  }

  // Assemble with TOC
  const contentPages = [coverSvg, summaryPage, ...overviewPages, ...tenantDetailPages];
  const tocEntries: TocEntry[] = [
    { label: 'Completion Summary', pageNumber: 3 },
    { label: 'Completion Overview', pageNumber: 4 },
    ...tenants.map((t, i) => ({
      label: `${t.shop_number} - ${t.shop_name}`,
      pageNumber: 4 + overviewPages.length + i,
      indent: true,
    })),
  ];
  const tocSvg = buildTableOfContentsSvg(tocEntries);
  const allPages = [coverSvg, tocSvg, ...contentPages.slice(1)];

  applyRunningHeaders(allPages, 'Tenant Handover Completion', coverData.projectName || '');
  applyPageFooters(allPages, 'Tenant Handover Completion');
  return allPages;
}
