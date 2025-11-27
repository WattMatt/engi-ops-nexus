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

// Memoized row component for performance
const CableRow = memo(({ 
  entry, 
  onEdit, 
  onDelete, 
  onSplit,
  style 
}: { 
  entry: CableEntry; 
  onEdit: (entry: CableEntry) => void;
  onDelete: (entry: CableEntry) => void;
  onSplit: (entry: CableEntry) => void;
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
      className="flex items-center border-b hover:bg-muted/50 transition-colors"
      style={style}
    >
      <div className="w-16 px-4 py-4 flex justify-center">
        {hasCompleteData ? (
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500" title="Complete" />
        ) : (
          <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" title="Incomplete" />
        )}
      </div>
      <div className="w-20 px-4 py-4 font-medium">{displayCableNumber}</div>
      <div className="w-44 px-4 py-4 font-medium truncate" title={displayCableTag}>{displayCableTag}</div>
      <div className="w-40 px-4 py-4 truncate" title={entry.from_location}>{entry.from_location}</div>
      <div className="w-40 px-4 py-4 truncate" title={entry.to_location}>{entry.to_location}</div>
      <div className="w-16 px-4 py-4 text-center font-medium">{entry.quantity || 1}</div>
      <div className="w-24 px-4 py-4">{entry.voltage || '-'}</div>
      <div className="w-24 px-4 py-4">{entry.load_amps || '-'}</div>
      <div className="w-28 px-4 py-4">{entry.cable_type || '-'}</div>
      <div className="w-32 px-4 py-4 capitalize">{entry.installation_method || 'air'}</div>
      <div className="w-28 px-4 py-4">{entry.cable_size || '-'}</div>
      <div className="w-28 px-4 py-4">{totalLength.toFixed(2)}</div>
      <div className="w-32 px-4 py-4 flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onSplit(entry)} title="Split into parallel cables">
          <Split className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(entry)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(entry)}>
          <Trash2 className="h-4 w-4" />
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

  return (
    <div className="rounded-md border">
      {/* Fixed header */}
      <div className="flex items-center bg-background border-b sticky top-0 z-20 text-sm font-medium text-muted-foreground">
        <div className="w-16 px-4 py-3 text-center">Status</div>
        <div className="w-20 px-4 py-3">Cable #</div>
        <div className="w-44 px-4 py-3">Cable Tag</div>
        <div className="w-40 px-4 py-3">From</div>
        <div className="w-40 px-4 py-3">To</div>
        <div className="w-16 px-4 py-3 text-center">Qty</div>
        <div className="w-24 px-4 py-3">Voltage</div>
        <div className="w-24 px-4 py-3">Load (A)</div>
        <div className="w-28 px-4 py-3">Cable Type</div>
        <div className="w-32 px-4 py-3">Install Method</div>
        <div className="w-28 px-4 py-3">Cable Size</div>
        <div className="w-28 px-4 py-3">Length (m)</div>
        <div className="w-32 px-4 py-3 text-right">Actions</div>
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
