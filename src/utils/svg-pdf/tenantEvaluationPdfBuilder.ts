/**
 * Tenant Evaluation SVG PDF Builder
 * Phase 4 migration: replaces pdfmake-based generate-tenant-evaluation-pdf
 * Features: tenant scoring, compliance checklist, electrical requirements
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

export interface TenantEvaluationData {
  coverData: StandardCoverPageData;
  projectName: string;
  tenantName: string;
  shopNumber: string;
  shopArea: number;
  category: string;
  evaluationDate: string;
  electricalRequirements: ElectricalRequirement[];
  complianceChecks: ComplianceCheck[];
  overallScore: number;
  notes?: string;
}

interface ElectricalRequirement {
  item: string;
  specification: string;
  status: 'met' | 'partial' | 'not_met';
  notes?: string;
}

interface ComplianceCheck {
  category: string;
  requirement: string;
  compliant: boolean;
  reference?: string;
}

export function buildTenantEvaluationPdf(data: TenantEvaluationData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Tenant summary
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, 'Tenant Evaluation Summary');

  let y = MARGIN_TOP + 14;
  const met = data.electricalRequirements.filter(r => r.status === 'met').length;
  const compliant = data.complianceChecks.filter(c => c.compliant).length;
  const stats: StatCard[] = [
    { label: 'Overall Score', value: `${data.overallScore}%`, color: data.overallScore >= 70 ? '#16a34a' : '#dc2626' },
    { label: 'Shop Area', value: `${data.shopArea} m²`, color: BRAND_PRIMARY },
    { label: 'Requirements Met', value: `${met}/${data.electricalRequirements.length}`, color: BRAND_ACCENT },
    { label: 'Compliance', value: `${compliant}/${data.complianceChecks.length}`, color: '#8b5cf6' },
  ];
  y = drawStatCards(summaryPage, stats, y);
  y += 8;

  // Tenant info block
  const infoItems = [
    ['Tenant', data.tenantName],
    ['Shop Number', data.shopNumber],
    ['Category', data.category],
    ['Evaluation Date', data.evaluationDate],
  ];
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: infoItems.length * 6 + 6, fill: BRAND_LIGHT, rx: 1.5 }, summaryPage);
  let iy = y + 5;
  for (const [label, value] of infoItems) {
    textEl(summaryPage, MARGIN_LEFT + 5, iy, `${label}:`, { size: 3, fill: TEXT_MUTED, weight: 'bold' });
    textEl(summaryPage, MARGIN_LEFT + 45, iy, value, { size: 3, fill: TEXT_DARK });
    iy += 6;
  }
  pages.push(summaryPage);

  // 3. Electrical requirements table
  if (data.electricalRequirements.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Item', width: 40, key: 'item' },
      { header: 'Specification', width: 45, key: 'specification' },
      { header: 'Status', width: 25, align: 'center', key: 'statusLabel' },
      { header: 'Notes', width: 35, key: 'notes' },
    ];
    const statusLabels: Record<string, string> = { met: '✓ Met', partial: '~ Partial', not_met: '✗ Not Met' };
    const rows = data.electricalRequirements.map(r => ({
      item: r.item,
      specification: r.specification,
      statusLabel: statusLabels[r.status] || r.status,
      notes: r.notes || '',
    }));
    pages.push(...buildTablePages('Electrical Requirements', cols, rows));
  }

  // 4. Compliance checklist
  if (data.complianceChecks.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Category', width: 35, key: 'category' },
      { header: 'Requirement', width: 60, key: 'requirement' },
      { header: 'Compliant', width: 22, align: 'center', key: 'compliantLabel' },
      { header: 'Reference', width: 25, key: 'reference' },
    ];
    const rows = data.complianceChecks.map(c => ({
      category: c.category,
      requirement: c.requirement,
      compliantLabel: c.compliant ? '✓ Yes' : '✗ No',
      reference: c.reference || '',
    }));
    pages.push(...buildTablePages('Compliance Checklist', cols, rows));
  }

  // 5. Notes
  if (data.notes) {
    const notesPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, notesPage);
    addPageHeader(notesPage, 'Evaluation Notes');
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
    { label: 'Tenant Evaluation Summary', pageNumber: 2 },
  ];
  let pn = 3;
  if (data.electricalRequirements.length > 0) { tocEntries.push({ label: 'Electrical Requirements', pageNumber: pn, indent: true }); pn++; }
  if (data.complianceChecks.length > 0) { tocEntries.push({ label: 'Compliance Checklist', pageNumber: pn, indent: true }); pn++; }
  if (data.notes) tocEntries.push({ label: 'Evaluation Notes', pageNumber: pn });
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  applyRunningHeaders(pages, 'Tenant Evaluation', data.projectName);
  applyPageFooters(pages, 'Tenant Evaluation');

  return pages;
}
