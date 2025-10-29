
export enum EquipmentType {
  // General
  RMU = 'Ring Main Unit',
  SUBSTATION = 'Miniature Substation',
  MAIN_BOARD = 'Main Board',
  SUB_BOARD = 'Sub Board',
  GENERATOR = 'Generator',
  POLE_LIGHT = 'Pole Light',

  // PV Design
  INVERTER = 'Inverter',
  DC_COMBINER = 'DC Combiner Box',
  AC_DISCONNECT = 'AC Disconnect',

  // Line Shop Markups
  GENERAL_LIGHT_SWITCH = 'General Light Switch',
  DIMMER_SWITCH = 'Dimmer Switch',
  MOTION_SENSOR = 'Ceiling Mounted Motion Sensor',
  TWO_WAY_LIGHT_SWITCH = '2-Way Light Switch',
  WATERTIGHT_LIGHT_SWITCH = 'Watertight Light Switch',
  LED_STRIP_LIGHT = 'LED Strip Light',
  FLUORESCENT_2_TUBE = '2-Tube Surface Mounted Fluorescent',
  FLUORESCENT_1_TUBE = 'Single Surface Mounted Fluorescent',
  CEILING_FLOODLIGHT = 'Ceiling Mounted Floodlight',
  CEILING_LIGHT = 'Ceiling Mounted Light Fitting',
  POLE_MOUNTED_LIGHT = 'Pole Mounted Light Fitting',
  WALL_MOUNTED_LIGHT = 'Wall Mounted Light Fitting',
  RECESSED_LIGHT_600 = '600x600mm Recessed Light',
  RECESSED_LIGHT_1200 = '1200x600mm Recessed Light',
  FLOODLIGHT = 'Floodlight',
  PHOTO_CELL = 'Photo Cell',
  FLUSH_FLOOR_OUTLET = 'Flush Floor Outlet',
  BOX_FLUSH_FLOOR = '100x100mm Box Flush Floor',
  SOCKET_16A = '16A Switched Socketed Outlet',
  SOCKET_DOUBLE = 'Double Switched Socket Outlet',
  CLEAN_POWER_OUTLET = 'Clean Power Outlet',
  EMERGENCY_SOCKET = '16A Emergency Switched Socket',
  UPS_SOCKET = 'Blue UPS Switched Socket',
  DATA_SOCKET = 'Data Socket Outlet',
  TELEPHONE_OUTLET = 'Telephone Outlet Point',
  SINGLE_PHASE_OUTLET = 'Single Phase Outlet',
  THREE_PHASE_OUTLET = 'Three Phase Outlet',
  SOCKET_16A_TP = '16A TP (5pin) Socket Outlet',
  GEYSER_OUTLET = 'Geyser Outlet',
  TV_OUTLET = 'TV Outlet Point',
  MANHOLE = '1000x1000mm Manhole',
  DISTRIBUTION_BOARD = 'Electrical Distribution Board',
  TELEPHONE_BOARD = 'Telephone Board',
  AC_CONTROLLER_BOX = 'AC Controller Draw Box',
  BREAK_GLASS_UNIT = 'Break Glass Unit',
  DRAWBOX_50 = '50mm Drawbox',
  DRAWBOX_100 = '100mm Drawbox',
  WORKSTATION_OUTLET = 'Workstation Outlet',
  CCTV_CAMERA = 'CCTV Camera',
}

export enum ContainmentType {
  TELKOM_BASKET = 'Telkom Wire Basket',
  SECURITY_BASKET = 'Security Wire Basket',
  CABLE_TRAY = 'Cable Tray',
  // Line Shop
  SLEEVES = 'Sleeves',
  POWERSKIRTING = 'Powerskirting',
  P2000_TRUNKING = 'P2000 Trunking',
  P8000_TRUNKING = 'P8000 Trunking',
  P9000_TRUNKING = 'P9000 Trunking',
}

export enum Tool {
  SELECT = 'select',
  PAN = 'pan',
  SCALE = 'scale',
  LINE_MV = 'line_mv',
  LINE_LV = 'line_lv', // Also used for general AC
  LINE_DC = 'line_dc',
  ZONE = 'zone',
  
  // General Equipment
  PLACE_RMU = 'place_rmu',
  PLACE_SUBSTATION = 'place_substation',
  PLACE_MAIN_BOARD = 'place_main_board',
  PLACE_SUB_BOARD = 'place_sub_board',
  PLACE_GENERATOR = 'place_generator',
  PLACE_POLE_LIGHT = 'place_pole_light',

  // PV Tools
  TOOL_ROOF_MASK = 'tool_roof_mask',
  TOOL_ROOF_DIRECTION = 'tool_roof_direction',
  TOOL_PV_ARRAY = 'tool_pv_array',
  PLACE_INVERTER = 'place_inverter',
  PLACE_DC_COMBINER = 'place_dc_combiner',
  PLACE_AC_DISCONNECT = 'place_ac_disconnect',
  
  // Containment
  TOOL_TELKOM_BASKET = 'tool_telkom_basket',
  TOOL_SECURITY_BASKET = 'tool_security_basket',
  TOOL_CABLE_TRAY = 'tool_cable_tray',
  TOOL_SLEEVES = 'tool_sleeves',
  TOOL_POWERSKIRTING = 'tool_powerskirting',
  TOOL_P2000_TRUNKING = 'tool_p2000_trunking',
  TOOL_P8000_TRUNKING = 'tool_p8000_trunking',
  TOOL_P9000_TRUNKING = 'tool_p9000_trunking',

  // Line Shop Equipment
  PLACE_GENERAL_LIGHT_SWITCH = 'place_general_light_switch',
  PLACE_DIMMER_SWITCH = 'place_dimmer_switch',
  PLACE_MOTION_SENSOR = 'place_motion_sensor',
  PLACE_TWO_WAY_LIGHT_SWITCH = 'place_two_way_light_switch',
  PLACE_WATERTIGHT_LIGHT_SWITCH = 'place_watertight_light_switch',
  PLACE_LED_STRIP_LIGHT = 'place_led_strip_light',
  PLACE_FLUORESCENT_2_TUBE = 'place_fluorescent_2_tube',
  PLACE_FLUORESCENT_1_TUBE = 'place_fluorescent_1_tube',
  PLACE_CEILING_FLOODLIGHT = 'place_ceiling_floodlight',
  PLACE_CEILING_LIGHT = 'place_ceiling_light',
  PLACE_POLE_MOUNTED_LIGHT = 'place_pole_mounted_light',
  PLACE_WALL_MOUNTED_LIGHT = 'place_wall_mounted_light',
  PLACE_RECESSED_LIGHT_600 = 'place_recessed_light_600',
  PLACE_RECESSED_LIGHT_1200 = 'place_recessed_light_1200',
  PLACE_FLOODLIGHT = 'place_floodlight',
  PLACE_PHOTO_CELL = 'place_photo_cell',
  PLACE_FLUSH_FLOOR_OUTLET = 'place_flush_floor_outlet',
  PLACE_BOX_FLUSH_FLOOR = 'place_box_flush_floor',
  PLACE_SOCKET_16A = 'place_socket_16a',
  PLACE_SOCKET_DOUBLE = 'place_socket_double',
  PLACE_CLEAN_POWER_OUTLET = 'place_clean_power_outlet',
  PLACE_EMERGENCY_SOCKET = 'place_emergency_socket',
  PLACE_UPS_SOCKET = 'place_ups_socket',
  PLACE_DATA_SOCKET = 'place_data_socket',
  PLACE_TELEPHONE_OUTLET = 'place_telephone_outlet',
  PLACE_SINGLE_PHASE_OUTLET = 'place_single_phase_outlet',
  PLACE_THREE_PHASE_OUTLET = 'place_three_phase_outlet',
  PLACE_SOCKET_16A_TP = 'place_socket_16a_tp',
  PLACE_GEYSER_OUTLET = 'place_geyser_outlet',
  PLACE_TV_OUTLET = 'place_tv_outlet',
  PLACE_MANHOLE = 'place_manhole',
  PLACE_DISTRIBUTION_BOARD = 'place_distribution_board',
  PLACE_TELEPHONE_BOARD = 'place_telephone_board',
  PLACE_AC_CONTROLLER_BOX = 'place_ac_controller_box',
  PLACE_BREAK_GLASS_UNIT = 'place_break_glass_unit',
  PLACE_DRAWBOX_50 = 'place_drawbox_50',
  PLACE_DRAWBOX_100 = 'place_drawbox_100',
  PLACE_WORKSTATION_OUTLET = 'place_workstation_outlet',
  PLACE_CCTV_CAMERA = 'place_cctv_camera',
}

export enum DesignPurpose {
  BUDGET_MARKUP = 'Budget mark up',
  LINE_SHOP_MEASUREMENTS = 'Line shop measurements',
  PV_DESIGN = 'PV design',
  PRELIM_DESIGN_MARKUP = 'Prelim design mark up',
  CABLE_SCHEDULE_MARKUP = 'Cable Schedule Markup',
  FINAL_ACCOUNT_MARKUP = 'Final Account Markup',
}

export type MarkupToolCategory = 'general' | 'drawing' | 'equipment' | 'containment' | 'lighting_sockets' | 'other_equipment';

export const MARKUP_TOOL_CATEGORIES: MarkupToolCategory[] = [
  'general',
  'drawing',
  'equipment',
  'containment',
  'lighting_sockets',
  'other_equipment'
];

export interface Point {
  x: number;
  y: number;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  position: Point;
  rotation: number; // in degrees
  name?: string;
}

export interface SupplyLine {
  id:string;
  name: string;
  label?: string;
  type: 'mv' | 'lv' | 'dc';
  points: Point[];
  length: number; // This will now be TOTAL length (path + heights)
  pathLength?: number; // The 2D length on the drawing
  from?: string;
  to?: string;
  cableType?: string;
  terminationCount?: number;
  startHeight?: number;
  endHeight?: number;
}

export interface SupplyZone {
  id: string;
  name: string;
  points: Point[];
  color: string;
  area: number; // in square meters
}

export interface Containment {
  id: string;
  type: ContainmentType;
  size: string;
  points: Point[];
  length: number;
}

export interface ViewState {
    zoom: number;
    offset: Point;
}

export interface ScaleInfo {
    pixelDistance: number | null;
    realDistance: number | null;
    ratio: number | null; // meters per pixel
}

export interface PVPanelConfig {
    width: number;  // in meters
    length: number; // in meters
    wattage: number; // in watts peak
}

export interface RoofMask {
    id: string;
    points: Point[];
    pitch: number;    // in degrees
    direction: number; // in degrees (azimuth)
}

export type PanelOrientation = 'portrait' | 'landscape';

export interface PVArrayItem {
    id: string;
    position: Point;
    rows: number;
    columns: number;
    orientation: PanelOrientation;
    rotation: number; // in degrees, overall rotation of the array
}

export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Completed',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  linkedItemId: string; // ID of EquipmentItem or SupplyZone
}

export interface GeneratePdfParams {
  canvases: {
    pdf: HTMLCanvasElement | null;
    drawing: HTMLCanvasElement | null;
  };
  projectName: string;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  scaleInfo: ScaleInfo;
  roofMasks: RoofMask[];
  tasks: Task[];
  comments?: string;
  // PV Specific
  pvPanelConfig?: PVPanelConfig | null;
  pvArrays?: PVArrayItem[];
}
