import { Point, PVArrayItem, PVPanelConfig, RoofMask, ScaleInfo } from '@/types/floor-plan';

/**
 * Checks if a point is inside a given polygon using the ray-casting algorithm.
 */
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const distance = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

/**
 * Finds the best snap point for a PV array being placed.
 */
export const findSnap = (
    mousePos: Point,
    arrayToPlaceConfig: Omit<PVArrayItem, 'id'>,
    existingArrays: PVArrayItem[],
    pvPanelConfig: PVPanelConfig,
    roofMasks: RoofMask[],
    scaleInfo: ScaleInfo,
    zoom: number
): { snappedPosition: Point; snapLines: { start: Point; end: Point }[] } | null => {
    if (!scaleInfo.metersPerPixel) return null;

    const SNAP_THRESHOLD = 15 / zoom;
    
    return {
        snappedPosition: mousePos,
        snapLines: []
    };
};

/**
 * Calculate polygon area using shoelace formula
 */
export function calculatePolygonArea(points: Point[], metersPerPixel: number): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    const areaInMeters = area * metersPerPixel * metersPerPixel;
    return areaInMeters;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate total length of a polyline
 */
export function calculatePolylineLength(points: Point[], metersPerPixel: number): number {
    if (points.length < 2) return 0;
    
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalLength += calculateDistance(points[i], points[i + 1]);
    }
    
    return totalLength * metersPerPixel;
}