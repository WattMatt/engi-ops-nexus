import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface PSSpreadsheetTableProps {
  items: any[];
  sectionId: string;
  accountId: string;
  projectId: string;
}

type EditableField = 'ps_spent_amount' | 'adjustment_amount' | 'adjustment_reason';

const COLUMNS: { 
  key: EditableField | 'item_code' | 'description' | 'ps_original_sum' | 'ps_remaining' | 'total_value'; 
  label: string; 
  width: string; 
  editable: boolean; 
  type: 'text' | 'number' | 'currency'; 
  align: 'left' | 'right' | 'center';
}[] = [
  { key: 'item_code', label: 'Code', width: 'w-[90px] shrink-0', editable: false, type: 'text', align: 'left' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[150px]', editable: false, type: 'text', align: 'left' },
  { key: 'ps_original_sum', label: 'Original Sum', width: 'w-[140px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'ps_spent_amount', label: 'Spent', width: 'w-[140px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'ps_remaining', label: 'Remaining', width: 'w-[140px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'adjustment_amount', label: 'Adjustment', width: 'w-[140px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'adjustment_reason', label: 'Reason', width: 'w-[180px] shrink-0', editable: true, type: 'text', align: 'left' },
  { key: 'total_value', label: 'Final Value', width: 'w-[140px] shrink-0', editable: false, type: 'currency', align: 'right' },
];

export function PSSpreadsheetTable({ items, sectionId, accountId, projectId }: PSSpreadsheetTableProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const updates: any = { [field]: value };

      // Update final_amount based on spent + adjustment
      if (field === 'ps_spent_amount' || field === 'adjustment_amount') {
        const item = items.find(i => i.id === id);
        if (item) {
          const originalSum = Number(item.ps_original_sum) || Number(item.contract_amount) || 0;
          const spent = field === 'ps_spent_amount' ? (Number(value) || 0) : (Number(item.ps_spent_amount) || 0);
          const adjustment = field === 'adjustment_amount' ? (Number(value) || 0) : (Number(item.adjustment_amount) || 0);
          updates.final_amount = spent + adjustment;
          updates.variation_amount = updates.final_amount - originalSum;
        }
      }

      const { error } = await supabase
        .from("final_account_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items-provisional-sums-grouped", accountId] });
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  const startEditing = useCallback((rowId: string, field: string) => {
    const item = items.find(i => i.id === rowId);
    if (!item) return;
    
    const value = item[field as keyof typeof item];
    setActiveCell({ rowId, field });
    setEditValue(value?.toString() || '');
  }, [items]);

  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    
    const item = items.find(i => i.id === activeCell.rowId);
    if (!item) return;
    
    const column = COLUMNS.find(c => c.key === activeCell.field);
    let newValue: any = editValue;
    
    if (column?.type === 'number' || column?.type === 'currency') {
      newValue = parseFloat(editValue) || 0;
    }
    
    const currentValue = item[activeCell.field as keyof typeof item];
    if (newValue !== currentValue) {
      updateMutation.mutate({ id: activeCell.rowId, field: activeCell.field, value: newValue });
    }
    
    setActiveCell(null);
    setEditValue("");
  }, [activeCell, editValue, items, updateMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return;
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setActiveCell(null);
      setEditValue("");
    }
  }, [activeCell, commitEdit]);

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  const calculateRemaining = (item: any) => {
    const original = Number(item.ps_original_sum) || Number(item.contract_amount) || 0;
    const spent = Number(item.ps_spent_amount) || 0;
    return original - spent;
  };

  const calculateTotalValue = (item: any) => {
    const spent = Number(item.ps_spent_amount) || 0;
    const adjustment = Number(item.adjustment_amount) || 0;
    return spent + adjustment;
  };

  const renderCell = (item: any, column: typeof COLUMNS[0]) => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    
    // Calculated columns
    if (column.key === 'ps_remaining') {
      const remaining = calculateRemaining(item);
      return (
        <div className={cn(
          "px-1.5 py-1 text-xs text-right font-medium",
          remaining >= 0 ? "text-green-600" : "text-destructive"
        )}>
          {formatCurrency(remaining)}
        </div>
      );
    }
    
    if (column.key === 'total_value') {
      const total = calculateTotalValue(item);
      return (
        <div className="px-1.5 py-1 text-xs text-right font-medium">
          {formatCurrency(total)}
        </div>
      );
    }

    if (column.key === 'ps_original_sum') {
      const value = Number(item.ps_original_sum) || Number(item.contract_amount) || 0;
      return (
        <div className="px-1.5 py-1 text-xs text-right">
          {formatCurrency(value)}
        </div>
      );
    }
    
    const value = item[column.key as keyof typeof item];
    
    if (isActive && column.editable) {
      return (
        <input
          ref={inputRef}
          type={column.type === 'text' ? 'text' : 'number'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-full bg-primary/10 border-2 border-primary outline-none px-1.5 py-0.5 text-xs",
            column.align === 'right' && "text-right"
          )}
          step={column.type === 'currency' ? '0.01' : '1'}
        />
      );
    }
    
    let displayValue: string;
    if (column.type === 'currency') {
      const numVal = Number(value) || 0;
      displayValue = numVal !== 0 ? formatCurrency(numVal) : '-';
    } else {
      displayValue = (value?.toString() || '-');
    }
    
    return (
      <div
        onClick={() => column.editable && startEditing(item.id, column.key)}
        className={cn(
          "px-1.5 py-1 text-xs truncate",
          column.editable && "cursor-cell hover:bg-muted/50",
          column.align === 'right' && "text-right"
        )}
        title={typeof value === 'string' ? value : undefined}
      >
        {displayValue}
      </div>
    );
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const original = Number(item.ps_original_sum) || Number(item.contract_amount) || 0;
      const spent = Number(item.ps_spent_amount) || 0;
      const adjustment = Number(item.adjustment_amount) || 0;
      return {
        original: acc.original + original,
        spent: acc.spent + spent,
        remaining: acc.remaining + (original - spent),
        adjustment: acc.adjustment + adjustment,
        total: acc.total + spent + adjustment,
      };
    },
    { original: 0, spent: 0, remaining: 0, adjustment: 0, total: 0 }
  );

  return (
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Header */}
      <div className="flex bg-muted/70 border-b sticky top-0 z-10">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={cn(
              "px-1.5 py-2 text-xs font-medium text-muted-foreground border-r last:border-r-0",
              col.width,
              col.align === 'right' && "text-right"
            )}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={cn(
            "flex border-b last:border-b-0 hover:bg-muted/30",
            idx % 2 === 0 ? "bg-background" : "bg-muted/10"
          )}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={cn(
                "border-r last:border-r-0 min-h-[32px] flex items-center",
                col.width
              )}
            >
              {renderCell(item, col)}
            </div>
          ))}
        </div>
      ))}

      {/* Totals Row */}
      <div className="flex bg-muted/50 border-t font-medium">
        <div className="w-[90px] shrink-0 px-1.5 py-2 text-xs border-r">Total</div>
        <div className="flex-1 min-w-[150px] px-1.5 py-2 text-xs border-r">{items.length} items</div>
        <div className="w-[140px] shrink-0 px-1.5 py-2 text-xs text-right border-r">{formatCurrency(totals.original)}</div>
        <div className="w-[140px] shrink-0 px-1.5 py-2 text-xs text-right border-r">{formatCurrency(totals.spent)}</div>
        <div className={cn("w-[140px] shrink-0 px-1.5 py-2 text-xs text-right border-r font-medium", 
          totals.remaining >= 0 ? "text-green-600" : "text-destructive"
        )}>
          {formatCurrency(totals.remaining)}
        </div>
        <div className="w-[140px] shrink-0 px-1.5 py-2 text-xs text-right border-r">{formatCurrency(totals.adjustment)}</div>
        <div className="w-[180px] shrink-0 px-1.5 py-2 text-xs border-r">-</div>
        <div className="w-[140px] shrink-0 px-1.5 py-2 text-xs text-right font-medium">{formatCurrency(totals.total)}</div>
      </div>
    </div>
  );
}
