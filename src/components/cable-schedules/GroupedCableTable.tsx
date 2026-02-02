import { useState, memo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VirtualizedCableTable } from "./VirtualizedCableTable";
import type { CableGroup } from "./useCableFiltering";

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

interface GroupedCableTableProps {
  groups: CableGroup[];
  onEdit: (entry: CableEntry) => void;
  onDelete: (entry: CableEntry) => void;
  onSplit: (entry: CableEntry) => void;
  tenantLoadMap?: Map<string, number>;
  tenantNameMap?: Map<string, string>;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

const GroupHeader = memo(({
  group,
  isExpanded,
  onToggle,
}: {
  group: CableGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <Button
    variant="ghost"
    className="w-full justify-start gap-2 py-3 px-4 h-auto bg-muted/50 hover:bg-muted rounded-lg"
    onClick={onToggle}
  >
    {isExpanded ? (
      <ChevronDown className="h-4 w-4" />
    ) : (
      <ChevronRight className="h-4 w-4" />
    )}
    <span className="font-semibold">{group.shopName}</span>
    <Badge variant="secondary" className="ml-2">
      {group.entries.length} cable{group.entries.length !== 1 ? "s" : ""}
    </Badge>
  </Button>
));

GroupHeader.displayName = "GroupHeader";

export function GroupedCableTable({
  groups,
  onEdit,
  onDelete,
  onSplit,
  tenantLoadMap,
  tenantNameMap,
  selectedIds = new Set(),
  onSelectionChange,
}: GroupedCableTableProps) {
  // Track expanded groups - all expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return new Set(groups.map((g) => g.shopNumber));
  });

  const toggleGroup = (shopNumber: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(shopNumber)) {
        next.delete(shopNumber);
      } else {
        next.add(shopNumber);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map((g) => g.shopNumber)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // If only one group with empty shop number, render flat table
  if (groups.length === 1 && groups[0].shopNumber === "") {
    return (
      <VirtualizedCableTable
        entries={groups[0].entries}
        onEdit={onEdit}
        onDelete={onDelete}
        onSplit={onSplit}
        tenantLoadMap={tenantLoadMap}
        tenantNameMap={tenantNameMap}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Expand/Collapse all controls */}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Grouped sections */}
      {groups.map((group) => (
        <div key={group.shopNumber} className="space-y-2">
          <GroupHeader
            group={group}
            isExpanded={expandedGroups.has(group.shopNumber)}
            onToggle={() => toggleGroup(group.shopNumber)}
          />
          {expandedGroups.has(group.shopNumber) && (
            <div className="pl-2">
              <VirtualizedCableTable
                entries={group.entries}
                onEdit={onEdit}
                onDelete={onDelete}
                onSplit={onSplit}
                tenantLoadMap={tenantLoadMap}
                tenantNameMap={tenantNameMap}
                selectedIds={selectedIds}
                onSelectionChange={onSelectionChange}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
