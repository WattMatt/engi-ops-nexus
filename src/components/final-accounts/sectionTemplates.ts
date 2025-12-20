// Comprehensive BOQ Section Templates for Final Accounts

export interface SectionTemplate {
  code: string;
  name: string;
  category: "infrastructure" | "areas" | "systems" | "dayworks";
  description?: string;
  subsections?: string[];
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  // Infrastructure Sections
  {
    code: "A",
    name: "Preliminary & General",
    category: "infrastructure",
    description: "Time-based, value-based, and fixed preliminary items",
    subsections: ["Time Based Items", "Value Based Items", "Fixed Charge Items"],
  },
  {
    code: "B",
    name: "Medium Voltage Equipment",
    category: "infrastructure",
    description: "MV substations, switchgear, cable and earthing",
    subsections: ["MV Substations", "MV Switchgear", "MV Cable", "Earthing System"],
  },
  {
    code: "C",
    name: "LV Cable & Distribution",
    category: "infrastructure",
    description: "Cable schedule, distribution boards, cable tray",
    subsections: ["Cable Schedule", "Distribution Boards", "Cable Tray & Ladder", "Busbar Systems"],
  },
  {
    code: "D",
    name: "Containment, Conduits & Wiring",
    category: "infrastructure",
    description: "General conduit and wiring infrastructure",
    subsections: ["Conduits", "Conductors", "Wiring Accessories"],
  },
  
  // Area-Based Sections
  {
    code: "E",
    name: "Line Shops",
    category: "areas",
    description: "Individual tenant/shop electrical installations - expandable per shop",
    subsections: ["Conduits", "Conductors", "Appliances", "Lighting", "Small Power"],
  },
  {
    code: "F",
    name: "External / Parking",
    category: "areas",
    description: "External works, parking areas, site lighting",
    subsections: ["Conduits", "Conductors", "Appliances", "External Lighting", "Bollards"],
  },
  {
    code: "G",
    name: "Mall Interior & Walkways",
    category: "areas",
    description: "Mall common areas and walkway installations",
    subsections: ["Conduits", "Conductors", "Appliances", "Lighting", "Emergency Lighting"],
  },
  {
    code: "H",
    name: "Offices & Management",
    category: "areas",
    description: "Office areas and management suites",
    subsections: ["Conduits", "Conductors", "Appliances", "Lighting", "Small Power", "Data Points"],
  },
  {
    code: "I",
    name: "Ablutions & Passages",
    category: "areas",
    description: "Restrooms, passages, and circulation areas",
    subsections: ["Conduits", "Conductors", "Appliances", "Lighting", "Extract Fans"],
  },
  {
    code: "J",
    name: "Back of House & Service Areas",
    category: "areas",
    description: "Service corridors, plant rooms, loading bays",
    subsections: ["Conduits", "Conductors", "Appliances", "Lighting", "Power Outlets"],
  },
  
  // Systems Sections
  {
    code: "K",
    name: "Signage",
    category: "systems",
    description: "Illuminated signage and display systems",
    subsections: ["Internal Signage", "External Signage", "Directory Boards"],
  },
  {
    code: "L",
    name: "Smoke / Fire Detection",
    category: "systems",
    description: "Fire alarm and detection systems",
    subsections: ["Detection Devices", "Sounders & Beacons", "Control Panels", "Wiring"],
  },
  {
    code: "M",
    name: "Telephone / Voice",
    category: "systems",
    description: "Voice and telephone infrastructure",
    subsections: ["Containment", "Cabling", "Outlets", "Equipment"],
  },
  {
    code: "N",
    name: "Data / Electronic Services",
    category: "systems",
    description: "Data, CCTV, access control, and electronic systems",
    subsections: ["Data Cabling", "CCTV", "Access Control", "PA System"],
  },
  {
    code: "O",
    name: "Sundry Works",
    category: "systems",
    description: "Miscellaneous and sundry items",
    subsections: ["Testing & Commissioning", "Documentation", "Spares"],
  },
  
  // Dayworks
  {
    code: "P",
    name: "Day Works",
    category: "dayworks",
    description: "Day work rates for labour and materials",
    subsections: ["Labour Rates", "Material Rates", "Plant Rates"],
  },
];

// Shop template for Line Shops (Section E) breakdown
export const SHOP_SUBSECTION_TEMPLATE = [
  "Conduits",
  "Conductors", 
  "Appliances",
  "Lighting",
  "Small Power",
  "Data Points",
  "Signage",
];

// Standard bill types
export interface BillTemplate {
  number: number;
  name: string;
  description: string;
  type: "main" | "tenant" | "infrastructure";
  defaultSections: string[]; // Section codes to include
}

export const BILL_TEMPLATES: BillTemplate[] = [
  {
    number: 1,
    name: "Mall Portion",
    description: "Main mall infrastructure and common areas",
    type: "main",
    defaultSections: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
  },
  {
    number: 2,
    name: "Anchor Stores",
    description: "Large anchor tenant installations",
    type: "tenant",
    defaultSections: ["D", "E", "K", "L", "M", "N"],
  },
  {
    number: 3,
    name: "Food Court",
    description: "Food court tenant installations",
    type: "tenant",
    defaultSections: ["D", "E", "K", "L"],
  },
];

// Get templates by category
export const getTemplatesByCategory = (category: SectionTemplate["category"]) => {
  return SECTION_TEMPLATES.filter((t) => t.category === category);
};

// Get template by code
export const getTemplateByCode = (code: string) => {
  return SECTION_TEMPLATES.find((t) => t.code === code);
};

// Category labels for UI
export const CATEGORY_LABELS: Record<SectionTemplate["category"], string> = {
  infrastructure: "Infrastructure",
  areas: "Area-Based",
  systems: "Systems",
  dayworks: "Day Works",
};
