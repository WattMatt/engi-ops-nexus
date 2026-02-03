// Folder template definitions for electrical handover categories
// These provide recommended folder structures that can be initialized with one click

export interface FolderTemplate {
  name: string;
  children?: FolderTemplate[];
}

export interface CategoryFolderTemplates {
  category: string;
  label: string;
  templates: FolderTemplate[];
}

// Generator folder structure
const generatorTemplates: FolderTemplate[] = [
  {
    name: "Drawings",
    children: [
      { name: "Layout Drawings" },
      { name: "Schematic Diagrams" },
      { name: "Wiring Diagrams" },
    ],
  },
  {
    name: "Test Certificates",
    children: [
      { name: "Factory Acceptance Tests (FAT)" },
      { name: "Site Acceptance Tests (SAT)" },
      { name: "Load Bank Tests" },
    ],
  },
  {
    name: "Commissioning",
    children: [
      { name: "Commissioning Procedures" },
      { name: "Commissioning Reports" },
      { name: "Witness Signatures" },
    ],
  },
  { name: "O&M Manuals" },
  { name: "Spares Lists" },
  { name: "Warranty Documents" },
];

// Transformer folder structure
const transformerTemplates: FolderTemplate[] = [
  {
    name: "Drawings",
    children: [
      { name: "GA Drawings" },
      { name: "Installation Drawings" },
    ],
  },
  { name: "Type Test Certificates" },
  { name: "Routine Test Certificates" },
  { name: "Oil Analysis Reports" },
  { name: "Commissioning Reports" },
  { name: "Protection Settings" },
  { name: "Thermal Imaging Reports" },
  { name: "Warranty Documents" },
];

// Main Boards folder structure
const mainBoardTemplates: FolderTemplate[] = [
  {
    name: "Drawings",
    children: [
      { name: "GA Drawings" },
      { name: "Single Line Diagrams" },
      { name: "Wiring Diagrams" },
    ],
  },
  { name: "Protection Settings" },
  { name: "Type Test Certificates" },
  { name: "Routine Test Certificates" },
  { name: "Thermal Imaging Reports" },
  { name: "Arc Flash Studies" },
  { name: "Commissioning Reports" },
  { name: "Warranty Documents" },
];

// Switchgear folder structure
const switchgearTemplates: FolderTemplate[] = [
  {
    name: "Drawings",
    children: [
      { name: "GA Drawings" },
      { name: "Single Line Diagrams" },
      { name: "Control & Protection Schematics" },
    ],
  },
  { name: "MV Switchgear" },
  { name: "LV Switchgear" },
  { name: "Type Test Reports" },
  { name: "FAT Reports" },
  { name: "Commissioning Reports" },
  { name: "Relay Settings" },
  { name: "O&M Manuals" },
];

// Earthing & Bonding folder structure
const earthingBondingTemplates: FolderTemplate[] = [
  { name: "Earth Electrode Test Reports" },
  { name: "Equipotential Bonding Certificates" },
  { name: "Earth Continuity Test Reports" },
  { name: "Soil Resistivity Tests" },
  { name: "Earth Mat Drawings" },
  { name: "Lightning Protection Bonds" },
];

// Surge Protection folder structure
const surgeProtectionTemplates: FolderTemplate[] = [
  { name: "SPD Installation Certificates" },
  { name: "Coordination Studies" },
  { name: "Type Test Certificates" },
  { name: "Manufacturer Data Sheets" },
  { name: "Installation Drawings" },
];

// Metering folder structure
const meteringTemplates: FolderTemplate[] = [
  { name: "Meter Certificates" },
  { name: "CT Calibration Certificates" },
  { name: "VT Calibration Certificates" },
  { name: "Metering Drawings" },
  { name: "Energy Management System" },
  { name: "Prepaid Meter Documentation" },
];

// Cable Installation folder structure
const cableInstallationTemplates: FolderTemplate[] = [
  {
    name: "Cable Schedules",
    children: [
      { name: "HV Cables" },
      { name: "MV Cables" },
      { name: "LV Cables" },
      { name: "Control Cables" },
    ],
  },
  {
    name: "Test Certificates",
    children: [
      { name: "Insulation Resistance Tests" },
      { name: "Continuity Tests" },
      { name: "HV Tests" },
    ],
  },
  { name: "Route Drawings" },
  { name: "Cable Pulling Records" },
  { name: "Termination Records" },
];

// Emergency Systems folder structure
const emergencySystemsTemplates: FolderTemplate[] = [
  {
    name: "Emergency Lighting",
    children: [
      { name: "Duration Test Reports" },
      { name: "Installation Drawings" },
      { name: "Luminaire Schedule" },
    ],
  },
  { name: "Exit Sign Locations" },
  { name: "Emergency Power Systems" },
  { name: "Fire Alarm Interface" },
  { name: "Evacuation Lighting Plans" },
];

// Lighting folder structure
const lightingTemplates: FolderTemplate[] = [
  { name: "Lighting Layouts" },
  { name: "Photometric Calculations" },
  { name: "Luminaire Schedules" },
  { name: "Control System Drawings" },
  { name: "DALI Programming" },
  { name: "Warranty Documents" },
];

// Test Certificates folder structure
const testCertificatesTemplates: FolderTemplate[] = [
  { name: "Electrical COCs" },
  { name: "Insulation Resistance Tests" },
  { name: "Loop Impedance Tests" },
  { name: "RCD Tests" },
  { name: "Earth Continuity Tests" },
  { name: "Polarity Tests" },
  { name: "Phase Sequence Tests" },
];

// Commissioning folder structure
const commissioningTemplates: FolderTemplate[] = [
  { name: "Commissioning Procedures" },
  { name: "Commissioning Reports" },
  { name: "Test Records" },
  { name: "Punch Lists" },
  { name: "Sign-Off Documents" },
  { name: "Witness Signatures" },
];

// Compliance folder structure
const complianceTemplates: FolderTemplate[] = [
  {
    name: "SANS 10142 Part 1",
    children: [
      { name: "Installation Certificates" },
      { name: "Inspection Checklists" },
      { name: "Test Records" },
    ],
  },
  {
    name: "SANS 10142 Part 2",
    children: [
      { name: "Health & Safety File" },
      { name: "Protection Coordination" },
      { name: "MV Switching Procedures" },
    ],
  },
  { name: "Municipal Approvals" },
  { name: "ECSA Certificates" },
  { name: "Occupancy Certificates" },
];

// Export all category templates
export const CATEGORY_FOLDER_TEMPLATES: CategoryFolderTemplates[] = [
  { category: "generators", label: "Generators", templates: generatorTemplates },
  { category: "transformers", label: "Transformers", templates: transformerTemplates },
  { category: "main_boards", label: "Main Boards", templates: mainBoardTemplates },
  { category: "switchgear", label: "Switchgear", templates: switchgearTemplates },
  { category: "earthing_bonding", label: "Earthing & Bonding", templates: earthingBondingTemplates },
  { category: "surge_protection", label: "Surge Protection", templates: surgeProtectionTemplates },
  { category: "metering", label: "Metering", templates: meteringTemplates },
  { category: "cable_installation", label: "Cable Installation", templates: cableInstallationTemplates },
  { category: "emergency_systems", label: "Emergency Systems", templates: emergencySystemsTemplates },
  { category: "lighting", label: "Lighting", templates: lightingTemplates },
  { category: "test_certificates", label: "Test Certificates", templates: testCertificatesTemplates },
  { category: "commissioning_docs", label: "Commissioning", templates: commissioningTemplates },
  { category: "compliance_certs", label: "Compliance", templates: complianceTemplates },
];

// Get templates for a specific category
export function getTemplatesForCategory(category: string): FolderTemplate[] {
  const found = CATEGORY_FOLDER_TEMPLATES.find(c => c.category === category);
  return found?.templates || [];
}

// Check if a category has templates
export function hasTemplatesForCategory(category: string): boolean {
  return CATEGORY_FOLDER_TEMPLATES.some(c => c.category === category);
}

// Count total folders in a template tree
export function countFoldersInTemplate(templates: FolderTemplate[]): number {
  let count = templates.length;
  for (const template of templates) {
    if (template.children) {
      count += countFoldersInTemplate(template.children);
    }
  }
  return count;
}
