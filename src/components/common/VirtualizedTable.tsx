import { useRef, useCallback, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  maxHeight?: number;
  getRowKey: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * Virtualized table component using @tanstack/react-virtual.
 * Significantly improves rendering performance for large datasets (100+ rows).
 * Only renders visible rows, reducing DOM nodes and improving scroll performance.
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 600,
  getRowKey,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  const virtualItems = virtualizer.getVirtualItems();

  const handleRowClick = useCallback((item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  }, [onRowClick]);

  if (data.length === 0) {
    return (
      <div className={`text-center text-muted-foreground py-8 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`rounded-md border ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`sticky top-0 bg-background z-20 px-4 py-3 border-b ${column.headerClassName || ''}`}
                style={{ width: column.width, textAlign: column.align }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <Table>
            <TableBody>
              {virtualItems.map((virtualRow) => {
                const item = data[virtualRow.index];
                const rowKey = getRowKey(item, virtualRow.index);
                
                return (
                  <TableRow
                    key={rowKey}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => handleRowClick(item)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`px-4 py-4 ${column.cellClassName || ''}`}
                        style={{ width: column.width, textAlign: column.align }}
                      >
                        {column.render(item, virtualRow.index)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to create column definitions with type safety
 */
export function createColumns<T>(columns: Column<T>[]): Column<T>[] {
  return columns;
}
