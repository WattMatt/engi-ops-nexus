import { DesignPurpose, Tool, EquipmentType } from './types';

export interface DesignPurposeConfig {
  name: string;
  description: string;
  availableTools: Tool[];
  availableEquipment: EquipmentType[];
}

export const DESIGN_PURPOSE_CONFIGS: Record<DesignPurpose, DesignPurposeConfig> = {
  'budget_markup': {
    name: 'Budget Markup',
    description: 'High-level equipment placement for budget estimation',
    availableTools: ['select', 'pan', 'scale', 'rotate', 'snap', 'rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'pole-light'],
    availableEquipment: ['rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'pole-light'],
  },
  
  'pv_design': {
    name: 'PV Solar Design',
    description: 'Solar panel array layout and inverter placement',
    availableTools: ['select', 'pan', 'scale', 'rotate', 'snap', 'line-dc', 'line-lv', 'roof-mask', 'pv-array', 'inverter', 'dc-combiner-box', 'ac-disconnect'],
    availableEquipment: ['inverter', 'dc-combiner-box', 'ac-disconnect', 'main-board', 'sub-board'],
  },
  
  'line_shop': {
    name: 'Line Shop Drawing',
    description: 'Detailed lighting, socket, and device placement',
    availableTools: [
      'select', 'pan', 'scale', 'rotate', 'snap',
      'line-lv', 'zone',
      'cable-tray', 'telkom-basket', 'security-basket', 'sleeves', 'powerskirting',
      // Lighting
      'light-switch', 'dimmer-switch', 'two-way-switch', 'watertight-switch', 'motion-sensor', 'photo-cell',
      'led-strip', 'ceiling-light', 'wall-light', 'recessed-600x600', 'recessed-1200x600', 'floodlight',
      // Sockets
      '16a-socket', 'double-socket', 'clean-power-outlet', 'ups-socket', 'emergency-socket',
      'data-outlet', 'telephone-outlet', 'single-phase-outlet', 'three-phase-outlet', 'tv-outlet', 'flush-floor-outlet',
      // Other
      'distribution-board', 'cctv', 'manhole', 'drawbox-50mm', 'drawbox-100mm',
    ],
    availableEquipment: [
      'light-switch', 'dimmer-switch', 'two-way-switch', 'watertight-switch', 'motion-sensor', 'photo-cell',
      'led-strip', 'ceiling-light', 'wall-light', 'recessed-600x600', 'recessed-1200x600', 'floodlight',
      '16a-socket', 'double-socket', 'clean-power-outlet', 'ups-socket', 'emergency-socket',
      'data-outlet', 'telephone-outlet', 'single-phase-outlet', 'three-phase-outlet', 'tv-outlet', 'flush-floor-outlet',
      'distribution-board', 'cctv', 'manhole', 'drawbox-50mm', 'drawbox-100mm',
    ],
  },
  
  'prelim_design': {
    name: 'Preliminary Design',
    description: 'Initial layout with main boards and distribution',
    availableTools: [
      'select', 'pan', 'scale', 'rotate', 'snap',
      'line-mv', 'line-lv', 'zone',
      'cable-tray',
      'rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'distribution-board',
    ],
    availableEquipment: ['rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'distribution-board'],
  },
  
  'cable_schedule': {
    name: 'Cable Schedule',
    description: 'Cable routing and termination points',
    availableTools: [
      'select', 'pan', 'scale', 'rotate', 'snap',
      'line-mv', 'line-lv', 'line-dc',
      'cable-tray', 'telkom-basket', 'security-basket', 'sleeves', 'p2000', 'p8000', 'p9000',
      'main-board', 'sub-board', 'distribution-board', 'manhole', 'drawbox-50mm', 'drawbox-100mm',
    ],
    availableEquipment: ['main-board', 'sub-board', 'distribution-board', 'manhole', 'drawbox-50mm', 'drawbox-100mm'],
  },
  
  'final_account': {
    name: 'Final Account',
    description: 'As-built documentation with all equipment',
    availableTools: [
      'select', 'pan', 'scale', 'rotate', 'snap',
      'line-mv', 'line-lv', 'line-dc', 'zone',
      'cable-tray', 'telkom-basket', 'security-basket', 'sleeves', 'powerskirting', 'p2000', 'p8000', 'p9000',
      // All equipment types
      'rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'pole-light',
      'light-switch', 'dimmer-switch', 'two-way-switch', 'ceiling-light', 'floodlight',
      '16a-socket', 'double-socket', 'data-outlet', 'telephone-outlet',
      'distribution-board', 'cctv', 'manhole', 'drawbox-50mm', 'drawbox-100mm',
    ],
    availableEquipment: [
      'rmu', 'miniature-substation', 'main-board', 'sub-board', 'generator', 'pole-light',
      'light-switch', 'dimmer-switch', 'two-way-switch', 'ceiling-light', 'floodlight',
      '16a-socket', 'double-socket', 'data-outlet', 'telephone-outlet',
      'distribution-board', 'cctv', 'manhole', 'drawbox-50mm', 'drawbox-100mm',
    ],
  },
};

export function getAvailableTools(purpose: DesignPurpose): Tool[] {
  return DESIGN_PURPOSE_CONFIGS[purpose]?.availableTools || [];
}

export function getAvailableEquipment(purpose: DesignPurpose): EquipmentType[] {
  return DESIGN_PURPOSE_CONFIGS[purpose]?.availableEquipment || [];
}

export function isToolAvailable(purpose: DesignPurpose, tool: Tool): boolean {
  return getAvailableTools(purpose).includes(tool);
}

export function isEquipmentAvailable(purpose: DesignPurpose, equipment: EquipmentType): boolean {
  return getAvailableEquipment(purpose).includes(equipment);
}
