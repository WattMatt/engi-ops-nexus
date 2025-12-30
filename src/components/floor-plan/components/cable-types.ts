// Cable Type Definitions for Drawing Sheet View
// Based on South African electrical installation standards

export interface ConductorSpec {
  size: string; // mm²
  material: 'copper' | 'aluminium';
}

export interface CableTypeDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  live: ConductorSpec;
  neutral: ConductorSpec;
  earth: ConductorSpec;
  voltage: number;
  maxCurrent: number; // Amperes
  usedFor: string[];
  color: string; // For visualization
}

export interface CircuitTypeMapping {
  circuitType: string;
  label: string;
  defaultCableType: string;
  alternateCableTypes: string[];
  description: string;
}

// GP (General Purpose) Cable Definitions
export const GP_4MM: CableTypeDefinition = {
  id: 'gp-4mm',
  name: 'GP 4mm² Cable',
  shortName: 'GP 4mm',
  description: 'General purpose cable for power circuits',
  live: { size: '4', material: 'copper' },
  neutral: { size: '4', material: 'copper' },
  earth: { size: '2.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 32,
  usedFor: ['Power circuits', 'Socket outlets', 'Small appliances'],
  color: 'hsl(var(--chart-1))',
};

export const GP_2_5MM: CableTypeDefinition = {
  id: 'gp-2.5mm',
  name: 'GP 2.5mm² Cable',
  shortName: 'GP 2.5mm',
  description: 'General purpose cable for lighting circuits',
  live: { size: '2.5', material: 'copper' },
  neutral: { size: '2.5', material: 'copper' },
  earth: { size: '1.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 20,
  usedFor: ['Lighting circuits', 'Light switches', 'Low power loads'],
  color: 'hsl(var(--chart-2))',
};

// Flattex Cable Definitions
export const FLATTEX_2_5MM: CableTypeDefinition = {
  id: 'flattex-2.5mm',
  name: 'Flattex 2.5mm² Cable',
  shortName: 'Flattex 2.5mm',
  description: 'Flat twin & earth cable for light switches',
  live: { size: '2.5', material: 'copper' },
  neutral: { size: '2.5', material: 'copper' },
  earth: { size: '1.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 20,
  usedFor: ['Light switches', 'Lighting circuits'],
  color: 'hsl(var(--chart-3))',
};

export const FLATTEX_4MM: CableTypeDefinition = {
  id: 'flattex-4mm',
  name: 'Flattex 4mm² Cable',
  shortName: 'Flattex 4mm',
  description: 'Flat twin & earth cable for socket outlets',
  live: { size: '4', material: 'copper' },
  neutral: { size: '4', material: 'copper' },
  earth: { size: '2.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 32,
  usedFor: ['Socket outlets', 'Kitchen sockets', 'Power circuits'],
  color: 'hsl(var(--chart-4))',
};

export const FLATTEX_6MM: CableTypeDefinition = {
  id: 'flattex-6mm',
  name: 'Flattex 6mm² Cable',
  shortName: 'Flattex 6mm',
  description: 'Flat twin & earth cable for high load circuits',
  live: { size: '6', material: 'copper' },
  neutral: { size: '6', material: 'copper' },
  earth: { size: '4', material: 'copper' },
  voltage: 230,
  maxCurrent: 40,
  usedFor: ['Geysers', 'Stoves', 'High load appliances'],
  color: 'hsl(var(--chart-5))',
};

// Twin & Earth Cable Definitions
export const TE_1_5MM: CableTypeDefinition = {
  id: 'te-1.5mm',
  name: 'T&E 1.5mm² Cable',
  shortName: 'T&E 1.5mm',
  description: 'Twin and earth cable for lighting',
  live: { size: '1.5', material: 'copper' },
  neutral: { size: '1.5', material: 'copper' },
  earth: { size: '1', material: 'copper' },
  voltage: 230,
  maxCurrent: 15,
  usedFor: ['Low power lighting', 'LED strips'],
  color: 'hsl(var(--muted-foreground))',
};

export const TE_2_5MM: CableTypeDefinition = {
  id: 'te-2.5mm',
  name: 'T&E 2.5mm² Cable',
  shortName: 'T&E 2.5mm',
  description: 'Twin and earth cable for general use',
  live: { size: '2.5', material: 'copper' },
  neutral: { size: '2.5', material: 'copper' },
  earth: { size: '1.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 20,
  usedFor: ['General lighting', 'Light power'],
  color: 'hsl(var(--muted-foreground))',
};

export const TE_4MM: CableTypeDefinition = {
  id: 'te-4mm',
  name: 'T&E 4mm² Cable',
  shortName: 'T&E 4mm',
  description: 'Twin and earth cable for power circuits',
  live: { size: '4', material: 'copper' },
  neutral: { size: '4', material: 'copper' },
  earth: { size: '2.5', material: 'copper' },
  voltage: 230,
  maxCurrent: 32,
  usedFor: ['Power circuits', 'Socket outlets'],
  color: 'hsl(var(--muted-foreground))',
};

export const TE_6MM: CableTypeDefinition = {
  id: 'te-6mm',
  name: 'T&E 6mm² Cable',
  shortName: 'T&E 6mm',
  description: 'Twin and earth cable for high loads',
  live: { size: '6', material: 'copper' },
  neutral: { size: '6', material: 'copper' },
  earth: { size: '4', material: 'copper' },
  voltage: 230,
  maxCurrent: 40,
  usedFor: ['High load circuits', 'Geysers'],
  color: 'hsl(var(--muted-foreground))',
};

// All cable types collection
export const CABLE_TYPES: Record<string, CableTypeDefinition> = {
  'gp-4mm': GP_4MM,
  'gp-2.5mm': GP_2_5MM,
  'flattex-2.5mm': FLATTEX_2_5MM,
  'flattex-4mm': FLATTEX_4MM,
  'flattex-6mm': FLATTEX_6MM,
  'te-1.5mm': TE_1_5MM,
  'te-2.5mm': TE_2_5MM,
  'te-4mm': TE_4MM,
  'te-6mm': TE_6MM,
};

// Circuit Type Mappings
export const CIRCUIT_TYPE_MAPPINGS: CircuitTypeMapping[] = [
  {
    circuitType: 'L1',
    label: 'Lighting Circuit 1',
    defaultCableType: 'gp-2.5mm',
    alternateCableTypes: ['flattex-2.5mm', 'te-2.5mm'],
    description: 'Primary lighting circuit',
  },
  {
    circuitType: 'L2',
    label: 'Lighting Circuit 2',
    defaultCableType: 'gp-2.5mm',
    alternateCableTypes: ['flattex-2.5mm', 'te-2.5mm'],
    description: 'Secondary lighting circuit',
  },
  {
    circuitType: 'L3',
    label: 'Lighting Circuit 3',
    defaultCableType: 'gp-2.5mm',
    alternateCableTypes: ['flattex-2.5mm', 'te-2.5mm'],
    description: 'Tertiary lighting circuit',
  },
  {
    circuitType: 'P1',
    label: 'Power Circuit 1',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-4mm', 'te-4mm'],
    description: 'Primary power circuit for socket outlets',
  },
  {
    circuitType: 'P2',
    label: 'Power Circuit 2',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-4mm', 'te-4mm'],
    description: 'Secondary power circuit for socket outlets',
  },
  {
    circuitType: 'P3',
    label: 'Power Circuit 3',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-4mm', 'te-4mm'],
    description: 'Tertiary power circuit for socket outlets',
  },
  {
    circuitType: 'KS',
    label: 'Kitchen Socket',
    defaultCableType: 'flattex-4mm',
    alternateCableTypes: ['gp-4mm', 'flattex-6mm'],
    description: 'Kitchen socket circuit - higher capacity',
  },
  {
    circuitType: 'GY',
    label: 'Geyser Circuit',
    defaultCableType: 'flattex-6mm',
    alternateCableTypes: ['te-6mm'],
    description: 'Dedicated geyser circuit - high load',
  },
  {
    circuitType: 'ST',
    label: 'Stove Circuit',
    defaultCableType: 'flattex-6mm',
    alternateCableTypes: ['te-6mm'],
    description: 'Dedicated stove circuit - high load',
  },
  {
    circuitType: 'S1',
    label: 'Spare 1',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-4mm', 'gp-2.5mm'],
    description: 'Spare circuit - varies by specification',
  },
  {
    circuitType: 'S2',
    label: 'Spare 2',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-4mm', 'gp-2.5mm'],
    description: 'Spare circuit - varies by specification',
  },
  {
    circuitType: 'DB',
    label: 'Distribution Board Feed',
    defaultCableType: 'gp-4mm',
    alternateCableTypes: ['flattex-6mm'],
    description: 'Sub-DB feed circuit',
  },
];

// Helper functions
export function getCableTypeById(id: string): CableTypeDefinition | undefined {
  return CABLE_TYPES[id];
}

export function getDefaultCableForCircuit(circuitType: string): CableTypeDefinition | undefined {
  const mapping = CIRCUIT_TYPE_MAPPINGS.find(m => m.circuitType === circuitType);
  if (mapping) {
    return getCableTypeById(mapping.defaultCableType);
  }
  return undefined;
}

export function getCircuitMapping(circuitType: string): CircuitTypeMapping | undefined {
  return CIRCUIT_TYPE_MAPPINGS.find(m => m.circuitType === circuitType);
}

export function getAllCableTypes(): CableTypeDefinition[] {
  return Object.values(CABLE_TYPES);
}

export function getCableTypesBySize(size: string): CableTypeDefinition[] {
  return Object.values(CABLE_TYPES).filter(cable => cable.live.size === size);
}

// Cable length calculation helpers
export interface CableLengthCalculation {
  circuit: string;
  cableType: CableTypeDefinition;
  liveLength: number;
  neutralLength: number;
  earthLength: number;
  totalLength: number;
}

export function calculateCableLengths(
  circuitType: string,
  routeLength: number,
  cableTypeId?: string
): CableLengthCalculation | null {
  const cableType = cableTypeId 
    ? getCableTypeById(cableTypeId) 
    : getDefaultCableForCircuit(circuitType);
  
  if (!cableType) return null;

  // For most circuits, L = N = E in terms of route length
  // Add 10% for terminations and waste
  const adjustedLength = routeLength * 1.1;

  return {
    circuit: circuitType,
    cableType,
    liveLength: adjustedLength,
    neutralLength: adjustedLength,
    earthLength: adjustedLength,
    totalLength: adjustedLength * 3, // L + N + E
  };
}
