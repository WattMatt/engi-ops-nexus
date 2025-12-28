import { useMemo } from 'react';
import type { EquipmentItem, SupplyLine, Containment } from '../types';
import type { TakeoffCounts } from '../components/LinkToFinalAccountDialog';
import type { DbCircuitMaterial } from '@/components/circuit-schedule/hooks/useDistributionBoards';

export function useTakeoffCounts(
  equipment: EquipmentItem[],
  lines: SupplyLine[],
  containment: Containment[],
  circuitMaterials?: DbCircuitMaterial[]
): TakeoffCounts {
  return useMemo(() => {
    // Count equipment by type
    const equipmentCounts: Record<string, number> = {};
    for (const item of equipment) {
      const type = item.type;
      equipmentCounts[type] = (equipmentCounts[type] || 0) + 1;
    }

    // Sum containment by type
    const containmentLengths: Record<string, number> = {};
    for (const item of containment) {
      const type = item.type;
      containmentLengths[type] = (containmentLengths[type] || 0) + item.length;
    }

    // Aggregate cables by type (from canvas lines)
    const cableCounts: Record<string, { count: number; totalLength: number }> = {};
    for (const line of lines) {
      if (line.type === 'lv' && line.cableType) {
        const type = line.cableType;
        if (!cableCounts[type]) {
          cableCounts[type] = { count: 0, totalLength: 0 };
        }
        cableCounts[type].count += 1;
        cableCounts[type].totalLength += line.length || 0;
      }
    }

    // Aggregate circuit wiring materials from db_circuit_materials
    const circuitWiring: Record<string, { count: number; totalLength: number }> = {};
    if (circuitMaterials && circuitMaterials.length > 0) {
      for (const material of circuitMaterials) {
        // Extract cable type from description (e.g., "2.5mm GP - DB-04A to Lighting circuit 1")
        const description = material.description || '';
        let cableType = '';
        
        // Try to extract cable type from the beginning of description
        const gpMatch = description.match(/^([\d.]+mm\s*GP)/i);
        const cableMatch = description.match(/^([\d.]+mm\s*\S+)/i);
        
        if (gpMatch) {
          cableType = gpMatch[1];
        } else if (cableMatch) {
          cableType = cableMatch[1];
        } else {
          // Use the full description for grouping
          cableType = description.split(' - ')[0] || description;
        }
        
        if (cableType) {
          if (!circuitWiring[cableType]) {
            circuitWiring[cableType] = { count: 0, totalLength: 0 };
          }
          circuitWiring[cableType].count += 1;
          
          // For GP wires, quantity is path length - we need to multiply by 3 for total
          const isGPWire = description.toLowerCase().includes('gp');
          const length = material.quantity || 0;
          circuitWiring[cableType].totalLength += isGPWire ? length * 3 : length;
        }
      }
    }

    return {
      equipment: equipmentCounts,
      containment: containmentLengths,
      cables: cableCounts,
      circuitWiring,
    };
  }, [equipment, lines, containment, circuitMaterials]);
}
