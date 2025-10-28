// Equipment icon sizes (in pixels)
export const ICON_SIZE = {
    DB: 30,
    PANEL: 25,
    LIGHT: 20,
    SWITCH: 18,
    SOCKET: 18,
    DATA: 16,
    EMERGENCY_LIGHT: 20,
    EXIT_SIGN: 22,
    SMOKE_DETECTOR: 18,
    HEAT_DETECTOR: 18,
    CALL_POINT: 18,
    SOUNDER: 16,
    BEACON: 16,
    PIR: 16,
    CAMERA: 20,
} as const;

// Tool colors for drawing
export const TOOL_COLORS = {
    LINE_LV: '#FF6B6B',
    LINE_MV: '#4ECDC4',
    LINE_DC: '#95E1D3',
    ROOF_MASK: 'rgba(52, 152, 219, 0.3)',
} as const;

// Equipment real-world sizes in meters
export const EQUIPMENT_REAL_WORLD_SIZES: Record<string, number | { w: number; h: number }> = {
    RMU: 1.5,
    SUBSTATION: { w: 2.0, h: 1.5 },
    MAIN_BOARD: { w: 1.0, h: 0.8 },
    SUB_BOARD: { w: 0.6, h: 0.8 },
    GENERATOR: 2.0,
    POLE_LIGHT: 0.5,
    INVERTER: { w: 0.6, h: 0.4 },
    DC_COMBINER: 0.5,
    AC_DISCONNECT: 0.4,
};

// Colors for different line types
export const LINE_COLORS = {
    lv: '#FF6B6B',      // Red for LV cables
    hv: '#4ECDC4',      // Cyan for HV cables
    data: '#95E1D3',    // Light green for data cables
    fire_alarm: '#F38181', // Pink for fire alarm cables
    zone: '#FFD93D',    // Yellow for zones
} as const;

// Colors for containment types
export const CONTAINMENT_COLORS = {
    tray: '#9B59B6',     // Purple for cable trays
    trunking: '#3498DB', // Blue for trunking
    conduit: '#E67E22',  // Orange for conduit
} as const;

// Canvas styling
export const CANVAS_BACKGROUND = '#1A1A1A';
export const GRID_COLOR = '#2A2A2A';
export const SCALE_LINE_COLOR = '#00FF00';
export const SELECTED_COLOR = '#FFFF00';
export const HOVER_COLOR = '#FFA500';

// Drawing settings
export const LINE_WIDTH = 2;
export const SELECTED_LINE_WIDTH = 3;
export const CONTAINMENT_LINE_WIDTH = 4;
export const MIN_LINE_SEGMENT_LENGTH = 5; // Minimum pixels between points
export const SNAP_DISTANCE = 10; // Pixels for snapping to existing points
export const ZOOM_SENSITIVITY = 0.1;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const PAN_SENSITIVITY = 1;

// PV Design Constants
export const PV_MASK_COLOR = 'rgba(52, 152, 219, 0.3)'; // Semi-transparent blue
export const PV_MASK_BORDER_COLOR = '#3498db';
export const PV_PANEL_COLOR = '#2c3e50';
export const PV_PANEL_BORDER_COLOR = '#34495e';
export const PV_ARRAY_SPACING = 2; // pixels between panels in array

// Task colors by status
export const TASK_STATUS_COLORS = {
    'To Do': '#6B7280',
    'In Progress': '#3B82F6',
    'Done': '#10B981',
} as const;

// Export formats
export const SUPPORTED_EXPORT_FORMATS = ['PDF'] as const;
export const PDF_MARGIN = 20; // mm
export const PDF_FONT_SIZE = 12;
export const PDF_TITLE_FONT_SIZE = 16;

// Local storage keys
export const STORAGE_KEYS = {
    LAST_PROJECT: 'floor_plan_last_project',
    AUTO_SAVE: 'floor_plan_auto_save',
    USER_PREFS: 'floor_plan_user_prefs',
} as const;
