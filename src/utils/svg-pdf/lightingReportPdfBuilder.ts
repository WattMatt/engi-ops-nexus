/**
 * Lighting Report SVG PDF Builder
 * Replaces legacy jsPDF-based lightingReportPDF.ts
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

export interface LightingTenantSchedule {
  shopNumber: string;
  shopName: string;
  area: number;
  items: {
    fittingCode: string;
    description: string;
    quantity: number;
    wattage: number;
    totalWattage: number;
    status: string;
    supplyCost: number;
    installCost: number;
  }[];
}

export interface LightingFittingSpec {
  manufacturer: string;
  modelNumber: string;
  wattage: number;
  lumens: number | null;
  colorTemperature: number | null;
  cri: number | null;
  ipRating: string | null;
  fittingType: string;
  quantityUsed: number;
}

export interface LightingReportPdfData {
  coverData: StandardCoverPageData;
  projectName: string;
  sections: {
    executiveSummary: boolean;
    scheduleByTenant: boolean;
    specificationSheets: boolean;
    costSummary: boolean;
    energyAnalysis: boolean;
  };
  schedules: LightingTenantSchedule[];
  specifications: LightingFittingSpec[];
}

export function buildLightingReportPdf(data: LightingReportPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. Executive Summary
  if (data.sections.executiveSummary) {
    const summaryPage = createSvgElement();
    el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, summaryPage);
    addPageHeader(summaryPage, 'Executive Summary');

    const totalFittings = data.schedules.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0);
    const totalWattage = data.schedules.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.totalWattage, 0), 0);
    const totalSupply = data.schedules.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.supplyCost, 0), 0);
    const totalInstall = data.schedules.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.installCost, 0), 0);

    let y = drawStatCards(summaryPage, [
      { label: 'Tenants', value: String(data.schedules.length), color: BRAND_PRIMARY },
      { label: 'Total Fittings', value: String(totalFittings), color: BRAND_ACCENT },
      { label: 'Total Load', value: `${(totalWattage / 1000).toFixed(1)} kW`, color: '#16a34a' },
      { label: 'Total Cost', value: `R${((totalSupply + totalInstall) / 1000).toFixed(0)}k`, color: '#8b5cf6' },
    ], MARGIN_TOP + 14);

    y += 8;
    const narrative = 'This report provides a comprehensive overview of the lighting design and specifications for this project, including schedules, costs, and energy analysis.';
    const lines = wrapText(narrative, CONTENT_W, 3.5);
    for (const line of lines) {
      textEl(summaryPage, MARGIN_LEFT, y, line, { size: 3.5 });
      y += 5;
    }
    pages.push(summaryPage);
  }

  // 3. Schedule by Tenant
  if (data.sections.scheduleByTenant && data.schedules.length > 0) {
    const cols: TableColumn[] = [
      { header: '#', width: 8, align: 'center', key: 'num' },
      { header: 'Code', width: 25, key: 'code' },
      { header: 'Description', width: 45, key: 'desc' },
      { header: 'Qty', width: 12, align: 'center', key: 'qty' },
      { header: 'Wattage', width: 18, align: 'right', key: 'wattage' },
      { header: 'Total W', width: 18, align: 'right', key: 'totalW' },
      { header: 'Status', width: 22, align: 'center', key: 'status' },
    ];

    for (const schedule of data.schedules) {
      const rows = schedule.items.map((item, i) => ({
        num: String(i + 1),
        code: item.fittingCode,
        desc: item.description,
        qty: String(item.quantity),
        wattage: `${item.wattage}W`,
        totalW: `${item.totalWattage}W`,
        status: item.status,
      }));
      const title = `Schedule: ${schedule.shopNumber} - ${schedule.shopName} (${schedule.area}m²)`;
      pages.push(...buildTablePages(title, cols, rows));
    }
  }

  // 4. Specification Summary
  if (data.sections.specificationSheets && data.specifications.length > 0) {
    const cols: TableColumn[] = [
      { header: 'Manufacturer', width: 28, key: 'mfr' },
      { header: 'Model', width: 28, key: 'model' },
      { header: 'Wattage', width: 16, align: 'center', key: 'wattage' },
      { header: 'Lumens', width: 16, align: 'center', key: 'lumens' },
      { header: 'CCT', width: 16, align: 'center', key: 'cct' },
      { header: 'CRI', width: 12, align: 'center', key: 'cri' },
      { header: 'IP', width: 14, align: 'center', key: 'ip' },
      { header: 'Qty', width: 12, align: 'right', key: 'qty' },
    ];
    const rows = data.specifications.map(s => ({
      mfr: s.manufacturer,
      model: s.modelNumber,
      wattage: `${s.wattage}W`,
      lumens: s.lumens ? `${s.lumens} lm` : '-',
      cct: s.colorTemperature ? `${s.colorTemperature}K` : '-',
      cri: s.cri?.toString() || '-',
      ip: s.ipRating || '-',
      qty: String(s.quantityUsed),
    }));
    pages.push(...buildTablePages('Specification Summary', cols, rows));
  }

  // 5. Cost Summary
  if (data.sections.costSummary && data.schedules.length > 0) {
    let totalSupply = 0;
    let totalInstall = 0;
    const cols: TableColumn[] = [
      { header: 'Shop #', width: 20, key: 'shop' },
      { header: 'Tenant', width: 40, key: 'name' },
      { header: 'Supply Cost', width: 28, align: 'right', key: 'supply' },
      { header: 'Install Cost', width: 28, align: 'right', key: 'install' },
      { header: 'Total', width: 28, align: 'right', key: 'total' },
    ];
    const rows = data.schedules.map(s => {
      const supply = s.items.reduce((sum, i) => sum + i.supplyCost, 0);
      const install = s.items.reduce((sum, i) => sum + i.installCost, 0);
      totalSupply += supply;
      totalInstall += install;
      return {
        shop: s.shopNumber,
        name: s.shopName,
        supply: `R${supply.toLocaleString()}`,
        install: `R${install.toLocaleString()}`,
        total: `R${(supply + install).toLocaleString()}`,
      };
    });
    rows.push({
      shop: '', name: 'TOTAL',
      supply: `R${totalSupply.toLocaleString()}`,
      install: `R${totalInstall.toLocaleString()}`,
      total: `R${(totalSupply + totalInstall).toLocaleString()}`,
      _bold: true,
    } as any);
    pages.push(...buildTablePages('Cost Summary', cols, rows));
  }

  // 6. Energy Analysis
  if (data.sections.energyAnalysis && data.schedules.length > 0) {
    const operatingHours = 12;
    const electricityRate = 2.5;
    const cols: TableColumn[] = [
      { header: 'Shop #', width: 20, key: 'shop' },
      { header: 'Tenant', width: 35, key: 'name' },
      { header: 'Load', width: 20, align: 'right', key: 'load' },
      { header: 'Monthly kWh', width: 25, align: 'right', key: 'monthly' },
      { header: 'Annual kWh', width: 25, align: 'right', key: 'annual' },
      { header: 'Annual Cost', width: 25, align: 'right', key: 'cost' },
    ];
    const rows = data.schedules.map(s => {
      const totalW = s.items.reduce((sum, i) => sum + i.totalWattage, 0);
      const monthlyKwh = (totalW * operatingHours * 30) / 1000;
      const annualKwh = monthlyKwh * 12;
      return {
        shop: s.shopNumber,
        name: s.shopName,
        load: `${totalW}W`,
        monthly: `${monthlyKwh.toFixed(1)}`,
        annual: `${annualKwh.toFixed(0)}`,
        cost: `R${(annualKwh * electricityRate).toFixed(0)}`,
      };
    });
    const energyPages = buildTablePages('Energy Analysis', cols, rows);
    // Add footnote to last energy page
    const lastPage = energyPages[energyPages.length - 1];
    textEl(lastPage, MARGIN_LEFT, PAGE_H - MARGIN_BOTTOM - 4,
      `* Based on ${operatingHours} operating hours/day at R${electricityRate}/kWh`,
      { size: 2.5, fill: TEXT_MUTED });
    pages.push(...energyPages);
  }

  // TOC
  const tocEntries: TocEntry[] = [];
  let pn = 2;
  if (data.sections.executiveSummary) { tocEntries.push({ label: 'Executive Summary', pageNumber: pn++ }); }
  if (data.sections.scheduleByTenant) { tocEntries.push({ label: 'Lighting Schedule by Tenant', pageNumber: pn }); pn += data.schedules.length || 1; }
  if (data.sections.specificationSheets) { tocEntries.push({ label: 'Specification Summary', pageNumber: pn++ }); }
  if (data.sections.costSummary) { tocEntries.push({ label: 'Cost Summary', pageNumber: pn++ }); }
  if (data.sections.energyAnalysis) { tocEntries.push({ label: 'Energy Analysis', pageNumber: pn++ }); }

  if (tocEntries.length > 0) {
    const tocPage = buildTableOfContentsSvg(tocEntries);
    pages.splice(1, 0, tocPage);
  }

  applyRunningHeaders(pages, 'Lighting Report', data.projectName);
  applyPageFooters(pages, 'Lighting Report');

  return pages;
}
