import { EquipmentType } from '@/components/floor-plan/types';

export interface AssemblyComponent {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  category: 'material' | 'labor' | 'accessory';
  boqCode?: string;
  supplyRate?: number;
  installRate?: number;
}

export interface SmartAssembly {
  equipmentType: EquipmentType;
  name: string;
  description: string;
  components: AssemblyComponent[];
}

// Assembly modifications stored per equipment instance
export interface AssemblyModification {
  componentId: string;
  excluded: boolean;
  quantityOverride?: number;
  notes?: string;
}

// Smart Assembly definitions for each equipment type
export const SMART_ASSEMBLIES: Record<string, SmartAssembly> = {
  [EquipmentType.SOCKET_16A]: {
    equipmentType: EquipmentType.SOCKET_16A,
    name: '16A Socket Assembly',
    description: 'Complete 16A switched socket installation',
    components: [
      { id: 'socket-16a-unit', name: '16A Switched Socket', description: 'Single pole 16A socket outlet', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-SOC-16A' },
      { id: 'socket-16a-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'socket-16a-labor', name: 'Install Labor', description: 'Socket installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-SOC-INST' },
    ],
  },
  [EquipmentType.SOCKET_DOUBLE]: {
    equipmentType: EquipmentType.SOCKET_DOUBLE,
    name: 'Double Socket Assembly',
    description: 'Complete double switched socket installation',
    components: [
      { id: 'socket-double-unit', name: 'Double Switched Socket', description: 'Double pole 16A socket outlet', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-SOC-DBL' },
      { id: 'socket-double-box', name: 'Draw Box', description: '100mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-100' },
      { id: 'socket-double-labor', name: 'Install Labor', description: 'Double socket installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-SOC-INST' },
    ],
  },
  [EquipmentType.GENERAL_LIGHT_SWITCH]: {
    equipmentType: EquipmentType.GENERAL_LIGHT_SWITCH,
    name: 'Light Switch Assembly',
    description: 'Complete light switch installation',
    components: [
      { id: 'switch-unit', name: 'Light Switch', description: 'Single pole light switch', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-SW-1G' },
      { id: 'switch-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'switch-labor', name: 'Install Labor', description: 'Switch installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-SW-INST' },
    ],
  },
  [EquipmentType.TWO_WAY_LIGHT_SWITCH]: {
    equipmentType: EquipmentType.TWO_WAY_LIGHT_SWITCH,
    name: '2-Way Switch Assembly',
    description: 'Complete 2-way light switch installation',
    components: [
      { id: '2way-switch-unit', name: '2-Way Light Switch', description: 'Two-way intermediate switch', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-SW-2W' },
      { id: '2way-switch-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: '2way-switch-labor', name: 'Install Labor', description: '2-way switch installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-SW-INST' },
    ],
  },
  [EquipmentType.DIMMER_SWITCH]: {
    equipmentType: EquipmentType.DIMMER_SWITCH,
    name: 'Dimmer Switch Assembly',
    description: 'Complete dimmer switch installation',
    components: [
      { id: 'dimmer-unit', name: 'Dimmer Switch', description: 'Rotary/push dimmer switch', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-SW-DIM' },
      { id: 'dimmer-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'dimmer-labor', name: 'Install Labor', description: 'Dimmer installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-SW-INST' },
    ],
  },
  [EquipmentType.DATA_SOCKET]: {
    equipmentType: EquipmentType.DATA_SOCKET,
    name: 'Data Socket Assembly',
    description: 'Complete data socket installation',
    components: [
      { id: 'data-socket-unit', name: 'Data Socket Outlet', description: 'RJ45 CAT6 data socket', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-DATA-CAT6' },
      { id: 'data-socket-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'data-patch-lead', name: 'Patch Lead', description: '1m CAT6 patch lead', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-PATCH-1M' },
      { id: 'data-socket-labor', name: 'Install Labor', description: 'Data socket installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-DATA-INST' },
    ],
  },
  [EquipmentType.TELEPHONE_OUTLET]: {
    equipmentType: EquipmentType.TELEPHONE_OUTLET,
    name: 'Telephone Outlet Assembly',
    description: 'Complete telephone outlet installation',
    components: [
      { id: 'tel-outlet-unit', name: 'Telephone Outlet', description: 'RJ11 telephone outlet', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-TEL-RJ11' },
      { id: 'tel-outlet-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'tel-outlet-labor', name: 'Install Labor', description: 'Telephone outlet installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-TEL-INST' },
    ],
  },
  [EquipmentType.TV_OUTLET]: {
    equipmentType: EquipmentType.TV_OUTLET,
    name: 'TV Outlet Assembly',
    description: 'Complete TV outlet installation',
    components: [
      { id: 'tv-outlet-unit', name: 'TV Outlet', description: 'Coaxial TV outlet', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-TV-COAX' },
      { id: 'tv-outlet-box', name: 'Draw Box', description: '50mm square draw box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-50' },
      { id: 'tv-outlet-labor', name: 'Install Labor', description: 'TV outlet installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-TV-INST' },
    ],
  },
  [EquipmentType.CEILING_LIGHT]: {
    equipmentType: EquipmentType.CEILING_LIGHT,
    name: 'Ceiling Light Assembly',
    description: 'Complete ceiling light installation',
    components: [
      { id: 'ceiling-light-unit', name: 'Ceiling Light Fitting', description: 'Ceiling mounted light fixture', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-LT-CEIL' },
      { id: 'ceiling-light-hook', name: 'Ceiling Rose/Hook', description: 'Ceiling rose with hook', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-ROSE-STD' },
      { id: 'ceiling-light-labor', name: 'Install Labor', description: 'Ceiling light installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-LT-INST' },
    ],
  },
  [EquipmentType.RECESSED_LIGHT_600]: {
    equipmentType: EquipmentType.RECESSED_LIGHT_600,
    name: '600x600 LED Panel Assembly',
    description: 'Complete 600x600 recessed LED panel installation',
    components: [
      { id: 'led-600-unit', name: '600x600 LED Panel', description: '40W LED panel 4000K', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-LT-LED600' },
      { id: 'led-600-driver', name: 'LED Driver', description: 'Constant current LED driver', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-DRV-LED' },
      { id: 'led-600-frame', name: 'Surface Frame', description: 'Surface mount frame (optional)', unit: 'No', quantity: 0, category: 'accessory', boqCode: 'E-FRM-600' },
      { id: 'led-600-labor', name: 'Install Labor', description: 'LED panel installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-LT-INST' },
    ],
  },
  [EquipmentType.RECESSED_LIGHT_1200]: {
    equipmentType: EquipmentType.RECESSED_LIGHT_1200,
    name: '1200x600 LED Panel Assembly',
    description: 'Complete 1200x600 recessed LED panel installation',
    components: [
      { id: 'led-1200-unit', name: '1200x600 LED Panel', description: '60W LED panel 4000K', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-LT-LED1200' },
      { id: 'led-1200-driver', name: 'LED Driver', description: 'Constant current LED driver', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-DRV-LED' },
      { id: 'led-1200-frame', name: 'Surface Frame', description: 'Surface mount frame (optional)', unit: 'No', quantity: 0, category: 'accessory', boqCode: 'E-FRM-1200' },
      { id: 'led-1200-labor', name: 'Install Labor', description: 'LED panel installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-LT-INST' },
    ],
  },
  [EquipmentType.FLOODLIGHT]: {
    equipmentType: EquipmentType.FLOODLIGHT,
    name: 'Floodlight Assembly',
    description: 'Complete floodlight installation',
    components: [
      { id: 'flood-unit', name: 'LED Floodlight', description: 'LED floodlight fixture', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-LT-FLOOD' },
      { id: 'flood-bracket', name: 'Mounting Bracket', description: 'Adjustable mounting bracket', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BKT-FLOOD' },
      { id: 'flood-junction', name: 'Junction Box', description: 'IP65 junction box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-JB-IP65' },
      { id: 'flood-labor', name: 'Install Labor', description: 'Floodlight installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-LT-FLOOD' },
    ],
  },
  [EquipmentType.MOTION_SENSOR]: {
    equipmentType: EquipmentType.MOTION_SENSOR,
    name: 'Motion Sensor Assembly',
    description: 'Complete motion sensor installation',
    components: [
      { id: 'motion-unit', name: 'PIR Motion Sensor', description: 'Ceiling mounted PIR sensor', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-PIR-CEIL' },
      { id: 'motion-box', name: 'Junction Box', description: 'Ceiling junction box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-JB-CEIL' },
      { id: 'motion-labor', name: 'Install Labor', description: 'Motion sensor installation labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-PIR-INST' },
    ],
  },
  [EquipmentType.DISTRIBUTION_BOARD]: {
    equipmentType: EquipmentType.DISTRIBUTION_BOARD,
    name: 'Distribution Board Assembly',
    description: 'Complete distribution board installation',
    components: [
      { id: 'db-enclosure', name: 'DB Enclosure', description: 'Distribution board enclosure', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-DB-ENC' },
      { id: 'db-busbar', name: 'Busbar System', description: 'Busbar and neutral bar', unit: 'Set', quantity: 1, category: 'accessory', boqCode: 'E-DB-BUS' },
      { id: 'db-earth-bar', name: 'Earth Bar', description: 'Earth terminal bar', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-DB-EARTH' },
      { id: 'db-labels', name: 'Circuit Labels', description: 'Circuit identification labels', unit: 'Set', quantity: 1, category: 'accessory', boqCode: 'E-LBL-CIRC' },
      { id: 'db-labor', name: 'Install Labor', description: 'DB installation and termination', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-DB-INST' },
    ],
  },
  [EquipmentType.CCTV_CAMERA]: {
    equipmentType: EquipmentType.CCTV_CAMERA,
    name: 'CCTV Camera Assembly',
    description: 'Complete CCTV camera installation',
    components: [
      { id: 'cctv-camera', name: 'IP Camera', description: 'IP dome/bullet camera', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-CAM-IP' },
      { id: 'cctv-mount', name: 'Camera Mount', description: 'Wall/ceiling mount bracket', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-MNT-CAM' },
      { id: 'cctv-junction', name: 'Junction Box', description: 'IP66 junction box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-JB-IP66' },
      { id: 'cctv-labor', name: 'Install Labor', description: 'Camera installation and commissioning', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-CAM-INST' },
    ],
  },
  [EquipmentType.GEYSER_OUTLET]: {
    equipmentType: EquipmentType.GEYSER_OUTLET,
    name: 'Geyser Outlet Assembly',
    description: 'Complete geyser outlet installation',
    components: [
      { id: 'geyser-isolator', name: 'Geyser Isolator', description: '30A DP isolator switch', unit: 'No', quantity: 1, category: 'material', boqCode: 'E-ISO-30A' },
      { id: 'geyser-box', name: 'Surface Box', description: 'IP55 surface box', unit: 'No', quantity: 1, category: 'accessory', boqCode: 'E-BOX-IP55' },
      { id: 'geyser-thermostat', name: 'Geyser Thermostat', description: 'Replacement thermostat (optional)', unit: 'No', quantity: 0, category: 'accessory', boqCode: 'E-THERM-GEY' },
      { id: 'geyser-labor', name: 'Install Labor', description: 'Geyser connection labor', unit: 'No', quantity: 1, category: 'labor', boqCode: 'L-GEY-INST' },
    ],
  },
};

// Helper to get assembly for equipment type
export function getAssemblyForType(type: EquipmentType): SmartAssembly | null {
  return SMART_ASSEMBLIES[type] || null;
}

// Helper to get effective components (with modifications applied)
export function getEffectiveComponents(
  assembly: SmartAssembly,
  modifications: AssemblyModification[] = []
): (AssemblyComponent & { excluded: boolean; effectiveQuantity: number })[] {
  return assembly.components.map(component => {
    const mod = modifications.find(m => m.componentId === component.id);
    return {
      ...component,
      excluded: mod?.excluded || false,
      effectiveQuantity: mod?.excluded ? 0 : (mod?.quantityOverride ?? component.quantity),
    };
  });
}

// Get all equipment types that have assemblies defined
export function getAssemblyEquipmentTypes(): EquipmentType[] {
  return Object.keys(SMART_ASSEMBLIES) as EquipmentType[];
}
