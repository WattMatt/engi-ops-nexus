import { EquipmentSymbol } from './types';

// Equipment symbols library - SVG paths for electrical symbols
export const equipmentSymbols: EquipmentSymbol[] = [
  // Distribution
  {
    id: 'transformer',
    name: 'Transformer',
    category: 'Distribution',
    svgPath: 'M10,10 L30,10 L30,30 L10,30 Z M15,15 L25,15 L25,25 L15,25 Z',
    defaultSize: { width: 1.5, height: 1.5 },
    color: '#3b82f6',
  },
  {
    id: 'msb',
    name: 'Main Switchboard (MSB)',
    category: 'Distribution',
    svgPath: 'M5,5 L35,5 L35,35 L5,35 Z M10,10 L30,10 M10,20 L30,20 M10,30 L30,30',
    defaultSize: { width: 2.0, height: 2.0 },
    color: '#3b82f6',
  },
  {
    id: 'db',
    name: 'Distribution Board (DB)',
    category: 'Distribution',
    svgPath: 'M8,8 L32,8 L32,32 L8,32 Z M12,12 L28,12 M12,20 L28,20 M12,28 L28,28',
    defaultSize: { width: 1.2, height: 1.2 },
    color: '#3b82f6',
  },
  {
    id: 'sdb',
    name: 'Sub-Distribution Board (SDB)',
    category: 'Distribution',
    svgPath: 'M10,10 L30,10 L30,30 L10,30 Z M14,14 L26,14 M14,20 L26,20 M14,26 L26,26',
    defaultSize: { width: 1.0, height: 1.0 },
    color: '#3b82f6',
  },
  {
    id: 'panelboard',
    name: 'Panelboard',
    category: 'Distribution',
    svgPath: 'M10,10 L30,10 L30,30 L10,30 Z M15,15 L25,25 M25,15 L15,25',
    defaultSize: { width: 0.8, height: 0.8 },
    color: '#3b82f6',
  },
  
  // Lighting
  {
    id: 'downlight',
    name: 'Downlight',
    category: 'Lighting',
    svgPath: 'M20,20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M20,15 L20,25',
    defaultSize: { width: 0.3, height: 0.3 },
    color: '#fbbf24',
  },
  {
    id: 'surface-light',
    name: 'Surface Light',
    category: 'Lighting',
    svgPath: 'M10,20 L30,20 M20,10 L20,30 M14,14 L26,26 M26,14 L14,26',
    defaultSize: { width: 0.4, height: 0.4 },
    color: '#fbbf24',
  },
  {
    id: 'pendant-light',
    name: 'Pendant Light',
    category: 'Lighting',
    svgPath: 'M20,10 L20,15 M20,20 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0',
    defaultSize: { width: 0.5, height: 0.5 },
    color: '#fbbf24',
  },
  {
    id: 'fluorescent',
    name: 'Fluorescent Tube',
    category: 'Lighting',
    svgPath: 'M5,18 L35,18 L35,22 L5,22 Z M10,20 L30,20',
    defaultSize: { width: 1.2, height: 0.2 },
    color: '#fbbf24',
  },
  {
    id: 'led-strip',
    name: 'LED Strip',
    category: 'Lighting',
    svgPath: 'M5,20 L35,20 M10,15 L10,25 M15,15 L15,25 M20,15 L20,25 M25,15 L25,25 M30,15 L30,25',
    defaultSize: { width: 1.5, height: 0.1 },
    color: '#fbbf24',
  },
  {
    id: 'emergency-light',
    name: 'Emergency Light',
    category: 'Lighting',
    svgPath: 'M10,10 L30,10 L30,25 L10,25 Z M15,15 L25,15 M20,20 L20,30',
    defaultSize: { width: 0.4, height: 0.4 },
    color: '#ef4444',
  },
  {
    id: 'exit-sign',
    name: 'Exit Sign',
    category: 'Lighting',
    svgPath: 'M8,12 L32,12 L32,28 L8,28 Z M12,17 L28,17 M12,23 L28,23',
    defaultSize: { width: 0.5, height: 0.3 },
    color: '#22c55e',
  },
  
  // Power
  {
    id: 'single-socket',
    name: 'Single Socket',
    category: 'Power',
    svgPath: 'M20,20 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M20,15 L20,25',
    defaultSize: { width: 0.15, height: 0.15 },
    color: '#10b981',
  },
  {
    id: 'double-socket',
    name: 'Double Socket',
    category: 'Power',
    svgPath: 'M20,20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M17,15 L17,25 M23,15 L23,25',
    defaultSize: { width: 0.2, height: 0.15 },
    color: '#10b981',
  },
  {
    id: 'triple-socket',
    name: 'Triple Socket',
    category: 'Power',
    svgPath: 'M20,20 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M15,14 L15,26 M20,14 L20,26 M25,14 L25,26',
    defaultSize: { width: 0.3, height: 0.15 },
    color: '#10b981',
  },
  {
    id: 'floor-socket',
    name: 'Floor Socket',
    category: 'Power',
    svgPath: 'M12,12 L28,12 L28,28 L12,28 Z M16,16 L24,24 M24,16 L16,24',
    defaultSize: { width: 0.2, height: 0.2 },
    color: '#10b981',
  },
  {
    id: 'switched-socket',
    name: 'Switched Socket',
    category: 'Power',
    svgPath: 'M20,20 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M20,15 L20,25 M25,12 L30,12',
    defaultSize: { width: 0.2, height: 0.15 },
    color: '#10b981',
  },
  
  // Switching
  {
    id: 'single-switch',
    name: 'Single Switch',
    category: 'Switching',
    svgPath: 'M15,20 L25,15 M20,20 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
    defaultSize: { width: 0.1, height: 0.1 },
    color: '#8b5cf6',
  },
  {
    id: 'double-switch',
    name: 'Double Switch',
    category: 'Switching',
    svgPath: 'M12,20 L18,15 M22,20 L28,15 M15,20 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 M25,20 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
    defaultSize: { width: 0.15, height: 0.1 },
    color: '#8b5cf6',
  },
  {
    id: 'dimmer-switch',
    name: 'Dimmer Switch',
    category: 'Switching',
    svgPath: 'M15,20 L25,15 M20,20 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0 M20,25 L25,25',
    defaultSize: { width: 0.12, height: 0.1 },
    color: '#8b5cf6',
  },
  
  // Safety
  {
    id: 'smoke-detector',
    name: 'Smoke Detector',
    category: 'Safety',
    svgPath: 'M20,20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M20,20 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
    defaultSize: { width: 0.25, height: 0.25 },
    color: '#ef4444',
  },
  {
    id: 'heat-detector',
    name: 'Heat Detector',
    category: 'Safety',
    svgPath: 'M20,20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M15,15 L25,25 M25,15 L15,25',
    defaultSize: { width: 0.25, height: 0.25 },
    color: '#ef4444',
  },
  {
    id: 'fire-alarm',
    name: 'Fire Alarm',
    category: 'Safety',
    svgPath: 'M12,12 L28,12 L28,28 L12,28 Z M20,15 L20,22 M20,25 L20,26',
    defaultSize: { width: 0.2, height: 0.2 },
    color: '#ef4444',
  },
  {
    id: 'security-camera',
    name: 'Security Camera',
    category: 'Safety',
    svgPath: 'M10,15 L15,15 L25,20 L15,25 L10,25 Z M25,20 L30,20',
    defaultSize: { width: 0.3, height: 0.2 },
    color: '#64748b',
  },
  
  // HVAC
  {
    id: 'ac-unit',
    name: 'Air Conditioning Unit',
    category: 'HVAC',
    svgPath: 'M8,8 L32,8 L32,32 L8,32 Z M12,20 L28,20 M20,12 L20,28 M14,14 L26,26 M26,14 L14,26',
    defaultSize: { width: 1.0, height: 1.0 },
    color: '#06b6d4',
  },
  {
    id: 'extract-fan',
    name: 'Extract Fan',
    category: 'HVAC',
    svgPath: 'M20,20 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M20,8 L20,32 M8,20 L32,20',
    defaultSize: { width: 0.5, height: 0.5 },
    color: '#06b6d4',
  },
  
  // Specialty
  {
    id: 'ev-charger',
    name: 'EV Charger',
    category: 'Specialty',
    svgPath: 'M12,8 L28,8 L28,32 L12,32 Z M16,12 L24,20 M20,20 L20,28 M16,16 L24,16',
    defaultSize: { width: 0.6, height: 0.8 },
    color: '#22c55e',
  },
  {
    id: 'inverter',
    name: 'Inverter',
    category: 'PV',
    svgPath: 'M8,12 L32,12 L32,28 L8,28 Z M12,16 L28,16 M12,20 L28,20 M12,24 L28,24',
    defaultSize: { width: 1.2, height: 0.8 },
    color: '#f59e0b',
  },
  {
    id: 'solar-panel',
    name: 'Solar Panel',
    category: 'PV',
    svgPath: 'M5,5 L35,5 L35,35 L5,35 Z M5,20 L35,20 M20,5 L20,35 M5,12.5 L35,12.5 M5,27.5 L35,27.5 M12.5,5 L12.5,35 M27.5,5 L27.5,35',
    defaultSize: { width: 1.6, height: 1.0 },
    color: '#f59e0b',
  },
  {
    id: 'combiner-box',
    name: 'Combiner Box',
    category: 'PV',
    svgPath: 'M10,10 L30,10 L30,30 L10,30 Z M15,15 L25,15 M15,20 L25,20 M15,25 L25,25',
    defaultSize: { width: 0.6, height: 0.6 },
    color: '#f59e0b',
  },
  {
    id: 'data-point',
    name: 'Data Point',
    category: 'Power',
    svgPath: 'M20,20 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M15,20 L25,20 M20,15 L20,25',
    defaultSize: { width: 0.1, height: 0.1 },
    color: '#6366f1',
  },
  {
    id: 'isolator',
    name: 'Isolator',
    category: 'Distribution',
    svgPath: 'M15,15 L25,25 M15,25 L25,15 M20,20 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0',
    defaultSize: { width: 0.4, height: 0.4 },
    color: '#3b82f6',
  },
  {
    id: 'circuit-breaker',
    name: 'Circuit Breaker',
    category: 'Distribution',
    svgPath: 'M10,15 L30,15 L30,25 L10,25 Z M15,20 L25,20 M20,15 L20,25',
    defaultSize: { width: 0.3, height: 0.2 },
    color: '#3b82f6',
  },
];

// Get symbols by category
export function getSymbolsByCategory(category: string): EquipmentSymbol[] {
  return equipmentSymbols.filter(symbol => symbol.category === category);
}

// Get symbol by ID
export function getSymbolById(id: string): EquipmentSymbol | undefined {
  return equipmentSymbols.find(symbol => symbol.id === id);
}

// Get all categories
export function getCategories(): string[] {
  const categories = new Set(equipmentSymbols.map(s => s.category));
  return Array.from(categories);
}
