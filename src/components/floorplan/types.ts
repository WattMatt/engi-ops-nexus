export type DesignPurpose = "budget_markup" | "line_shop" | "pv_design" | "prelim_design" | "cable_schedule" | "final_account";

export type Tool = 
  | "select" 
  | "pan" 
  | "scale"
  | "rotate"
  | "snap"
  | "line-mv"
  | "line-lv"
  | "line-dc"
  | "zone"
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

export interface Point {
  x: number;
  y: number;
}

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
  
  // Lighting & Switches
  | "light-switch"
  | "dimmer-switch"
  | "two-way-switch"
  | "watertight-switch"
  | "motion-sensor"
  | "led-strip"
  | "ceiling-light"
  | "wall-light"
  | "recessed-600x600"
  | "recessed-1200x600"
  | "floodlight"
  | "photo-cell"
  
  // Sockets & Outlets
  | "16a-socket"
  | "double-socket"
  | "clean-power-outlet"
  | "ups-socket"
  | "emergency-socket"
  | "data-outlet"
  | "telephone-outlet"
  | "single-phase-outlet"
  | "three-phase-outlet"
  | "tv-outlet"
  | "flush-floor-outlet"
  
  // Other Building Services
  | "distribution-board"
  | "cctv"
  | "manhole"
  | "drawbox-50mm"
  | "drawbox-100mm";

export type CableType = "1.5mm" | "2.5mm" | "4mm" | "6mm" | "10mm" | "16mm" | "25mm" | "35mm";
export type ContainmentSize = "50mm" | "100mm" | "150mm" | "200mm" | "300mm" | "450mm" | "600mm";

export interface ScaleCalibration {
  metersPerPixel: number;
  isSet: boolean;
}

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  x: number;
  y: number;
  rotation: number;
  name?: string;
  properties?: Record<string, any>;
}

export interface CableRoute {
  id: string;
  type: "mv" | "lv" | "dc";
  points: Point[];
  cableType?: CableType;
  cableSize?: string;
  cableSpec?: string;
  supplyFrom?: string;
  supplyTo?: string;
  color?: string;
  lengthMeters?: number;
  pathLength?: number;
  startHeight?: number;
  endHeight?: number;
  label?: string;
}

export interface SupplyLine extends CableRoute {}

export interface Zone {
  id: string;
  type: "supply" | "exclusion" | "roof";
  points: Point[];
  name: string;
  color?: string;
  areaSqm?: number;
  roofPitch?: number;
  roofAzimuth?: number;
}

export interface SupplyZone extends Zone {}

export interface RoofMask {
  id: string;
  points: Point[];
  pitch?: number;
  direction?: number;
  areaSqm?: number;
  usableAreaSqm?: number;
  name: string;
}

export interface ContainmentRoute {
  id: string;
  type: "cable-tray" | "telkom-basket" | "security-basket" | "sleeves" | "powerskirting" | "p2000" | "p8000" | "p9000";
  points: Point[];
  size?: ContainmentSize;
  lengthMeters?: number;
}

export interface Containment extends ContainmentRoute {}

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
  length: number;
  width: number;
  wattage: number;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  assigned_to: string;
  status: string;
  due_date?: string;
  linked_item_id?: string;
  linked_item_type?: string;
}

export interface ProjectData {
  equipment: EquipmentItem[];
  cables: CableRoute[];
  zones: Zone[];
  containment: ContainmentRoute[];
  pvArrays: PVArray[];
}

export interface DesignState {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  roofMasks: RoofMask[];
  pvArrays: PVArray[];
  tasks: Task[];
}

export interface ScaleInfo {
  point1: Point | null;
  point2: Point | null;
  realMeters: number;
  metersPerPixel: number;
  isSet: boolean;
}

export interface ViewState {
  zoom: number;
  pan: Point;
}
