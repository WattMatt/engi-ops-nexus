import { useMemo } from 'react';
import type { EquipmentItem, SupplyLine, Containment } from '../types';
import type { TakeoffCounts } from '../components/LinkToFinalAccountDialog';

export function useTakeoffCounts(
  equipment: EquipmentItem[],
  lines: SupplyLine[],
  containment: Containment[]
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

    // Aggregate cables by type
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

    return {
      equipment: equipmentCounts,
      containment: containmentLengths,
      cables: cableCounts,
    };
  }, [equipment, lines, containment]);
}
