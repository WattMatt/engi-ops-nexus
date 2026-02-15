// SANS 10142-1 Cable Sizing Data
import { validateCableCalculation } from './cableValidation';
import { 
  CableData, 
  COPPER_CABLE_TABLE, 
  ALUMINIUM_CABLE_TABLE, 
  CABLE_SIZING_TABLE 
} from '../data/cable-specs';
import { ValidationWarning } from '../types/cableTypes';

// Helper function for formatting numbers to fixed precision
const toFixed = (value: number, precision: number = 2): number => 
  Number(value.toFixed(precision));

// Re-export CableData interface and tables for backward compatibility if needed
export type { CableData };
export { COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE, CABLE_SIZING_TABLE, ValidationWarning };

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
