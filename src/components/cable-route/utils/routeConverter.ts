import { SupplyLine, ScaleInfo } from '@/components/floor-plan/types';
import { CableRoute, RoutePoint, RouteMetrics } from '../types';

/**
 * Convert SupplyLine from floor plan to CableRoute format for 3D analysis
 */
export function convertSupplyLineToCableRoute(
  line: SupplyLine,
  scaleInfo: ScaleInfo | null
): CableRoute {
  const scale = scaleInfo?.ratio || 0.02; // Default 50 pixels per meter

  // Convert 2D points to 3D RoutePoints
  const points: RoutePoint[] = line.points.map((point, index) => {
    // Interpolate height between start and end
    const startHeight = line.startHeight || 0;
    const endHeight = line.endHeight || 0;
    const progress = index / Math.max(1, line.points.length - 1);
    const z = startHeight + (endHeight - startHeight) * progress;

    return {
      id: `${line.id}-p${index}`,
      x: point.x,
      y: point.y,
      z: z,
      label: index === 0 ? line.from : index === line.points.length - 1 ? line.to : undefined,
    };
  });

  // Calculate metrics
  const metrics = calculateRouteMetrics(points, line, scale);

  // Determine cable type
  const cableType = mapCableType(line.cableType || '');

  // Get diameter from cable type or default
  const diameter = getCableDiameter(line.cableType || '');

  return {
    id: line.id,
    name: line.name || line.label || `Cable ${line.id.slice(0, 8)}`,
    points,
    cableType,
    diameter,
    timestamp: new Date().toISOString(),
    metrics,
  };
}

/**
 * Convert multiple SupplyLines to CableRoutes
 */
export function convertSupplyLinesToCableRoutes(
  lines: SupplyLine[],
  scaleInfo: ScaleInfo | null
): CableRoute[] {
  return lines
    .filter((line) => line.points.length >= 2)
    .map((line) => convertSupplyLineToCableRoute(line, scaleInfo));
}

/**
 * Calculate route metrics from points
 */
function calculateRouteMetrics(
  points: RoutePoint[],
  line: SupplyLine,
  scale: number
): RouteMetrics {
  // Calculate 3D length including elevation changes
  let totalLength = 0;
  let bendCount = 0;
  let maxElevation = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // 3D distance
    const dx = (p2.x - p1.x) * scale;
    const dy = (p2.y - p1.y) * scale;
    const dz = p2.z - p1.z;
    const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    totalLength += segmentLength;

    maxElevation = Math.max(maxElevation, p1.z, p2.z);

    // Count significant bends (>15 degrees)
    if (i < points.length - 2) {
      const p3 = points[i + 2];
      const angle = calculateAngle(p1, p2, p3);
      if (angle > 15) bendCount++;
    }
  }

  // Estimate support count (every 0.6m for horizontal runs)
  const horizontalLength = line.pathLength || totalLength;
  const supportCount = Math.ceil(horizontalLength / 0.6);

  // Calculate cost (simplified)
  const cableType = line.cableType || 'PVC/PVC';
  const costPerMeter = getCostPerMeter(cableType);
  const materialCost = totalLength * costPerMeter;
  const laborCost = materialCost * 0.4; // 40% labor
  const supportsCost = supportCount * 15; // £15 per bracket
  const totalCost = materialCost + laborCost + supportsCost;

  // Determine complexity
  const complexity: 'Low' | 'Medium' | 'High' =
    bendCount > 8 || maxElevation > 5
      ? 'High'
      : bendCount > 4 || maxElevation > 2
      ? 'Medium'
      : 'Low';

  return {
    totalLength,
    totalCost,
    supportCount,
    bendCount,
    complexity,
  };
}

/**
 * Calculate angle between three points
 */
function calculateAngle(p1: RoutePoint, p2: RoutePoint, p3: RoutePoint): number {
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

/**
 * Map cable type string to standard format
 */
function mapCableType(cableType: string): 'PVC/PVC' | 'PVC/SWA/PVC' | 'XLPE/SWA/PVC' | 'LSZH' {
  const normalized = cableType.toUpperCase();
  if (normalized.includes('XLPE')) return 'XLPE/SWA/PVC';
  if (normalized.includes('SWA')) return 'PVC/SWA/PVC';
  if (normalized.includes('LSZH') || normalized.includes('LSF')) return 'LSZH';
  return 'PVC/PVC';
}

/**
 * Get cable diameter from type (in mm)
 */
function getCableDiameter(cableType: string): number {
  // Extract size from cable type (e.g., "4mm²" -> 4)
  const sizeMatch = cableType.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (sizeMatch) {
    const area = parseFloat(sizeMatch[1]);
    // Approximate diameter from cross-sectional area: d = 2 * sqrt(A/π)
    return 2 * Math.sqrt(area / Math.PI) + 5; // Add 5mm for insulation
  }

  // Default sizes by type
  if (cableType.includes('SWA') || cableType.includes('XLPE')) return 25;
  if (cableType.includes('LSZH')) return 15;
  return 10; // Default for PVC/PVC
}

/**
 * Get cost per meter for cable type (in £)
 */
function getCostPerMeter(cableType: string): number {
  const normalized = cableType.toUpperCase();
  if (normalized.includes('XLPE')) return 18;
  if (normalized.includes('SWA')) return 12.5;
  if (normalized.includes('LSZH')) return 9.5;
  return 5.5; // PVC/PVC
}
