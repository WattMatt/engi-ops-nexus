import { Point, PVArrayItem, PVPanelConfig, RoofMask, ScaleInfo } from './types';

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

export const getPVArrayCorners = (
    array: PVArrayItem,
    pvPanelConfig: PVPanelConfig,
    roofMasks: RoofMask[],
    scaleInfo: ScaleInfo
): Point[] => {
    if (!scaleInfo.ratio) return [];

    const panelIsOnMask = roofMasks.find(mask => isPointInPolygon(array.position, mask.points));
    const pitch = panelIsOnMask ? panelIsOnMask.pitch : 0;
    const pitchRad = pitch * Math.PI / 180;

    let panelW_px = (pvPanelConfig.panelWidthMm / 1000 / scaleInfo.ratio);
    let panelL_px = (pvPanelConfig.panelLengthMm / 1000 / scaleInfo.ratio);
    panelL_px *= Math.cos(pitchRad);

    const arrayPanelW = array.orientation === 'portrait' ? panelW_px : panelL_px;
    const arrayPanelL = array.orientation === 'portrait' ? panelL_px : panelW_px;

    const totalWidth = array.columns * arrayPanelW;
    const totalHeight = array.rows * arrayPanelL;

    const corners: Point[] = [
        { x: -totalWidth / 2, y: -totalHeight / 2 },
        { x:  totalWidth / 2, y: -totalHeight / 2 },
        { x:  totalWidth / 2, y:  totalHeight / 2 },
        { x: -totalWidth / 2, y:  totalHeight / 2 },
    ];

    const angleRad = array.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    return corners.map(c => ({
        x: (c.x * cosA - c.y * sinA) + array.position.x,
        y: (c.x * sinA + c.y * cosA) + array.position.y,
    }));
};

const distance = (p1: Point, p2: Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

export const findSnap = (
    mousePos: Point,
    arrayToPlaceConfig: Omit<PVArrayItem, 'id' | 'position'>,
    existingArrays: PVArrayItem[],
    pvPanelConfig: PVPanelConfig,
    roofMasks: RoofMask[],
    scaleInfo: ScaleInfo,
    zoom: number
): { snappedPosition: Point; snapLines: { start: Point; end: Point }[] } | null => {
    if (!scaleInfo.ratio) return null;

    const SNAP_THRESHOLD = 15 / zoom;
    const ADJACENT_OFFSET = 0.1 / scaleInfo.ratio;

    let bestSnap: { dist: number; position: Point; lines: { start: Point; end: Point }[] } = {
        dist: Infinity,
        position: mousePos,
        lines: [],
    };

    const arrayToPlace: PVArrayItem = {
        id: 'preview',
        position: mousePos,
        ...arrayToPlaceConfig,
    };

    const cornersToPlaceInitial = getPVArrayCorners(arrayToPlace, pvPanelConfig, roofMasks, scaleInfo);
    if (cornersToPlaceInitial.length === 0) return null;

    for (const existing of existingArrays) {
        const existingCorners = getPVArrayCorners(existing, pvPanelConfig, roofMasks, scaleInfo);
        if (existingCorners.length === 0) continue;

        for (let i = 0; i < cornersToPlaceInitial.length; i++) {
            for (let j = 0; j < existingCorners.length; j++) {
                const dist = distance(cornersToPlaceInitial[i], existingCorners[j]);
                if (dist < SNAP_THRESHOLD && dist < bestSnap.dist) {
                    const dx = existingCorners[j].x - cornersToPlaceInitial[i].x;
                    const dy = existingCorners[j].y - cornersToPlaceInitial[i].y;
                    const snappedPosition = { x: mousePos.x + dx, y: mousePos.y + dy };
                    const finalCorners = getPVArrayCorners({ ...arrayToPlace, position: snappedPosition }, pvPanelConfig, roofMasks, scaleInfo);

                    bestSnap = {
                        dist,
                        position: snappedPosition,
                        lines: [{ start: finalCorners[i], end: existingCorners[j] }],
                    };
                }
            }
        }

        const { position: posEx, rotation: rotEx } = existing;
        const { rotation: rotNew } = arrayToPlace;

        if (Math.abs(rotEx - rotNew) % 90 === 0) {
            const exCorners = getPVArrayCorners(existing, pvPanelConfig, roofMasks, scaleInfo);
            const newCornersInitial = getPVArrayCorners(arrayToPlace, pvPanelConfig, roofMasks, scaleInfo);

            const exW = distance(exCorners[0], exCorners[1]);
            const exH = distance(exCorners[0], exCorners[3]);
            const newW = distance(newCornersInitial[0], newCornersInitial[1]);
            const newH = distance(newCornersInitial[0], newCornersInitial[3]);

            const angleRad = rotEx * Math.PI / 180;
            const cosA = Math.cos(angleRad);
            const sinA = Math.sin(angleRad);

            const rightVec = { x: cosA, y: sinA };
            const upVec = { x: -sinA, y: cosA };

            const offsets = [
                { x: rightVec.x * (exW / 2 + newW / 2 + ADJACENT_OFFSET), y: rightVec.y * (exW / 2 + newW / 2 + ADJACENT_OFFSET) },
                { x: -rightVec.x * (exW / 2 + newW / 2 + ADJACENT_OFFSET), y: -rightVec.y * (exW / 2 + newW / 2 + ADJACENT_OFFSET) },
                { x: -upVec.x * (exH / 2 + newH / 2 + ADJACENT_OFFSET), y: -upVec.y * (exH / 2 + newH / 2 + ADJACENT_OFFSET) },
                { x: upVec.x * (exH / 2 + newH / 2 + ADJACENT_OFFSET), y: upVec.y * (exH / 2 + newH / 2 + ADJACENT_OFFSET) },
            ];

            for (const offset of offsets) {
                const targetPos = { x: posEx.x + offset.x, y: posEx.y + offset.y };
                const dist = distance(mousePos, targetPos);
                if (dist < SNAP_THRESHOLD && dist < bestSnap.dist) {
                    bestSnap = {
                        dist,
                        position: targetPos,
                        lines: [],
                    };
                }
            }
        }
    }

    if (bestSnap.dist < SNAP_THRESHOLD) {
        return { snappedPosition: bestSnap.position, snapLines: bestSnap.lines };
    }

    return null;
};
