/**
 * Reusable SVG chart helpers for PDF reports.
 * Donut, bar, and gauge charts rendered as native SVG elements.
 */
import {
  el, textEl,
  BRAND_PRIMARY, BRAND_ACCENT, TEXT_DARK, TEXT_MUTED, WHITE, BRAND_LIGHT,
  SUCCESS_COLOR, DANGER_COLOR,
} from './sharedSvgHelpers';

// ─── Color palette for chart segments ───
const CHART_COLORS = [
  '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

// ─── Donut Chart ───

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

/**
 * Draw a donut chart centered at (cx, cy) with given radius.
 * Returns the bottom Y position for layout flow.
 */
export function drawDonutChart(
  parent: Element,
  segments: DonutSegment[],
  cx: number,
  cy: number,
  radius: number = 25,
  options?: { innerRadiusRatio?: number; showLegend?: boolean; legendX?: number; legendY?: number }
): number {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return cy + radius;

  const innerR = radius * (options?.innerRadiusRatio ?? 0.55);
  let startAngle = -Math.PI / 2;

  segments.forEach((seg, i) => {
    const sliceAngle = (seg.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    const color = seg.color || CHART_COLORS[i % CHART_COLORS.length];
    el('path', { d, fill: color, stroke: WHITE, 'stroke-width': 0.3 }, parent);
    startAngle = endAngle;
  });

  // Center label
  textEl(parent, cx, cy + 1, total.toLocaleString(), {
    size: 5, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });

  // Legend
  if (options?.showLegend !== false) {
    const lx = options?.legendX ?? cx + radius + 8;
    let ly = options?.legendY ?? cy - (segments.length * 5) / 2;
    segments.forEach((seg, i) => {
      const color = seg.color || CHART_COLORS[i % CHART_COLORS.length];
      el('rect', { x: lx, y: ly - 2.5, width: 3, height: 3, fill: color, rx: 0.5 }, parent);
      const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0';
      textEl(parent, lx + 5, ly, `${seg.label} (${pct}%)`, { size: 2.5, fill: TEXT_DARK });
      ly += 5;
    });
  }

  return cy + radius + 5;
}

// ─── Bar Chart ───

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

/**
 * Draw a horizontal bar chart starting at (x, y).
 * Returns the bottom Y position.
 */
export function drawBarChart(
  parent: Element,
  items: BarChartItem[],
  x: number,
  y: number,
  width: number = 120,
  options?: { barHeight?: number; gap?: number; showValues?: boolean }
): number {
  const barH = options?.barHeight ?? 5;
  const gap = options?.gap ?? 2;
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const labelW = 30;
  const barAreaW = width - labelW - 10;

  items.forEach((item, i) => {
    const by = y + i * (barH + gap);
    // Label
    textEl(parent, x, by + barH / 2 + 1, truncateLabel(item.label, 18), {
      size: 2.5, fill: TEXT_DARK,
    });
    // Background bar
    el('rect', {
      x: x + labelW, y: by,
      width: barAreaW, height: barH,
      fill: BRAND_LIGHT, rx: 1,
    }, parent);
    // Value bar
    const barW = Math.max((item.value / maxVal) * barAreaW, 1);
    const color = item.color || CHART_COLORS[i % CHART_COLORS.length];
    el('rect', {
      x: x + labelW, y: by,
      width: barW, height: barH,
      fill: color, rx: 1,
    }, parent);
    // Value text
    if (options?.showValues !== false) {
      textEl(parent, x + labelW + barAreaW + 2, by + barH / 2 + 1, item.value.toLocaleString(), {
        size: 2.3, fill: TEXT_MUTED,
      });
    }
  });

  return y + items.length * (barH + gap) + 4;
}

// ─── Gauge Chart ───

/**
 * Draw a semi-circular gauge chart.
 * value: 0-100 percentage.
 */
export function drawGaugeChart(
  parent: Element,
  value: number,
  cx: number,
  cy: number,
  radius: number = 18,
  options?: { label?: string; color?: string; thresholds?: { warn: number; danger: number } }
): number {
  const clamped = Math.max(0, Math.min(100, value));
  const thresholds = options?.thresholds ?? { warn: 70, danger: 90 };

  // Determine color
  let gaugeColor = options?.color || SUCCESS_COLOR;
  if (clamped >= thresholds.danger) gaugeColor = DANGER_COLOR;
  else if (clamped >= thresholds.warn) gaugeColor = '#f59e0b';

  // Background arc (180 degrees)
  const bgD = describeArc(cx, cy, radius, 180, 360);
  el('path', { d: bgD, fill: 'none', stroke: BRAND_LIGHT, 'stroke-width': 4, 'stroke-linecap': 'round' }, parent);

  // Value arc
  const endAngle = 180 + (clamped / 100) * 180;
  const valD = describeArc(cx, cy, radius, 180, endAngle);
  el('path', { d: valD, fill: 'none', stroke: gaugeColor, 'stroke-width': 4, 'stroke-linecap': 'round' }, parent);

  // Value text
  textEl(parent, cx, cy - 2, `${Math.round(clamped)}%`, {
    size: 6, fill: gaugeColor, weight: 'bold', anchor: 'middle',
  });

  // Label
  if (options?.label) {
    textEl(parent, cx, cy + 5, options.label, {
      size: 2.5, fill: TEXT_MUTED, anchor: 'middle',
    });
  }

  return cy + 8;
}

// ─── Internal Helpers ───

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function truncateLabel(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 2) + '..' : text;
}
