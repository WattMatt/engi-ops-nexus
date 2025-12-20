import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BOQSpreadsheetTableProps {
  uploadId: string;
  billNumber?: number | null;
  sectionCode?: string | null;
}

interface BOQItemRow {
  id: string;
  row_number: number;
  item_code: string | null;
  item_description: string;
  quantity: number | null;
  unit: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  supply_cost: number | null;
  install_cost: number | null;
  prime_cost: number | null;
  bill_number: number | null;
  bill_name: string | null;
  section_code: string | null;
  section_name: string | null;
  is_rate_only: boolean;
  review_status: string;
  added_to_master: boolean;
}

type EditableField = 'item_code' | 'item_description' | 'quantity' | 'unit' | 'supply_rate' | 'install_rate';

// Column structure matching typical BOQ Excel format
const COLUMNS: { key: string; label: string; width: string; editable: boolean; type: 'text' | 'number' | 'currency'; align: 'left' | 'right' | 'center' }[] = [
  { key: 'row_number', label: 'No.', width: 'w-[50px]', editable: false, type: 'number', align: 'center' },
  { key: 'item_code', label: 'Item Ref', width: 'w-[100px]', editable: true, type: 'text', align: 'left' },
  { key: 'item_description', label: 'Description', width: 'flex-1 min-w-[300px]', editable: true, type: 'text', align: 'left' },
  { key: 'unit', label: 'Unit', width: 'w-[70px]', editable: true, type: 'text', align: 'center' },
  { key: 'quantity', label: 'Qty', width: 'w-[80px]', editable: true, type: 'number', align: 'right' },
  { key: 'supply_rate', label: 'Supply', width: 'w-[100px]', editable: true, type: 'currency', align: 'right' },
  { key: 'install_rate', label: 'Install', width: 'w-[100px]', editable: true, type: 'currency', align: 'right' },
  { key: 'total_rate', label: 'Rate', width: 'w-[100px]', editable: false, type: 'currency', align: 'right' },
  { key: 'amount', label: 'Amount', width: 'w-[120px]', editable: false, type: 'currency', align: 'right' },
  { key: 'actions', label: '', width: 'w-[40px]', editable: false, type: 'text', align: 'center' },
];

export function BOQSpreadsheetTable({ uploadId, billNumber, sectionCode }: BOQSpreadsheetTableProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["boq-spreadsheet-items", uploadId, billNumber, sectionCode],
    queryFn: async () => {
      let query = supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", uploadId)
        .order("row_number", { ascending: true });
      
      if (billNumber !== undefined) {
        if (billNumber === null) {
          query = query.is("bill_number", null);
        } else {
          query = query.eq("bill_number", billNumber);
        }
      }
      
      if (sectionCode !== undefined) {
        if (sectionCode === null) {
          query = query.is("section_code", null);
        } else {
          query = query.eq("section_code", sectionCode);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BOQItemRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error("Item not found");

      const updates: any = { [field]: value };
      
      const supplyRate = field === 'supply_rate' ? (value || 0) : (item.supply_rate || 0);
      const installRate = field === 'install_rate' ? (value || 0) : (item.install_rate || 0);
      updates.total_rate = supplyRate + installRate;
      
      const quantity = field === 'quantity' ? (value || 0) : (item.quantity || 0);
      updates.supply_cost = quantity * supplyRate;
      updates.install_cost = quantity * installRate;

      const { error } = await supabase
        .from("boq_extracted_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-spreadsheet-items", uploadId, billNumber, sectionCode] });
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxRowNumber = items.length > 0 ? Math.max(...items.map(i => i.row_number)) : 0;
      const { error } = await supabase
        .from("boq_extracted_items")
        .insert({
          upload_id: uploadId,
          row_number: maxRowNumber + 1,
          item_code: '',
          item_description: 'New item',
          quantity: 0,
          unit: 'No.',
          supply_rate: 0,
          install_rate: 0,
          total_rate: 0,
          supply_cost: 0,
          install_cost: 0,
          bill_number: billNumber ?? null,
          section_code: sectionCode ?? null,
          review_status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-spreadsheet-items", uploadId, billNumber, sectionCode] });
    },
    onError: () => {
      toast.error("Failed to add item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("boq_extracted_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-spreadsheet-items", uploadId, billNumber, sectionCode] });
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  const startEditing = useCallback((rowId: string, field: string) => {
    const item = items.find(i => i.id === rowId);
    if (!item) return;
    
    const value = item[field as keyof BOQItemRow];
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
    
    const currentValue = item[activeCell.field as keyof BOQItemRow];
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
      
      const currentRowIndex = items.findIndex(i => i.id === activeCell.rowId);
      const editableColumns = COLUMNS.filter(c => c.editable);
      const currentColIndex = editableColumns.findIndex(c => c.key === activeCell.field);
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (currentColIndex > 0) {
            startEditing(activeCell.rowId, editableColumns[currentColIndex - 1].key);
          } else if (currentRowIndex > 0) {
            startEditing(items[currentRowIndex - 1].id, editableColumns[editableColumns.length - 1].key);
          }
        } else {
          if (currentColIndex < editableColumns.length - 1) {
            startEditing(activeCell.rowId, editableColumns[currentColIndex + 1].key);
          } else if (currentRowIndex < items.length - 1) {
            startEditing(items[currentRowIndex + 1].id, editableColumns[0].key);
          }
        }
      } else if (e.key === 'Enter') {
        if (currentRowIndex < items.length - 1) {
          startEditing(items[currentRowIndex + 1].id, activeCell.field);
        }
      }
    } else if (e.key === 'Escape') {
      setActiveCell(null);
      setEditValue("");
    }
  }, [activeCell, commitEdit, items, startEditing]);

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  const renderCell = (item: BOQItemRow, column: typeof COLUMNS[0], rowIndex: number) => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    
    if (column.key === 'actions') {
      return (
        <button
          onClick={() => deleteMutation.mutate(item.id)}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
          title="Delete row"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      );
    }

    if (column.key === 'row_number') {
      return (
        <div className="px-2 py-1.5 text-xs text-center text-muted-foreground font-mono">
          {rowIndex + 1}
        </div>
      );
    }

    if (column.key === 'amount') {
      const amount = (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0));
      return (
        <div className="px-2 py-1.5 text-xs text-right font-medium font-mono">
          {formatCurrency(amount)}
        </div>
      );
    }

    if (column.key === 'total_rate') {
      const rate = (item.supply_rate || 0) + (item.install_rate || 0);
      return (
        <div className="px-2 py-1.5 text-xs text-right font-mono">
          {formatCurrency(rate)}
        </div>
      );
    }

    const value = item[column.key as keyof BOQItemRow];
    
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
            "w-full h-full bg-blue-50 dark:bg-blue-950 border-2 border-blue-500 outline-none px-2 py-1 text-xs font-mono",
            column.align === 'right' && "text-right",
            column.align === 'center' && "text-center"
          )}
          step={column.type === 'currency' ? '0.01' : '1'}
        />
      );
    }
    
    const displayValue = column.type === 'currency' 
      ? formatCurrency(value as number)
      : column.type === 'number'
      ? (value ?? '')
      : (value || '');
    
    return (
      <div
        onClick={() => column.editable && startEditing(item.id, column.key)}
        className={cn(
          "px-2 py-1.5 text-xs font-mono truncate",
          column.editable && "cursor-cell hover:bg-blue-50 dark:hover:bg-blue-950/50",
          column.align === 'right' && "text-right",
          column.align === 'center' && "text-center"
        )}
        title={typeof value === 'string' ? value : undefined}
      >
        {displayValue}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading items...</div>;
  }

  // Calculate totals
  const totals = items.reduce((acc, item) => ({
    quantity: acc.quantity + (item.quantity || 0),
    supplyTotal: acc.supplyTotal + ((item.quantity || 0) * (item.supply_rate || 0)),
    installTotal: acc.installTotal + ((item.quantity || 0) * (item.install_rate || 0)),
    grandTotal: acc.grandTotal + ((item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0))),
  }), { quantity: 0, supplyTotal: 0, installTotal: 0, grandTotal: 0 });

  return (
    <div className="border-0 overflow-hidden bg-background">
      {/* Excel-style Header */}
      <div className="flex bg-muted border-b border-border sticky top-0 z-10">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={cn(
              "px-2 py-2 text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0 bg-muted",
              col.width,
              col.align === 'right' && "text-right",
              col.align === 'center' && "text-center"
            )}
          >
            {col.label}
          </div>
        ))}
      </div>
      
      {/* Data Rows */}
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No items in this sheet. Click "Add Row" below to start adding items.
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={item.id} 
              className={cn(
                "flex group transition-colors",
                index % 2 === 0 ? "bg-background" : "bg-muted/30"
              )}
            >
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "border-r border-border last:border-r-0 min-h-[32px] flex items-center",
                    col.width
                  )}
                >
                  {renderCell(item, col, index)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      
      {/* Totals Row */}
      {items.length > 0 && (
        <div className="flex bg-muted/70 border-t-2 border-border font-semibold">
          <div className="w-[50px] px-2 py-2 text-xs border-r border-border"></div>
          <div className="w-[100px] px-2 py-2 text-xs border-r border-border"></div>
          <div className="flex-1 min-w-[300px] px-2 py-2 text-xs border-r border-border font-semibold">
            TOTAL ({items.length} items)
          </div>
          <div className="w-[70px] px-2 py-2 text-xs border-r border-border text-center"></div>
          <div className="w-[80px] px-2 py-2 text-xs border-r border-border text-right font-mono">{totals.quantity.toFixed(2)}</div>
          <div className="w-[100px] px-2 py-2 text-xs border-r border-border text-right font-mono">{formatCurrency(totals.supplyTotal)}</div>
          <div className="w-[100px] px-2 py-2 text-xs border-r border-border text-right font-mono">{formatCurrency(totals.installTotal)}</div>
          <div className="w-[100px] px-2 py-2 text-xs border-r border-border text-right"></div>
          <div className="w-[120px] px-2 py-2 text-xs border-r border-border text-right font-mono font-bold">{formatCurrency(totals.grandTotal)}</div>
          <div className="w-[40px]"></div>
        </div>
      )}
      
      {/* Add Row Button */}
      <div className="border-t border-border bg-muted/30">
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending}
          className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Row
        </button>
      </div>
    </div>
  );
}
