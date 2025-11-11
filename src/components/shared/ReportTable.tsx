import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ReportTableProps {
  rows: string[][];
  className?: string;
}

export const ReportTable = ({ rows, className = "" }: ReportTableProps) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (rows.length === 0) return null;

  // First row is header
  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const sortedRows = sortColumn !== null
    ? [...dataRows].sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        
        // Try to parse as numbers for numerical sorting
        const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
        const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Fallback to string sorting
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      })
    : dataRows;

  return (
    <div className={`overflow-x-auto rounded-lg border border-border shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            {headerRow.map((header, index) => (
              <th
                key={index}
                onClick={() => handleSort(index)}
                className="px-4 py-3 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80 transition-colors select-none group"
              >
                <div className="flex items-center gap-2">
                  <span>{header}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {sortColumn === index ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {sortedRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`
                transition-colors hover:bg-muted/30
                ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
              `}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-foreground whitespace-normal"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
