export type DesignPurpose = 
  | "budget_markup" 
  | "pv_design" 
  | "line_shop" 
  | "prelim_design" 
  | "cable_schedule" 
  | "final_account";

export type Tool = 
  | "select" 
  | "pan" 
  | "scale"
  | "rotate"
  | "snap"
  | "line-mv"
  | "line-lv"
  | "line-dc"
  | "line-ac"
  | "zone"
  | "exclusion-zone"
  | "roof-mask"
  | "cable-tray"
  | "telkom-basket"
  | "security-basket"
  | "sleeves"
  | "powerskirting"
  | "p2000"
  | "p8000"
  | "p9000"
  | "pv-array"
  | EquipmentType;

export type EquipmentType =
  // High-Level Equipment (Budget Markup, Prelim Design)
  | "rmu"
  | "miniature-substation"
  | "main-board"
  | "sub-board"
  | "generator"
  | "pole-light"
  
  // PV Design Equipment
  | "inverter"
  | "dc-combiner-box"
  | "ac-disconnect"
  
  // Lighting & Switches (Line Shop)
  | "surface-light"
  | "downlight"
  | "emergency-light"
  | "exit-light"
  | "bulkhead"
  | "floodlight"
  | "wallpack"
  | "led-strip"
  | "switch"
  | "dimmer-switch"
  | "two-way-switch"
  | "motion-sensor"
  | "photo-cell"
  
  // Sockets & Outlets (Line Shop)
  | "single-socket"
  | "double-socket"
  | "16a-socket"
  | "industrial-socket"
  | "clean-power-outlet"
  | "ups-socket"
  | "floor-outlet"
  | "data-outlet"
  | "telephone-outlet"
  | "tv-outlet"
  
  // Other Equipment (Line Shop)
  | "distribution-board"
  | "isolator"
  | "cctv"
  | "access-control"
  | "fire-detector"
  | "call-point"
  | "sounder"
  | "manhole"
  | "drawbox";

export type CableSize = "4mm²" | "6mm²" | "10mm²" | "16mm²" | "25mm²" | "35mm²" | "50mm²" | "70mm²" | "95mm²" | "120mm²" | "150mm²" | "185mm²" | "240mm²";
export type ContainmentSize = "50mm" | "75mm" | "100mm" | "150mm" | "200mm" | "300mm" | "450mm" | "600mm";

export interface Point {
  x: number;
  y: number;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  x: number;
  y: number;
  rotation: number;
  properties: Record<string, any>;
}

export interface SupplyLine {
  id: string;
  type: "mv" | "lv" | "dc" | "ac";
  points: Point[];
  lengthMeters?: number;
  cableSize?: CableSize;
  cableType?: string;
  cableSpec?: string;
  supplyFrom?: string;
  supplyTo?: string;
  terminations?: number;
  startHeight?: number;
  endHeight?: number;
  label?: string;
  color?: string;
}

export interface Zone {
  id: string;
  type: "supply" | "exclusion" | "roof";
  points: Point[];
  name: string;
  color?: string;
  areaSqm?: number;
}

export interface Containment {
  id: string;
  type: "cable-tray" | "telkom-basket" | "security-basket" | "sleeves" | "powerskirting" | "p2000" | "p8000" | "p9000";
  points: Point[];
  size?: ContainmentSize;
  lengthMeters?: number;
}

export interface RoofMask {
  id: string;
  points: Point[];
  areaSqm?: number;
  usableAreaSqm?: number;
  pitch?: number;
  direction?: number;
  name: string;
}

export interface PVArray {
  id: string;
  x: number;
  y: number;
  rows: number;
  columns: number;
  rotation: number;
  orientation: "portrait" | "landscape";
  totalPanels: number;
  totalWattage: number;
}

export interface PVPanelConfig {
  length: number; // meters
  width: number; // meters
  wattage: number;
}

export interface ProjectData {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: Zone[];
  containment: Containment[];
  roofMasks: RoofMask[];
  pvArrays: PVArray[];
}

export interface HistoryAction {
  type: 'add' | 'delete' | 'modify' | 'move';
  target: 'equipment' | 'line' | 'zone' | 'containment' | 'roof-mask' | 'pv-array';
  id: string;
  data: any;
  previousData?: any;
}

export interface ScaleCalibration {
  point1: Point | null;
  point2: Point | null;
  realMeters: number;
  metersPerPixel: number;
  isSet: boolean;
}
