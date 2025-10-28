import { SupplyLine, ContainmentType } from './types';
import { CONTAINMENT_COLORS, CONTAINMENT_DASH_STYLES } from './constants';

const CABLE_COLORS = [
  '#34D399', '#FBBF24', '#60A5FA', '#F472B6',
  '#A78BFA', '#818CF8', '#F97316', '#2DD4BF',
];

export const ZONE_COLORS = [
  '#22D3EE', '#A3E635', '#FB923C', '#EC4899',
  '#6EE7B7', '#C084FC', '#F87171',
];

const cableColorCache = new Map<string, string>();

export function getCableColor(cableType: string): string {
  if (cableColorCache.has(cableType)) {
    return cableColorCache.get(cableType)!;
  }

  let hash = 0;
  for (let i = 0; i < cableType.length; i++) {
    const char = cableType.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  const index = Math.abs(hash % CABLE_COLORS.length);
  const color = CABLE_COLORS[index];
  cableColorCache.set(cableType, color);
  return color;
}

export function getZoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

export function getContainmentStyle(type: ContainmentType, size: string): { color: string; dash: number[] } {
  return {
    color: CONTAINMENT_COLORS[type],
    dash: CONTAINMENT_DASH_STYLES[size] || [],
  };
}

export function calculateLvCableSummary(lines: SupplyLine[]): {
    totalLength: number;
    summary: Map<string, { totalLength: number; color: string }>;
    terminationSummary: Map<string, number>;
} {
    const lvLines = lines.filter(l => l.type === 'lv' && l.cableType);
    let totalLength = 0;
    const summary = new Map<string, { totalLength: number; color: string }>();
    const terminationSummary = new Map<string, number>();

    lvLines.forEach(line => {
        const isGpWire = line.cableType?.includes('GP');
        let calculatedLength: number;

        if (isGpWire) {
            const pathLen = line.points.reduce((sum, p, i) => {
                if (i === 0) return 0;
                const prev = line.points[i - 1];
                return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
            }, 0);
            const startH = line.startHeight ?? 0;
            const endH = line.endHeight ?? 0;
            calculatedLength = (pathLen * 3) + startH + endH;
        } else {
            calculatedLength = line.points.reduce((sum, p, i) => {
                if (i === 0) return 0;
                const prev = line.points[i - 1];
                return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
            }, 0);
        }

        totalLength += calculatedLength;

        if (line.cableType) {
            const existing = summary.get(line.cableType) || {
                totalLength: 0,
                color: getCableColor(line.cableType),
            };
            existing.totalLength += calculatedLength;
            summary.set(line.cableType, existing);

            if (line.terminationCount && line.terminationCount > 0) {
                const currentTerminations = terminationSummary.get(line.cableType) || 0;
                terminationSummary.set(line.cableType, currentTerminations + line.terminationCount);
            }
        }
    });

    return { totalLength, summary, terminationSummary };
}
