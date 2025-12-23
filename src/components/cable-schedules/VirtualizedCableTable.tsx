import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
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
}

interface ColumnWidths {
  status: string;
  cableNum: string;
  cableTag: string;
  from: string;
  to: string;
  qty: string;
  voltage: string;
  loadAmps: string;
  cableType: string;
  installMethod: string;
  cableSize: string;
  length: string;
  actions: string;
}

// Memoized row component for performance
const CableRowWithWidths = memo(({ 
  entry, 
  onEdit, 
  onDelete, 
  onSplit,
  columnWidths,
  style 
}: { 
  entry: CableEntry; 
  onEdit: (entry: CableEntry) => void;
  onDelete: (entry: CableEntry) => void;
  onSplit: (entry: CableEntry) => void;
  columnWidths: ColumnWidths;
  style: React.CSSProperties;
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

  return (
    <div 
      className="flex items-center border-b hover:bg-muted/50 transition-colors text-sm min-w-max"
      style={style}
    >
      <div className={`${columnWidths.status} px-2 py-3 flex justify-center`}>
        {hasCompleteData ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Complete" />
        ) : (
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" title="Incomplete" />
        )}
      </div>
      <div className={`${columnWidths.cableNum} px-2 py-3 font-medium`}>{displayCableNumber}</div>
      <div className={`${columnWidths.cableTag} px-2 py-3 font-medium truncate`} title={displayCableTag}>{displayCableTag}</div>
      <div className={`${columnWidths.from} px-2 py-3 truncate`} title={entry.from_location}>{entry.from_location}</div>
      <div className={`${columnWidths.to} px-2 py-3 truncate`} title={entry.to_location}>{entry.to_location}</div>
      <div className={`${columnWidths.qty} px-2 py-3 text-center`}>{entry.quantity || 1}</div>
      <div className={`${columnWidths.voltage} px-2 py-3`}>{entry.voltage || '-'}</div>
      <div className={`${columnWidths.loadAmps} px-2 py-3`}>{entry.load_amps || '-'}</div>
      <div className={`${columnWidths.cableType} px-2 py-3 truncate`}>{entry.cable_type || '-'}</div>
      <div className={`${columnWidths.installMethod} px-2 py-3 capitalize truncate`}>{entry.installation_method || 'air'}</div>
      <div className={`${columnWidths.cableSize} px-2 py-3`}>{entry.cable_size || '-'}</div>
      <div className={`${columnWidths.length} px-2 py-3`}>{totalLength.toFixed(2)}</div>
      <div className={`${columnWidths.actions} px-2 py-3 flex justify-end gap-1`}>
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

CableRowWithWidths.displayName = 'CableRowWithWidths';

/**
 * Virtualized cable entries table using @tanstack/react-virtual.
 * Only renders visible rows for improved performance with large datasets (100+ cables).
 */
export function VirtualizedCableTable({
  entries,
  onEdit,
  onDelete,
  onSplit,
}: VirtualizedCableTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Row height in pixels
    overscan: 10, // Render extra rows for smooth scrolling
  });

  const handleEdit = useCallback((entry: CableEntry) => onEdit(entry), [onEdit]);
  const handleDelete = useCallback((entry: CableEntry) => onDelete(entry), [onDelete]);
  const handleSplit = useCallback((entry: CableEntry) => onSplit(entry), [onSplit]);

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No cable entries yet. Add your first cable entry to get started.
      </p>
    );
  }

  const columnWidths = {
    status: 'w-14 min-w-[56px]',
    cableNum: 'w-16 min-w-[64px]',
    cableTag: 'w-48 min-w-[192px]',
    from: 'w-32 min-w-[128px]',
    to: 'w-32 min-w-[128px]',
    qty: 'w-12 min-w-[48px]',
    voltage: 'w-20 min-w-[80px]',
    loadAmps: 'w-20 min-w-[80px]',
    cableType: 'w-24 min-w-[96px]',
    installMethod: 'w-24 min-w-[96px]',
    cableSize: 'w-24 min-w-[96px]',
    length: 'w-24 min-w-[96px]',
    actions: 'w-28 min-w-[112px]',
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      {/* Fixed header */}
      <div className="flex items-center bg-muted/50 border-b sticky top-0 z-20 text-xs font-medium text-muted-foreground min-w-max">
        <div className={`${columnWidths.status} px-2 py-2 text-center`}>Status</div>
        <div className={`${columnWidths.cableNum} px-2 py-2`}>Cable #</div>
        <div className={`${columnWidths.cableTag} px-2 py-2`}>Cable Tag</div>
        <div className={`${columnWidths.from} px-2 py-2`}>From</div>
        <div className={`${columnWidths.to} px-2 py-2`}>To</div>
        <div className={`${columnWidths.qty} px-2 py-2 text-center`}>Qty</div>
        <div className={`${columnWidths.voltage} px-2 py-2`}>Voltage</div>
        <div className={`${columnWidths.loadAmps} px-2 py-2`}>Load (A)</div>
        <div className={`${columnWidths.cableType} px-2 py-2`}>Cable Type</div>
        <div className={`${columnWidths.installMethod} px-2 py-2`}>Install</div>
        <div className={`${columnWidths.cableSize} px-2 py-2`}>Size</div>
        <div className={`${columnWidths.length} px-2 py-2`}>Length (m)</div>
        <div className={`${columnWidths.actions} px-2 py-2 text-right`}>Actions</div>
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
              <CableRowWithWidths
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSplit={handleSplit}
                columnWidths={columnWidths}
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
