export interface LightingFitting {
  id: string;
  project_id: string | null;
  fitting_code: string;
  manufacturer: string | null;
  model_name: string;
  fitting_type: string;
  wattage: number | null;
  lumen_output: number | null;
  color_temperature: number | null;
  cri: number | null;
  beam_angle: number | null;
  ip_rating: string | null;
  ik_rating: string | null;
  lifespan_hours: number | null;
  dimensions: string | null;
  weight: number | null;
  supply_cost: number;
  install_cost: number;
  category: string | null;
  subcategory: string | null;
  is_dimmable: boolean;
  driver_type: string | null;
  notes: string | null;
  warranty_years: number | null;
  warranty_terms: string | null;
  spec_sheet_url: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LightingScheduleItem {
  id: string;
  project_id: string;
  tenant_id: string | null;
  zone_name: string | null;
  fitting_id: string | null;
  quantity: number;
  total_wattage: number | null;
  total_lumens: number | null;
  notes: string | null;
  approval_status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fitting?: LightingFitting;
}

export const FITTING_TYPES = [
  { value: 'downlight', label: 'Downlight' },
  { value: 'linear', label: 'Linear' },
  { value: 'panel', label: 'Panel Light' },
  { value: 'highbay', label: 'Highbay' },
  { value: 'floodlight', label: 'Floodlight' },
  { value: 'streetlight', label: 'Street Light' },
  { value: 'bulkhead', label: 'Bulkhead' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'pendant', label: 'Pendant' },
  { value: 'wall', label: 'Wall Light' },
  { value: 'strip', label: 'Strip Light' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'exit_sign', label: 'Exit Sign' },
  { value: 'decorative', label: 'Decorative' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
] as const;

export const FITTING_CATEGORIES: Record<string, string[]> = {
  downlight: ['LED', 'Halogen', 'Recessed', 'Surface'],
  linear: ['Battens', 'Strip Lights', 'Trunking'],
  panel: ['Recessed', 'Surface', 'Suspended'],
  highbay: ['LED', 'Metal Halide', 'Industrial'],
  floodlight: ['Exterior', 'Interior', 'Area'],
  streetlight: ['Road', 'Pathway', 'Pole Mounted', 'Area'],
  bulkhead: ['Round', 'Square', 'Emergency'],
  spotlight: ['Track', 'Surface', 'Recessed'],
  pendant: ['Decorative', 'Industrial', 'Commercial'],
  wall: ['Sconces', 'Wall Washers', 'Up/Down'],
  strip: ['LED', 'RGB', 'Flexible'],
  emergency: ['Exit Signs', 'Emergency Packs', 'Combined'],
  exit_sign: ['LED', 'Illuminated', 'Photoluminescent'],
  decorative: ['Pendants', 'Chandeliers', 'Feature'],
  outdoor: ['Bollards', 'Post Tops', 'Wall Packs'],
  other: ['Custom', 'Specialty'],
};

export const COLOR_TEMPERATURES = [
  { value: 2700, label: '2700K (Warm White)' },
  { value: 3000, label: '3000K (Warm White)' },
  { value: 4000, label: '4000K (Cool White)' },
  { value: 5000, label: '5000K (Daylight)' },
  { value: 6500, label: '6500K (Cool Daylight)' },
];

export const IP_RATINGS = [
  'IP20', 'IP40', 'IP44', 'IP54', 'IP65', 'IP66', 'IP67', 'IP68'
];

export const IK_RATINGS = [
  'IK00', 'IK01', 'IK02', 'IK03', 'IK04', 'IK05', 
  'IK06', 'IK07', 'IK08', 'IK09', 'IK10'
];

export const DRIVER_TYPES = [
  'Constant Current',
  'Constant Voltage', 
  'DALI',
  'DALI-2',
  '0-10V',
  'Triac',
  'Non-Dimmable',
];
