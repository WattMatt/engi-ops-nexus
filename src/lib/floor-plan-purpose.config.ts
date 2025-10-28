import { Tool, DesignPurpose } from '@/types/floor-plan';

export interface PurposeConfig {
  tools: Tool[];
  equipmentToToolMap: Record<string, Tool>;
  cableTypes: string[];
  containmentSizes: string[];
}

export const purposeConfigs: Record<DesignPurpose, PurposeConfig> = {
  [DesignPurpose.BUDGET_MARKUP]: {
    tools: [
      Tool.PAN,
      Tool.SELECT,
      Tool.SCALE,
      Tool.RULER,
      Tool.TOOL_DB,
      Tool.TOOL_PANEL,
      Tool.TOOL_LIGHT,
      Tool.TOOL_SWITCH,
      Tool.TOOL_SOCKET,
      Tool.TOOL_DATA,
      Tool.TOOL_EMERGENCY_LIGHT,
      Tool.TOOL_EXIT_SIGN,
      Tool.TOOL_SMOKE_DETECTOR,
      Tool.TOOL_HEAT_DETECTOR,
      Tool.TOOL_CALL_POINT,
      Tool.TOOL_SOUNDER,
      Tool.TOOL_BEACON,
      Tool.TOOL_PIR,
      Tool.TOOL_CAMERA,
      Tool.TOOL_CABLE_LV,
      Tool.TOOL_CABLE_HV,
      Tool.TOOL_CABLE_DATA,
      Tool.TOOL_CABLE_FIRE_ALARM,
      Tool.TOOL_CONTAINMENT_TRAY,
      Tool.TOOL_CONTAINMENT_TRUNKING,
      Tool.TOOL_CONTAINMENT_CONDUIT,
      Tool.TOOL_ZONE,
    ],
    equipmentToToolMap: {
      DB: Tool.TOOL_DB,
      PANEL: Tool.TOOL_PANEL,
      LIGHT: Tool.TOOL_LIGHT,
      SWITCH: Tool.TOOL_SWITCH,
      SOCKET: Tool.TOOL_SOCKET,
      DATA: Tool.TOOL_DATA,
      EMERGENCY_LIGHT: Tool.TOOL_EMERGENCY_LIGHT,
      EXIT_SIGN: Tool.TOOL_EXIT_SIGN,
      SMOKE_DETECTOR: Tool.TOOL_SMOKE_DETECTOR,
      HEAT_DETECTOR: Tool.TOOL_HEAT_DETECTOR,
      CALL_POINT: Tool.TOOL_CALL_POINT,
      SOUNDER: Tool.TOOL_SOUNDER,
      BEACON: Tool.TOOL_BEACON,
      PIR: Tool.TOOL_PIR,
      CAMERA: Tool.TOOL_CAMERA,
    },
    cableTypes: [
      '2.5mm² 3C+E',
      '4mm² 3C+E',
      '6mm² 3C+E',
      '10mm² 3C+E',
      '16mm² 3C+E',
      'Cat6 UTP',
      'Cat6A STP',
      'OM3 Fibre',
      'FP200 2C',
      'FP200 4C',
    ],
    containmentSizes: [
      '50x50mm',
      '100x50mm',
      '150x50mm',
      '200x50mm',
      '300x50mm',
      '20mm Conduit',
      '25mm Conduit',
      '32mm Conduit',
    ],
  },
  [DesignPurpose.PV_DESIGN]: {
    tools: [
      Tool.PAN,
      Tool.SELECT,
      Tool.SCALE,
      Tool.TOOL_ROOF_MASK,
      Tool.TOOL_ROOF_DIRECTION,
      Tool.TOOL_PV_ARRAY,
    ],
    equipmentToToolMap: {},
    cableTypes: [],
    containmentSizes: [],
  },
};
