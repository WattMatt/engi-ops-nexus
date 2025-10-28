// Equipment sizes (width x height in pixels at scale 1.0)
export const EQUIPMENT_SIZES: Record<string, { width: number; height: number }> = {
  // High-Level Equipment
  'rmu': { width: 40, height: 40 },
  'miniature-substation': { width: 50, height: 50 },
  'main-board': { width: 30, height: 40 },
  'sub-board': { width: 25, height: 35 },
  'generator': { width: 45, height: 35 },
  'pole-light': { width: 15, height: 15 },
  
  // PV Equipment
  'inverter': { width: 30, height: 30 },
  'dc-combiner-box': { width: 20, height: 25 },
  'ac-disconnect': { width: 20, height: 20 },
  
  // Lighting & Switches
  'light-switch': { width: 10, height: 10 },
  'dimmer-switch': { width: 10, height: 10 },
  'two-way-switch': { width: 10, height: 10 },
  'watertight-switch': { width: 12, height: 12 },
  'motion-sensor': { width: 12, height: 12 },
  'photo-cell': { width: 10, height: 10 },
  'led-strip': { width: 20, height: 8 },
  'ceiling-light': { width: 15, height: 15 },
  'wall-light': { width: 12, height: 12 },
  'recessed-600x600': { width: 15, height: 15 },
  'recessed-1200x600': { width: 20, height: 15 },
  'floodlight': { width: 18, height: 18 },
  
  // Sockets & Outlets
  '16a-socket': { width: 10, height: 10 },
  'double-socket': { width: 12, height: 10 },
  'clean-power-outlet': { width: 10, height: 10 },
  'ups-socket': { width: 10, height: 10 },
  'emergency-socket': { width: 10, height: 10 },
  'data-outlet': { width: 10, height: 10 },
  'telephone-outlet': { width: 10, height: 10 },
  'single-phase-outlet': { width: 10, height: 10 },
  'three-phase-outlet': { width: 12, height: 12 },
  'tv-outlet': { width: 10, height: 10 },
  'flush-floor-outlet': { width: 12, height: 12 },
  
  // Other Equipment
  'distribution-board': { width: 25, height: 35 },
  'cctv': { width: 12, height: 12 },
  'manhole': { width: 20, height: 20 },
  'drawbox-50mm': { width: 15, height: 15 },
  'drawbox-100mm': { width: 20, height: 20 },
};

// Cable colors by type
export const CABLE_COLORS: Record<string, string> = {
  'mv': '#FF0000',      // Red for MV
  'lv': '#0000FF',      // Blue for LV
  'dc': '#FF6600',      // Orange for DC
};

// Containment colors by type
export const CONTAINMENT_COLORS: Record<string, string> = {
  'cable-tray': '#666666',
  'telkom-basket': '#00AA00',
  'security-basket': '#AA0000',
  'sleeves': '#888888',
  'powerskirting': '#444444',
  'p2000': '#666666',
  'p8000': '#555555',
  'p9000': '#777777',
};

// Zone colors by type
export const ZONE_COLORS: Record<string, string> = {
  'supply': 'rgba(0, 123, 255, 0.15)',
  'exclusion': 'rgba(220, 53, 69, 0.15)',
  'roof': 'rgba(40, 167, 69, 0.15)',
};

// Equipment labels (short codes)
export const EQUIPMENT_LABELS: Record<string, string> = {
  'rmu': 'RMU',
  'miniature-substation': 'MSUB',
  'main-board': 'MB',
  'sub-board': 'SB',
  'generator': 'GEN',
  'pole-light': 'PL',
  'inverter': 'INV',
  'dc-combiner-box': 'DCB',
  'ac-disconnect': 'ACD',
  'light-switch': 'LS',
  'dimmer-switch': 'DS',
  'two-way-switch': '2WS',
  'watertight-switch': 'WTS',
  'motion-sensor': 'MS',
  'photo-cell': 'PC',
  'led-strip': 'LED',
  'ceiling-light': 'CL',
  'wall-light': 'WL',
  'recessed-600x600': 'R66',
  'recessed-1200x600': 'R126',
  'floodlight': 'FL',
  '16a-socket': '16A',
  'double-socket': 'DS',
  'clean-power-outlet': 'CPO',
  'ups-socket': 'UPS',
  'emergency-socket': 'EM',
  'data-outlet': 'DATA',
  'telephone-outlet': 'TEL',
  'single-phase-outlet': '1PH',
  'three-phase-outlet': '3PH',
  'tv-outlet': 'TV',
  'flush-floor-outlet': 'FFO',
  'distribution-board': 'DB',
  'cctv': 'CCTV',
  'manhole': 'MH',
  'drawbox-50mm': 'DB50',
  'drawbox-100mm': 'DB100',
};

// Available cable sizes
export const CABLE_SIZES = ['1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²', '16mm²', '25mm²', '35mm²', '50mm²', '70mm²', '95mm²', '120mm²', '150mm²', '185mm²', '240mm²'] as const;

// Available containment sizes
export const CONTAINMENT_SIZES = ['50mm', '75mm', '100mm', '150mm', '200mm', '300mm', '450mm', '600mm'] as const;

// PV panel default configuration
export const DEFAULT_PV_PANEL = {
  length: 1.7, // meters
  width: 1.0,  // meters
  wattage: 400, // watts
};

// Drawing constants
export const SELECTION_TOLERANCE = 10; // pixels
export const SNAP_GRID_SIZE = 20; // pixels
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;
export const ZOOM_STEP = 0.1;
