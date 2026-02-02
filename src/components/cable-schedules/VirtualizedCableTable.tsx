import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Split } from 'lucide-react';
import { round } from '@/utils/decimalPrecision';

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

interface VirtualizedCableTableProps {
  entries: CableEntry[];
  onEdit: (entry: CableEntry) => void;
  onDelete: (entry: CableEntry) => void;
  onSplit: (entry: CableEntry) => void;
  tenantLoadMap?: Map<string, number>;
  tenantNameMap?: Map<string, string>;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

// Column styles for full-width distribution
const colStyles = {
  checkbox: 'w-[3%] min-w-[40px] text-center',
  status: 'w-[4%] min-w-[50px] text-center',
  cableNum: 'w-[5%] min-w-[50px]',
  cableTag: 'w-[13%] min-w-[120px]',
  from: 'w-[11%] min-w-[100px]',
  to: 'w-[11%] min-w-[100px]',
  qty: 'w-[4%] min-w-[40px] text-center',
  voltage: 'w-[6%] min-w-[60px]',
  loadAmps: 'w-[6%] min-w-[60px]',
  cableType: 'w-[8%] min-w-[80px]',
  installMethod: 'w-[7%] min-w-[70px]',
  cableSize: 'w-[6%] min-w-[60px]',
  length: 'w-[7%] min-w-[70px]',
  actions: 'w-[9%] min-w-[90px] text-right',
};

// Extract shop number from to_location (e.g., "Shop 45 - Store Name" -> "45")
const extractShopNumber = (toLocation: string): string | null => {
  const match = toLocation.match(/Shop\s+(\d+[A-Za-z]*)/i);
  return match ? match[1].toLowerCase() : null;
};

// Memoized row component for performance
const CableRow = memo(({ 
  entry, 
  onEdit, 
  onDelete, 
  onSplit,
  style,
  tenantLoadMap,
  tenantNameMap,
  isSelected,
  onToggleSelect,
}: { 
  entry: CableEntry; 
  onEdit: (entry: CableEntry) => void;
  onDelete: (entry: CableEntry) => void;
  onSplit: (entry: CableEntry) => void;
  style: React.CSSProperties;
  tenantLoadMap?: Map<string, number>;
  tenantNameMap?: Map<string, string>;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) => {
  const hasCompleteData = entry.voltage && entry.load_amps && entry.cable_size;
  
  let displayCableTag = entry.cable_tag;
  let displayCableNumber = entry.cable_number || 1;
  
  if (entry.parallel_group_id && entry.parallel_total_count) {
    const baseTag = entry.base_cable_tag || entry.cable_tag;
    displayCableTag = `${baseTag} (${entry.cable_number}/${entry.parallel_total_count})`;
    displayCableNumber = entry.cable_number || 1;
  }

  const totalLength = entry.total_length || 
    round((entry.measured_length || 0) + (entry.extra_length || 0), 2);

  // Get SOW load and tenant name from lookup maps
  const shopNum = extractShopNumber(entry.to_location);
  const sowLoad = shopNum ? tenantLoadMap?.get(shopNum) : undefined;
  const displayLoad = entry.load_amps || sowLoad || '-';
  
  // Build display location with tenant name if available
  let displayToLocation = entry.to_location;
  if (shopNum && tenantNameMap) {
    const tenantName = tenantNameMap.get(shopNum);
    // Only add tenant name if not already in to_location
    if (tenantName && !entry.to_location.toLowerCase().includes(tenantName.toLowerCase())) {
      displayToLocation = `Shop ${shopNum.toUpperCase()} - ${tenantName}`;
    }
  }

  return (
    <div 
      className={`flex items-center border-b hover:bg-muted/50 transition-colors text-sm ${isSelected ? 'bg-primary/10' : ''}`}
      style={style}
    >
      <div className={`${colStyles.checkbox} px-2 py-3 flex justify-center`}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(entry.id)}
          aria-label={`Select ${entry.cable_tag}`}
        />
      </div>
      <div className={`${colStyles.status} px-2 py-3 flex justify-center`}>
        {hasCompleteData ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Complete" />
        ) : (
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" title="Incomplete" />
        )}
      </div>
      <div className={`${colStyles.cableNum} px-2 py-3 font-medium`}>{displayCableNumber}</div>
      <div className={`${colStyles.cableTag} px-2 py-3 font-medium truncate`} title={displayCableTag}>{displayCableTag}</div>
      <div className={`${colStyles.from} px-2 py-3 truncate`} title={entry.from_location}>{entry.from_location}</div>
      <div className={`${colStyles.to} px-2 py-3 truncate`} title={displayToLocation}>{displayToLocation}</div>
      <div className={`${colStyles.qty} px-2 py-3`}>{entry.quantity || 1}</div>
      <div className={`${colStyles.voltage} px-2 py-3`}>{entry.voltage || '-'}</div>
      <div className={`${colStyles.loadAmps} px-2 py-3`}>{displayLoad}</div>
      <div className={`${colStyles.cableType} px-2 py-3 truncate`}>{entry.cable_type || '-'}</div>
      <div className={`${colStyles.installMethod} px-2 py-3 capitalize truncate`}>{entry.installation_method || 'air'}</div>
      <div className={`${colStyles.cableSize} px-2 py-3`}>{entry.cable_size || '-'}</div>
      <div className={`${colStyles.length} px-2 py-3`}>{totalLength.toFixed(2)}</div>
      <div className={`${colStyles.actions} px-2 py-3 flex justify-end gap-1`}>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSplit(entry)} title="Split into parallel cables">
          <Split className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(entry)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

CableRow.displayName = 'CableRow';

/**
 * Virtualized cable entries table using @tanstack/react-virtual.
 * Only renders visible rows for improved performance with large datasets (100+ cables).
 */
export function VirtualizedCableTable({
  entries,
  onEdit,
  onDelete,
  onSplit,
  tenantLoadMap,
  tenantNameMap,
  selectedIds = new Set(),
  onSelectionChange,
}: VirtualizedCableTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleEdit = useCallback((entry: CableEntry) => onEdit(entry), [onEdit]);
  const handleDelete = useCallback((entry: CableEntry) => onDelete(entry), [onDelete]);
  const handleSplit = useCallback((entry: CableEntry) => onSplit(entry), [onSplit]);
  
  const handleToggleSelect = useCallback((id: string) => {
    if (!onSelectionChange) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  }, [selectedIds, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (selectedIds.size === entries.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(entries.map(e => e.id)));
    }
  }, [entries, selectedIds.size, onSelectionChange]);

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < entries.length;

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No cable entries yet. Add your first cable entry to get started.
      </p>
    );
  }

  return (
    <div className="rounded-md border w-full">
      {/* Fixed header */}
      <div className="flex items-center bg-muted/50 border-b sticky top-0 z-20 text-xs font-medium text-muted-foreground">
        <div className={`${colStyles.checkbox} px-2 py-2 flex justify-center`}>
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                (el as HTMLButtonElement).dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
              }
            }}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
        </div>
        <div className={`${colStyles.status} px-2 py-2`}>Status</div>
        <div className={`${colStyles.cableNum} px-2 py-2`}>Cable #</div>
        <div className={`${colStyles.cableTag} px-2 py-2`}>Cable Tag</div>
        <div className={`${colStyles.from} px-2 py-2`}>From</div>
        <div className={`${colStyles.to} px-2 py-2`}>To</div>
        <div className={`${colStyles.qty} px-2 py-2`}>Qty</div>
        <div className={`${colStyles.voltage} px-2 py-2`}>Voltage</div>
        <div className={`${colStyles.loadAmps} px-2 py-2`}>Load (A)</div>
        <div className={`${colStyles.cableType} px-2 py-2`}>Cable Type</div>
        <div className={`${colStyles.installMethod} px-2 py-2`}>Install</div>
        <div className={`${colStyles.cableSize} px-2 py-2`}>Size</div>
        <div className={`${colStyles.length} px-2 py-2`}>Length (m)</div>
        <div className={`${colStyles.actions} px-2 py-2`}>Actions</div>
      </div>
      
      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: '600px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = entries[virtualRow.index];
            return (
              <CableRow
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSplit={handleSplit}
                tenantLoadMap={tenantLoadMap}
                tenantNameMap={tenantNameMap}
                isSelected={selectedIds.has(entry.id)}
                onToggleSelect={handleToggleSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
