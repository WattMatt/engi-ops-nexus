/**
 * Accessible Table Component
 * Enhanced table with keyboard navigation and ARIA support
 */

import React, { useCallback, useRef, useState, useEffect, forwardRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface AccessibleTableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Accessible caption describing the table contents */
  caption?: string;
  /** Whether the caption should be visually hidden but available to screen readers */
  captionHidden?: boolean;
  /** Number of columns for keyboard navigation */
  columnCount?: number;
  /** Enable arrow key navigation between cells */
  enableKeyboardNavigation?: boolean;
  /** Announce row/column position to screen readers */
  announcePosition?: boolean;
  /** Callback when a cell receives focus */
  onCellFocus?: (rowIndex: number, colIndex: number) => void;
}

export const AccessibleTable = forwardRef<HTMLTableElement, AccessibleTableProps>(
  (
    {
      caption,
      captionHidden = false,
      columnCount,
      enableKeyboardNavigation = false,
      announcePosition = false,
      onCellFocus,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const tableRef = useRef<HTMLTableElement>(null);
    const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null);
    const [announcement, setAnnouncement] = useState<string>('');

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!enableKeyboardNavigation) return;
        
        const target = e.target as HTMLElement;
        const cell = target.closest('td, th');
        if (!cell) return;

        const row = cell.parentElement as HTMLTableRowElement;
        const tbody = row.parentElement;
        if (!row || !tbody) return;

        const rowIndex = Array.from(tbody.children).indexOf(row);
        const colIndex = Array.from(row.children).indexOf(cell);
        const totalRows = tbody.children.length;
        const totalCols = row.children.length;

        let newRow = rowIndex;
        let newCol = colIndex;

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            newRow = Math.max(0, rowIndex - 1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            newRow = Math.min(totalRows - 1, rowIndex + 1);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            newCol = Math.max(0, colIndex - 1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            newCol = Math.min(totalCols - 1, colIndex + 1);
            break;
          case 'Home':
            e.preventDefault();
            if (e.ctrlKey) {
              newRow = 0;
            }
            newCol = 0;
            break;
          case 'End':
            e.preventDefault();
            if (e.ctrlKey) {
              newRow = totalRows - 1;
            }
            newCol = totalCols - 1;
            break;
          default:
            return;
        }

        // Focus the new cell
        const newRowEl = tbody.children[newRow] as HTMLTableRowElement;
        const newCellEl = newRowEl?.children[newCol] as HTMLElement;
        if (newCellEl) {
          // Find focusable element within cell, or make cell focusable
          const focusable = newCellEl.querySelector<HTMLElement>(
            'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            focusable.focus();
          } else {
            newCellEl.setAttribute('tabindex', '0');
            newCellEl.focus();
          }
          
          setCurrentCell({ row: newRow, col: newCol });
          onCellFocus?.(newRow, newCol);

          if (announcePosition) {
            setAnnouncement(`Row ${newRow + 1} of ${totalRows}, Column ${newCol + 1} of ${totalCols}`);
          }
        }
      },
      [enableKeyboardNavigation, announcePosition, onCellFocus]
    );

    // Clear announcement after it's read
    useEffect(() => {
      if (announcement) {
        const timer = setTimeout(() => setAnnouncement(''), 1000);
        return () => clearTimeout(timer);
      }
    }, [announcement]);

    return (
      <>
        <Table
          ref={(node) => {
            // Handle both refs
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (tableRef as React.MutableRefObject<HTMLTableElement | null>).current = node;
          }}
          className={cn(className)}
          role="grid"
          aria-rowcount={undefined}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {caption && (
            <caption
              className={cn(
                'text-sm text-muted-foreground mb-2',
                captionHidden && 'sr-only'
              )}
            >
              {caption}
            </caption>
          )}
          {children}
        </Table>
        
        {/* Live region for screen reader announcements */}
        {announcePosition && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>
        )}
      </>
    );
  }
);

AccessibleTable.displayName = 'AccessibleTable';

// Re-export table parts with accessibility enhancements
export { TableHeader, TableBody, TableRow, TableHead, TableCell };

// Accessible table header cell
interface AccessibleTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Sort direction for sortable columns */
  sortDirection?: 'asc' | 'desc' | 'none';
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Callback when sort is triggered */
  onSort?: () => void;
}

export const AccessibleTableHead = forwardRef<HTMLTableCellElement, AccessibleTableHeadProps>(
  ({ sortDirection, sortable, onSort, children, className, ...props }, ref) => {
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (sortable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSort?.();
        }
      },
      [sortable, onSort]
    );

    return (
      <TableHead
        ref={ref}
        aria-sort={
          sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
            ? 'descending'
            : sortable
            ? 'none'
            : undefined
        }
        tabIndex={sortable ? 0 : undefined}
        onClick={sortable ? onSort : undefined}
        onKeyDown={sortable ? handleKeyDown : undefined}
        className={cn(sortable && 'cursor-pointer hover:bg-muted/50', className)}
        {...props}
      >
        {children}
      </TableHead>
    );
  }
);

AccessibleTableHead.displayName = 'AccessibleTableHead';
