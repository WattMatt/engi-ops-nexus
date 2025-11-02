// SANS 10142-1 Cable Sizing Data
// Simplified table for copper and aluminium conductors, PVC insulated cables

export interface CableData {
  size: string;
  currentRating: number; // Amps (for reference method B - enclosed in conduit)
  ohmPerKm: number; // Resistance at 20°C
  supplyCost: number; // Cost per meter (R)
  installCost: number; // Installation cost per meter (R)
}

// Standard copper cable sizes with typical ratings
export const COPPER_CABLE_TABLE: CableData[] = [
  { size: "1.5mm²", currentRating: 17.5, ohmPerKm: 12.1, supplyCost: 8.5, installCost: 15 },
  { size: "2.5mm²", currentRating: 24, ohmPerKm: 7.41, supplyCost: 12, installCost: 18 },
  { size: "4mm²", currentRating: 32, ohmPerKm: 4.61, supplyCost: 18, installCost: 22 },
  { size: "6mm²", currentRating: 41, ohmPerKm: 3.08, supplyCost: 25, installCost: 28 },
  { size: "10mm²", currentRating: 57, ohmPerKm: 1.83, supplyCost: 38, installCost: 35 },
  { size: "16mm²", currentRating: 76, ohmPerKm: 1.15, supplyCost: 52, installCost: 42 },
  { size: "25mm²", currentRating: 101, ohmPerKm: 0.727, supplyCost: 75, installCost: 55 },
  { size: "35mm²", currentRating: 125, ohmPerKm: 0.524, supplyCost: 95, installCost: 65 },
  { size: "50mm²", currentRating: 151, ohmPerKm: 0.387, supplyCost: 125, installCost: 78 },
  { size: "70mm²", currentRating: 192, ohmPerKm: 0.268, supplyCost: 165, installCost: 95 },
  { size: "95mm²", currentRating: 232, ohmPerKm: 0.193, supplyCost: 210, installCost: 115 },
  { size: "120mm²", currentRating: 269, ohmPerKm: 0.153, supplyCost: 255, installCost: 135 },
  { size: "150mm²", currentRating: 309, ohmPerKm: 0.124, supplyCost: 310, installCost: 155 },
  { size: "185mm²", currentRating: 353, ohmPerKm: 0.0991, supplyCost: 375, installCost: 180 },
  { size: "240mm²", currentRating: 415, ohmPerKm: 0.0754, supplyCost: 475, installCost: 215 },
  { size: "300mm²", currentRating: 478, ohmPerKm: 0.0601, supplyCost: 580, installCost: 250 },
  { size: "400mm²", currentRating: 551, ohmPerKm: 0.047, supplyCost: 750, installCost: 295 },
];

// Standard aluminium cable sizes with typical ratings
export const ALUMINIUM_CABLE_TABLE: CableData[] = [
  { size: "16mm²", currentRating: 61, ohmPerKm: 1.91, supplyCost: 32, installCost: 42 },
  { size: "25mm²", currentRating: 80, ohmPerKm: 1.20, supplyCost: 45, installCost: 55 },
  { size: "35mm²", currentRating: 99, ohmPerKm: 0.868, supplyCost: 58, installCost: 65 },
  { size: "50mm²", currentRating: 119, ohmPerKm: 0.641, supplyCost: 75, installCost: 78 },
  { size: "70mm²", currentRating: 151, ohmPerKm: 0.443, supplyCost: 98, installCost: 95 },
  { size: "95mm²", currentRating: 182, ohmPerKm: 0.320, supplyCost: 125, installCost: 115 },
  { size: "120mm²", currentRating: 210, ohmPerKm: 0.253, supplyCost: 152, installCost: 135 },
  { size: "150mm²", currentRating: 240, ohmPerKm: 0.206, supplyCost: 185, installCost: 155 },
  { size: "185mm²", currentRating: 273, ohmPerKm: 0.164, supplyCost: 222, installCost: 180 },
  { size: "240mm²", currentRating: 320, ohmPerKm: 0.125, supplyCost: 280, installCost: 215 },
  { size: "300mm²", currentRating: 367, ohmPerKm: 0.100, supplyCost: 340, installCost: 250 },
  { size: "400mm²", currentRating: 423, ohmPerKm: 0.0778, supplyCost: 435, installCost: 295 },
];

// Default to copper table for backward compatibility
export const CABLE_SIZING_TABLE = COPPER_CABLE_TABLE;

export interface CableCalculationParams {
  loadAmps: number;
  voltage: number;
  totalLength: number; // in meters
  cableType?: string; // for future expansion (e.g., "3C", "4C")
  deratingFactor?: number; // default 1.0
  material?: "copper" | "aluminium"; // default copper
}

export interface CableCalculationResult {
  recommendedSize: string;
  ohmPerKm: number;
  voltDrop: number;
  voltDropPercentage: number;
  supplyCost: number;
  installCost: number;
  totalCost: number;
}

/**
 * Calculate recommended cable size based on load current
 * Applies derating factor and selects cable with adequate current rating
 */
export function calculateCableSize(
  params: CableCalculationParams
): CableCalculationResult | null {
  const { loadAmps, voltage, totalLength, deratingFactor = 1.0, material = "copper" } = params;

  if (!loadAmps || loadAmps <= 0 || !voltage || voltage <= 0) {
    return null;
  }

  // Select appropriate cable table based on material
  const cableTable = material === "aluminium" ? ALUMINIUM_CABLE_TABLE : COPPER_CABLE_TABLE;

  // Apply derating factor to get required current rating
  const requiredRating = loadAmps / deratingFactor;

  // Find the smallest cable that can handle the required current
  const selectedCable = cableTable.find(
    (cable) => cable.currentRating >= requiredRating
  );

  if (!selectedCable) {
    // Load exceeds largest cable in table
    return null;
  }

  // Calculate voltage drop
  // For single phase: Vd = 2 × I × R × L / 1000
  // For three phase: Vd = √3 × I × R × L / 1000
  // Assuming single phase for now (can be enhanced later)
  const voltDrop =
    (2 * loadAmps * selectedCable.ohmPerKm * totalLength) / 1000;
  const voltDropPercentage = (voltDrop / voltage) * 100;

  // Calculate costs
  const supplyCost = selectedCable.supplyCost * totalLength;
  const installCost = selectedCable.installCost * totalLength;
  const totalCost = supplyCost + installCost;

  return {
    recommendedSize: selectedCable.size,
    ohmPerKm: selectedCable.ohmPerKm,
    voltDrop: parseFloat(voltDrop.toFixed(2)),
    voltDropPercentage: parseFloat(voltDropPercentage.toFixed(2)),
    supplyCost: parseFloat(supplyCost.toFixed(2)),
    installCost: parseFloat(installCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
  };
}
