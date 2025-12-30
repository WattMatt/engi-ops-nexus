import { useMemo } from 'react';
import { EquipmentItem, Containment, ScaleInfo } from '../types';

export interface RoomBounds {
  width: number;
  depth: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isEmpty: boolean;
}

const DEFAULT_ROOM_SIZE = 10; // 10m default
const PADDING = 2; // 2m padding on each side
const MIN_ROOM_SIZE = 4; // Minimum 4m each direction
const MAX_ROOM_SIZE = 100; // Maximum 100m for performance

export function useRoomBounds(
  equipment: EquipmentItem[],
  containment: Containment[],
  scaleInfo: ScaleInfo
): RoomBounds {
  return useMemo(() => {
    // Collect all points from equipment and containment
    const allPoints: { x: number; y: number }[] = [];

    // Add equipment positions
    equipment.forEach((item) => {
      allPoints.push(item.position);
    });

    // Add containment path points
    containment.forEach((item) => {
      item.points.forEach((point) => {
        allPoints.push(point);
      });
    });

    // Handle empty room case
    if (allPoints.length === 0) {
      return {
        width: DEFAULT_ROOM_SIZE,
        depth: DEFAULT_ROOM_SIZE,
        minX: 0,
        minY: 0,
        maxX: DEFAULT_ROOM_SIZE,
        maxY: DEFAULT_ROOM_SIZE,
        isEmpty: true,
      };
    }

    // Calculate scale ratio (pixels to meters)
    const scaleRatio = scaleInfo.ratio || 0.01;

    // Calculate bounds in pixels
    const xCoords = allPoints.map((p) => p.x);
    const yCoords = allPoints.map((p) => p.y);

    const minXPixels = Math.min(...xCoords);
    const maxXPixels = Math.max(...xCoords);
    const minYPixels = Math.min(...yCoords);
    const maxYPixels = Math.max(...yCoords);

    // Convert to meters
    const minXMeters = minXPixels * scaleRatio;
    const maxXMeters = maxXPixels * scaleRatio;
    const minYMeters = minYPixels * scaleRatio;
    const maxYMeters = maxYPixels * scaleRatio;

    // Calculate dimensions with padding
    let width = maxXMeters - minXMeters + (PADDING * 2);
    let depth = maxYMeters - minYMeters + (PADDING * 2);

    // Handle single item case - ensure minimum size
    if (allPoints.length === 1) {
      width = Math.max(width, MIN_ROOM_SIZE * 2);
      depth = Math.max(depth, MIN_ROOM_SIZE * 2);
    }

    // Enforce minimum and maximum sizes
    width = Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, width));
    depth = Math.max(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, depth));

    return {
      width,
      depth,
      minX: minXMeters - PADDING,
      minY: minYMeters - PADDING,
      maxX: minXMeters + width - PADDING,
      maxY: minYMeters + depth - PADDING,
      isEmpty: false,
    };
  }, [equipment, containment, scaleInfo.ratio]);
}

export default useRoomBounds;
