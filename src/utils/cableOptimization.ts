import { calculateCableSize, CableCalculationParams } from "./cableSizing";
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
  }>;
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

const calculateCostBreakdown = (
  cableSize: string,
  cableType: string,
  lengthMeters: number,
  parallelCount: number,
  cableRates: CableRate[]
): { total: number; supply: number; install: number; termination: number } => {
  const rate = cableRates.find(
    r => r.cable_size === cableSize && r.cable_type === cableType
  );

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
    
    const targetAmpacity = entry.protection_device_rating;
    
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
      
      const testParams: CableCalculationParams = {
        loadAmps: ampacityPerCable,
        voltage: entry.voltage,
        totalLength: entry.total_length,
        material,
        deratingFactor: entry.grouping_factor || 1.0,
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
      
      // Verify the recommended cable can actually handle the per-cable load
      const cableData = material === "aluminium" ? 
        require("./cableSizing").ALUMINIUM_CABLE_TABLE.find((c: any) => c.size === result.recommendedSize) :
        require("./cableSizing").COPPER_CABLE_TABLE.find((c: any) => c.size === result.recommendedSize);
      
      if (cableData) {
        const installMethod = (entry.installation_method || calcSettings.default_installation_method) as 'air' | 'ducts' | 'ground';
        const cableRating = installMethod === 'air' ? cableData.currentRatingAir :
                           installMethod === 'ground' ? cableData.currentRatingGround :
                           cableData.currentRatingDucts;
        
        const requiredPerCable = ampacityPerCable * calcSettings.cable_safety_margin;
        
        if (cableRating < requiredPerCable) {
          console.log(`[OPTIMIZER SKIP] ${result.recommendedSize} rating ${cableRating}A < required ${requiredPerCable}A per cable`);
          continue;
        }
      }

      const altCostBreakdown = calculateCostBreakdown(
        result.recommendedSize,
        entry.cable_type || "",
        entry.total_length,
        newParallelCount,
        cableRates
      );

      const savings = currentCostBreakdown.total - altCostBreakdown.total;
      
      const isCurrentConfig = result.recommendedSize === entry.cable_size && 
                               newParallelCount === currentParallelCount;
      
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
      });
    }

    testedAlternatives.sort((a, b) => a.totalCost - b.totalCost);

    if (testedAlternatives.length > 0) {
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
      });
    }
  }

  return optimizations;
};
