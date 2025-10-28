export enum Tool {
    PAN = 'PAN',
    SCALE = 'SCALE',
    SELECT = 'SELECT',
    RULER = 'RULER',
    DRAW_SCALE = 'DRAW_SCALE',
    DRAW_CABLE = 'DRAW_CABLE',
    DRAW_ZONE = 'DRAW_ZONE',
    DRAW_CONTAINMENT = 'DRAW_CONTAINMENT',
    DRAW_ROOF_MASK = 'DRAW_ROOF_MASK',
    PLACE_PV_ARRAY = 'PLACE_PV_ARRAY',
    PLACE_EQUIPMENT = 'PLACE_EQUIPMENT',
    DELETE = 'DELETE',
    // Budget Markup Tools
    TOOL_DB = 'TOOL_DB',
    TOOL_PANEL = 'TOOL_PANEL',
    TOOL_LIGHT = 'TOOL_LIGHT',
    TOOL_SWITCH = 'TOOL_SWITCH',
    TOOL_SOCKET = 'TOOL_SOCKET',
    TOOL_DATA = 'TOOL_DATA',
    TOOL_EMERGENCY_LIGHT = 'TOOL_EMERGENCY_LIGHT',
    TOOL_EXIT_SIGN = 'TOOL_EXIT_SIGN',
    TOOL_SMOKE_DETECTOR = 'TOOL_SMOKE_DETECTOR',
    TOOL_HEAT_DETECTOR = 'TOOL_HEAT_DETECTOR',
    TOOL_CALL_POINT = 'TOOL_CALL_POINT',
    TOOL_SOUNDER = 'TOOL_SOUNDER',
    TOOL_BEACON = 'TOOL_BEACON',
    TOOL_PIR = 'TOOL_PIR',
    TOOL_CAMERA = 'TOOL_CAMERA',
    TOOL_CABLE_LV = 'TOOL_CABLE_LV',
    TOOL_CABLE_HV = 'TOOL_CABLE_HV',
    TOOL_CABLE_DATA = 'TOOL_CABLE_DATA',
    TOOL_CABLE_FIRE_ALARM = 'TOOL_CABLE_FIRE_ALARM',
    TOOL_CONTAINMENT_TRAY = 'TOOL_CONTAINMENT_TRAY',
    TOOL_CONTAINMENT_TRUNKING = 'TOOL_CONTAINMENT_TRUNKING',
    TOOL_CONTAINMENT_CONDUIT = 'TOOL_CONTAINMENT_CONDUIT',
    TOOL_ZONE = 'TOOL_ZONE',
    // PV Design Tools
    TOOL_ROOF_MASK = 'TOOL_ROOF_MASK',
    TOOL_ROOF_DIRECTION = 'TOOL_ROOF_DIRECTION',
    TOOL_PV_ARRAY = 'TOOL_PV_ARRAY',
}

export interface Point {
    x: number;
    y: number;
}

export interface EquipmentItem {
    id: string;
    type: string;
    x: number;
    y: number;
    label?: string;
    rotation?: number;
}

export enum LineType {
    LV = 'lv',
    HV = 'hv',
    DATA = 'data',
    FIRE_ALARM = 'fire_alarm',
}

export interface SupplyLine {
    id: string;
    type?: LineType;
    points: Point[];
    from: string;
    to: string;
    fromLabel?: string;
    toLabel?: string;
    length: number | null;
    cableType: string;
    startHeight: number;
    endHeight: number;
    terminationCount: number;
    label?: string;
}

export interface SupplyZone {
    id: string;
    points: Point[];
    label?: string;
    area?: number;
}

export enum ContainmentType {
    TRAY = 'tray',
    TRUNKING = 'trunking',
    CONDUIT = 'conduit'
}

export interface Containment {
    id: string;
    type: ContainmentType;
    points: Point[];
    length?: number;
    size?: string;
}

export interface ScaleInfo {
    metersPerPixel: number;
    referenceLineStart: Point;
    referenceLineEnd: Point;
    referenceDistanceMeters: number;
    pixelDistance?: number | null;
    realDistance?: number | null;
    ratio?: number | null;
}

export interface ViewState {
    zoom: number;
    offset: Point;
}

export enum DesignPurpose {
    BUDGET_MARKUP = 'Budget Markup',
    PV_DESIGN = 'PV Design',
}

export interface PVPanelConfig {
    panelWidthM: number;
    panelLengthM: number;
    panelWattage: number;
}

export interface RoofMask {
    id: string;
    maskPoints: Point[];
    lowPoint?: Point;
    highPoint?: Point;
    pitchDegrees?: number;
    azimuthDegrees?: number;
}

export interface PVArrayItem {
    id: string;
    x: number;
    y: number;
    rows: number;
    cols: number;
    orientation: 'portrait' | 'landscape';
    rotation?: number;
    roofId: string;
}

export enum TaskStatus {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    DONE = 'Done',
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignee?: string;
    assignedTo?: string;
    itemType?: string;
    itemId?: string;
}

export type MarkupToolCategory = 'general' | 'drawing' | 'equipment' | 'containment' | 'lighting_sockets' | 'other_equipment';
export const MARKUP_TOOL_CATEGORIES: MarkupToolCategory[] = ['general', 'drawing', 'equipment', 'containment', 'lighting_sockets', 'other_equipment'];
