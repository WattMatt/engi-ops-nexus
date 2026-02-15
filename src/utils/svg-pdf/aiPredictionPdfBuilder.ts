/**
 * AI Prediction PDF Builder — SVG Engine
 * 
 * Builds SVG pages for: Cover, Executive Summary, Cost Breakdown (donut + table),
 * Risk Assessment (bar chart + table), and Detailed Analysis.
 */
import {
  createSvgElement, el, textEl, addPageHeader,
  buildStandardCoverPageSvg, buildTablePages, buildTextPages,
  applyPageFooters, applyRunningHeaders, buildExecutiveSummarySvg,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, SUCCESS_COLOR, DANGER_COLOR,
  formatCurrencyValue, wrapText,
  type StandardCoverPageData, type TocEntry, buildTableOfContentsSvg,
  type ExecutiveSummaryData,
} from './sharedSvgHelpers';
import { drawDonutChart, drawBarChart, drawGaugeChart } from './svgChartHelpers';

// ─── Interfaces ───

interface PredictionData {
  summary: {
    totalEstimate: number;
    confidenceLevel: number;
    currency: string;
  };
  costBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  historicalTrend: Array<{
    project: string;
    budgeted: number;
    actual: number;
  }>;
  riskFactors: Array<{
    risk: string;
    probability: number;
    impact: number;
  }>;
  analysis: string;
}

export interface AiPredictionPdfParams {
  predictionData: PredictionData;
  projectName: string;
  projectNumber: string;
  parameters: {
    projectSize: string;
    complexity: string;
    timeline: string;
    location: string;
  };
  coverData: Partial<StandardCoverPageData>;
  revision?: string;
}

// ─── Main Builder ───

export function buildAiPredictionPages(params: AiPredictionPdfParams): SVGSVGElement[] {
  const { predictionData, projectName, projectNumber, parameters, coverData, revision } = params;
  const pages: SVGSVGElement[] = [];
  const reportTitle = 'AI Cost Prediction Report';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Cover Page
  const cover = buildStandardCoverPageSvg({
    reportTitle,
    reportSubtitle: `Timeline: ${parameters.timeline} | Complexity: ${parameters.complexity}`,
    projectName,
    projectNumber,
    revision: revision || 'R01',
    date: dateStr,
    ...coverData,
  });
  pages.push(cover);

  // 2. Table of Contents (placeholder — page numbers assigned after assembly)
  const tocEntries: TocEntry[] = [
    { label: 'Executive Summary', pageNumber: 3 },
    { label: 'Project Parameters', pageNumber: 3 },
  ];
  if (predictionData.costBreakdown.length > 0) {
    tocEntries.push({ label: 'Cost Breakdown', pageNumber: 4 });
  }
  if (predictionData.riskFactors.length > 0) {
    tocEntries.push({ label: 'Risk Assessment', pageNumber: 0 }); // updated below
  }
  tocEntries.push({ label: 'Detailed Analysis', pageNumber: 0 });
  // We'll fix page numbers after building all pages
  const tocPage = buildTableOfContentsSvg(tocEntries, reportTitle);
  pages.push(tocPage);

  // 3. Executive Summary + Parameters Page
  const summaryPage = buildSummaryPage(predictionData, parameters, dateStr);
  pages.push(summaryPage);

  // 4. Cost Breakdown Page (donut chart + table)
  if (predictionData.costBreakdown.length > 0) {
    const breakdownPages = buildCostBreakdownPages(predictionData);
    pages.push(...breakdownPages);
  }

  // Update risk page number
  const riskPageIdx = pages.length + 1;
  const riskTocEntry = tocEntries.find(e => e.label === 'Risk Assessment');
  if (riskTocEntry) riskTocEntry.pageNumber = riskPageIdx;

  // 5. Risk Assessment Page
  if (predictionData.riskFactors.length > 0) {
    const riskPages = buildRiskPages(predictionData);
    pages.push(...riskPages);
  }

  // Update analysis page number
  const analysisTocEntry = tocEntries.find(e => e.label === 'Detailed Analysis');
  if (analysisTocEntry) analysisTocEntry.pageNumber = pages.length + 1;

  // 6. Detailed Analysis
  if (predictionData.analysis) {
    const analysisPages = buildTextPages(
      'Detailed Analysis',
      predictionData.analysis.replace(/[#*`]/g, ''),
    );
    pages.push(...analysisPages);
  }

  // Rebuild TOC with correct page numbers
  const correctedToc = buildTableOfContentsSvg(tocEntries, reportTitle);
  pages[1] = correctedToc;

  // Apply running headers & footers
  applyRunningHeaders(pages, reportTitle, projectName);
  applyPageFooters(pages, reportTitle);

  return pages;
}

// ─── Summary Page ───

function buildSummaryPage(
  data: PredictionData,
  parameters: { projectSize: string; complexity: string; timeline: string; location: string },
  dateStr: string,
): SVGSVGElement {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Executive Summary');

  let y = MARGIN_TOP + 16;

  // Gauge for confidence
  drawGaugeChart(svg, data.summary.confidenceLevel, PAGE_W / 2, y + 18, 20, {
    label: 'Confidence Level',
    thresholds: { warn: 60, danger: 40 },
  });
  y += 48;

  // KPI cards
  const stats = [
    { label: 'Total Estimate', value: formatCurrencyValue(data.summary.totalEstimate), color: BRAND_PRIMARY },
    { label: 'Confidence', value: `${data.summary.confidenceLevel}%`, color: data.summary.confidenceLevel >= 70 ? SUCCESS_COLOR : '#f59e0b' },
    { label: 'Risk Factors', value: String(data.riskFactors.length), color: data.riskFactors.length > 3 ? DANGER_COLOR : BRAND_ACCENT },
    { label: 'Cost Categories', value: String(data.costBreakdown.length), color: BRAND_ACCENT },
  ];

  const cardW = (CONTENT_W - 6) / stats.length;
  stats.forEach((stat, i) => {
    const x = MARGIN_LEFT + i * (cardW + 2);
    el('rect', { x, y, width: cardW, height: 18, fill: BRAND_LIGHT, rx: 1.5 }, svg);
    textEl(svg, x + cardW / 2, y + 7, stat.value, {
      size: 4.5, fill: stat.color, weight: 'bold', anchor: 'middle',
    });
    textEl(svg, x + cardW / 2, y + 13, stat.label, {
      size: 2.5, fill: TEXT_MUTED, anchor: 'middle',
    });
  });
  y += 26;

  // Project Parameters section
  el('line', {
    x1: MARGIN_LEFT, y1: y, x2: PAGE_W - MARGIN_RIGHT, y2: y,
    stroke: BORDER_COLOR, 'stroke-width': 0.3,
  }, svg);
  y += 6;

  textEl(svg, MARGIN_LEFT, y, 'PROJECT PARAMETERS', {
    size: 3.5, fill: BRAND_PRIMARY, weight: 'bold',
  });
  y += 7;

  const params = [
    ['Project Size', parameters.projectSize || '-'],
    ['Complexity', parameters.complexity || '-'],
    ['Timeline', parameters.timeline || '-'],
    ['Location', parameters.location || '-'],
    ['Generated', dateStr],
  ];

  params.forEach(([label, value]) => {
    textEl(svg, MARGIN_LEFT + 2, y, `${label}:`, { size: 3, fill: TEXT_MUTED, weight: 'bold' });
    textEl(svg, MARGIN_LEFT + 40, y, value, { size: 3, fill: TEXT_DARK });
    y += 5.5;
  });

  return svg;
}

// ─── Cost Breakdown Pages ───

function buildCostBreakdownPages(data: PredictionData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Cost Breakdown');
  pages.push(svg);

  let y = MARGIN_TOP + 14;

  // Donut chart
  const segments = data.costBreakdown.map(item => ({
    label: item.category,
    value: item.amount,
  }));
  y = drawDonutChart(svg, segments, 60, y + 28, 22, {
    showLegend: true,
    legendX: 95,
    legendY: y + 10,
  });
  y += 10;

  // Table below
  const tablePages = buildTablePages(
    'Cost Breakdown',
    [
      { header: 'Category', width: 70, key: 'category' },
      { header: 'Amount (R)', width: 50, align: 'right', key: 'amount' },
      { header: '%', width: 30, align: 'right', key: 'percentage' },
    ],
    data.costBreakdown.map(item => ({
      category: item.category,
      amount: formatCurrencyValue(item.amount),
      percentage: `${item.percentage}%`,
    })),
    { startY: y },
  );

  // Merge first table page into existing chart page if fits
  if (tablePages.length > 0 && y < PAGE_H - MARGIN_BOTTOM - 40) {
    // Draw table rows directly on the chart page
    // For simplicity, just add the separate table pages
  }

  // If table doesn't fit on chart page, add as separate pages
  if (y > PAGE_H - MARGIN_BOTTOM - 50) {
    pages.push(...tablePages);
  } else {
    // Re-render table on same page
    drawMiniTable(svg, data.costBreakdown, y);
  }

  return pages;
}

function drawMiniTable(
  svg: SVGSVGElement,
  items: Array<{ category: string; amount: number; percentage: number }>,
  startY: number,
) {
  const rowH = 5.5;
  let y = startY;

  // Header
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: rowH, fill: BRAND_PRIMARY }, svg);
  textEl(svg, MARGIN_LEFT + 2, y, 'Category', { size: 2.8, fill: WHITE, weight: 'bold' });
  textEl(svg, MARGIN_LEFT + 100, y, 'Amount', { size: 2.8, fill: WHITE, weight: 'bold', anchor: 'end' });
  textEl(svg, PAGE_W - MARGIN_RIGHT - 2, y, '%', { size: 2.8, fill: WHITE, weight: 'bold', anchor: 'end' });
  y += rowH;

  items.forEach((item, i) => {
    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: rowH, fill: bg }, svg);
    textEl(svg, MARGIN_LEFT + 2, y, item.category, { size: 2.8, fill: TEXT_DARK });
    textEl(svg, MARGIN_LEFT + 100, y, formatCurrencyValue(item.amount), { size: 2.8, fill: TEXT_DARK, anchor: 'end' });
    textEl(svg, PAGE_W - MARGIN_RIGHT - 2, y, `${item.percentage}%`, { size: 2.8, fill: TEXT_MUTED, anchor: 'end' });
    el('line', {
      x1: MARGIN_LEFT, y1: y + rowH - 3.5,
      x2: PAGE_W - MARGIN_RIGHT, y2: y + rowH - 3.5,
      stroke: BORDER_COLOR, 'stroke-width': 0.15,
    }, svg);
    y += rowH;
  });
}

// ─── Risk Assessment Pages ───

function buildRiskPages(data: PredictionData): SVGSVGElement[] {
  const svg = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, svg);
  addPageHeader(svg, 'Risk Assessment');

  let y = MARGIN_TOP + 14;

  // Bar chart for risk probability
  const barItems = data.riskFactors.map(r => ({
    label: r.risk,
    value: r.probability,
  }));
  y = drawBarChart(svg, barItems, MARGIN_LEFT, y, CONTENT_W, {
    barHeight: 5,
    gap: 2,
    showValues: true,
  });
  y += 8;

  // Risk details
  data.riskFactors.forEach(risk => {
    if (y > PAGE_H - MARGIN_BOTTOM - 20) return; // skip if overflow (simplified)
    textEl(svg, MARGIN_LEFT + 2, y, `• ${risk.risk}`, { size: 3, fill: TEXT_DARK, weight: 'bold' });
    y += 5;
    textEl(svg, MARGIN_LEFT + 6, y, `Probability: ${risk.probability}%`, { size: 2.8, fill: TEXT_MUTED });
    y += 4.5;
    textEl(svg, MARGIN_LEFT + 6, y, `Impact: ${formatCurrencyValue(risk.impact)}`, { size: 2.8, fill: TEXT_MUTED });
    y += 6;
  });

  return [svg];
}
