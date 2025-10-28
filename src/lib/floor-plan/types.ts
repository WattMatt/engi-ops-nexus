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
  WATER_HEATER_CONTROL = 'Water Heater Control',
  STOVE_OUTLET = 'Stove Outlet',
  FAN = 'Ceiling Fan',
  EXTRACTOR_FAN = 'Extractor Fan',
  ELECTRIC_GATE = 'Electric Gate Control',
  BELL = 'Door Bell',
  SIREN = 'Siren',
  SMOKE_DETECTOR = 'Smoke Detector',
  SHAVER_SOCKET = 'Shaver Socket',
}

export enum Tool {
  SELECT = 'select',
  PAN = 'pan',
  SCALE = 'scale',
  LINE_MV = 'line_mv',
  LINE_LV = 'line_lv',
  LINE_DC = 'line_dc',
  ZONE = 'zone',

  // Equipment placement tools
  PLACE_RMU = 'place_rmu',
  PLACE_SUBSTATION = 'place_substation',
  PLACE_MAIN_BOARD = 'place_main_board',
  PLACE_SUB_BOARD = 'place_sub_board',
  PLACE_GENERATOR = 'place_generator',
  PLACE_POLE_LIGHT = 'place_pole_light',
  PLACE_INVERTER = 'place_inverter',
  PLACE_DC_COMBINER = 'place_dc_combiner',
  PLACE_AC_DISCONNECT = 'place_ac_disconnect',
  PLACE_GENERAL_LIGHT_SWITCH = 'place_general_light_switch',
  PLACE_DIMMER_SWITCH = 'place_dimmer_switch',
  PLACE_MOTION_SENSOR = 'place_motion_sensor',
  PLACE_TWO_WAY_LIGHT_SWITCH = 'place_2way_light_switch',
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
  PLACE_WATER_HEATER_CONTROL = 'place_water_heater_control',
  PLACE_STOVE_OUTLET = 'place_stove_outlet',
  PLACE_FAN = 'place_fan',
  PLACE_EXTRACTOR_FAN = 'place_extractor_fan',
  PLACE_ELECTRIC_GATE = 'place_electric_gate',
  PLACE_BELL = 'place_bell',
  PLACE_SIREN = 'place_siren',
  PLACE_SMOKE_DETECTOR = 'place_smoke_detector',
  PLACE_SHAVER_SOCKET = 'place_shaver_socket',

  // Containment tools
  TOOL_CABLE_TRAY = 'tool_cable_tray',
  TOOL_TELKOM_BASKET = 'tool_telkom_basket',
  TOOL_SECURITY_BASKET = 'tool_security_basket',
  TOOL_SLEEVES = 'tool_sleeves',
  TOOL_POWERSKIRTING = 'tool_powerskirting',
  TOOL_P2000_TRUNKING = 'tool_p2000_trunking',
  TOOL_P8000_TRUNKING = 'tool_p8000_trunking',
  TOOL_P9000_TRUNKING = 'tool_p9000_trunking',

  // PV Design tools
  TOOL_ROOF_MASK = 'tool_roof_mask',
  TOOL_PV_ARRAY = 'tool_pv_array',
}

export enum ContainmentType {
  CABLE_TRAY = 'Cable Tray',
  TELKOM_BASKET = 'Telkom Basket',
  SECURITY_BASKET = 'Security Basket',
  SLEEVES = 'Sleeves',
  POWERSKIRTING = 'Powerskirting',
  P2000_TRUNKING = 'P2000 Trunking',
  P8000_TRUNKING = 'P8000 Trunking',
  P9000_TRUNKING = 'P9000 Trunking',
}

export enum DesignPurpose {
  BUDGET_MARKUP = 'Budget mark up',
  LINE_SHOP = 'Line shop mark up',
  PV_DESIGN = 'PV Design',
  EXTERNAL_LIGHTING = 'External Lighting',
  CCTV_NETWORK = 'CCTV & Network',
  POWER_SOCKET_LAYOUT = 'Power & Socket Layout',
}

export enum PanelOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

export enum TaskStatus {
  TO_DO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}

export type MarkupToolCategory = 'general' | 'drawing' | 'containment' | 'equipment' | 'pv_design';

export const MARKUP_TOOL_CATEGORIES: Record<MarkupToolCategory, string> = {
  general: 'General',
  drawing: 'Drawing',
  containment: 'Containment',
  equipment: 'Equipment',
  pv_design: 'PV Design',
};

export interface Point {
  x: number;
  y: number;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  position: Point;
  rotation: number;
  label: string;
}

export interface SupplyLine {
  id: string;
  type: 'mv' | 'lv' | 'dc';
  points: Point[];
  from?: string;
  to?: string;
  label?: string;
  cableType?: string;
  terminationCount?: number;
  startHeight?: number;
  endHeight?: number;
}

export interface Containment {
  id: string;
  points: Point[];
  type: ContainmentType;
  size: string;
  label?: string;
}

export interface ScaleInfo {
  pixelDistance: number | null;
  realDistance: number | null;
  ratio: number | null;
  drawingRatio?: number | null;
}

export interface ViewState {
  zoom: number;
  offset: Point;
}

export interface PVPanelConfig {
  panelLengthMm: number;
  panelWidthMm: number;
  panelWattage: number;
}

export interface RoofMask {
  id: string;
  points: Point[];
  pitch: number;
  azimuth?: number;
}

export interface PVArrayItem {
  id: string;
  position: Point;
  roofMaskId: string;
  rows: number;
  columns: number;
  orientation: PanelOrientation;
  rotation: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string;
  linkedItemId?: string;
}

export interface Zone {
  id: string;
  points: Point[];
  label: string;
  color: string;
}

export interface BoQEntry {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  rate?: number;
  amount?: number;
}

export interface GeneratePdfParams {
  canvases: {
    pdf: HTMLCanvasElement | null;
    drawing: HTMLCanvasElement | null;
  };
  projectName: string;
  scaleInfo: ScaleInfo;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: Zone[];
  containment: Containment[];
  pvPanelConfig: PVPanelConfig | null;
  roofMasks: RoofMask[];
  pvArrays: PVArrayItem[];
  tasks: TaskItem[];
  designPurpose: DesignPurpose;
}

// Backward compatibility
export type Task = TaskItem;
export type SupplyZone = Zone;
