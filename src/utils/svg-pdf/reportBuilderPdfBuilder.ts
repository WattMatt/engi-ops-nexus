/**
 * Analytics Report Builder PDF — SVG engine
 */
import {
  createSvgElement, el, textEl, addPageHeader, applyPageFooters,
  MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, CONTENT_W, PAGE_W,
  BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED, BORDER_COLOR, WHITE,
  formatCurrencyValue,
} from './sharedSvgHelpers';
import { format } from 'date-fns';

export interface ReportData {
  fittings: any[] | null;
  schedules: any[] | null;
  projects: { id: string; name: string }[] | null;
}

export interface ReportConfig {
  name: string;
  timeframe: 'all' | '12months' | '6months' | '3months';
  metrics: {
    portfolio: boolean;
    benchmarks: boolean;
    trends: boolean;
    manufacturers: boolean;
    efficiency: boolean;
    costs: boolean;
  };
}

function drawSimpleTable(
  svg: SVGSVGElement,
  y: number,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  aligns: ('start' | 'end' | 'middle')[] = []
): number {
  const rowH = 7;
  const fs = 3;

  // Header
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: rowH, fill: BRAND_PRIMARY }, svg);
  let cx = MARGIN_LEFT;
  headers.forEach((h, i) => {
    textEl(svg, cx + 2, y + 4.5, h, { size: fs, fill: WHITE, weight: 'bold', anchor: aligns[i] === 'end' ? 'end' : 'start' });
    cx += colWidths[i];
  });
  y += rowH;

  rows.forEach((row, ri) => {
    const fill = ri % 2 === 0 ? '#f8fafc' : WHITE;
    el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: rowH, fill }, svg);
    cx = MARGIN_LEFT;
    row.forEach((cell, ci) => {
      const anchor = aligns[ci] === 'end' ? 'end' : 'start';
      const tx = anchor === 'end' ? cx + colWidths[ci] - 2 : cx + 2;
      textEl(svg, tx, y + 4.5, cell, { size: fs, fill: TEXT_DARK, anchor });
      cx += colWidths[ci];
    });
    y += rowH;
  });

  return y + 4;
}

export function buildAnalyticsReportPdf(config: ReportConfig, data: ReportData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const svg = createSvgElement();

  addPageHeader(svg, config.name);
  textEl(svg, MARGIN_LEFT, MARGIN_TOP + 12, `Generated: ${format(new Date(), 'PPP')}`, {
    size: 3.5, fill: TEXT_MUTED,
  });

  let y = MARGIN_TOP + 20;

  // Portfolio Summary
  if (config.metrics.portfolio && data.fittings && data.fittings.length > 0) {
    const totalFittings = data.fittings.length;
    const totalCost = data.fittings.reduce((s, f) => s + (f.supply_cost || 0) + (f.install_cost || 0), 0);
    const avgWattage = data.fittings.reduce((s, f) => s + (f.wattage || 0), 0) / totalFittings;

    textEl(svg, MARGIN_LEFT, y, 'Portfolio Summary', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 6;

    y = drawSimpleTable(svg, y,
      ['Metric', 'Value'],
      [
        ['Total Fittings', totalFittings.toString()],
        ['Total Portfolio Value', formatCurrencyValue(totalCost)],
        ['Average Wattage', `${avgWattage.toFixed(1)} W`],
        ['Unique Projects', (data.projects?.length || 0).toString()],
      ],
      [CONTENT_W * 0.6, CONTENT_W * 0.4],
      ['start', 'end']
    );
    y += 6;
  }

  // Manufacturer Analysis
  if (config.metrics.manufacturers && data.fittings && data.fittings.length > 0) {
    const mfrCounts: Record<string, number> = {};
    data.fittings.forEach(f => { if (f.manufacturer) mfrCounts[f.manufacturer] = (mfrCounts[f.manufacturer] || 0) + 1; });

    const mfrData = Object.entries(mfrCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mfr, count]) => [mfr, count.toString(), `${((count / data.fittings!.length) * 100).toFixed(1)}%`]);

    textEl(svg, MARGIN_LEFT, y, 'Manufacturer Analysis', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 6;
    y = drawSimpleTable(svg, y,
      ['Manufacturer', 'Count', 'Share'],
      mfrData,
      [CONTENT_W * 0.5, CONTENT_W * 0.25, CONTENT_W * 0.25],
      ['start', 'middle', 'end']
    );
    y += 6;
  }

  // Efficiency Analysis
  if (config.metrics.efficiency && data.fittings && data.fittings.length > 0) {
    const eff = data.fittings.filter(f => f.wattage && f.lumen_output);
    if (eff.length > 0) {
      const ranges: Record<string, number> = { 'Below 80 lm/W': 0, '80-100 lm/W': 0, '100-120 lm/W': 0, 'Above 120 lm/W': 0 };
      eff.forEach(f => {
        const e = f.lumen_output / f.wattage;
        if (e < 80) ranges['Below 80 lm/W']++;
        else if (e < 100) ranges['80-100 lm/W']++;
        else if (e < 120) ranges['100-120 lm/W']++;
        else ranges['Above 120 lm/W']++;
      });

      textEl(svg, MARGIN_LEFT, y, 'Efficiency Analysis', { size: 5, fill: BRAND_PRIMARY, weight: 'bold' });
      y += 6;
      y = drawSimpleTable(svg, y,
        ['Efficacy Range', 'Count', 'Percentage'],
        Object.entries(ranges).map(([r, c]) => [r, c.toString(), `${((c / eff.length) * 100).toFixed(1)}%`]),
        [CONTENT_W * 0.5, CONTENT_W * 0.25, CONTENT_W * 0.25],
        ['start', 'middle', 'end']
      );
    }
  }

  pages.push(svg);
  applyPageFooters(pages, config.name, false);
  return pages;
}
