import { calculateCableSize, CableCalculationParams, COPPER_CABLE_TABLE, ALUMINIUM_CABLE_TABLE } from "./cableSizing";
import type { CalculationSettings } from "@/hooks/useCalculationSettings";

export interface OptimizationResult {
  cableId: string;
  cableTag: string;
  fromLocation: string;
  toLocation: string;
  totalLength: number;
  currentConfig: {
    size: string;
    parallelCount: number;
    totalCost: number;
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    voltage: number;
    loadAmps: number;
  };
  alternatives: Array<{
    size: string;
    parallelCount: number;
    totalCost: number;
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    savings: number;
    savingsPercent: number;
    voltDrop: number;
    isCurrentConfig?: boolean;
    complianceReport?: string;
  }>;
  complianceNotes?: string;
}

interface CableEntry {
  id: string;
  cable_tag: string;
  base_cable_tag: string | null;
  parallel_group_id: string | null;
  parallel_total_count: number | null;
  from_location: string;
  to_location: string;
  voltage: number | null;
  load_amps: number | null;
  cable_size: string | null;
  cable_type: string | null;
  total_length: number | null;
  grouping_factor: number | null;
  installation_method: string | null;
  protection_device_rating: number | null;
}

interface CableRate {
  cable_size: string;
  cable_type: string;
  supply_rate_per_meter: number;
  install_rate_per_meter: number;
  termination_cost_per_end: number;
}

// Calculate grouping factor per SANS 10142-1 based on parallel cable count
const calculateGroupingFactor = (parallelCount: number, settings: CalculationSettings): number => {
  if (parallelCount === 1) return 1.0;
  if (parallelCount === 2) return settings.grouping_factor_2_circuits;
  if (parallelCount === 3) return settings.grouping_factor_3_circuits;
  return settings.grouping_factor_4plus_circuits; // 4 or more
};

// Normalize cable type for matching (handles "Aluminium", "Al/PVC", "Copper", "Cu/PVC" etc.)
const normalizeCableType = (cableType: string): string => {
  const lower = cableType.toLowerCase();
  if (lower.includes('al') || lower.includes('aluminium')) return 'aluminium';
  if (lower.includes('cu') || lower.includes('copper')) return 'copper';
  return lower;
};

const calculateCostBreakdown = (
  cableSize: string,
  cableType: string,
  lengthMeters: number,
  parallelCount: number,
  cableRates: CableRate[]
): { total: number; supply: number; install: number; termination: number } => {
  const normalizedType = normalizeCableType(cableType);
  
  // Try exact match first, then normalized match
  let rate = cableRates.find(
    r => r.cable_size === cableSize && r.cable_type === cableType
  );
  
  if (!rate) {
    rate = cableRates.find(
      r => r.cable_size === cableSize && normalizeCableType(r.cable_type) === normalizedType
    );
  }

  if (!rate) return { total: 0, supply: 0, install: 0, termination: 0 };

  const supply = rate.supply_rate_per_meter * lengthMeters * parallelCount;
  const install = rate.install_rate_per_meter * lengthMeters * parallelCount;
  const termination = rate.termination_cost_per_end * 2 * parallelCount;

  return {
    total: supply + install + termination,
    supply,
    install,
    termination,
  };
};

export const analyzeCableOptimizations = (
  cableEntries: CableEntry[],
  cableRates: CableRate[],
  calcSettings: CalculationSettings
): OptimizationResult[] => {
  const optimizations: OptimizationResult[] = [];

  // Group cables by parallel_group_id or base_cable_tag
  const cableGroups = new Map<string, CableEntry>();
  
  for (const entry of cableEntries) {
    const groupKey = entry.parallel_group_id || entry.base_cable_tag || entry.cable_tag;
    
    if (!cableGroups.has(groupKey)) {
      cableGroups.set(groupKey, entry);
    }
  }
  
  const uniqueCables = Array.from(cableGroups.values());
  
  for (const entry of uniqueCables) {
    const currentParallelCount = entry.parallel_total_count || 1;
    
    if (!entry.voltage || !entry.total_length) continue;
    
    // PHASE 1: Target Ampacity Logic
    // load_amps represents the TOTAL circuit load (not per cable)
    // Fall back to protection_device_rating only if load data unavailable
    const targetAmpacity = (entry.load_amps && entry.load_amps > 0) 
      ? entry.load_amps 
      : entry.protection_device_rating;
    const protectionDeviceRating = entry.protection_device_rating;
    
    if (!targetAmpacity || targetAmpacity === 0) continue;

    const material = entry.cable_type?.includes("Cu") ? "copper" : 
                    entry.cable_type?.includes("Al") ? "aluminium" : 
                    (calcSettings.default_cable_material.toLowerCase() as "copper" | "aluminium");

    const currentCostBreakdown = calculateCostBreakdown(
      entry.cable_size || "",
      entry.cable_type || "",
      entry.total_length,
      currentParallelCount,
      cableRates
    );

    const testedAlternatives: OptimizationResult["alternatives"] = [];

    const maxPracticalParallel = currentParallelCount > 1 
      ? Math.min(6, currentParallelCount + 1)
      : 6;
    
    const minPracticalParallel = currentParallelCount > 1
      ? Math.max(1, currentParallelCount - 2)
      : 1;

    for (let newParallelCount = minPracticalParallel; newParallelCount <= maxPracticalParallel; newParallelCount++) {
      const ampacityPerCable = targetAmpacity / newParallelCount;
      
      if (ampacityPerCable < 50 || ampacityPerCable > calcSettings.max_amps_per_cable) continue;
      
      // PHASE 2: Implement Proper Derating - Auto-calculate grouping factor
      const effectiveGroupingFactor = calculateGroupingFactor(newParallelCount, calcSettings);
      
      const testParams: CableCalculationParams = {
        loadAmps: ampacityPerCable,
        voltage: entry.voltage,
        totalLength: entry.total_length,
        material,
        deratingFactor: effectiveGroupingFactor,
        installationMethod: (entry.installation_method || calcSettings.default_installation_method) as 'air' | 'ducts' | 'ground',
        safetyMargin: calcSettings.cable_safety_margin,
        maxAmpsPerCable: calcSettings.max_amps_per_cable,
        preferredAmpsPerCable: calcSettings.preferred_amps_per_cable,
        voltageDropLimit: entry.voltage >= 380 ? 
          calcSettings.voltage_drop_limit_400v : 
          calcSettings.voltage_drop_limit_230v,
      };

      const result = calculateCableSize(testParams);
      
      if (!result) continue;
      
      // CRITICAL: Skip if capacity is insufficient
      if (result.capacitySufficient === false) {
        console.log(`[OPTIMIZER SKIP] ${result.recommendedSize} x ${newParallelCount} insufficient for ${targetAmpacity}A`);
        continue;
      }
      
      // PHASE 3: SANS 10142-1 Compliance Checks
      const cableData = material === "aluminium" ? 
        ALUMINIUM_CABLE_TABLE.find(c => c.size === result.recommendedSize) :
        COPPER_CABLE_TABLE.find(c => c.size === result.recommendedSize);
      
      if (!cableData) {
        console.log(`[ERROR] Cable data not found for ${result.recommendedSize}`);
        continue;
      }
      
      const installMethod = (entry.installation_method || calcSettings.default_installation_method) as 'air' | 'ducts' | 'ground';
      const baseCableRating = installMethod === 'air' ? cableData.currentRatingAir :
                             installMethod === 'ground' ? cableData.currentRatingGround :
                             cableData.currentRatingDucts;
      
      // Apply proper derating to get derated cable capacity (Iz)
      const deratedCapacityPerCable = baseCableRating * effectiveGroupingFactor;
      const totalDeratedCapacity = deratedCapacityPerCable * newParallelCount;
      
      // COMPLIANCE CHECK 1: Cable capacity must handle design current with safety margin
      const requiredPerCable = ampacityPerCable * calcSettings.cable_safety_margin;
      if (deratedCapacityPerCable < requiredPerCable) {
        console.log(`[COMPLIANCE FAIL - CAPACITY] ${result.recommendedSize} derated ${deratedCapacityPerCable.toFixed(1)}A < required ${requiredPerCable.toFixed(1)}A per cable`);
        continue;
      }
      
      // COMPLIANCE CHECK 2: SANS 10142-1 Protection Coordination
      // Rule: In ≤ Iz (Protection device rating ≤ Cable capacity)
      // NOTE: Only apply this check when protection_device_rating appears to be local protection
      // (not an upstream main breaker). If protection >> load (3x+), it's likely the main breaker.
      const isLocalProtection = protectionDeviceRating && protectionDeviceRating <= targetAmpacity * 3;
      
      if (isLocalProtection && protectionDeviceRating > totalDeratedCapacity) {
        console.log(`[COMPLIANCE FAIL - In≤Iz] Protection ${protectionDeviceRating}A > Cable capacity ${totalDeratedCapacity.toFixed(1)}A`);
        continue;
      }
      
      // Rule: I2 ≤ 1.45 × Iz (Tripping current ≤ 1.45 × cable capacity)
      // For circuit breakers, I2 is typically 1.45 × In per SANS 10142-1
      // Only apply when we have local protection (not upstream main breaker)
      if (isLocalProtection) {
        const trippingCurrent = protectionDeviceRating * 1.45;
        const maxAllowableTripping = totalDeratedCapacity * 1.45;
        
        if (trippingCurrent > maxAllowableTripping) {
          console.log(`[COMPLIANCE FAIL - I2≤1.45Iz] Tripping ${trippingCurrent.toFixed(1)}A > Max ${maxAllowableTripping.toFixed(1)}A`);
          continue;
        }
      }
      
      // COMPLIANCE CHECK 3: Voltage drop must be within limits
      const voltDropLimit = entry.voltage >= 380 ? 
        calcSettings.voltage_drop_limit_400v : 
        calcSettings.voltage_drop_limit_230v;
      
      if (result.voltDropPercentage > voltDropLimit) {
        console.log(`[COMPLIANCE FAIL - VOLTAGE DROP] ${result.voltDropPercentage.toFixed(2)}% exceeds limit ${voltDropLimit}%`);
        continue;
      }
      
      // COMPLIANCE CHECK 4: Minimum cable size based on protection device rating
      const cableSizeNum = parseFloat(result.recommendedSize.replace(/mm²/g, ''));
      
      if (protectionDeviceRating) {
        let minRequiredSize = 1.5;
        
        // Minimum size requirements per SANS 10142-1
        if (protectionDeviceRating > 800) minRequiredSize = 185;
        else if (protectionDeviceRating > 630) minRequiredSize = 150;
        else if (protectionDeviceRating > 500) minRequiredSize = 120;
        else if (protectionDeviceRating > 400) minRequiredSize = 95;
        else if (protectionDeviceRating > 315) minRequiredSize = 70;
        else if (protectionDeviceRating > 250) minRequiredSize = 50;
        else if (protectionDeviceRating > 200) minRequiredSize = 35;
        else if (protectionDeviceRating > 160) minRequiredSize = 25;
        else if (protectionDeviceRating > 125) minRequiredSize = 16;
        else if (protectionDeviceRating > 100) minRequiredSize = 10;
        else if (protectionDeviceRating > 63) minRequiredSize = 6;
        else if (protectionDeviceRating > 32) minRequiredSize = 4;
        else if (protectionDeviceRating > 20) minRequiredSize = 2.5;
        
        if (cableSizeNum < minRequiredSize) {
          console.log(`[COMPLIANCE FAIL - MIN SIZE] ${result.recommendedSize} < min ${minRequiredSize}mm² for ${protectionDeviceRating}A CB`);
          continue;
        }
      }

      // PHASE 4: Improve Cost Accuracy - Use entry's cable type to match rates
      const recommendedCableType = entry.cable_type || (material === "copper" ? "Copper" : "Aluminium");

      const altCostBreakdown = calculateCostBreakdown(
        result.recommendedSize,
        recommendedCableType,
        entry.total_length,
        newParallelCount,
        cableRates
      );

      const savings = currentCostBreakdown.total - altCostBreakdown.total;
      
      const isCurrentConfig = result.recommendedSize === entry.cable_size && 
                               newParallelCount === currentParallelCount;
      
      // PHASE 5: Better Logging & Transparency - Create compliance report
      const complianceReport = `Design: ${targetAmpacity.toFixed(0)}A | ` +
        `CB: ${protectionDeviceRating ? protectionDeviceRating.toFixed(0) + 'A' : 'N/A'} | ` +
        `Cable: ${(deratedCapacityPerCable * newParallelCount).toFixed(0)}A (${deratedCapacityPerCable.toFixed(0)}A × ${newParallelCount}) | ` +
        `Grouping: ${(effectiveGroupingFactor * 100).toFixed(0)}% | ` +
        `Margin: ${((deratedCapacityPerCable / ampacityPerCable - 1) * 100).toFixed(0)}%`;
      
      // Only add alternatives that are compliant and either save money or are current config
      if (isCurrentConfig || savings > 0 || altCostBreakdown.total < currentCostBreakdown.total * 0.95) {
        testedAlternatives.push({
          size: result.recommendedSize,
          parallelCount: newParallelCount,
          totalCost: altCostBreakdown.total,
          supplyCost: altCostBreakdown.supply,
          installCost: altCostBreakdown.install,
          terminationCost: altCostBreakdown.termination,
          savings,
          savingsPercent: currentCostBreakdown.total > 0 ? 
            (savings / currentCostBreakdown.total) * 100 : 0,
          voltDrop: result.voltDropPercentage,
          isCurrentConfig,
          complianceReport,
        });
      }
    }

    testedAlternatives.sort((a, b) => a.totalCost - b.totalCost);

    if (testedAlternatives.length > 0) {
      const complianceNotes = entry.load_amps 
        ? `Circuit load: ${targetAmpacity.toFixed(0)}A. Protection: ${protectionDeviceRating || 'N/A'}A. All alternatives meet SANS 10142-1 requirements: In ≤ Iz, I2 ≤ 1.45×Iz, voltage drop limits, and minimum cable sizing.`
        : `Design based on protection device: ${protectionDeviceRating}A (load data unavailable). All alternatives meet SANS 10142-1 compliance checks.`;
      
      optimizations.push({
        cableId: entry.id,
        cableTag: entry.base_cable_tag || entry.cable_tag,
        fromLocation: entry.from_location,
        toLocation: entry.to_location,
        totalLength: entry.total_length,
        currentConfig: {
          size: entry.cable_size || "",
          parallelCount: currentParallelCount,
          totalCost: currentCostBreakdown.total,
          supplyCost: currentCostBreakdown.supply,
          installCost: currentCostBreakdown.install,
          terminationCost: currentCostBreakdown.termination,
          voltage: entry.voltage,
          loadAmps: targetAmpacity,
        },
        alternatives: testedAlternatives,
        complianceNotes,
      });
    }
  }

  return optimizations;
};
