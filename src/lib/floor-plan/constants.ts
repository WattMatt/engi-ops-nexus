import { ContainmentType, EquipmentType } from './types';

export const TOOL_COLORS = {
  LINE_MV: '#ff4d4d', // Red for Medium Voltage
  LINE_LV: '#4d4dff', // Blue for Low Voltage / AC
  LINE_DC: '#f97316', // Orange for DC
  ZONE: 'rgba(255, 255, 0, 0.3)', // Yellow for zones
  SCALE: '#39e600',
  ROOF_MASK: 'rgba(148, 112, 216, 0.3)', // A purplish color for roof masks
};

export const CONTAINMENT_COLORS: Record<ContainmentType, string> = {
    [ContainmentType.TELKOM_BASKET]: '#10B981', // Emerald 500
    [ContainmentType.SECURITY_BASKET]: '#8B5CF6', // Violet 500
    [ContainmentType.CABLE_TRAY]: '#06B6D4', // Cyan 500
    [ContainmentType.SLEEVES]: '#EF4444', // Red 500
    [ContainmentType.POWERSKIRTING]: '#22D3EE', // Cyan 400
    [ContainmentType.P2000_TRUNKING]: '#3B82F6', // Blue 500
    [ContainmentType.P8000_TRUNKING]: '#DC2626', // Red 600
    [ContainmentType.P9000_TRUNKING]: '#EC4899', // Pink 500
};

export const CONTAINMENT_DASH_STYLES: Record<string, number[]> = {
    '50mm': [2, 2],
    '100mm': [5, 3],
    '150mm': [8, 4],
    '200mm': [12, 5],
    '300mm': [15, 6],
    '450mm': [20, 7],
    '600mm': [],
    'Sleeves': [5, 5],
    'Powerskirting': [],
    'P2000 Trunking': [],
    'P8000 Trunking': [],
    'P9000 Trunking': [],
};

export const EQUIPMENT_REAL_WORLD_SIZES: Partial<Record<EquipmentType, number>> = {
  [EquipmentType.RMU]: 2.0,
  [EquipmentType.SUBSTATION]: 3.5,
  [EquipmentType.MAIN_BOARD]: 1.2,
  [EquipmentType.SUB_BOARD]: 0.8,
  [EquipmentType.GENERATOR]: 2.5,
  [EquipmentType.POLE_LIGHT]: 0.5,
  [EquipmentType.INVERTER]: 0.8,
  [EquipmentType.DC_COMBINER]: 0.6,
  [EquipmentType.AC_DISCONNECT]: 0.4,
  [EquipmentType.GENERAL_LIGHT_SWITCH]: 0.1,
  [EquipmentType.DIMMER_SWITCH]: 0.1,
  [EquipmentType.MOTION_SENSOR]: 0.15,
  [EquipmentType.TWO_WAY_LIGHT_SWITCH]: 0.1,
  [EquipmentType.WATERTIGHT_LIGHT_SWITCH]: 0.1,
  [EquipmentType.LED_STRIP_LIGHT]: 1.2,
  [EquipmentType.FLUORESCENT_2_TUBE]: 1.2,
  [EquipmentType.FLUORESCENT_1_TUBE]: 0.6,
  [EquipmentType.CEILING_FLOODLIGHT]: 0.25,
  [EquipmentType.CEILING_LIGHT]: 0.2,
  [EquipmentType.POLE_MOUNTED_LIGHT]: 0.5,
  [EquipmentType.WALL_MOUNTED_LIGHT]: 0.2,
  [EquipmentType.RECESSED_LIGHT_600]: 0.6,
  [EquipmentType.RECESSED_LIGHT_1200]: 1.2,
  [EquipmentType.FLOODLIGHT]: 0.3,
  [EquipmentType.PHOTO_CELL]: 0.1,
  [EquipmentType.FLUSH_FLOOR_OUTLET]: 0.1,
  [EquipmentType.BOX_FLUSH_FLOOR]: 0.1,
  [EquipmentType.SOCKET_16A]: 0.1,
  [EquipmentType.SOCKET_DOUBLE]: 0.15,
  [EquipmentType.CLEAN_POWER_OUTLET]: 0.1,
  [EquipmentType.EMERGENCY_SOCKET]: 0.1,
  [EquipmentType.UPS_SOCKET]: 0.1,
  [EquipmentType.DATA_SOCKET]: 0.1,
  [EquipmentType.TELEPHONE_OUTLET]: 0.1,
  [EquipmentType.SINGLE_PHASE_OUTLET]: 0.12,
  [EquipmentType.THREE_PHASE_OUTLET]: 0.15,
  [EquipmentType.SOCKET_16A_TP]: 0.12,
  [EquipmentType.GEYSER_OUTLET]: 0.15,
  [EquipmentType.WATER_HEATER_CONTROL]: 0.15,
  [EquipmentType.STOVE_OUTLET]: 0.15,
  [EquipmentType.FAN]: 0.6,
  [EquipmentType.EXTRACTOR_FAN]: 0.3,
  [EquipmentType.ELECTRIC_GATE]: 0.2,
  [EquipmentType.BELL]: 0.1,
  [EquipmentType.SIREN]: 0.15,
  [EquipmentType.SMOKE_DETECTOR]: 0.15,
  [EquipmentType.SHAVER_SOCKET]: 0.1,
};
