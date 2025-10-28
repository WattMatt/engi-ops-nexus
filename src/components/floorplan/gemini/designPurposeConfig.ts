import { DesignPurpose, Tool, EquipmentType } from './types';

export interface DesignPurposeConfig {
  name: string;
  description: string;
  tools: Tool[];
  equipment: EquipmentType[];
}

export const DESIGN_PURPOSE_CONFIGS: Record<DesignPurpose, DesignPurposeConfig> = {
  budget_markup: {
    name: "Budget Mark Up",
    description: "For high-level, preliminary cost estimation with major electrical equipment",
    tools: [
      "select", "pan", "scale",
      "line-mv", "line-lv",
      "zone",
      "cable-tray", "telkom-basket", "security-basket"
    ],
    equipment: [
      "rmu", "miniature-substation", "main-board", 
      "sub-board", "generator", "pole-light"
    ]
  },

  pv_design: {
    name: "PV Design",
    description: "Specialized workflow for solar panel installations",
    tools: [
      "select", "pan", "scale",
      "roof-mask", "pv-array",
      "line-dc", "line-ac",
      "exclusion-zone",
      "cable-tray"
    ],
    equipment: [
      "inverter", "dc-combiner-box", "ac-disconnect", "main-board"
    ]
  },

  line_shop: {
    name: "Line Shop Measurements",
    description: "For detailed internal fit-outs with extensive equipment library",
    tools: [
      "select", "pan", "scale",
      "line-ac",
      "sleeves", "powerskirting", "p2000", "p8000", "p9000"
    ],
    equipment: [
      // Lighting
      "surface-light", "downlight", "emergency-light", "exit-light",
      "bulkhead", "floodlight", "wallpack", "led-strip",
      // Switches
      "switch", "dimmer-switch", "two-way-switch",
      "motion-sensor", "photo-cell",
      // Sockets
      "single-socket", "double-socket", "16a-socket", 
      "industrial-socket", "clean-power-outlet", "ups-socket",
      "floor-outlet", "data-outlet", "telephone-outlet", "tv-outlet",
      // Other
      "distribution-board", "isolator", "cctv", "access-control",
      "fire-detector", "call-point", "sounder", "manhole", "drawbox"
    ]
  },

  prelim_design: {
    name: "Prelim Design Mark Up",
    description: "Similar to Budget Markup, for early stages of project design",
    tools: [
      "select", "pan", "scale",
      "line-mv", "line-lv",
      "zone",
      "cable-tray", "telkom-basket", "security-basket"
    ],
    equipment: [
      "rmu", "miniature-substation", "main-board",
      "sub-board", "generator", "pole-light"
    ]
  },

  cable_schedule: {
    name: "Cable Schedule Markup",
    description: "Focused mode for creating detailed cable schedules",
    tools: [
      "select", "pan", "scale",
      "line-mv", "line-lv",
      "cable-tray"
    ],
    equipment: [
      "main-board", "sub-board"
    ]
  },

  final_account: {
    name: "Final Account Markup",
    description: "Comprehensive mode with all available tools for as-built drawings",
    tools: [
      "select", "pan", "scale",
      "line-mv", "line-lv", "line-dc", "line-ac",
      "zone", "exclusion-zone", "roof-mask",
      "cable-tray", "telkom-basket", "security-basket",
      "sleeves", "powerskirting", "p2000", "p8000", "p9000",
      "pv-array"
    ],
    equipment: [
      // All equipment types
      "rmu", "miniature-substation", "main-board", "sub-board", 
      "generator", "pole-light",
      "inverter", "dc-combiner-box", "ac-disconnect",
      "surface-light", "downlight", "emergency-light", "exit-light",
      "bulkhead", "floodlight", "wallpack", "led-strip",
      "switch", "dimmer-switch", "two-way-switch",
      "motion-sensor", "photo-cell",
      "single-socket", "double-socket", "16a-socket",
      "industrial-socket", "clean-power-outlet", "ups-socket",
      "floor-outlet", "data-outlet", "telephone-outlet", "tv-outlet",
      "distribution-board", "isolator", "cctv", "access-control",
      "fire-detector", "call-point", "sounder", "manhole", "drawbox"
    ]
  }
};

export function getAvailableTools(purpose: DesignPurpose): Tool[] {
  return DESIGN_PURPOSE_CONFIGS[purpose].tools;
}

export function getAvailableEquipment(purpose: DesignPurpose): EquipmentType[] {
  return DESIGN_PURPOSE_CONFIGS[purpose].equipment;
}

export function isToolAvailable(purpose: DesignPurpose, tool: Tool): boolean {
  return DESIGN_PURPOSE_CONFIGS[purpose].tools.includes(tool);
}

export function isEquipmentAvailable(purpose: DesignPurpose, equipment: EquipmentType): boolean {
  return DESIGN_PURPOSE_CONFIGS[purpose].equipment.includes(equipment);
}
