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
  SLEEVES = 'Sleeves',
  POWERSKIRTING = 'Powerskirting',
  P2000_TRUNKING = 'P2000 Trunking',
  P8000_TRUNKING = 'P8000 Trunking',
  P9000_TRUNKING = 'P9000 Trunking',
}

export interface Point {
  x: number;
  y: number;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  position: Point;
  rotation: number;
  name?: string;
}

export interface SupplyLine {
  id:string;
  name: string;
  type: 'mv' | 'lv' | 'dc';
  points: Point[];
  length: number;
  pathLength?: number;
  from?: string;
  to?: string;
  cableType?: string;
  terminationCount?: number;
  // FIX: Added missing properties to match frontend type
  label?: string;
  startHeight?: number;
  endHeight?: number;
}

export interface SupplyZone {
  id: string;
  name: string;
  points: Point[];
  color: string;
  area: number;
}

export interface Containment {
  id: string;
  type: ContainmentType;
  size: string;
  points: Point[];
  length: number;
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
