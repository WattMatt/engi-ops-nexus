// Core types for Floor Plan Markup Tool

export type DesignPurpose = 'Budget mark up' | 'Line shop measurements' | 'PV design';
export type CableType = 'MV' | 'LV/AC' | 'DC';
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';
export type PVOrientation = 'portrait' | 'landscape';

export interface Point {
  x: number;
  y: number;
}

export interface EquipmentItem {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label?: string;
  properties?: Record<string, any>;
}

export interface CableRoute {
  id: string;
  cableType: CableType;
  points: Point[];
  lengthMeters?: number;
  fromLabel?: string;
  toLabel?: string;
  terminationCount?: number;
  startHeight?: number;
  endHeight?: number;
  label?: string;
}

export interface ContainmentItem {
  id: string;
  type: string;
  points: Point[];
  lengthMeters?: number;
  size?: string;
}

export interface Zone {
  id: string;
  points: Point[];
  areaSqm?: number;
  label?: string;
}

export interface PVConfig {
  panelLengthM: number;
  panelWidthM: number;
  panelWattage: number;
}

export interface PVRoof {
  id: string;
  maskPoints: Point[];
  pitchDegrees?: number;
  azimuthDegrees?: number;
  highPoint?: Point;
  lowPoint?: Point;
}

export interface PVArray {
  id: string;
  roofId: string;
  rows: number;
  columns: number;
  orientation: PVOrientation;
  x: number;
  y: number;
  rotation: number;
}

export interface Task {
  id: string;
  itemType?: string;
  itemId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorPlanState {
  // PDF & Scale
  pdfFile: File | null;
  pdfDataUrl: string | null;
  scaleMetersPerPixel: number | null;
  
  // Design Purpose
  designPurpose: DesignPurpose | null;
  
  // Markup Items
  equipment: EquipmentItem[];
  cables: CableRoute[];
  containment: ContainmentItem[];
  zones: Zone[];
  
  // PV Specific
  pvConfig: PVConfig | null;
  pvRoofs: PVRoof[];
  pvArrays: PVArray[];
  
  // Tasks
  tasks: Task[];
  
  // UI State
  activeTool: string | null;
  selectedItem: { type: string; id: string } | null;
  canvasTransform: { x: number; y: number; scale: number };
}

export interface FloorPlanProject {
  id: string;
  userId: string;
  projectId?: string;
  name: string;
  designPurpose: DesignPurpose;
  pdfUrl?: string;
  scaleMetersPerPixel?: number;
  stateJson: any;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentSymbol {
  id: string;
  name: string;
  category: string;
  svgPath: string;
  defaultSize: { width: number; height: number }; // in meters
  color: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  icon: string;
  category: string;
  purposes: DesignPurpose[];
}
