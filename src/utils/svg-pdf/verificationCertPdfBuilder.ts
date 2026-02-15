/**
 * Verification Certificate SVG-to-PDF Builder
 * Migrated from PDFShift Edge Function (generate-verification-certificate-pdf)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTablePages, addPageHeader, applyPageFooters, applyRunningHeaders,
  drawStatCards,
  MARGIN_LEFT, MARGIN_TOP, PAGE_W, PAGE_H, CONTENT_W,
  WHITE, BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED, BORDER_COLOR,
  SUCCESS_COLOR, DANGER_COLOR,
  type StandardCoverPageData, type TableColumn,
} from './sharedSvgHelpers';

export interface VerificationItem {
  cable_tag: string;
  from_location: string;
  to_location: string;
  cable_size: string;
  status: string;
  notes: string | null;
  measured_length: number | null;
}

export interface VerificationCertPdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  projectNumber: string;
  scheduleName: string;
  scheduleRevision?: string;
  electrician: {
    name: string;
    company: string;
    position?: string;
    registration?: string;
  };
  stats: {
    total: number;
    verified: number;
    issues: number;
    not_installed: number;
  };
  items: VerificationItem[];
  completedAt: string;
  certId: string;
}

export function buildVerificationCertPdf(data: VerificationCertPdfData): SVGSVGElement[] {
  const { coverData, stats, items, electrician, completedAt, certId } = data;

  // 1. Cover
  const coverSvg = buildStandardCoverPageSvg(coverData);

  // 2. Certificate page
  const certPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, certPage);

  // Header
  let y = MARGIN_TOP;
  textEl(certPage, PAGE_W / 2, y, 'Cable Schedule Verification Certificate', {
    size: 6, weight: 'bold', fill: '#1e40af', anchor: 'middle',
  });
  y += 4;
  textEl(certPage, PAGE_W / 2, y, 'Official Record of Site Installation Verification', {
    size: 3, fill: TEXT_MUTED, anchor: 'middle',
  });
  y += 2;
  el('line', { x1: MARGIN_LEFT, y1: y, x2: PAGE_W - MARGIN_LEFT, y2: y, stroke: BRAND_ACCENT, 'stroke-width': 0.8 }, certPage);
  y += 8;

  // Two-column info
  const colW = CONTENT_W / 2 - 4;
  const drawInfo = (x: number, yy: number, label: string, value: string) => {
    textEl(certPage, x, yy, label, { size: 2.5, fill: TEXT_MUTED });
    textEl(certPage, x, yy + 4, value, { size: 3, weight: 'bold', fill: TEXT_DARK });
    return yy + 9;
  };

  // Left: Project
  textEl(certPage, MARGIN_LEFT, y, 'PROJECT INFORMATION', { size: 3, weight: 'bold', fill: '#374151' });
  el('line', { x1: MARGIN_LEFT, y1: y + 2, x2: MARGIN_LEFT + colW, y2: y + 2, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, certPage);
  let ly = y + 5;
  ly = drawInfo(MARGIN_LEFT, ly, 'Project Name', data.projectName);
  ly = drawInfo(MARGIN_LEFT, ly, 'Project Number', data.projectNumber);
  ly = drawInfo(MARGIN_LEFT, ly, 'Cable Schedule', `${data.scheduleName}${data.scheduleRevision ? ` (Rev ${data.scheduleRevision})` : ''}`);

  // Right: Electrician
  const rx = MARGIN_LEFT + colW + 8;
  textEl(certPage, rx, y, 'VERIFIED BY', { size: 3, weight: 'bold', fill: '#374151' });
  el('line', { x1: rx, y1: y + 2, x2: rx + colW, y2: y + 2, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, certPage);
  let ry = y + 5;
  ry = drawInfo(rx, ry, 'Name', electrician.name);
  ry = drawInfo(rx, ry, 'Position', electrician.position || 'Site Electrician');
  ry = drawInfo(rx, ry, 'Company', electrician.company || 'N/A');
  if (electrician.registration) {
    ry = drawInfo(rx, ry, 'Registration', electrician.registration);
  }

  y = Math.max(ly, ry) + 4;

  // Stats cards
  y = drawStatCards(certPage, [
    { label: 'Total Cables', value: String(stats.total), color: BRAND_PRIMARY },
    { label: 'Verified', value: String(stats.verified), color: SUCCESS_COLOR },
    { label: 'Issues', value: String(stats.issues), color: '#d97706' },
    { label: 'Not Installed', value: String(stats.not_installed), color: DANGER_COLOR },
  ], y);

  // Authorization section
  y += 8;
  textEl(certPage, MARGIN_LEFT, y, 'AUTHORIZATION', { size: 3, weight: 'bold', fill: '#374151' });
  el('line', { x1: MARGIN_LEFT, y1: y + 2, x2: PAGE_W - MARGIN_LEFT, y2: y + 2, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, certPage);
  y += 8;
  
  // Signature line
  el('line', { x1: MARGIN_LEFT, y1: y + 10, x2: MARGIN_LEFT + 60, y2: y + 10, stroke: TEXT_DARK, 'stroke-width': 0.3 }, certPage);
  textEl(certPage, MARGIN_LEFT, y + 14, 'Signature', { size: 2.5, fill: TEXT_MUTED });

  textEl(certPage, MARGIN_LEFT + 80, y + 4, 'Signed By:', { size: 2.5, fill: TEXT_MUTED });
  textEl(certPage, MARGIN_LEFT + 80, y + 8, electrician.name, { size: 3, weight: 'bold', fill: TEXT_DARK });
  textEl(certPage, MARGIN_LEFT + 80, y + 14, 'Date:', { size: 2.5, fill: TEXT_MUTED });
  textEl(certPage, MARGIN_LEFT + 80, y + 18, new Date(completedAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }), { size: 3, fill: TEXT_DARK });

  // Footer
  y = PAGE_H - MARGIN_TOP - 10;
  el('line', { x1: MARGIN_LEFT, y1: y, x2: PAGE_W - MARGIN_LEFT, y2: y, stroke: BORDER_COLOR, 'stroke-width': 0.3 }, certPage);
  y += 4;
  textEl(certPage, PAGE_W / 2, y, 'This is an official verification certificate generated electronically.', { size: 2.2, fill: '#9ca3af', anchor: 'middle' });
  y += 4;
  textEl(certPage, PAGE_W / 2, y, `Certificate ID: ${certId}`, { size: 2, fill: '#9ca3af', anchor: 'middle' });

  // 3. Details table
  const columns: TableColumn[] = [
    { header: 'Cable Tag', width: 25, key: 'tag' },
    { header: 'From', width: 30, key: 'from' },
    { header: 'To', width: 30, key: 'to' },
    { header: 'Size', width: 20, key: 'size' },
    { header: 'Status', width: 22, key: 'status' },
    { header: 'Notes', width: 40, key: 'notes' },
  ];

  const rows = items.map(i => ({
    tag: i.cable_tag,
    from: i.from_location || '-',
    to: i.to_location || '-',
    size: i.cable_size || '-',
    status: i.status.toUpperCase(),
    notes: i.notes || '-',
  }));

  const tablePages = buildTablePages('Cable Verification Details', columns, rows);

  const allPages = [coverSvg, certPage, ...tablePages];
  applyRunningHeaders(allPages, 'Verification Certificate', data.projectName);
  applyPageFooters(allPages, 'Verification Certificate');
  return allPages;
}
