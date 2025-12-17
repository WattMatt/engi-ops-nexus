/**
 * Environmental Regulations for Workplaces, 1987
 * (Occupational Health and Safety Act, 1993)
 * 
 * This file contains the lighting requirements from the South African
 * Environmental Regulations for Workplaces, 1987 for compliance reference.
 */

export const REGULATION_REFERENCE = {
  title: "Environmental Regulations for Workplaces, 1987",
  act: "Occupational Health and Safety Act, 1993",
  section: "Section 3 - Lighting",
  pdfPath: "/documents/Environ_Reg_for_Workplaces_1987.pdf",
};

export const LIGHTING_REGULATION_SUMMARY = {
  generalRequirements: [
    "Every employer shall cause every workplace to be lighted in accordance with the illuminance values specified in the Schedule.",
    "Where specialized lighting is necessary for any particular type of work, the employer shall ensure such specialized lighting is available and used.",
    "The average illuminance at any floor level within 5 meters of a task shall not be less than one fifth (1/5) of the average illuminance on that task.",
    "Glare in any workplace shall be reduced to a level that does not impair vision.",
    "Lighting on rotating machinery shall be such that the hazard of stroboscopic effects is eliminated.",
    "Luminaires and lamps shall be kept clean and, when defective, replaced or repaired forthwith.",
  ],
  emergencyLighting: {
    standard: {
      minLux: 0.3,
      description: "Minimum illuminance at floor level for safe evacuation",
    },
    hazardous: {
      minLux: 20,
      description: "For areas requiring machinery shutdown, dangerous materials, or hazardous processes",
    },
    requirements: [
      "Emergency lighting must activate within 15 seconds of main lighting failure.",
      "Emergency lighting must last long enough to ensure safe evacuation of all indoor workplaces.",
      "Emergency lighting shall be kept in good working order and tested at intervals not exceeding 3 months.",
      "Directional luminaires shall be mounted at least 2 meters above floor level and not aimed between 10° above and 45° below horizontal.",
    ],
  },
};

export interface IlluminanceRequirement {
  category: string;
  location: string;
  activity: string;
  minLux: number;
}

export const ILLUMINANCE_SCHEDULE: IlluminanceRequirement[] = [
  // Retail & Commercial
  { category: "Shops & Retail", location: "General working areas", activity: "Retail operations", minLux: 100 },
  { category: "Shops & Retail", location: "Stairs, corridors", activity: "Circulation", minLux: 100 },
  { category: "Banks", location: "Counters", activity: "Customer service", minLux: 300 },
  { category: "Banks", location: "General working areas", activity: "Office work", minLux: 200 },
  { category: "Post Offices", location: "Counters", activity: "Customer service", minLux: 200 },
  { category: "Post Offices", location: "General working areas", activity: "Sorting", minLux: 100 },
  
  // Offices
  { category: "Offices", location: "Entrance halls & reception", activity: "Reception", minLux: 100 },
  { category: "Offices", location: "Conference rooms", activity: "Meetings", minLux: 300 },
  { category: "Offices", location: "General offices", activity: "Office work", minLux: 300 },
  { category: "Offices", location: "Typing & filing", activity: "Administrative", minLux: 300 },
  { category: "Offices", location: "Computer operators", activity: "Screen work", minLux: 500 },
  { category: "Offices", location: "Drawing offices", activity: "Technical drawing", minLux: 500 },
  
  // Warehouses & Storage
  { category: "Warehouses", location: "Small materials, racks", activity: "Picking & packing", minLux: 150 },
  { category: "Warehouses", location: "Issue counters", activity: "Dispatch", minLux: 200 },
  { category: "Warehouses", location: "Loading bays", activity: "Loading", minLux: 75 },
  { category: "Warehouses", location: "Inactive storage", activity: "Storage", minLux: 20 },
  { category: "Cold Stores", location: "General working areas", activity: "Cold storage", minLux: 100 },
  
  // Ablutions & Passages
  { category: "Ablutions", location: "Wash-rooms, toilets", activity: "Ablutions", minLux: 100 },
  { category: "Ablutions", location: "Changing rooms", activity: "Changing", minLux: 100 },
  { category: "Passages & Lobbies", location: "All areas", activity: "Circulation", minLux: 75 },
  { category: "Stairs & Ramps", location: "General", activity: "Circulation", minLux: 100 },
  
  // Parking
  { category: "Garages", location: "Parking areas (interior)", activity: "Parking", minLux: 50 },
  { category: "Garages", location: "Washing, polishing", activity: "Car wash", minLux: 100 },
  { category: "Garages", location: "Servicing pits", activity: "Servicing", minLux: 100 },
  { category: "Garages", location: "Repairs", activity: "Mechanical work", minLux: 200 },
  { category: "Garages", location: "Work bench", activity: "Detailed work", minLux: 250 },
  
  // Food & Beverage
  { category: "Bakeries", location: "Mixing & make-up rooms", activity: "Food preparation", minLux: 100 },
  { category: "Bakeries", location: "Decorating and icing", activity: "Fine work", minLux: 200 },
  { category: "Brewing & Drinks", location: "General working area", activity: "Production", minLux: 100 },
  { category: "Brewing & Drinks", location: "Bottling & canning", activity: "Filling", minLux: 300 },
  { category: "Brewing & Drinks", location: "Bottle inspection", activity: "Quality control", minLux: 300 },
  { category: "Dairies", location: "General working areas", activity: "Dairy operations", minLux: 150 },
  { category: "Dairies", location: "Bottle inspection", activity: "Quality control", minLux: 300 },
  { category: "Canning & Preserving", location: "Inspection of products", activity: "Quality control", minLux: 300 },
  { category: "Canning & Preserving", location: "Preparation areas", activity: "Food prep", minLux: 200 },
  { category: "Confectionery", location: "Mixing, blending", activity: "Production", minLux: 100 },
  { category: "Confectionery", location: "Hand decorating", activity: "Fine work", minLux: 200 },
  { category: "Refrigeration", location: "Chilling & cold rooms", activity: "Cold storage", minLux: 100 },
  
  // Manufacturing - General
  { category: "Assembly Plants", location: "Rough work", activity: "Heavy assembly", minLux: 100 },
  { category: "Assembly Plants", location: "Medium work", activity: "Engine assembly", minLux: 200 },
  { category: "Assembly Plants", location: "Fine work", activity: "Radio/electronics", minLux: 500 },
  { category: "Assembly Plants", location: "Very fine work", activity: "Precision assembly", minLux: 1000 },
  
  // Clothing & Textiles
  { category: "Clothing", location: "Matching up", activity: "Fabric matching", minLux: 300 },
  { category: "Clothing", location: "Sorting, cutting, sewing", activity: "Garment production", minLux: 300 },
  { category: "Clothing", location: "Pressing, cloth treating", activity: "Finishing", minLux: 200 },
  { category: "Clothing", location: "Inspections, hand tailoring", activity: "Quality/fine work", minLux: 500 },
  
  // Electrical & Electronics
  { category: "Electrical Goods", location: "Impregnating, mica work", activity: "Manufacturing", minLux: 150 },
  { category: "Electrical Goods", location: "Coil/armature - general", activity: "Assembly", minLux: 200 },
  { category: "Electrical Goods", location: "Coil/armature - fine", activity: "Instrument coils", minLux: 400 },
  
  // Building & Construction
  { category: "Building & Construction", location: "Industrialized plants", activity: "Prefab work", minLux: 200 },
  { category: "Building & Construction", location: "Concrete shops", activity: "Concrete work", minLux: 150 },
  { category: "Building & Construction", location: "General working areas", activity: "Site work", minLux: 20 },
  { category: "Building & Construction", location: "Walkways and access", activity: "Access", minLux: 5 },
  
  // Abattoirs
  { category: "Abattoirs", location: "Cold store, pens", activity: "Animal handling", minLux: 100 },
  { category: "Abattoirs", location: "Bleeding, slaughtering", activity: "Slaughter", minLux: 150 },
  { category: "Abattoirs", location: "Dressing, washing", activity: "Processing", minLux: 200 },
  { category: "Abattoirs", location: "Inspection & grading", activity: "Quality control", minLux: 300 },
  
  // Schools & Education
  { category: "Schools", location: "Stairs, corridors", activity: "Circulation", minLux: 100 },
  { category: "Schools", location: "Class & lecture rooms", activity: "Teaching", minLux: 200 },
  { category: "Schools", location: "General working areas", activity: "Admin", minLux: 100 },
  
  // Healthcare
  { category: "Hospitals & Clinics", location: "Stairs, corridors", activity: "Circulation", minLux: 100 },
  { category: "Hospitals & Clinics", location: "General working areas", activity: "Clinical", minLux: 100 },
  
  // Entertainment
  { category: "Theatres & Cinemas", location: "Stairs, corridors", activity: "Circulation", minLux: 100 },
  { category: "Theatres & Cinemas", location: "Booking offices", activity: "Ticketing", minLux: 200 },
  { category: "Theatres & Cinemas", location: "Projection rooms", activity: "Technical", minLux: 150 },
  
  // Industrial
  { category: "Chemical Works", location: "General processes", activity: "Production", minLux: 100 },
  { category: "Chemical Works", location: "Control rooms", activity: "Monitoring", minLux: 200 },
  { category: "Foundries", location: "Rough moulding", activity: "Casting", minLux: 100 },
  { category: "Foundries", location: "Fine moulding, inspection", activity: "Quality work", minLux: 200 },
  { category: "Forging", location: "General", activity: "Metalwork", minLux: 100 },
  { category: "Blacksmith", location: "General working area", activity: "Smithing", minLux: 75 },
  
  // Printing & Publishing
  { category: "Printing", location: "Machine composition", activity: "Typesetting", minLux: 150 },
  { category: "Printing", location: "Presses", activity: "Printing", minLux: 200 },
  { category: "Printing", location: "Composition room", activity: "Layout", minLux: 300 },
  { category: "Printing", location: "Proof reading", activity: "Editing", minLux: 300 },
  { category: "Printing", location: "Colour inspection", activity: "Quality control", minLux: 500 },
  
  // Woodworking
  { category: "Woodworking", location: "Rough sawing", activity: "Cutting", minLux: 150 },
  { category: "Woodworking", location: "Medium machine work", activity: "Shaping", minLux: 200 },
  { category: "Woodworking", location: "Fine bench work", activity: "Finishing", minLux: 200 },
  { category: "Furniture", location: "Raw materials store", activity: "Storage", minLux: 50 },
  { category: "Furniture", location: "Wood machining", activity: "Machining", minLux: 150 },
  { category: "Furniture", location: "Cabinet making", activity: "Fine work", minLux: 500 },
  
  // Outdoor Areas
  { category: "Outdoor Areas", location: "Bulk loading - manual", activity: "Manual handling", minLux: 50 },
  { category: "Outdoor Areas", location: "Bulk loading - mechanical", activity: "Mechanical", minLux: 10 },
  { category: "Outdoor Areas", location: "Storage areas", activity: "Storage", minLux: 5 },
  { category: "Outdoor Areas", location: "Gangways, stairways", activity: "Access", minLux: 20 },
  { category: "Outdoor Areas", location: "Main entrances/exits", activity: "Access", minLux: 20 },
];

// Categories for filtering
export const ILLUMINANCE_CATEGORIES = [
  "Shops & Retail",
  "Banks",
  "Post Offices",
  "Offices",
  "Warehouses",
  "Cold Stores",
  "Ablutions",
  "Passages & Lobbies",
  "Stairs & Ramps",
  "Garages",
  "Bakeries",
  "Brewing & Drinks",
  "Dairies",
  "Canning & Preserving",
  "Confectionery",
  "Refrigeration",
  "Assembly Plants",
  "Clothing",
  "Electrical Goods",
  "Building & Construction",
  "Abattoirs",
  "Schools",
  "Hospitals & Clinics",
  "Theatres & Cinemas",
  "Chemical Works",
  "Foundries",
  "Forging",
  "Blacksmith",
  "Printing",
  "Woodworking",
  "Furniture",
  "Outdoor Areas",
];

// Helper function to get requirements by category
export function getRequirementsByCategory(category: string): IlluminanceRequirement[] {
  return ILLUMINANCE_SCHEDULE.filter(req => req.category === category);
}

// Helper function to find minimum lux for a zone type
export function getMinLuxForZoneType(zoneType: string): number | null {
  const mappings: Record<string, number> = {
    sales_floor: 100,
    back_of_house: 100,
    storage: 20,
    corridor: 75,
    exterior: 20,
    food_court: 150,
    anchor: 100,
    office: 300,
    ablutions: 100,
    parking: 50,
    general: 100,
  };
  return mappings[zoneType] || null;
}
