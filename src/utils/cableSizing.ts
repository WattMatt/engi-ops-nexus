// SANS 10142-1 Cable Sizing Data
// Simplified table for copper and aluminium conductors, PVC insulated cables

export interface CableData {
  size: string;
  currentRating: number; // Amps (for reference method B - enclosed in conduit)
  ohmPerKm: number; // Resistance at 20°C
  supplyCost: number; // Cost per meter (R)
  installCost: number; // Installation cost per meter (R)
}

// Standard copper cable sizes from SANS 1507-3 Table 6.2 (Ducts installation method)
export const COPPER_CABLE_TABLE: CableData[] = [
  { size: "1.5mm²", currentRating: 20, ohmPerKm: 14.48, supplyCost: 8.5, installCost: 15 },
  { size: "2.5mm²", currentRating: 26, ohmPerKm: 8.87, supplyCost: 12, installCost: 18 },
  { size: "4mm²", currentRating: 34, ohmPerKm: 5.52, supplyCost: 18, installCost: 22 },
  { size: "6mm²", currentRating: 43, ohmPerKm: 3.69, supplyCost: 25, installCost: 28 },
  { size: "10mm²", currentRating: 58, ohmPerKm: 2.19, supplyCost: 38, installCost: 35 },
  { size: "16mm²", currentRating: 75, ohmPerKm: 1.38, supplyCost: 52, installCost: 42 },
  { size: "25mm²", currentRating: 96, ohmPerKm: 0.8749, supplyCost: 75, installCost: 55 },
  { size: "35mm²", currentRating: 116, ohmPerKm: 0.6335, supplyCost: 95, installCost: 65 },
  { size: "50mm²", currentRating: 138, ohmPerKm: 0.4718, supplyCost: 125, installCost: 78 },
  { size: "70mm²", currentRating: 171, ohmPerKm: 0.3325, supplyCost: 165, installCost: 95 },
  { size: "95mm²", currentRating: 205, ohmPerKm: 0.2460, supplyCost: 210, installCost: 115 },
  { size: "120mm²", currentRating: 234, ohmPerKm: 0.2012, supplyCost: 255, installCost: 135 },
  { size: "150mm²", currentRating: 263, ohmPerKm: 0.1698, supplyCost: 310, installCost: 155 },
  { size: "185mm²", currentRating: 298, ohmPerKm: 0.1445, supplyCost: 375, installCost: 180 },
  { size: "240mm²", currentRating: 344, ohmPerKm: 0.1220, supplyCost: 475, installCost: 215 },
  { size: "300mm²", currentRating: 385, ohmPerKm: 0.1090, supplyCost: 580, installCost: 250 },
];

// Standard aluminium cable sizes from SANS 1507-3 Table 6.3 (Ducts installation method)
export const ALUMINIUM_CABLE_TABLE: CableData[] = [
  { size: "25mm²", currentRating: 73, ohmPerKm: 1.4446, supplyCost: 45, installCost: 55 },
  { size: "35mm²", currentRating: 87, ohmPerKm: 1.0465, supplyCost: 58, installCost: 65 },
  { size: "50mm²", currentRating: 104, ohmPerKm: 0.7749, supplyCost: 75, installCost: 78 },
  { size: "70mm²", currentRating: 130, ohmPerKm: 0.5388, supplyCost: 98, installCost: 95 },
  { size: "95mm²", currentRating: 157, ohmPerKm: 0.3934, supplyCost: 125, installCost: 115 },
  { size: "120mm²", currentRating: 179, ohmPerKm: 0.3148, supplyCost: 152, installCost: 135 },
  { size: "150mm²", currentRating: 201, ohmPerKm: 0.2607, supplyCost: 185, installCost: 155 },
  { size: "185mm²", currentRating: 229, ohmPerKm: 0.2133, supplyCost: 222, installCost: 180 },
  { size: "240mm²", currentRating: 268, ohmPerKm: 0.1708, supplyCost: 280, installCost: 215 },
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
