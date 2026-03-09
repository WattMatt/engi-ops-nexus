// Takeoff digitization types

export interface TakeoffCatalogItem {
  id: string;
  item_code: string | null;
  category: string;
  sub_category: string | null;
  name: string;
  description: string | null;
  conduit_size: string | null;
  conduit_type: string | null;
  unit: string;
  default_vertical_drop: number;
  waste_percentage: number;
}

export interface TakeoffAssembly {
  id: string;
  name: string;
  icon_svg: string | null;
  color: string;
  items?: TakeoffAssemblyItem[];
}

export interface TakeoffAssemblyItem {
  id: string;
  assembly_id: string;
  catalog_id: string;
  quantity: number;
  catalog?: TakeoffCatalogItem;
}

export interface Takeoff {
  id: string;
  project_id: string;
  drawing_id: string | null;
  name: string;
  scale_ratio: number | null;
  measurement_unit: string;
  status: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TakeoffZone {
  id: string;
  takeoff_id: string;
  name: string;
  polygon: { x: number; y: number }[];
  color: string;
}

export interface TakeoffMeasurement {
  id: string;
  takeoff_id: string;
  type: 'count' | 'linear';
  assembly_id: string | null;
  catalog_id: string | null;
  zone_id: string | null;
  remarks: string | null;
  source_reference: string | null;
  x_pos: number | null;
  y_pos: number | null;
  points: { x: number; y: number }[] | null;
  measured_length: number | null;
  final_quantity: number | null;
  vertical_drop_total: number;
  waste_added: number;
  created_at: string;
}

export type TakeoffTool = 'select' | 'scale' | 'count' | 'linear' | 'zone';

export interface ScaleCalibration {
  point1: { x: number; y: number } | null;
  point2: { x: number; y: number } | null;
  realWorldDistance: number | null;
}

export interface BOMLine {
  description: string;
  conduitSize: string;
  conduitType: string;
  location: string;
  quantity: number;
  unit: string;
  remarks: string;
  source: string;
}
