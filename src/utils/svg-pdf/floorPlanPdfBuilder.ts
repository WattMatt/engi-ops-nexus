/**
 * Floor Plan Report SVG PDF Builder
 * Phase 3 migration: replaces PDFShift-based generate-floor-plan-pdf
 * Features: embedded floor plan image, equipment/cable schedules, annotations
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

export interface FloorPlanReportData {
  coverData: StandardCoverPageData;
  projectName: string;
  layoutName: string;
  floorPlanImageBase64?: string;
  equipment: EquipmentItem[];
  cables: CableItem[];
  containment: ContainmentItem[];
  annotations?: string[];
}

interface EquipmentItem {
  tag: string;
  type: string;
  location: string;
  rating?: string;
  quantity: number;
}

interface CableItem {
  tag: string;
  from: string;
  to: string;
  type: string;
  size: string;
  length: number;
}

interface ContainmentItem {
  type: string;
  size: string;
  length: number;
  route: string;
}

export function buildFloorPlanReportPdf(data: FloorPlanReportData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Summary page
  const summaryPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
  addPageHeader(summaryPage, `Layout: ${data.layoutName}`);

  let y = MARGIN_TOP + 14;
  const stats: StatCard[] = [
    { label: 'Equipment Items', value: String(data.equipment.length), color: BRAND_PRIMARY },
    { label: 'Cable Runs', value: String(data.cables.length), color: BRAND_ACCENT },
    { label: 'Containment Runs', value: String(data.containment.length), color: '#16a34a' },
  ];
  y = drawStatCards(summaryPage, stats, y);
  y += 6;

  // Embedded floor plan image
  if (data.floorPlanImageBase64) {
    textEl(summaryPage, MARGIN_LEFT, y, 'Floor Plan Overview', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 4;
    const imgW = CONTENT_W;
    const imgH = 120;
    el('rect', { x: MARGIN_LEFT, y, width: imgW, height: imgH, fill: BRAND_LIGHT, rx: 1 }, summaryPage);
    el('image', {
      x: MARGIN_LEFT + 2, y: y + 2, width: imgW - 4, height: imgH - 4,
      href: data.floorPlanImageBase64,
      preserveAspectRatio: 'xMidYMid meet',
    }, summaryPage);
  } else {
    textEl(summaryPage, PAGE_W / 2, y + 40, '[Floor Plan Image]', {
      size: 5, fill: TEXT_MUTED, anchor: 'middle',
    });
  }
  pages.push(summaryPage);

  // 3. Equipment schedule
  if (data.equipment.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Tag', width: 25, key: 'tag' },
      { header: 'Type', width: 40, key: 'type' },
      { header: 'Location', width: 40, key: 'location' },
      { header: 'Rating', width: 25, align: 'center', key: 'rating' },
      { header: 'Qty', width: 15, align: 'center', key: 'quantity' },
    ];
    const rows = data.equipment.map(e => ({ ...e, rating: e.rating || '-', quantity: String(e.quantity) }));
    pages.push(...buildTablePages('Equipment Schedule', cols, rows));
  }

  // 4. Cable schedule
  if (data.cables.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Tag', width: 20, key: 'tag' },
      { header: 'From', width: 30, key: 'from' },
      { header: 'To', width: 30, key: 'to' },
      { header: 'Type', width: 25, key: 'type' },
      { header: 'Size', width: 20, align: 'center', key: 'size' },
      { header: 'Length (m)', width: 20, align: 'right', key: 'length' },
    ];
    const rows = data.cables.map(c => ({ ...c, length: c.length.toFixed(1) }));
    pages.push(...buildTablePages('Cable Schedule', cols, rows));
  }

  // 5. Containment schedule
  if (data.containment.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Type', width: 35, key: 'type' },
      { header: 'Size', width: 30, key: 'size' },
      { header: 'Length (m)', width: 25, align: 'right', key: 'length' },
      { header: 'Route', width: 55, key: 'route' },
    ];
    const rows = data.containment.map(c => ({ ...c, length: c.length.toFixed(1) }));
    pages.push(...buildTablePages('Containment Schedule', cols, rows));
  }

  // 6. Annotations
  if (data.annotations && data.annotations.length > 0) {
    const annotPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, annotPage);
    addPageHeader(annotPage, 'Annotations & Notes');
    let ay = MARGIN_TOP + 14;
    data.annotations.forEach((note, i) => {
      textEl(annotPage, MARGIN_LEFT + 2, ay, `${i + 1}. ${note}`, { size: 3, fill: TEXT_DARK });
      ay += 5;
    });
    pages.push(annotPage);
  }

  // TOC
  const tocEntries: TocEntry[] = [
    { label: `Layout: ${data.layoutName}`, pageNumber: 2 },
  ];
  let pn = 3;
  if (data.equipment.length > 0) { tocEntries.push({ label: 'Equipment Schedule', pageNumber: pn, indent: true }); pn++; }
  if (data.cables.length > 0) { tocEntries.push({ label: 'Cable Schedule', pageNumber: pn, indent: true }); pn++; }
  if (data.containment.length > 0) { tocEntries.push({ label: 'Containment Schedule', pageNumber: pn, indent: true }); pn++; }
  if (data.annotations?.length) { tocEntries.push({ label: 'Annotations & Notes', pageNumber: pn }); }
  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(1, 0, tocPage);

  applyRunningHeaders(pages, 'Floor Plan Report', data.projectName);
  applyPageFooters(pages, 'Floor Plan Report');

  return pages;
}
