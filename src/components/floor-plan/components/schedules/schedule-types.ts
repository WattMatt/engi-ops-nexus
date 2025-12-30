// Schedule Types and Type Mark Definitions

import { EquipmentType, ContainmentType } from '../../types';

// Type Mark mappings for fixtures
export const FIXTURE_TYPE_MARKS: Record<string, { mark: string; description: string; category: string }> = {
  // Power Fixtures (F-series)
  [EquipmentType.SOCKET_16A]: { mark: 'F1', description: '16A Switched Socket Outlet, Single, Surface/Flush Mounted', category: 'Power' },
  [EquipmentType.SOCKET_DOUBLE]: { mark: 'F2', description: 'Double Switched Socket Outlet, 2x16A, Surface/Flush Mounted', category: 'Power' },
  [EquipmentType.EMERGENCY_SOCKET]: { mark: 'F3', description: '16A Emergency Switched Socket, Red, with LED Indicator', category: 'Power' },
  [EquipmentType.UPS_SOCKET]: { mark: 'F4', description: 'Blue UPS Switched Socket Outlet, 16A, Dedicated UPS Feed', category: 'Power' },
  [EquipmentType.CLEAN_POWER_OUTLET]: { mark: 'F5', description: 'Clean Power Outlet, Orange, Isolated Earth', category: 'Power' },
  [EquipmentType.SINGLE_PHASE_OUTLET]: { mark: 'F6', description: 'Single Phase Outlet, 16A, 230V', category: 'Power' },
  [EquipmentType.THREE_PHASE_OUTLET]: { mark: 'F7', description: 'Three Phase Outlet, 32A, 400V, 5-Pin', category: 'Power' },
  [EquipmentType.SOCKET_16A_TP]: { mark: 'F8', description: '16A TP (5-Pin) Socket Outlet, Industrial Type', category: 'Power' },
  [EquipmentType.GEYSER_OUTLET]: { mark: 'F9', description: 'Geyser Outlet, 20A, with Isolator Switch', category: 'Power' },
  [EquipmentType.FLUSH_FLOOR_OUTLET]: { mark: 'F10', description: 'Flush Floor Outlet, Stainless Steel Cover', category: 'Power' },
  [EquipmentType.BOX_FLUSH_FLOOR]: { mark: 'F11', description: '100x100mm Box Flush Floor, Cast Iron', category: 'Power' },
  [EquipmentType.WORKSTATION_OUTLET]: { mark: 'F12', description: 'Workstation Outlet, 4x16A + 2xData', category: 'Power' },
  
  // Data Fixtures (D-series)
  [EquipmentType.DATA_SOCKET]: { mark: 'D1', description: 'Data Socket Outlet, Cat6A, Dual RJ45', category: 'Data' },
  [EquipmentType.TELEPHONE_OUTLET]: { mark: 'D2', description: 'Telephone Outlet Point, RJ11', category: 'Data' },
  [EquipmentType.TV_OUTLET]: { mark: 'D3', description: 'TV Outlet Point, F-Type Coaxial', category: 'Data' },
  [EquipmentType.CCTV_CAMERA]: { mark: 'D4', description: 'CCTV Camera, IP Type, PoE Powered', category: 'Data' },
};

// Type Mark mappings for lighting fixtures
export const LIGHTING_TYPE_MARKS: Record<string, { mark: string; description: string; wattage?: number; lumens?: number; cct?: string }> = {
  [EquipmentType.RECESSED_LIGHT_600]: { mark: 'A', description: '600x600 LED Panel, 40W, 4000K, 4000lm', wattage: 40, lumens: 4000, cct: '4000K' },
  [EquipmentType.RECESSED_LIGHT_1200]: { mark: 'B', description: '1200x600 LED Panel, 72W, 4000K, 7200lm', wattage: 72, lumens: 7200, cct: '4000K' },
  [EquipmentType.CEILING_LIGHT]: { mark: 'C', description: 'Ceiling Mounted Light Fitting, Surface, LED 18W', wattage: 18, lumens: 1800, cct: '4000K' },
  [EquipmentType.LED_STRIP_LIGHT]: { mark: 'D', description: 'LED Strip Light, 14.4W/m, 4000K, Aluminium Profile', wattage: 14.4, lumens: 1200, cct: '4000K' },
  [EquipmentType.FLUORESCENT_2_TUBE]: { mark: 'E', description: '2-Tube Surface Mounted Fluorescent, 2x36W', wattage: 72, lumens: 6400, cct: '4000K' },
  [EquipmentType.FLUORESCENT_1_TUBE]: { mark: 'F', description: 'Single Surface Mounted Fluorescent, 1x36W', wattage: 36, lumens: 3200, cct: '4000K' },
  [EquipmentType.CEILING_FLOODLIGHT]: { mark: 'G', description: 'Ceiling Mounted Floodlight, LED 50W, IP65', wattage: 50, lumens: 5000, cct: '5000K' },
  [EquipmentType.WALL_MOUNTED_LIGHT]: { mark: 'H', description: 'Wall Mounted Light Fitting, LED 12W, IP44', wattage: 12, lumens: 1000, cct: '3000K' },
  [EquipmentType.POLE_MOUNTED_LIGHT]: { mark: 'I', description: 'Pole Mounted Light Fitting, LED 100W, IP66', wattage: 100, lumens: 12000, cct: '5000K' },
  [EquipmentType.FLOODLIGHT]: { mark: 'J', description: 'Floodlight, LED 150W, IP66, Adjustable', wattage: 150, lumens: 18000, cct: '5000K' },
};

// Type Mark mappings for lighting devices (switches, sensors)
export const LIGHTING_DEVICE_TYPE_MARKS: Record<string, { mark: string; description: string; category: string }> = {
  [EquipmentType.GENERAL_LIGHT_SWITCH]: { mark: 'LS1', description: 'Light Switch, Single Gang, 10A, 2-Wire', category: 'Switch' },
  [EquipmentType.DIMMER_SWITCH]: { mark: 'LS2', description: 'Dimmer Switch, Trailing Edge, 300W Max', category: 'Switch' },
  [EquipmentType.TWO_WAY_LIGHT_SWITCH]: { mark: 'LS3', description: '2-Way Light Switch, Single Gang, 10A', category: 'Switch' },
  [EquipmentType.WATERTIGHT_LIGHT_SWITCH]: { mark: 'LS4', description: 'Watertight Light Switch, IP56, Single Gang', category: 'Switch' },
  [EquipmentType.MOTION_SENSOR]: { mark: 'MS1', description: 'Ceiling Mounted Motion Sensor, PIR, 360°, 8m Range', category: 'Sensor' },
  [EquipmentType.PHOTO_CELL]: { mark: 'PC1', description: 'Photo Cell, Dusk-to-Dawn, IP65', category: 'Sensor' },
};

// Type Mark mappings for equipment (distribution)
export const EQUIPMENT_TYPE_MARKS: Record<string, { mark: string; description: string; rating?: string }> = {
  [EquipmentType.DISTRIBUTION_BOARD]: { mark: 'DB', description: 'Electrical Distribution Board, 12-Way, TP+N', rating: '100A' },
  [EquipmentType.MAIN_BOARD]: { mark: 'MB', description: 'Main Distribution Board, 24-Way, TP+N', rating: '250A' },
  [EquipmentType.SUB_BOARD]: { mark: 'SB', description: 'Sub Distribution Board, 8-Way, SP+N', rating: '63A' },
  [EquipmentType.RMU]: { mark: 'RMU', description: 'Ring Main Unit, 11kV, SF6 Insulated', rating: '630A' },
  [EquipmentType.SUBSTATION]: { mark: 'TX', description: 'Miniature Substation, 11kV/400V', rating: '500kVA' },
  [EquipmentType.GENERATOR]: { mark: 'GEN', description: 'Standby Generator, Diesel, Auto Transfer', rating: '200kVA' },
  [EquipmentType.TELEPHONE_BOARD]: { mark: 'TB', description: 'Telephone Distribution Board, MDF', rating: 'N/A' },
};

// Conduit outside diameter mapping
export const CONDUIT_OUTER_DIAMETERS: Record<string, { od: number; wallThickness: number }> = {
  [ContainmentType.CONDUIT_20MM]: { od: 20, wallThickness: 1.5 },
  [ContainmentType.CONDUIT_25MM]: { od: 25, wallThickness: 1.5 },
  [ContainmentType.CONDUIT_32MM]: { od: 32, wallThickness: 2.0 },
  [ContainmentType.CONDUIT_40MM]: { od: 40, wallThickness: 2.0 },
  [ContainmentType.CONDUIT_50MM]: { od: 50, wallThickness: 2.5 },
};

// Enhanced Schedule Item interface
export interface EnhancedScheduleItem {
  id: string;
  typeMark: string;
  type: string;
  description: string;
  count: number;
  length?: number;
  unit?: string;
  // Additional fields
  panelName?: string;
  rating?: string;
  wattage?: number;
  lumens?: number;
  cct?: string;
  category?: string;
  outerDiameter?: number;
}

// Conduit Schedule Item
export interface ConduitScheduleItem extends EnhancedScheduleItem {
  conduitType: 'Steel' | 'PVC' | 'Flexible';
  innerDiameter: number;
  outerDiameter: number;
  totalLength: number;
}
