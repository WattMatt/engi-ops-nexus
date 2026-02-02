import { useMemo } from "react";
import type { CableFilters } from "./CableScheduleFilters";

interface CableEntry {
  id: string;
  cable_tag: string;
  cable_number?: number;
  base_cable_tag?: string;
  parallel_group_id?: string;
  parallel_total_count?: number;
  from_location: string;
  to_location: string;
  quantity?: number;
  voltage?: number;
  load_amps?: number;
  cable_type?: string;
  installation_method?: string;
  cable_size?: string;
  total_length?: number;
  measured_length?: number;
  extra_length?: number;
}

export interface CableGroup {
  shopNumber: string;
  shopName: string;
  entries: CableEntry[];
}

// Extract shop number from to_location (e.g., "Shop 45" -> "45")
const extractShopNumber = (location: string): string | null => {
  const match = location.match(/Shop\s+(\d+[A-Za-z]*)/i);
  return match ? match[1] : null;
};

// Get unique values from entries for filter options
export function useFilterOptions(entries: CableEntry[]) {
  return useMemo(() => {
    const cableTypes = new Set<string>();
    const installationMethods = new Set<string>();
    const cableSizes = new Set<string>();
    const voltages = new Set<string>();

    entries.forEach((entry) => {
      if (entry.cable_type) cableTypes.add(entry.cable_type);
      if (entry.installation_method) installationMethods.add(entry.installation_method);
      if (entry.cable_size) cableSizes.add(entry.cable_size);
      if (entry.voltage) voltages.add(String(entry.voltage));
    });

    // Sort sizes numerically
    const sortedSizes = Array.from(cableSizes).sort((a, b) => {
      const numA = parseFloat(a.replace(/[^\d.]/g, "")) || 0;
      const numB = parseFloat(b.replace(/[^\d.]/g, "")) || 0;
      return numA - numB;
    });

    // Sort voltages numerically
    const sortedVoltages = Array.from(voltages).sort((a, b) => {
      return parseInt(a) - parseInt(b);
    });

    return {
      cableTypes: Array.from(cableTypes).sort(),
      installationMethods: Array.from(installationMethods).sort(),
      cableSizes: sortedSizes,
      voltages: sortedVoltages,
    };
  }, [entries]);
}

// Filter entries based on filter state
export function useFilteredEntries(
  entries: CableEntry[],
  filters: CableFilters
) {
  return useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          entry.cable_tag?.toLowerCase().includes(searchLower) ||
          entry.from_location?.toLowerCase().includes(searchLower) ||
          entry.to_location?.toLowerCase().includes(searchLower) ||
          entry.cable_size?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Cable type filter
      if (filters.cableType !== "all" && entry.cable_type !== filters.cableType) {
        return false;
      }

      // Installation method filter
      if (
        filters.installationMethod !== "all" &&
        entry.installation_method !== filters.installationMethod
      ) {
        return false;
      }

      // Cable size filter
      if (filters.cableSize !== "all" && entry.cable_size !== filters.cableSize) {
        return false;
      }

      // Voltage filter
      if (
        filters.voltage !== "all" &&
        String(entry.voltage) !== filters.voltage
      ) {
        return false;
      }

      // Status filter (complete/incomplete)
      if (filters.status !== "all") {
        const hasCompleteData =
          entry.voltage && entry.load_amps && entry.cable_size;
        if (filters.status === "complete" && !hasCompleteData) return false;
        if (filters.status === "incomplete" && hasCompleteData) return false;
      }

      return true;
    });
  }, [entries, filters]);
}

// Group entries by shop number
export function useGroupedEntries(
  entries: CableEntry[],
  groupByShop: boolean,
  tenantNameMap?: Map<string, string>
): CableGroup[] {
  return useMemo(() => {
    if (!groupByShop) {
      return [
        {
          shopNumber: "",
          shopName: "All Cables",
          entries,
        },
      ];
    }

    const groups = new Map<string, CableEntry[]>();
    const otherEntries: CableEntry[] = [];

    entries.forEach((entry) => {
      const shopNum = extractShopNumber(entry.to_location);
      if (shopNum) {
        const existing = groups.get(shopNum) || [];
        existing.push(entry);
        groups.set(shopNum, existing);
      } else {
        otherEntries.push(entry);
      }
    });

    // Sort groups by shop number
    const sortedGroups = Array.from(groups.entries())
      .sort((a, b) => {
        const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
        const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .map(([shopNum, groupEntries]) => {
        const shopName = tenantNameMap?.get(shopNum.toLowerCase()) || "";
        return {
          shopNumber: shopNum,
          shopName: shopName ? `Shop ${shopNum} - ${shopName}` : `Shop ${shopNum}`,
          entries: groupEntries,
        };
      });

    // Add "Other" group for entries without shop numbers
    if (otherEntries.length > 0) {
      sortedGroups.push({
        shopNumber: "other",
        shopName: "Other / General",
        entries: otherEntries,
      });
    }

    return sortedGroups;
  }, [entries, groupByShop, tenantNameMap]);
}
