export type DesignPurpose = "general" | "budget_markup" | "pv_design" | "line_shop";

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

export type EquipmentType =
  | "main-board"
  | "sub-board"
  | "generator"
  | "inverter"
  | "light-switch"
  | "double-socket"
  | "single-socket"
  | "cctv"
  | "data-outlet"
  | "light-point"
  | "emergency-light"
  | "fan"
  | "air-conditioner";

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
  properties?: Record<string, any>;
}

export interface CableRoute {
  id: string;
  type: "mv" | "lv" | "dc";
  points: { x: number; y: number }[];
  cableType?: CableType;
  supplyFrom?: string;
  supplyTo?: string;
  color?: string;
  lengthMeters?: number;
}

export interface Zone {
  id: string;
  type: "supply" | "exclusion" | "roof";
  points: { x: number; y: number }[];
  name?: string;
  color?: string;
  areaSqm?: number;
  roofPitch?: number;
  roofAzimuth?: number;
}

export interface ContainmentRoute {
  id: string;
  type: "cable-tray" | "telkom-basket" | "security-basket" | "sleeves" | "powerskirting" | "p2000" | "p8000" | "p9000";
  points: { x: number; y: number }[];
  size?: ContainmentSize;
  lengthMeters?: number;
}

export interface PVArray {
  id: string;
  x: number;
  y: number;
  rows: number;
  columns: number;
  rotation: number;
  orientation: "portrait" | "landscape";
}

export interface ProjectData {
  equipment: EquipmentItem[];
  cables: CableRoute[];
  zones: Zone[];
  containment: ContainmentRoute[];
  pvArrays: PVArray[];
}
