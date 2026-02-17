/**
 * Generator Report SVG PDF Builder — Standby System Implementation Report
 * Matches the professional engineering report format:
 *   Cover → List of Terms → TOC → Introduction → Load Provision → DB & Circuit Verification
 *   → DB & Control → Tenant Tracking → Appendices Intro
 *   → Appendix A (Capital Cost) → Appendix B (Capital Recovery + Operational Recovery)
 *   → Appendix C (Load Allocation)
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  buildTableOfContentsSvg, applyRunningHeaders, applyPageFooters,
  addPageHeader, buildTablePages, wrapText,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, formatCurrencyValue, truncate,
  type StandardCoverPageData, type TableColumn, type TocEntry,
} from './sharedSvgHelpers';
import { GENERATOR_SIZING_TABLE } from '@/utils/generatorSizing';

// ─── Data Interfaces ───

export interface GeneratorReportData {
  coverData: StandardCoverPageData;
  projectName: string;
  projectDescription?: string;
  zones: GeneratorZoneData[];
  generators: GeneratorInfo[];
  tenants: TenantInfo[];
  settings: GeneratorSettings;
}

interface GeneratorZoneData {
  id: string;
  name: string;
  color?: string;
  zoneNumber: number;
}

interface GeneratorInfo {
  zoneId: string;
  generatorNumber: number;
  generatorSize: string;
  generatorCost: number;
}

export interface TenantInfo {
  shopNumber: string;
  shopName: string;
  area: number;
  ownGenerator: boolean;
  isRestaurant: boolean;
  zoneId: string;
  zoneName: string;
  zoneNumber: number;
  loadingKw: number;
}

export interface GeneratorSettings {
  standardKwPerSqm: number;
  fastFoodKwPerSqm: number;
  restaurantKwPerSqm: number;
  capitalRecoveryYears: number;
  capitalRecoveryRate: number;
  additionalCablingCost: number;
  controlWiringCost: number;
  numMainBoards: number;
  ratePerMainBoard: number;
  ratePerTenantDb: number;
  dieselCostPerLitre: number;
  runningHoursPerMonth: number;
  maintenanceCostAnnual: number;
  powerFactor: number;
  runningLoadPercentage: number;
  maintenanceContingencyPercent: number;
}

// ─── Helper: fuel consumption from sizing table ───

function getFuelConsumption(generatorSize: string, loadPercentage: number): number {
  const sizingData = GENERATOR_SIZING_TABLE.find(g => g.rating === generatorSize);
  if (!sizingData) return 0;
  if (loadPercentage <= 25) return sizingData.load25;
  if (loadPercentage <= 50) {
    const r = (loadPercentage - 25) / 25;
    return sizingData.load25 + r * (sizingData.load50 - sizingData.load25);
  }
  if (loadPercentage <= 75) {
    const r = (loadPercentage - 50) / 25;
    return sizingData.load50 + r * (sizingData.load75 - sizingData.load50);
  }
  const r = (loadPercentage - 75) / 25;
  return sizingData.load75 + r * (sizingData.load100 - sizingData.load75);
}

// ─── Narrative text page builder with section numbering ───

function buildNarrativePage(
  sectionNumber: string,
  sectionTitle: string,
  paragraphs: string[],
  subsections?: { number: string; title: string; paragraphs: string[]; bullets?: string[] }[]
): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const fontSize = 3.2;
  const lineSpacing = 4.5;
  const maxY = PAGE_H - MARGIN_BOTTOM - 12;
  const startY = MARGIN_TOP + 14;

  let currentPage = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
  addPageHeader(currentPage, 'Standby System Implementation');
  pages.push(currentPage);
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > maxY) {
      currentPage = createSvgElement();
      el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, currentPage);
      addPageHeader(currentPage, 'Standby System Implementation');
      pages.push(currentPage);
      y = startY;
    }
  };

  // Section heading
  ensureSpace(10);
  textEl(currentPage, MARGIN_LEFT, y, `${sectionNumber}. ${sectionTitle.toUpperCase()}`, {
    size: 4.5, fill: BRAND_PRIMARY, weight: 'bold',
  });
  y += 7;

  // Main paragraphs
  for (const para of paragraphs) {
    const lines = wrapText(para, CONTENT_W, fontSize);
    for (const line of lines) {
      ensureSpace(lineSpacing);
      textEl(currentPage, MARGIN_LEFT, y, line, { size: fontSize });
      y += lineSpacing;
    }
    y += 2;
  }

  // Subsections
  if (subsections) {
    for (const sub of subsections) {
      ensureSpace(10);
      textEl(currentPage, MARGIN_LEFT, y, `${sub.number}. ${sub.title}`, {
        size: 3.8, fill: BRAND_PRIMARY, weight: 'bold',
      });
      y += 6;

      for (const para of sub.paragraphs) {
        const lines = wrapText(para, CONTENT_W, fontSize);
        for (const line of lines) {
          ensureSpace(lineSpacing);
          textEl(currentPage, MARGIN_LEFT, y, line, { size: fontSize });
          y += lineSpacing;
        }
        y += 2;
      }

      if (sub.bullets) {
        for (const bullet of sub.bullets) {
          const lines = wrapText(bullet, CONTENT_W - 6, fontSize);
          for (let i = 0; i < lines.length; i++) {
            ensureSpace(lineSpacing);
            if (i === 0) {
              textEl(currentPage, MARGIN_LEFT + 3, y, '•', { size: fontSize });
            }
            textEl(currentPage, MARGIN_LEFT + 6, y, lines[i], { size: fontSize });
            y += lineSpacing;
          }
        }
        y += 2;
      }
    }
  }

  return pages;
}

// ─── Build List of Terms page ───

function buildListOfTermsPage(): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Standby System Implementation');

  let y = MARGIN_TOP + 14;
  textEl(svg, MARGIN_LEFT, y, 'LIST OF TERMS', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
  y += 8;
  textEl(svg, MARGIN_LEFT, y, 'The following terms and abbreviations are listed in the order as they appear in the text:', { size: 3.2, fill: TEXT_MUTED });
  y += 10;

  const terms = [
    ['VA/m²', 'Volt-amperes per square metre.'],
    ['kVA', 'Kilovolt-amperes.'],
    ['kW', 'Kilowatts.'],
    ['kWh', 'Kilowatt-hours.'],
    ['BO', 'Beneficial occupation.'],
    ['%', 'Percentage.'],
    ['R', 'South African Rand.'],
  ];

  for (const [term, def] of terms) {
    el('rect', { x: MARGIN_LEFT, y: y - 3, width: CONTENT_W, height: 6, fill: BRAND_LIGHT, rx: 0.5 }, svg);
    textEl(svg, MARGIN_LEFT + 3, y, term, { size: 3, weight: 'bold' });
    textEl(svg, MARGIN_LEFT + 30, y, def, { size: 3, fill: TEXT_MUTED });
    y += 7;
  }

  return svg;
}

// ─── Build Capital Cost Breakdown (Appendix A) ───

function buildAppendixA(data: GeneratorReportData): SVGSVGElement[] {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Appendix A: Forecast Cash Outlay');

  let y = MARGIN_TOP + 16;
  const s = data.settings;

  // Capital cost table
  const items: { num: number; desc: string; detail: string; cost: number }[] = [];
  let itemNum = 1;

  // Total capital header
  const totalGenCost = data.generators.reduce((sum, g) => sum + g.generatorCost, 0);

  // Individual generators
  for (const gen of data.generators) {
    const zone = data.zones.find(z => z.id === gen.zoneId);
    items.push({
      num: ++itemNum,
      desc: `Generator ${gen.generatorNumber} (${zone?.name || 'Zone'})`,
      detail: gen.generatorSize,
      cost: gen.generatorCost,
    });
  }

  // Additional costs
  if (s.additionalCablingCost > 0) items.push({ num: ++itemNum, desc: 'Cabling', detail: '', cost: s.additionalCablingCost });
  
  const numTenantDBs = data.tenants.filter(t => !t.ownGenerator).length;
  const boardModCost = numTenantDBs * s.ratePerTenantDb + s.numMainBoards * s.ratePerMainBoard;
  if (boardModCost > 0) items.push({ num: ++itemNum, desc: 'Board Modifications', detail: `${numTenantDBs} tenant DBs + ${s.numMainBoards} main boards`, cost: boardModCost });
  if (s.controlWiringCost > 0) items.push({ num: ++itemNum, desc: 'Control Wiring', detail: '', cost: s.controlWiringCost });

  const totalCapitalCost = totalGenCost + s.additionalCablingCost + boardModCost + s.controlWiringCost;

  // Draw table
  // Header row
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 6, fill: BRAND_PRIMARY }, svg);
  textEl(svg, MARGIN_LEFT + 3, y, '#', { size: 2.8, fill: WHITE, weight: 'bold' });
  textEl(svg, MARGIN_LEFT + 12, y, 'Description', { size: 2.8, fill: WHITE, weight: 'bold' });
  textEl(svg, MARGIN_LEFT + 90, y, 'Detail', { size: 2.8, fill: WHITE, weight: 'bold' });
  textEl(svg, PAGE_W - MARGIN_RIGHT - 3, y, 'Amount', { size: 2.8, fill: WHITE, weight: 'bold', anchor: 'end' });
  y += 6;

  // Total row first
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 6, fill: BRAND_LIGHT }, svg);
  textEl(svg, MARGIN_LEFT + 3, y, '1', { size: 2.8, weight: 'bold' });
  textEl(svg, MARGIN_LEFT + 12, y, 'TOTAL CAPITAL COST', { size: 2.8, weight: 'bold' });
  textEl(svg, PAGE_W - MARGIN_RIGHT - 3, y, formatCurrencyValue(totalCapitalCost), { size: 2.8, weight: 'bold', anchor: 'end' });
  y += 6;

  for (const item of items) {
    const bg = items.indexOf(item) % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 6, fill: bg }, svg);
    textEl(svg, MARGIN_LEFT + 3, y, String(item.num), { size: 2.8 });
    textEl(svg, MARGIN_LEFT + 12, y, item.desc, { size: 2.8 });
    if (item.detail) textEl(svg, MARGIN_LEFT + 90, y, item.detail, { size: 2.8, fill: TEXT_MUTED });
    textEl(svg, PAGE_W - MARGIN_RIGHT - 3, y, formatCurrencyValue(item.cost), { size: 2.8, anchor: 'end' });
    el('line', { x1: MARGIN_LEFT, y1: y + 2.5, x2: PAGE_W - MARGIN_RIGHT, y2: y + 2.5, stroke: BORDER_COLOR, 'stroke-width': 0.15 }, svg);
    y += 6;
  }

  // Additional parameters
  y += 8;
  textEl(svg, MARGIN_LEFT, y, 'Key Parameters:', { size: 3.5, fill: BRAND_PRIMARY, weight: 'bold' });
  y += 6;

  const params = [
    ['Diesel cost per litre', `R${s.dieselCostPerLitre.toFixed(2)}`],
    ['Estimated running hours per month', `${s.runningHoursPerMonth}`],
    ['Monthly capital repayment', formatCurrencyValue(calculateMonthlyRepayment(totalCapitalCost, s.capitalRecoveryRate, s.capitalRecoveryYears))],
  ];
  for (const [label, val] of params) {
    textEl(svg, MARGIN_LEFT + 3, y, label, { size: 3 });
    textEl(svg, PAGE_W - MARGIN_RIGHT - 3, y, val, { size: 3, weight: 'bold', anchor: 'end' });
    y += 5;
  }

  return [svg];
}

// ─── PMT calculation ───

function calculateMonthlyRepayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = (annualRate / 100) / 12;
  if (r === 0) return principal / (years * 12);
  const n = years * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Appendix B: Capital Recovery + Operational Recovery ───

function buildAppendixB(data: GeneratorReportData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const s = data.settings;

  // Calculate total capital
  const totalGenCost = data.generators.reduce((sum, g) => sum + g.generatorCost, 0);
  const numTenantDBs = data.tenants.filter(t => !t.ownGenerator).length;
  const boardModCost = numTenantDBs * s.ratePerTenantDb + s.numMainBoards * s.ratePerMainBoard;
  const totalCapitalCost = totalGenCost + s.additionalCablingCost + boardModCost + s.controlWiringCost;
  const annualRate = s.capitalRecoveryRate / 100;
  const years = s.capitalRecoveryYears;
  const annualRepayment = calculateMonthlyRepayment(totalCapitalCost, s.capitalRecoveryRate, years) * 12;
  const monthlyRepayment = annualRepayment / 12;

  // Page 1: Amortization table
  const page1 = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page1);
  addPageHeader(page1, 'Appendix B: Forecast Capital Recovery');
  let y = MARGIN_TOP + 14;

  // Summary info
  const summaryItems = [
    ['Capital Cost:', formatCurrencyValue(totalCapitalCost)],
    ['Period (years):', String(years)],
    ['Rate:', `${s.capitalRecoveryRate.toFixed(2)}%`],
    ['Annual Repayment:', formatCurrencyValue(annualRepayment)],
    ['Monthly Repayment:', formatCurrencyValue(monthlyRepayment)],
  ];
  for (const [label, val] of summaryItems) {
    textEl(page1, MARGIN_LEFT + 3, y, label, { size: 3, fill: TEXT_MUTED });
    textEl(page1, MARGIN_LEFT + 60, y, val, { size: 3, weight: 'bold' });
    y += 5;
  }
  y += 4;

  // Amortization table header
  const amortCols = ['Year', 'Beginning', 'Repayment', 'Interest', 'Principal', 'Ending Balance'];
  const colWidths = [15, 30, 28, 28, 28, 30];
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 6, fill: BRAND_PRIMARY }, page1);
  let xOff = MARGIN_LEFT + 1;
  for (let i = 0; i < amortCols.length; i++) {
    const anchor = i === 0 ? 'start' : 'end';
    const tx = i === 0 ? xOff : xOff + colWidths[i] - 1;
    textEl(page1, tx, y, amortCols[i], { size: 2.5, fill: WHITE, weight: 'bold', anchor });
    xOff += colWidths[i];
  }
  y += 6;

  // Amortization rows
  let balance = totalCapitalCost;
  for (let yr = 1; yr <= years; yr++) {
    const interest = balance * annualRate;
    const principal = annualRepayment - interest;
    const endingBalance = Math.max(balance - principal, 0);

    const bg = yr % 2 === 0 ? BRAND_LIGHT : WHITE;
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: bg }, page1);

    xOff = MARGIN_LEFT + 1;
    const vals = [String(yr), formatCurrencyValue(balance), formatCurrencyValue(annualRepayment), formatCurrencyValue(interest), formatCurrencyValue(principal), formatCurrencyValue(endingBalance)];
    for (let i = 0; i < vals.length; i++) {
      const anchor = i === 0 ? 'start' : 'end';
      const tx = i === 0 ? xOff : xOff + colWidths[i] - 1;
      textEl(page1, tx, y, vals[i], { size: 2.5, anchor });
      xOff += colWidths[i];
    }
    el('line', { x1: MARGIN_LEFT, y1: y + 2, x2: PAGE_W - MARGIN_RIGHT, y2: y + 2, stroke: BORDER_COLOR, 'stroke-width': 0.15 }, page1);
    y += 5.5;
    balance = endingBalance;
  }

  pages.push(page1);

  // Page 2: Operational cost recovery (diesel + maintenance + tariff)
  const page2 = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page2);
  addPageHeader(page2, 'Appendix B: Operational Cost Recovery');
  y = MARGIN_TOP + 14;

  // Find largest generator for fuel calc
  const largestGenSize = data.generators.reduce((largest, g) => {
    const sizeNum = parseInt(g.generatorSize) || 0;
    return sizeNum > (parseInt(largest) || 0) ? g.generatorSize : largest;
  }, data.generators[0]?.generatorSize || '250 kVA');
  const largestGenKva = parseInt(largestGenSize) || 250;
  const runningLoad = s.runningLoadPercentage;
  const netKva = largestGenKva * (runningLoad / 100);
  const netKwh = netKva * s.powerFactor;
  const fuelConsumption = getFuelConsumption(largestGenSize, runningLoad);
  const dieselCostPerHour = fuelConsumption * s.dieselCostPerLitre;
  const dieselCostPerKwh = netKwh > 0 ? dieselCostPerHour / netKwh : 0;

  // Maintenance calc
  const maintenanceCostPerMonth = s.maintenanceCostAnnual / 12;
  const serviceCostPer250h = s.maintenanceCostAnnual;
  const costServicePerMonth = (s.runningHoursPerMonth / 250) * serviceCostPer250h;
  const additionalServiceCost = costServicePerMonth - maintenanceCostPerMonth;
  const maintenanceCostPerKwh = netKwh > 0 && s.runningHoursPerMonth > 0 ? additionalServiceCost / (netKwh * s.runningHoursPerMonth) : 0;

  const totalTariffBase = dieselCostPerKwh + maintenanceCostPerKwh;
  const contingency = totalTariffBase * (s.maintenanceContingencyPercent / 100);
  const finalTariff = totalTariffBase + contingency;

  // Draw operational recovery sections
  const drawSection = (title: string, items: [string, string][], startY: number): number => {
    textEl(page2, MARGIN_LEFT, startY, title, { size: 3.5, fill: BRAND_PRIMARY, weight: 'bold' });
    let sy = startY + 6;
    for (const [label, val] of items) {
      textEl(page2, MARGIN_LEFT + 5, sy, label, { size: 2.8 });
      textEl(page2, PAGE_W - MARGIN_RIGHT - 5, sy, val, { size: 2.8, weight: 'bold', anchor: 'end' });
      el('line', { x1: MARGIN_LEFT + 5, y1: sy + 2, x2: PAGE_W - MARGIN_RIGHT - 5, y2: sy + 2, stroke: BORDER_COLOR, 'stroke-width': 0.1 }, page2);
      sy += 5;
    }
    return sy + 3;
  };

  y = drawSection('DIESEL CONSUMPTION COST', [
    ['Largest generator size (kVA)', String(largestGenKva)],
    ['Running load expected', `${runningLoad}%`],
    ['Net energy generated (usable kVA)', netKva.toFixed(0)],
    ['Conversion of kVA to kWh (power factor)', String(s.powerFactor)],
    ['Net total energy generated (usable kWh)', netKwh.toFixed(0)],
    ['Fuel consumption at running load (l/h)', fuelConsumption.toFixed(2)],
    ['Cost of diesel per litre', `R${s.dieselCostPerLitre.toFixed(2)}`],
    ['Total cost of diesel per hour', formatCurrencyValue(dieselCostPerHour)],
    ['Monthly diesel cost (per kWh)', `R${dieselCostPerKwh.toFixed(2)}`],
  ], y);

  y = drawSection('MAINTENANCE COST', [
    ['Cost of servicing units per year', formatCurrencyValue(s.maintenanceCostAnnual)],
    ['Cost of servicing per month', formatCurrencyValue(maintenanceCostPerMonth)],
    ['Cost of servicing per 250 hours', formatCurrencyValue(serviceCostPer250h)],
    ['Expected hours per month', String(s.runningHoursPerMonth)],
    ['Additional servicing cost per month', formatCurrencyValue(additionalServiceCost)],
    ['Total servicing cost (per kWh)', `R${maintenanceCostPerKwh.toFixed(2)}`],
  ], y);

  y = drawSection('SUMMARY: TOTAL COST PER kWh', [
    ['Total fuel cost (per kWh)', `R${dieselCostPerKwh.toFixed(2)}`],
    ['Total maintenance cost (per kWh)', `R${maintenanceCostPerKwh.toFixed(2)}`],
    ['Total tariff for use (per kWh)', `R${totalTariffBase.toFixed(2)}`],
    [`Maintenance contingency (${s.maintenanceContingencyPercent}%)`, `R${contingency.toFixed(2)}`],
    ['FINAL TOTAL TARIFF FOR USE (per kWh)', `R${finalTariff.toFixed(2)}`],
  ], y);

  pages.push(page2);
  return pages;
}

// ─── Appendix C: Load Allocation (Full Tenant Table) ───

function buildAppendixC(data: GeneratorReportData): SVGSVGElement[] {
  const s = data.settings;

  // Calculate totals
  const totalGenCost = data.generators.reduce((sum, g) => sum + g.generatorCost, 0);
  const numTenantDBs = data.tenants.filter(t => !t.ownGenerator).length;
  const boardModCost = numTenantDBs * s.ratePerTenantDb + s.numMainBoards * s.ratePerMainBoard;
  const totalCapitalCost = totalGenCost + s.additionalCablingCost + boardModCost + s.controlWiringCost;
  const monthlyRepayment = calculateMonthlyRepayment(totalCapitalCost, s.capitalRecoveryRate, s.capitalRecoveryYears);

  const activeTenants = data.tenants.filter(t => !t.ownGenerator && t.loadingKw > 0);
  const totalActiveLoad = activeTenants.reduce((sum, t) => sum + t.loadingKw, 0);

  // Build rows
  const cols: TableColumn[] = [
    { header: 'Shop No.', width: 16, key: 'shopNo' },
    { header: 'Tenant', width: 32, key: 'tenant' },
    { header: 'Size (m²)', width: 16, align: 'right', key: 'size' },
    { header: 'Own Gen.', width: 14, align: 'center', key: 'ownGen' },
    { header: 'Loading (kW)', width: 20, align: 'right', key: 'loading' },
    { header: 'Portion %', width: 16, align: 'right', key: 'portion' },
    { header: 'Monthly (R)', width: 24, align: 'right', key: 'monthly' },
    { header: 'R/m²', width: 14, align: 'right', key: 'ratePerSqm' },
  ];

  const rows = data.tenants.map(t => {
    const portion = totalActiveLoad > 0 && !t.ownGenerator ? (t.loadingKw / totalActiveLoad) * 100 : 0;
    const monthlyRental = totalActiveLoad > 0 && !t.ownGenerator ? (t.loadingKw / totalActiveLoad) * monthlyRepayment : 0;
    const ratePerSqm = t.area > 0 && !t.ownGenerator ? monthlyRental / t.area : 0;

    return {
      shopNo: t.shopNumber,
      tenant: truncate(t.shopName, 22),
      size: String(t.area),
      ownGen: t.ownGenerator ? 'YES' : 'NO',
      loading: t.ownGenerator ? '-' : t.loadingKw.toFixed(2),
      portion: t.ownGenerator ? '0.00%' : `${portion.toFixed(2)}%`,
      monthly: t.ownGenerator ? formatCurrencyValue(0) : formatCurrencyValue(monthlyRental),
      ratePerSqm: t.ownGenerator ? 'R 0.00' : `R ${ratePerSqm.toFixed(2)}`,
    };
  });

  // Totals row
  const totalMonthly = activeTenants.reduce((sum, t) => {
    const portion = totalActiveLoad > 0 ? t.loadingKw / totalActiveLoad : 0;
    return sum + portion * monthlyRepayment;
  }, 0);

  rows.push({
    shopNo: '',
    tenant: 'OVERALL TOTALS',
    size: String(data.tenants.reduce((s, t) => s + t.area, 0)),
    ownGen: '',
    loading: totalActiveLoad.toFixed(2),
    portion: `${((totalActiveLoad / (totalActiveLoad || 1)) * 100).toFixed(2)}%`,
    monthly: formatCurrencyValue(totalMonthly),
    ratePerSqm: '',
    _bold: true,
    _bgColor: BRAND_LIGHT,
  } as any);

  return buildTablePages('Appendix C: Load Allocation', cols, rows, { rowHeight: 5, fontSize: 2.5, headerFontSize: 2.5 });
}

// ─── Main Builder ───

export function buildGeneratorReportPdf(data: GeneratorReportData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const s = data.settings;

  // 1. Cover
  pages.push(buildStandardCoverPageSvg(data.coverData));

  // 2. List of Terms
  pages.push(buildListOfTermsPage());

  // 3. Section 1: Introduction and Background
  const sec1 = buildNarrativePage('1', 'INTRODUCTION AND BACKGROUND', [
    `${data.projectName} will need to be supplied with standby plants, sized to cater for essential services (that include essential small power and lighting) and for any extra allowances in the event of a mains power failure so that the tenants can continue operating their vital business functions. Tenants who will be supplying their own standby plants based on their individual specifications will be excluded from this system.`,
  ], [
    {
      number: '1.1',
      title: 'Approval',
      paragraphs: ['Enclosed with, and forming part of this report is the Form of Report Document Approval. Acceptance is confirmed by signature of approval thereto.'],
    },
  ]);
  pages.push(...sec1);

  // 4. Section 2: Load Provision
  const shopRate = (s.standardKwPerSqm * 1000).toFixed(0);
  const restRate = (s.restaurantKwPerSqm * 1000).toFixed(0);
  const sec2 = buildNarrativePage('2', 'LOAD PROVISION', [
    `The emergency supply made available to each tenant will be limited. These supplies will be predominantly single phase, however the option for three phase power will be available upon request. A standard single-phase load of ${shopRate}VA/m² per shop tenant and of ${restRate}VA/m² per restaurant tenant will be supplied which has been determined to be sufficient for the supply of till points as well as for general trade lighting. No provision has been made to cater for air-conditioning; however, fresh air will be allowed for. Additionally, the supply allocated to each tenant will be reviewed and customised, if necessary, to account for any specific exceptions that may be required.`,
  ]);
  pages.push(...sec2);

  // 5. Section 3: Distribution Boards and Circuit Verification
  const sec3 = buildNarrativePage('3', 'DISTRIBUTION BOARDS AND CIRCUIT VERIFICATION', [
    'Each tenant would be required to issue an electrical circuit layout that clearly reflects what supplies would be required to remain active in the event of a mains power failure. These layouts need to be circulated for approval prior to the fit-out of the shop for clear record keeping and tracking purposes. The electrical installation and circuit details for each individual tenant unit will need to be verified, upon beneficial occupation (BO), between the electrical contractor, the tenants themselves and the tenant coordinator when all are present.',
  ], [
    {
      number: '3.1',
      title: 'Tenants whose distribution boards will be supplied by the landlord',
      paragraphs: ['For tenants whose distribution boards are supplied by the landlord, the relevant circuit breakers will be tested and then set to remain switched on or off after the relevant witnessing of test requirements with all the parties present.'],
    },
    {
      number: '3.2',
      title: 'Tenants who opt to supply their own distribution boards',
      paragraphs: [
        'Tenants opting to supply their own distribution boards will be supplied with a connection panel in their shop that houses the required control wiring. Supply cabling from this connection panel to the tenant\'s board will also be provided.',
        'Line diagram layouts will need to clearly reflect the following to be approved:',
      ],
      bullets: [
        'Main supply isolator size for the non-essential section: relevant circuits are to be connected to this section based on the layouts.',
        'Main supply isolator size for the essential section: relevant circuits are to be connected to this section based on the layouts.',
      ],
    },
  ]);
  pages.push(...sec3);

  // 6. Section 4: Distribution Boards and Control
  const sec4 = buildNarrativePage('4', 'DISTRIBUTION BOARDS AND CONTROL', [
    'Each distribution board will have control wiring which will disconnect non-essential loads in the event of a power failure. In the event of any tampering with this control wiring the following will result:',
  ], [
    {
      number: '',
      title: '',
      paragraphs: [],
      bullets: [
        'Control and verification switching will be turned off preventing any emergency power from being received in the event of a power failure.',
        'Tenants will be billed based on the approved increased tariff for kilowatt-hours (kWh) consumed from the standby plant.',
      ],
    },
  ]);
  pages.push(...sec4);

  // 7. Section 5: Tenant Tracking Schedule
  const sec5 = buildNarrativePage('5', 'TENANT TRACKING SCHEDULE', [
    'Tenants who elect to be connected to the system will be placed on a tracking schedule. This tracking schedule will allow the landlord to do the necessary switching and verifications of each tenant.',
    'Photographic record will be kept in terms of switching control per tenant which will be managed by the tenant coordinator for record keeping purposes.',
  ], [
    {
      number: '5.1',
      title: 'Billing',
      paragraphs: ['The required annexures and agreements will be circulated by the landlord\'s leasing team detailing rates and tariffs.'],
    },
  ]);
  pages.push(...sec5);

  // 8. Section 6: Appendices intro
  const numGenerators = data.generators.length;
  const generatorSizes = [...new Set(data.generators.map(g => g.generatorSize))].join(', ');
  const totalGenCost = data.generators.reduce((sum, g) => sum + g.generatorCost, 0);
  const numTenantDBs = data.tenants.filter(t => !t.ownGenerator).length;
  const boardModCost = numTenantDBs * s.ratePerTenantDb + s.numMainBoards * s.ratePerMainBoard;
  const totalCapitalCost = totalGenCost + s.additionalCablingCost + boardModCost + s.controlWiringCost;
  const monthlyRepm = calculateMonthlyRepayment(totalCapitalCost, s.capitalRecoveryRate, s.capitalRecoveryYears);
  const numZones = data.zones.length;

  const sec6 = buildNarrativePage('6', 'APPENDICES', [
    'The following describe the system hereby proposed in terms of the above requirements concerning the standby generator banks and their sizes:',
  ], [
    {
      number: '6.1',
      title: 'Appendix A: Forecast cash outlay',
      paragraphs: [`An amount of ${formatCurrencyValue(totalCapitalCost)} has been forecast as the total capital cost for the implementation of ${numGenerators} generator(s) of size ${generatorSizes} each, that are to be organised as ${numZones} generator bank(s).`],
    },
    {
      number: '6.2',
      title: 'Appendix B: Forecast capital recovery',
      paragraphs: [`A capital recovery forecast showing illustrative figures over a ${s.capitalRecoveryYears}-year period provides a general view of the monthly repayments envisaged. As shown, it is estimated that a monthly amount of ${formatCurrencyValue(monthlyRepm)} would need to be paid back at an interest rate of ${s.capitalRecoveryRate.toFixed(2)}% over the ${s.capitalRecoveryYears} years so that the initial capital outlay stated in Appendix A would be fully redeemed.`],
    },
    {
      number: '6.3',
      title: 'Appendix C: Load allocation',
      paragraphs: [`As indicated therein there are ${numZones} generator bank(s) proposed for the scheme. A pro-rata breakdown of the total monthly payback amount of ${formatCurrencyValue(monthlyRepm)} has been determined for each tenant, in terms of their respective floor area sizes and whether they are shops or restaurants.`],
    },
  ]);
  pages.push(...sec6);

  // 9. Appendix A: Capital Cost Breakdown
  pages.push(...buildAppendixA(data));

  // 10. Appendix B: Capital Recovery + Operational Recovery
  pages.push(...buildAppendixB(data));

  // 11. Appendix C: Load Allocation
  pages.push(...buildAppendixC(data));

  // Insert TOC at position 1 (after cover)
  const tocEntries: TocEntry[] = [];
  let pageOffset = 3; // Cover=1, Terms=2, TOC=3
  tocEntries.push({ label: 'List of Terms', pageNumber: 2 });
  tocEntries.push({ label: '1. Introduction and Background', pageNumber: pageOffset });
  pageOffset += sec1.length;
  tocEntries.push({ label: '2. Load Provision', pageNumber: pageOffset });
  pageOffset += sec2.length;
  tocEntries.push({ label: '3. Distribution Boards and Circuit Verification', pageNumber: pageOffset });
  pageOffset += sec3.length;
  tocEntries.push({ label: '4. Distribution Boards and Control', pageNumber: pageOffset });
  pageOffset += sec4.length;
  tocEntries.push({ label: '5. Tenant Tracking Schedule', pageNumber: pageOffset });
  pageOffset += sec5.length;
  tocEntries.push({ label: '6. Appendices', pageNumber: pageOffset });
  pageOffset += sec6.length;
  tocEntries.push({ label: 'Appendix A: Forecast Cash Outlay', pageNumber: pageOffset, indent: true });
  pageOffset += 1; // appendixA is 1 page
  tocEntries.push({ label: 'Appendix B: Forecast Capital Recovery', pageNumber: pageOffset, indent: true });
  pageOffset += 2; // appendixB is 2 pages
  tocEntries.push({ label: 'Appendix C: Load Allocation', pageNumber: pageOffset, indent: true });

  const tocPage = buildTableOfContentsSvg(tocEntries);
  pages.splice(2, 0, tocPage); // Insert after cover and terms

  // Apply headers & footers
  applyRunningHeaders(pages, 'Standby System Implementation', data.projectName);
  applyPageFooters(pages, 'Standby System Implementation');

  return pages;
}
