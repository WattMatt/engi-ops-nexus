/**
 * Calculate the area of a polygon using the Shoelace formula
 * Points should be in { x, y } format
 */
export function calculatePolygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area / 2);
}

/**
 * Calculate the centroid (center point) of a polygon
 * Returns { x, y } coordinates
 */
export function calculatePolygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Get zone color based on zone type
 */
export function getZoneColor(type: 'supply' | 'exclusion' | 'roof'): string {
  switch (type) {
    case 'supply':
      return '#10b98155'; // Green with transparency
    case 'exclusion':
      return '#ef444455'; // Red with transparency
    case 'roof':
      return '#3b82f655'; // Blue with transparency
    default:
      return '#64748b55'; // Gray with transparency
  }
}

/**
 * Get zone stroke color (darker version for borders)
 */
export function getZoneStrokeColor(type: 'supply' | 'exclusion' | 'roof'): string {
  switch (type) {
    case 'supply':
      return '#10b981'; // Green
    case 'exclusion':
      return '#ef4444'; // Red
    case 'roof':
      return '#3b82f6'; // Blue
    default:
      return '#64748b'; // Gray
  }
}
