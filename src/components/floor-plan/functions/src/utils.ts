
import { SupplyLine } from './types';

const CABLE_COLORS = [
  '#34D399', '#FBBF24', '#60A5FA', '#F472B6',
  '#A78BFA', '#818CF8', '#F97316', '#2DD4BF',
];

const cableColorCache = new Map<string, string>();

function getCableColor(cableType: string): string {
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
        const calculatedLength = isGpWire ? line.length * 3 : line.length;

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

    return { totalLength, summary: summary, terminationSummary: terminationSummary };
}