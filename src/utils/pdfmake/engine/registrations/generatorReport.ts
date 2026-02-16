/**
 * Generator Report Registration
 * 
 * Defines how Generator Financial Evaluation reports are generated.
 */

import type { Content, Margins } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, tableLayouts, FONT_SIZES } from '../../styles';
import { buildPanel, buildMetricCard, dataTable, spacer, pageBreak, horizontalLine, formatCurrency, buildInfoBox } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface GeneratorZone {
  id: string;
  name: string;
  color: string;
  generators: {
    size: string;
    cost: number;
  }[];
  cost: number;
}

export interface GeneratorReportData {
  projectName: string;
  reportDate: string;
  
  // Executive Summary Data
  summary: {
    totalCapitalCost: number;
    monthlyRepayment: number;
    avgTariff: number;
    numTenantDBs: number;
    tenantDBsCost: number;
    numMainBoards: number;
    mainBoardsCost: number;
    additionalCablingCost: number;
    controlWiringCost: number;
  };
  
  zones: GeneratorZone[];
  
  // Amortization Data
  amortization: {
    periodYears: number;
    ratePercent: number;
    annualRepayment: number;
    schedule: {
      year: number;
      beginning: number;
      payment: number;
      interest: number;
      principal: number;
      ending: number;
    }[];
  };
  
  // Running Recovery Data
  runningRecovery: {
    generators: {
      zoneName: string;
      generatorSize: string;
      isSync: boolean;
      runningLoad: number;
      netEnergy: number;
      fuelRate: number;
      dieselPrice: number;
      servicingYear: number;
      totalEnergy: number;
      monthlyDiesel: number;
      monthlyServicing: number;
      tariff: number;
    }[];
  };
  
  // Tenant Schedule Data
  tenants: {
    shopNo: string;
    name: string;
    size: number;
    isOwnGen: boolean;
    zoneName: string;
    zoneLoad: number;
    portion: number;
    monthlyRental: number;
    ratePerSqm: number;
    tags?: ('own_gen' | 'fast_food' | 'restaurant')[];
  }[];
  
  totals: {
    area: number;
    loading: number;
    monthlyRental: number;
  };
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

/**
 * Page 2: Executive Summary
 */
function buildExecutiveSummary(data: GeneratorReportData, config: ReportConfig): Content[] {
  const { summary, zones } = data;
  
  // Build Equipment Costing Table
  const tableBody: any[][] = [
    [
      { text: 'Item', style: 'tableHeader' }, 
      { text: 'Description', style: 'tableHeader' }, 
      { text: 'Quantity', style: 'tableHeader', alignment: 'center' }, 
      { text: 'Cost (excl. VAT)', style: 'tableHeader', alignment: 'right' }
    ]
  ];
  
  // Zone rows
  zones.forEach((zone, index) => {
    const numGens = zone.generators.length;
    const desc = numGens > 1 ? `${zone.name} (${numGens} Generators)` : zone.name;
    
    tableBody.push([
      { text: (index + 1).toString(), style: 'tableCell' },
      { text: desc, style: 'tableCell', color: zone.color, bold: true },
      { text: numGens.toString(), style: 'tableCell', alignment: 'center' },
      { text: formatCurrency(zone.cost), style: 'tableCell', alignment: 'right' }
    ]);
  });
  
  // Additional items
  let itemIdx = zones.length + 1;
  if (summary.numTenantDBs > 0) {
    tableBody.push([itemIdx++, 'Number of Tenant DBs', summary.numTenantDBs, formatCurrency(summary.tenantDBsCost)]);
  }
  if (summary.numMainBoards > 0) {
    tableBody.push([itemIdx++, 'Number of Main Boards', summary.numMainBoards, formatCurrency(summary.mainBoardsCost)]);
  }
  if (summary.additionalCablingCost > 0) {
    tableBody.push([itemIdx++, 'Additional Cabling', '1', formatCurrency(summary.additionalCablingCost)]);
  }
  if (summary.controlWiringCost > 0) {
    tableBody.push([itemIdx++, 'Control Wiring', '1', formatCurrency(summary.controlWiringCost)]);
  }
  
  // Total row
  tableBody.push([
    { text: '', border: [false, false, false, false] },
    { text: 'TOTAL CAPITAL COST', bold: true, fillColor: PDF_COLORS.backgroundAlt },
    { text: '', fillColor: PDF_COLORS.backgroundAlt },
    { text: formatCurrency(summary.totalCapitalCost), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt }
  ]);

  return [
    { text: `${data.projectName.toUpperCase()} - STANDBY SYSTEM`, style: 'headerLabel' },
    { text: 'EXECUTIVE SUMMARY:', style: 'h2', margin: [0, 10, 0, 10] },
    { text: 'GENERATOR VARIABLES:', style: 'h3', margin: [0, 0, 0, 10] },
    
    // Equipment Costing Table
    {
      table: {
        headerRows: 1,
        widths: [30, '*', 50, 100],
        body: tableBody
      },
      layout: tableLayouts.professional,
      margin: [0, 0, 0, 20]
    },
    
    // Key Metrics Cards
    {
      columns: [
        buildMetricCard(formatCurrency(summary.totalCapitalCost), 'Total Capital Investment', { width: '33%' }),
        buildMetricCard(formatCurrency(summary.monthlyRepayment), 'Monthly Repayment', { width: '33%' }),
        buildMetricCard(`R ${summary.avgTariff.toFixed(4)}`, 'Avg Recovery Tariff / kWh', { width: '33%' })
      ],
      columnGap: 10
    }
  ];
}

/**
 * Page 3: Sizing and Allowances (Tenant Schedule)
 */
function buildTenantSchedule(data: GeneratorReportData): Content[] {
  const headers = [
    { text: 'Shop No.', style: 'tableHeader' },
    { text: 'Tenant', style: 'tableHeader' },
    { text: 'Size (m²)', style: 'tableHeader', alignment: 'right' },
    { text: 'Own Gen', style: 'tableHeader', alignment: 'center' },
    { text: 'Zone', style: 'tableHeader' },
    { text: 'Load (kW)', style: 'tableHeader', alignment: 'right' },
    { text: 'Portion (%)', style: 'tableHeader', alignment: 'right' },
    { text: 'Monthly Rental', style: 'tableHeader', alignment: 'right' },
    { text: 'Rate / m²', style: 'tableHeader', alignment: 'right' }
  ];

  const body = data.tenants.map(t => {
    let fillColor = undefined;
    let color = undefined;
    
    if (t.tags?.includes('own_gen')) {
      fillColor = '#fee2e2'; // Light red
      color = '#991b1b'; // Dark red
    } else if (t.tags?.includes('fast_food') || t.tags?.includes('restaurant')) {
      fillColor = '#dcfce7'; // Light green
      color = '#166534'; // Dark green
    }

    return [
      { text: t.shopNo, style: 'tableCell', fillColor, color },
      { text: t.name, style: 'tableCell', fillColor, color },
      { text: t.size.toLocaleString(), style: 'tableCell', alignment: 'right', fillColor, color },
      { text: t.isOwnGen ? 'YES' : 'NO', style: 'tableCell', alignment: 'center', fillColor, color },
      { text: t.zoneName, style: 'tableCell', fillColor, color },
      { text: t.zoneLoad.toFixed(2), style: 'tableCell', alignment: 'right', fillColor, color },
      { text: `${t.portion.toFixed(2)}%`, style: 'tableCell', alignment: 'right', fillColor, color },
      { text: formatCurrency(t.monthlyRental), style: 'tableCell', alignment: 'right', fillColor, color },
      { text: formatCurrency(t.ratePerSqm), style: 'tableCell', alignment: 'right', fillColor, color }
    ];
  });

  // Totals row
  body.push([
    { text: '', border: [false, false, false, false] },
    { text: 'OVERALL TOTALS', bold: true, fillColor: PDF_COLORS.backgroundAlt },
    { text: data.totals.area.toLocaleString(), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt },
    { text: '', fillColor: PDF_COLORS.backgroundAlt },
    { text: '', fillColor: PDF_COLORS.backgroundAlt },
    { text: data.totals.loading.toFixed(2), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt },
    { text: '100.00%', bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt },
    { text: formatCurrency(data.totals.monthlyRental), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt },
    { text: '', fillColor: PDF_COLORS.backgroundAlt }
  ]);

  return [
    pageBreak(),
    { text: `${data.projectName.toUpperCase()} - STANDBY SYSTEM`, style: 'headerLabel' },
    { text: 'SIZING AND ALLOWANCES:', style: 'h2', margin: [0, 10, 0, 10] },
    {
      table: {
        headerRows: 1,
        widths: [35, '*', 35, 30, 40, 35, 35, 55, 40],
        body: [headers, ...body]
      },
      layout: tableLayouts.zebra
    }
  ];
}

/**
 * Page 4: Capital Recovery
 */
function buildCapitalRecovery(data: GeneratorReportData): Content[] {
  const { amortization } = data;
  
  const scheduleRows = amortization.schedule.map(row => [
    row.year,
    formatCurrency(row.beginning),
    formatCurrency(row.payment),
    formatCurrency(row.interest),
    formatCurrency(row.principal),
    formatCurrency(row.ending)
  ]);

  return [
    pageBreak(),
    { text: `${data.projectName.toUpperCase()} - STANDBY SYSTEM`, style: 'headerLabel' },
    { text: 'CAPITAL COST RECOVERY', style: 'h2', margin: [0, 10, 0, 5] },
    { text: 'Amortization schedule for capital investment recovery', style: 'subtext', margin: [0, 0, 0, 15] },
    
    // Params
    buildInfoBox([
      keyValue('Capital Cost (R)', formatCurrency(data.summary.totalCapitalCost)),
      keyValue('Period (years)', amortization.periodYears),
      keyValue('Rate (%)', `${(amortization.ratePercent * 100).toFixed(2)}%`),
      keyValue('Monthly Repayment', formatCurrency(data.summary.monthlyRepayment))
    ]),
    
    spacer(15),
    { text: 'AMORTIZATION SCHEDULE', style: 'h3', margin: [0, 0, 0, 10] },
    
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*', '*', '*'],
        body: [
          [
            { text: 'Year', style: 'tableHeader' },
            { text: 'Beginning', style: 'tableHeader', alignment: 'right' },
            { text: 'Payment', style: 'tableHeader', alignment: 'right' },
            { text: 'Interest', style: 'tableHeader', alignment: 'right' },
            { text: 'Principal', style: 'tableHeader', alignment: 'right' },
            { text: 'Ending', style: 'tableHeader', alignment: 'right' }
          ],
          ...scheduleRows.map(row => row.map((cell, i) => ({ 
            text: cell, 
            alignment: i === 0 ? 'left' : 'right',
            style: 'tableCell'
          })))
        ]
      },
      layout: tableLayouts.zebra
    }
  ];
}

/**
 * Page 5: Running Recovery
 */
function buildRunningRecovery(data: GeneratorReportData): Content[] {
  // Transpose the data for side-by-side comparison
  const gens = data.runningRecovery.generators;
  
  const rows = [
    ['Zone Name', ...gens.map(g => g.zoneName)],
    ['Generator Size', ...gens.map(g => g.generatorSize)],
    ['Synchronized', ...gens.map(g => g.isSync ? 'Yes' : 'No')],
    ['Running Load (%)', ...gens.map(g => `${g.runningLoad}%`)],
    ['Net Energy (kVA)', ...gens.map(g => g.netEnergy)],
    ['Fuel Rate (L/h)', ...gens.map(g => g.fuelRate.toFixed(2))],
    ['Diesel Price (R/L)', ...gens.map(g => formatCurrency(g.dieselPrice))],
    ['Total Energy (kWh)', ...gens.map(g => g.totalEnergy.toFixed(2))],
    ['Monthly Diesel (R)', ...gens.map(g => formatCurrency(g.monthlyDiesel))],
    ['Monthly Service (R)', ...gens.map(g => formatCurrency(g.monthlyServicing))],
    ['TARIFF / kWh', ...gens.map(g => `R ${g.tariff.toFixed(4)}`)]
  ];

  // Build dynamic table body
  const tableBody = rows.map((row, idx) => {
    const isHeader = idx < 3; // Info rows
    const isResult = idx === rows.length - 1; // Tariff row
    
    return row.map((cell, cellIdx) => ({
      text: cell,
      style: isResult ? 'tableHeader' : 'tableCell',
      bold: isHeader || isResult || cellIdx === 0,
      fillColor: isResult ? PDF_COLORS.primary : (isHeader ? PDF_COLORS.backgroundAlt : undefined),
      color: isResult ? 'white' : 'black',
      alignment: cellIdx === 0 ? 'left' : 'center'
    }));
  });

  return [
    pageBreak(),
    { text: `${data.projectName.toUpperCase()} - STANDBY SYSTEM`, style: 'headerLabel' },
    { text: 'RUNNING RECOVERY CALCULATOR', style: 'h2', margin: [0, 10, 0, 5] },
    { text: 'Comparative operational cost analysis', style: 'subtext', margin: [0, 0, 0, 15] },
    
    {
      table: {
        headerRows: 0,
        widths: [100, ...gens.map(() => '*')],
        body: tableBody
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 1 : 0.5,
        hLineColor: PDF_COLORS.border,
        vLineColor: PDF_COLORS.border,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      }
    }
  ];
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

function buildGeneratorReportContent(data: GeneratorReportData, config: ReportConfig): Content[] {
  const content: Content[] = [];
  
  content.push(...buildExecutiveSummary(data, config));
  content.push(...buildTenantSchedule(data));
  content.push(...buildCapitalRecovery(data));
  content.push(...buildRunningRecovery(data));
  
  // Charts are appended automatically by the engine if captured
  
  return content;
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<GeneratorReportData>({
  type: 'generator-report',
  name: 'Generator Financial Evaluation',
  description: 'Detailed financial analysis of generator system costs and recovery',
  
  defaultConfig: {
    includeCoverPage: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
      margins: [20, 30, 20, 30] // Custom margins
    },
  },
  
  // Define charts to capture from the UI
  chartConfigs: [
    { elementId: 'load-distribution-chart', title: 'Load Distribution by Zone', width: 800, height: 400 },
    { elementId: 'cost-breakdown-chart', title: 'Capital Cost Breakdown', width: 800, height: 400 },
    { elementId: 'recovery-projection-chart', title: 'Recovery Projection', width: 800, height: 400 }
  ],
  
  buildContent: buildGeneratorReportContent,
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));
