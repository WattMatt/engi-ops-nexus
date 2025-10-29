import { CONTAINMENT_COLORS, CONTAINMENT_DASH_STYLES } from './constants.js';

// A predefined palette of visually distinct and pleasant colors for LV cables.
const CABLE_COLORS = [
  '#34D399', // Emerald 400
  '#FBBF24', // Amber 400
  '#60A5FA', // Blue 400
  '#F472B6', // Pink 400
  '#A78BFA', // Violet 400
  '#818CF8', // Indigo 400
  '#F97316', // Orange 500
  '#2DD4BF', // Teal 400
];

// A different palette for supply zones to avoid color collisions with cables.
export const ZONE_COLORS = [
  '#22D3EE', // Cyan 400
  '#A3E635', // Lime 400
  '#FB923C', // Orange 400
  '#EC4899', // Pink 500
  '#6EE7B7', // Emerald 300
  '#C084FC', // Purple 400
  '#F87171', // Red 400
];

// A cache to store generated colors for cable types to ensure consistency.
const cableColorCache = new Map();

/**
 * Generates a consistent color for a given cable type string.
 * It uses a simple hashing algorithm to pick a color from the predefined
 * palette, ensuring the same string always returns the same color.
 * @param {string} cableType The string identifier for the cable (e.g., "4Core x 25mm Alu").
 * @returns {string} A hex color string.
 */
export function getCableColor(cableType) {
  if (cableColorCache.has(cableType)) {
    return cableColorCache.get(cableType);
  }

  // Simple string hashing function to get a numeric hash code.
  let hash = 0;
  for (let i = 0; i < cableType.length; i++) {
    const char = cableType.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  // Use the hash to pick a color from the palette.
  const index = Math.abs(hash % CABLE_COLORS.length);
  const color = CABLE_COLORS[index];
  
  cableColorCache.set(cableType, color);
  return color;
}

/**
 * Gets a unique color for a supply zone based on its index.
 * This cycles through the ZONE_COLORS palette.
 * @param {number} index The index of the zone (e.g., the number of existing zones).
 * @returns {string} A hex color string.
 */
export function getZoneColor(index) {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

/**
 * Gets the visual style for a given containment type and size.
 * @param {import('./types.js').ContainmentType} type The type of containment.
 * @param {string} size The size of the containment.
 * @returns {{ color: string; dash: number[] }} An object with color and dash array.
 */
export function getContainmentStyle(type, size) {
  return {
    color: CONTAINMENT_COLORS[type],
    dash: CONTAINMENT_DASH_STYLES[size] || [],
  };
}

/**
 * Calculates the summary for LV cables, applying a multiplier for GP wires.
 * @param {import('./types.js').SupplyLine[]} lines An array of all supply lines in the project.
 * @returns {{ totalLength: number; summary: Map<string, { totalLength: number; color: string }>; terminationSummary: Map<string, number> }} An object with the total length, a map of summaries by cable type, and a map of termination counts.
 */
export function calculateLvCableSummary(lines) {
    const lvLines = lines.filter(l => l.type === 'lv' && l.cableType);
    let totalLength = 0;
    const summary = new Map();
    const terminationSummary = new Map();

    lvLines.forEach(line => {
        const isGpWire = line.cableType?.includes('GP');
        
        let calculatedLength;

        if (isGpWire) {
            // For GP wire, we apply the multiplier only to the path length
            const pathLen = line.pathLength ?? line.length; // Fallback for old data
            const startH = line.startHeight ?? 0;
            const endH = line.endHeight ?? 0;
            calculatedLength = (pathLen * 3) + startH + endH;
        } else {
            // For non-GP wire, the stored length is already correct
            calculatedLength = line.length;
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

    return { totalLength, summary: summary, terminationSummary: terminationSummary };
}
