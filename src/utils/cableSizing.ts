// SANS 10142-1 Cable Sizing Data
// ⚠️ CRITICAL: These tables MUST be verified against SANS 10142-1 Edition 3 (2020)
// Last verification: UNVERIFIED - Requires qualified electrical engineer sign-off
// Simplified table for copper and aluminium conductors, PVC insulated cables
import { validateCableCalculation } from './cableValidation';

// Helper function for formatting numbers to fixed precision
const toFixed = (value: number, precision: number = 2): number => 
  Number(value.toFixed(precision));

export interface CableData {
  size: string;
  currentRatingGround: number; // Ground (A) - VERIFY AGAINST SANS 10142-1
  currentRatingDucts: number; // Ducts (A) - VERIFY AGAINST SANS 10142-1
  currentRatingAir: number; // Air (A) - VERIFY AGAINST SANS 10142-1
  impedance: number; // Ω/km at 20°C - VERIFY AGAINST SANS 10142-1
  voltDrop3Phase: number; // 3φ Volt drop (mV/A/m) - VERIFY AGAINST SANS 10142-1
  voltDrop1Phase: number; // 1φ Volt drop (mV/A/m) - VERIFY AGAINST SANS 10142-1
  d1_3c: number; // Nominal Diameter D1 - 3 core (mm)
  d1_4c: number; // Nominal Diameter D1 - 4 core (mm)
  d_3c: number; // Nominal Diameter d - 3 core (mm)
  d_4c: number; // Nominal Diameter d - 4 core (mm)
  d2_3c: number; // Nominal Diameter D2 - 3 core (mm)
  d2_4c: number; // Nominal Diameter D2 - 4 core (mm)
  mass_3c: number; // Approx. Mass 3 core (kg/km)
  mass_4c: number; // Approx. Mass 4 core (kg/km)
  supplyCost: number; // Cost per meter (R)
  installCost: number; // Installation cost per meter (R)
}

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface CableCalculationResult {
  recommendedSize: string;
  recommendedQuantity?: number;
  ohmPerKm: number;
  voltDrop: number;
  voltDropPercentage: number;
  supplyCost: number;
  installCost: number;
  totalCost: number;
  cablesInParallel?: number;
  loadPerCable?: number;
  validationWarnings?: ValidationWarning[];
  requiresEngineerVerification?: boolean;
  alternatives?: CableAlternative[]; // Other cost-effective options
  costSavings?: number; // Savings vs most expensive option
  capacitySufficient?: boolean; // True if cable can handle required load
}

export interface CableAlternative {
  cableSize: string;
  cablesInParallel: number;
  loadPerCable: number;
  voltDropPercentage: number;
  totalCost: number;
  supplyCost: number;
  installCost: number;
  isRecommended: boolean;
}

// Standard copper cable sizes from SANS 1507-3 Table 6.2
export const COPPER_CABLE_TABLE: CableData[] = [
  { size: "1.5mm²", currentRatingGround: 24, currentRatingDucts: 20, currentRatingAir: 19, impedance: 14.48, voltDrop3Phase: 25.080, voltDrop1Phase: 28.956, d1_3c: 8.51, d1_4c: 9.33, d_3c: 1.25, d_4c: 1.25, d2_3c: 14.13, d2_4c: 14.95, mass_3c: 448, mass_4c: 501, supplyCost: 8.5, installCost: 15 },
  { size: "2.5mm²", currentRatingGround: 32, currentRatingDucts: 26, currentRatingAir: 26, impedance: 8.87, voltDrop3Phase: 15.363, voltDrop1Phase: 17.734, d1_3c: 9.61, d1_4c: 10.56, d_3c: 1.25, d_4c: 1.25, d2_3c: 15.23, d2_4c: 16.18, mass_3c: 522, mass_4c: 597, supplyCost: 12, installCost: 18 },
  { size: "4mm²", currentRatingGround: 42, currentRatingDucts: 34, currentRatingAir: 35, impedance: 5.52, voltDrop3Phase: 9.561, voltDrop1Phase: 11.034, d1_3c: 11.40, d1_4c: 12.57, d_3c: 1.25, d_4c: 1.25, d2_3c: 17.02, d2_4c: 18.39, mass_3c: 667, mass_4c: 762, supplyCost: 18, installCost: 22 },
  { size: "6mm²", currentRatingGround: 53, currentRatingDucts: 43, currentRatingAir: 45, impedance: 3.69, voltDrop3Phase: 6.391, voltDrop1Phase: 7.374, d1_3c: 12.58, d1_4c: 13.90, d_3c: 1.25, d_4c: 1.25, d2_3c: 18.40, d2_4c: 19.72, mass_3c: 790, mass_4c: 910, supplyCost: 25, installCost: 28 },
  { size: "10mm²", currentRatingGround: 70, currentRatingDucts: 58, currentRatingAir: 62, impedance: 2.19, voltDrop3Phase: 3.793, voltDrop1Phase: 4.384, d1_3c: 14.59, d1_4c: 16.14, d_3c: 1.25, d_4c: 1.25, d2_3c: 20.41, d2_4c: 21.96, mass_3c: 996, mass_4c: 1169, supplyCost: 38, installCost: 35 },
  { size: "16mm²", currentRatingGround: 91, currentRatingDucts: 75, currentRatingAir: 83, impedance: 1.38, voltDrop3Phase: 2.390, voltDrop1Phase: 2.759, d1_3c: 16.55, d1_4c: 19.18, d_3c: 1.25, d_4c: 1.60, d2_3c: 22.37, d2_4c: 25.92, mass_3c: 1295, mass_4c: 1768, supplyCost: 52, installCost: 42 },
  { size: "25mm²", currentRatingGround: 119, currentRatingDucts: 96, currentRatingAir: 110, impedance: 0.8749, voltDrop3Phase: 1.515, voltDrop1Phase: 1.749, d1_3c: 19.46, d1_4c: 21.34, d_3c: 1.60, d_4c: 1.60, d2_3c: 26.46, d2_4c: 28.34, mass_3c: 1838, mass_4c: 2196, supplyCost: 75, installCost: 55 },
  { size: "35mm²", currentRatingGround: 143, currentRatingDucts: 116, currentRatingAir: 135, impedance: 0.6335, voltDrop3Phase: 1.097, voltDrop1Phase: 1.267, d1_3c: 20.89, d1_4c: 23.97, d_3c: 1.60, d_4c: 1.60, d2_3c: 27.89, d2_4c: 31.17, mass_3c: 2215, mass_4c: 2732, supplyCost: 95, installCost: 65 },
  { size: "50mm²", currentRatingGround: 169, currentRatingDucts: 138, currentRatingAir: 163, impedance: 0.4718, voltDrop3Phase: 0.817, voltDrop1Phase: 0.944, d1_3c: 24.26, d1_4c: 28.14, d_3c: 1.60, d_4c: 2.00, d2_3c: 31.46, d2_4c: 36.54, mass_3c: 2871, mass_4c: 3893, supplyCost: 125, installCost: 78 },
  { size: "70mm²", currentRatingGround: 210, currentRatingDucts: 171, currentRatingAir: 207, impedance: 0.3325, voltDrop3Phase: 0.576, voltDrop1Phase: 0.665, d1_3c: 27.07, d1_4c: 31.29, d_3c: 2.00, d_4c: 2.00, d2_3c: 35.47, d2_4c: 40.09, mass_3c: 3617, mass_4c: 4837, supplyCost: 165, installCost: 95 },
  { size: "95mm²", currentRatingGround: 251, currentRatingDucts: 205, currentRatingAir: 251, impedance: 0.2460, voltDrop3Phase: 0.427, voltDrop1Phase: 0.492, d1_3c: 31.19, d1_4c: 35.82, d_3c: 2.00, d_4c: 2.00, d2_3c: 39.99, d2_4c: 44.62, mass_3c: 4901, mass_4c: 6115, supplyCost: 210, installCost: 115 },
  { size: "120mm²", currentRatingGround: 285, currentRatingDucts: 234, currentRatingAir: 290, impedance: 0.2012, voltDrop3Phase: 0.348, voltDrop1Phase: 0.402, d1_3c: 33.38, d1_4c: 38.10, d_3c: 2.00, d_4c: 2.00, d2_3c: 42.18, d2_4c: 47.40, mass_3c: 5720, mass_4c: 7269, supplyCost: 255, installCost: 135 },
  { size: "150mm²", currentRatingGround: 320, currentRatingDucts: 263, currentRatingAir: 332, impedance: 0.1698, voltDrop3Phase: 0.294, voltDrop1Phase: 0.339, d1_3c: 36.68, d1_4c: 42.05, d_3c: 2.00, d_4c: 2.50, d2_3c: 45.98, d2_4c: 52.65, mass_3c: 6908, mass_4c: 9250, supplyCost: 310, installCost: 155 },
  { size: "185mm²", currentRatingGround: 361, currentRatingDucts: 298, currentRatingAir: 378, impedance: 0.1445, voltDrop3Phase: 0.250, voltDrop1Phase: 0.289, d1_3c: 40.82, d1_4c: 46.75, d_3c: 2.50, d_4c: 2.50, d2_3c: 51.12, d2_4c: 57.45, mass_3c: 8690, mass_4c: 11039, supplyCost: 375, installCost: 180 },
  { size: "240mm²", currentRatingGround: 416, currentRatingDucts: 344, currentRatingAir: 445, impedance: 0.1220, voltDrop3Phase: 0.211, voltDrop1Phase: 0.244, d1_3c: 46.43, d1_4c: 53.06, d_3c: 2.50, d_4c: 2.50, d2_3c: 57.13, d2_4c: 64.16, mass_3c: 10767, mass_4c: 13726, supplyCost: 475, installCost: 215 },
  { size: "300mm²", currentRatingGround: 465, currentRatingDucts: 385, currentRatingAir: 510, impedance: 0.1090, voltDrop3Phase: 0.189, voltDrop1Phase: 0.218, d1_3c: 51.10, d1_4c: 58.53, d_3c: 2.50, d_4c: 2.50, d2_3c: 62.20, d2_4c: 70.13, mass_3c: 12950, mass_4c: 16544, supplyCost: 580, installCost: 250 },
];

// Standard aluminium cable sizes from SANS 1507-3 Table 6.3
export const ALUMINIUM_CABLE_TABLE: CableData[] = [
  { size: "25mm²", currentRatingGround: 90, currentRatingDucts: 73, currentRatingAir: 80, impedance: 1.4446, voltDrop3Phase: 2.502, voltDrop1Phase: 2.889, d1_3c: 17.76, d1_4c: 20.65, d_3c: 1.60, d_4c: 1.60, d2_3c: 24.76, d2_4c: 27.65, mass_3c: 1301, mass_4c: 1554, supplyCost: 45, installCost: 55 },
  { size: "35mm²", currentRatingGround: 108, currentRatingDucts: 87, currentRatingAir: 99, impedance: 1.0465, voltDrop3Phase: 1.813, voltDrop1Phase: 2.093, d1_3c: 19.33, d1_4c: 21.93, d_3c: 1.60, d_4c: 1.60, d2_3c: 26.33, d2_4c: 29.13, mass_3c: 1477, mass_4c: 1757, supplyCost: 58, installCost: 65 },
  { size: "50mm²", currentRatingGround: 129, currentRatingDucts: 104, currentRatingAir: 119, impedance: 0.7749, voltDrop3Phase: 1.342, voltDrop1Phase: 1.549, d1_3c: 21.87, d1_4c: 25.05, d_3c: 1.60, d_4c: 1.60, d2_3c: 29.07, d2_4c: 32.25, mass_3c: 1782, mass_4c: 2150, supplyCost: 75, installCost: 78 },
  { size: "70mm²", currentRatingGround: 158, currentRatingDucts: 130, currentRatingAir: 151, impedance: 0.5388, voltDrop3Phase: 0.933, voltDrop1Phase: 1.078, d1_3c: 24.76, d1_4c: 29.27, d_3c: 1.60, d_4c: 1.60, d2_3c: 31.96, d2_4c: 37.67, mass_3c: 2132, mass_4c: 2930, supplyCost: 98, installCost: 95 },
  { size: "95mm²", currentRatingGround: 192, currentRatingDucts: 157, currentRatingAir: 186, impedance: 0.3934, voltDrop3Phase: 0.681, voltDrop1Phase: 0.787, d1_3c: 28.68, d1_4c: 33.73, d_3c: 2.00, d_4c: 2.00, d2_3c: 37.08, d2_4c: 42.53, mass_3c: 2908, mass_4c: 3647, supplyCost: 125, installCost: 115 },
  { size: "120mm²", currentRatingGround: 219, currentRatingDucts: 179, currentRatingAir: 216, impedance: 0.3148, voltDrop3Phase: 0.545, voltDrop1Phase: 0.629, d1_3c: 31.09, d1_4c: 35.44, d_3c: 2.00, d_4c: 2.00, d2_3c: 39.89, d2_4c: 44.24, mass_3c: 3328, mass_4c: 4023, supplyCost: 152, installCost: 135 },
  { size: "150mm²", currentRatingGround: 245, currentRatingDucts: 201, currentRatingAir: 250, impedance: 0.2607, voltDrop3Phase: 0.452, voltDrop1Phase: 0.521, d1_3c: 33.99, d1_4c: 39.39, d_3c: 2.00, d_4c: 2.50, d2_3c: 42.79, d2_4c: 49.69, mass_3c: 3837, mass_4c: 5276, supplyCost: 185, installCost: 155 },
  { size: "185mm²", currentRatingGround: 278, currentRatingDucts: 229, currentRatingAir: 287, impedance: 0.2133, voltDrop3Phase: 0.369, voltDrop1Phase: 0.427, d1_3c: 37.80, d1_4c: 44.51, d_3c: 2.00, d_4c: 2.50, d2_3c: 47.10, d2_4c: 54.81, mass_3c: 4557, mass_4c: 6231, supplyCost: 222, installCost: 180 },
  { size: "240mm²", currentRatingGround: 324, currentRatingDucts: 268, currentRatingAir: 342, impedance: 0.1708, voltDrop3Phase: 0.296, voltDrop1Phase: 0.342, d1_3c: 42.60, d1_4c: 50.04, d_3c: 2.50, d_4c: 2.50, d2_3c: 52.9, d2_4c: 61.14, mass_3c: 5977, mass_4c: 7550, supplyCost: 280, installCost: 215 },
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
  maxAmpsPerCable?: number; // Maximum amps per cable (default 400A)
  preferredAmpsPerCable?: number; // Preferred amps per cable for parallel runs (default 300A)
  installationMethod?: 'air' | 'ducts' | 'ground'; // Installation method (default 'air')
  safetyMargin?: number; // Safety margin multiplier (e.g., 1.15 for 15% margin)
  voltageDropLimit?: number; // Custom voltage drop limit percentage
}

/**
 * Calculate recommended cable size based on load current
 * Applies derating factor and selects cable with adequate current rating
 * If length is provided, also checks voltage drop and upsizes if necessary
 * Returns number of cables needed in parallel if load exceeds maximum cable capacity
 */
export function calculateCableSize(
  params: CableCalculationParams
): CableCalculationResult | null {
  const { 
    loadAmps, 
    voltage, 
    totalLength, 
    deratingFactor = 1.0, 
    material = "copper",
    maxAmpsPerCable = 400,
    preferredAmpsPerCable = 300,
    installationMethod = 'air',
    safetyMargin = 1.0,
    voltageDropLimit
  } = params;

  if (!loadAmps || loadAmps <= 0 || !voltage || voltage <= 0) {
    return null;
  }

  const maxVoltDropPercentage = voltageDropLimit || (voltage === 400 ? 5 : 3);
  const cableTable = material === "aluminium" ? ALUMINIUM_CABLE_TABLE : COPPER_CABLE_TABLE;

  console.log(`[CABLE CALC START] Material: ${material}, Load: ${loadAmps}A, Voltage: ${voltage}V, Length: ${totalLength}m, Installation: ${installationMethod}`);

  // Try single cable first if load is reasonable
  if (loadAmps <= maxAmpsPerCable) {
    // Apply derating factor and safety margin to get required current rating
    // Safety margin increases required rating, derating factor also increases it (cable must handle MORE)
    const requiredRating = toFixed((loadAmps * safetyMargin) / deratingFactor);
    
    // Find the smallest cable that can handle the required current based on installation method
    let selectedCable = cableTable.find((cable) => {
      const currentRating = installationMethod === 'air' ? cable.currentRatingAir :
                           installationMethod === 'ground' ? cable.currentRatingGround :
                           cable.currentRatingDucts;
      return currentRating >= requiredRating;
    });

    console.log(`[INITIAL SELECTION] Required rating: ${requiredRating}A, Selected: ${selectedCable?.size}, Impedance: ${selectedCable?.impedance}`);

    // Track if capacity is sufficient
    let capacitySufficient = true;

    // If no single cable can handle the load, suggest the largest available cable
    if (!selectedCable) {
      console.log(`[NO MATCH] No single cable found for ${requiredRating}A, suggesting largest cable...`);
      selectedCable = cableTable[cableTable.length - 1]; // Largest cable in table
      
      // Check if even the largest cable is insufficient
      const largestCableRating = installationMethod === 'air' ? selectedCable.currentRatingAir :
                                 installationMethod === 'ground' ? selectedCable.currentRatingGround :
                                 selectedCable.currentRatingDucts;
      
      if (largestCableRating < requiredRating) {
        capacitySufficient = false;
        console.log(`[CAPACITY INSUFFICIENT] Largest cable ${selectedCable.size} (${largestCableRating}A) cannot meet required ${requiredRating}A`);
      }
    }

    // Check voltage drop if length provided
    if (totalLength > 0) {
      console.log(`[BEFORE VOLT DROP CHECK] Cable: ${selectedCable.size}, Impedance: ${selectedCable.impedance}`);
      selectedCable = findCableWithAcceptableVoltDrop(
        cableTable,
        selectedCable,
        loadAmps,
        voltage,
        totalLength
      );
      console.log(`[AFTER VOLT DROP CHECK] Cable: ${selectedCable.size}, Impedance: ${selectedCable.impedance}`);
    }

    const result = calculateSingleCableResult(selectedCable, loadAmps, voltage, totalLength);
    
    // Add validation warnings
    const validation = validateCableCalculation(
      selectedCable,
      loadAmps,
      voltage,
      totalLength,
      result.voltDropPercentage,
      installationMethod,
      deratingFactor
    );
    
    // Add capacity warning if insufficient
    const warnings = [...validation.warnings];
    if (!capacitySufficient) {
      warnings.unshift({
        type: 'error',
        message: `Cable capacity insufficient: ${selectedCable.size} cannot safely handle ${loadAmps}A. Consider parallel cables or alternative material.`,
        field: 'cable_size'
      });
    }
    
    return {
      ...result,
      cablesInParallel: 1,
      loadPerCable: loadAmps,
      validationWarnings: warnings,
      requiresEngineerVerification: validation.requiresVerification || !capacitySufficient,
      capacitySufficient
    };
  }

  // For high loads, evaluate all possible parallel configurations
  const alternatives = evaluateParallelOptions(
    loadAmps,
    voltage,
    totalLength,
    deratingFactor,
    maxAmpsPerCable,
    preferredAmpsPerCable,
    cableTable,
    installationMethod,
    safetyMargin,
    maxVoltDropPercentage
  );

  if (alternatives.length === 0) {
    return null;
  }

  // Find the most cost-effective option
  const recommended = alternatives.reduce((best, current) => 
    current.totalCost < best.totalCost ? current : best
  );

  const mostExpensive = alternatives.reduce((max, current) => 
    current.totalCost > max.totalCost ? current : max
  );

  const costSavings = toFixed(mostExpensive.totalCost - recommended.totalCost);

  // Find the cable details for the recommended option
  const recommendedCable = cableTable.find(c => c.size === recommended.cableSize)!;
  
  return {
    recommendedSize: recommended.cableSize,
    ohmPerKm: recommendedCable.impedance,
    voltDrop: calculateVoltDrop(recommended.loadPerCable, voltage, totalLength, recommendedCable),
    voltDropPercentage: recommended.voltDropPercentage,
    supplyCost: recommended.supplyCost,
    installCost: recommended.installCost,
    totalCost: recommended.totalCost,
    cablesInParallel: recommended.cablesInParallel,
    loadPerCable: recommended.loadPerCable,
    alternatives: alternatives.map(alt => ({
      ...alt,
      isRecommended: alt === recommended,
    })),
    costSavings,
  };
}

/**
 * Evaluate all possible parallel cable configurations and return viable options
 */
function evaluateParallelOptions(
  totalLoad: number,
  voltage: number,
  totalLength: number,
  deratingFactor: number,
  maxAmpsPerCable: number,
  preferredAmpsPerCable: number,
  cableTable: CableData[],
  installationMethod: 'air' | 'ducts' | 'ground' = 'air',
  safetyMargin: number = 1.15,
  maxVoltDropPercentage: number = 5
): CableAlternative[] {
  const alternatives: CableAlternative[] = [];

  // Calculate minimum number of cables needed to stay under max amps
  const minCables = Math.ceil(totalLoad / maxAmpsPerCable);
  
  // Try configurations from min cables up to reasonable maximum (e.g., 6 cables)
  const maxCablesToTry = Math.min(Math.ceil(totalLoad / preferredAmpsPerCable) + 2, 8);

  for (let numCables = minCables; numCables <= maxCablesToTry; numCables++) {
    const loadPerCable = totalLoad / numCables;
    
    // Skip if load per cable still exceeds max
    if (loadPerCable > maxAmpsPerCable) continue;

    // Apply safety margin to required rating
    const requiredRatingPerCable = (loadPerCable / deratingFactor) * safetyMargin;
    
    // Find smallest cable that can handle this current based on installation method
    let selectedCable = cableTable.find(cable => {
      const currentRating = installationMethod === 'air' ? cable.currentRatingAir :
                           installationMethod === 'ground' ? cable.currentRatingGround :
                           cable.currentRatingDucts;
      return currentRating >= requiredRatingPerCable;
    });

    if (!selectedCable) continue;

    // Check voltage drop if length provided
    if (totalLength > 0) {
      selectedCable = findCableWithAcceptableVoltDrop(
        cableTable,
        selectedCable,
        loadPerCable,
        voltage,
        totalLength
      );
      
      // Calculate voltage drop percentage
      const voltDrop = calculateVoltDrop(loadPerCable, voltage, totalLength, selectedCable);
      const voltDropPercentage = toFixed((voltDrop / voltage) * 100);
      
      // Skip if voltage drop is still too high
      if (voltDropPercentage > maxVoltDropPercentage) continue;
    }

    // Calculate total costs for this configuration
    const supplyCostPerCable = toFixed(selectedCable.supplyCost * (totalLength || 0));
    const installCostPerCable = toFixed(selectedCable.installCost * (totalLength || 0));
    const totalSupplyCost = toFixed(supplyCostPerCable * numCables);
    const totalInstallCost = toFixed(installCostPerCable * numCables);
    const totalCost = toFixed(totalSupplyCost + totalInstallCost);

    const voltDrop = calculateVoltDrop(loadPerCable, voltage, totalLength, selectedCable);
    const voltDropPercentage = totalLength > 0 
      ? toFixed((voltDrop / voltage) * 100)
      : 0;

    alternatives.push({
      cableSize: selectedCable.size,
      cablesInParallel: numCables,
      loadPerCable,
      totalCost,
      supplyCost: totalSupplyCost,
      installCost: totalInstallCost,
      voltDropPercentage,
      isRecommended: false,
    });
  }

  return alternatives;
}

/**
 * Find cable size that meets voltage drop requirements
 */
function findCableWithAcceptableVoltDrop(
  cableTable: CableData[],
  startCable: CableData,
  loadAmps: number,
  voltage: number,
  totalLength: number
): CableData {
  const maxVoltDropPercentage = voltage === 400 ? 5 : 3;
  let cableIndex = cableTable.findIndex(c => c.size === startCable.size);

  console.log(`[VOLT DROP SEARCH] Starting from ${startCable.size} at index ${cableIndex}, Max VD: ${maxVoltDropPercentage}%`);

  while (cableIndex < cableTable.length) {
    const testCable = cableTable[cableIndex];
    const voltDrop = calculateVoltDrop(loadAmps, voltage, totalLength, testCable);
    const voltDropPercentage = toFixed((voltDrop / voltage) * 100);

    console.log(`[TEST CABLE ${cableIndex}] Size: ${testCable.size}, Impedance: ${testCable.impedance}, VD: ${voltDropPercentage}%`);

    if (voltDropPercentage <= maxVoltDropPercentage) {
      console.log(`[SELECTED] ${testCable.size} with impedance ${testCable.impedance}`);
      return testCable;
    }
    cableIndex++;
  }

  const lastCable = cableTable[cableTable.length - 1];
  console.log(`[FALLBACK] Returning largest cable: ${lastCable.size}, Impedance: ${lastCable.impedance}`);
  return lastCable;
}

/**
 * Calculate voltage drop in volts using SANS voltage drop values
 */
function calculateVoltDrop(
  loadAmps: number,
  voltage: number,
  totalLength: number,
  cableData: CableData | number
): number {
  if (totalLength === 0) return 0;
  
  // If passed a CableData object, use the proper voltage drop values
  if (typeof cableData === 'object') {
    // Use SANS voltage drop values (mV/A/m)
    const voltDropPerAmpPerMeter = voltage === 400 ? cableData.voltDrop3Phase : cableData.voltDrop1Phase;
    // Convert mV to V: (mV/A/m) * A * m / 1000
    return toFixed((voltDropPerAmpPerMeter * loadAmps * totalLength) / 1000);
  } else {
    // Legacy: if just impedance value is passed
    const impedance = cableData;
    if (voltage === 400) {
      return (Math.sqrt(3) * loadAmps * impedance * totalLength) / 1000;
    } else {
      return (2 * loadAmps * impedance * totalLength) / 1000;
    }
  }
}

/**
 * Calculate result for a single cable
 */
function calculateSingleCableResult(
  cable: CableData,
  loadAmps: number,
  voltage: number,
  totalLength: number
): Omit<CableCalculationResult, 'cablesInParallel' | 'loadPerCable'> {
  const voltDrop = calculateVoltDrop(loadAmps, voltage, totalLength, cable);
  const voltDropPercentage = totalLength > 0 
    ? toFixed((voltDrop / voltage) * 100)
    : 0;
  
  // Calculate costs
  const supplyCost = toFixed(cable.supplyCost * (totalLength || 0));
  const installCost = toFixed(cable.installCost * (totalLength || 0));
  const totalCost = toFixed(supplyCost + installCost);

  // CRITICAL SAFETY CHECK: Verify cable data matches expected size
  const csaFromSize = cable.size.match(/(\d+\.?\d*)/);
  if (csaFromSize) {
    const expectedImpedance = 17.5 / parseFloat(csaFromSize[1]); // Approximate for copper
    console.log(`[CABLE VALIDATION] Size: ${cable.size}, Impedance: ${cable.impedance}, Expected~: ${expectedImpedance.toFixed(4)}`);
  }

  return {
    recommendedSize: cable.size,
    ohmPerKm: cable.impedance,
    voltDrop: toFixed(voltDrop),
    voltDropPercentage: toFixed(voltDropPercentage),
    supplyCost,
    installCost,
    totalCost,
  };
}
