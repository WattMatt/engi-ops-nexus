import { EquipmentType } from "./types";

// Real-world sizes of equipment in meters (width/diameter)
export const EQUIPMENT_SIZES: Record<EquipmentType, number> = {
  // High-Level Equipment
  "rmu": 2.5,
  "miniature-substation": 3.0,
  "main-board": 1.2,
  "sub-board": 0.8,
  "generator": 2.0,
  "pole-light": 0.3,
  
  // PV Design Equipment
  "inverter": 0.8,
  "dc-combiner-box": 0.5,
  "ac-disconnect": 0.4,
  
  // Lighting & Switches (small items)
  "light-switch": 0.1,
  "dimmer-switch": 0.1,
  "two-way-switch": 0.1,
  "watertight-switch": 0.1,
  "motion-sensor": 0.15,
  "led-strip": 0.05,
  "ceiling-light": 0.2,
  "wall-light": 0.15,
  "recessed-600x600": 0.6,
  "recessed-1200x600": 1.2,
  "floodlight": 0.3,
  "photo-cell": 0.1,
  
  // Sockets & Outlets
  "16a-socket": 0.1,
  "double-socket": 0.15,
  "clean-power-outlet": 0.1,
  "ups-socket": 0.1,
  "emergency-socket": 0.1,
  "data-outlet": 0.1,
  "telephone-outlet": 0.1,
  "single-phase-outlet": 0.15,
  "three-phase-outlet": 0.2,
  "tv-outlet": 0.1,
  "flush-floor-outlet": 0.15,
  
  // Other Building Services
  "distribution-board": 0.6,
  "cctv": 0.15,
  "manhole": 0.8,
  "drawbox-50mm": 0.2,
  "drawbox-100mm": 0.3,
};
