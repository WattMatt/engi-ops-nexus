import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BOQItemsSpreadsheetTableProps {
  sectionId: string;
  billId: string;
}

interface BOQItemRow {
  id: string;
  item_code: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  supply_rate: number | null;
  install_rate: number | null;
  total_rate: number | null;
  supply_cost: number | null;
  install_cost: number | null;
  total_amount: number | null;
  notes: string | null;
  display_order: number;
}

type EditableField = 'item_code' | 'description' | 'unit' | 'quantity' | 'supply_rate' | 'install_rate' | 'notes';

const COLUMNS: { 
  key: EditableField | 'total_rate' | 'supply_cost' | 'install_cost' | 'total_amount' | 'actions'; 
  label: string; 
  width: string; 
  editable: boolean; 
  type: 'text' | 'number' | 'currency'; 
  align: 'left' | 'right' | 'center' 
}[] = [
  { key: 'item_code', label: 'Code', width: 'w-[140px] shrink-0', editable: true, type: 'text', align: 'left' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[360px]', editable: true, type: 'text', align: 'left' },
  { key: 'unit', label: 'Unit', width: 'w-[100px] shrink-0', editable: true, type: 'text', align: 'center' },
  { key: 'quantity', label: 'Quantity', width: 'w-[120px] shrink-0', editable: true, type: 'number', align: 'right' },
  { key: 'supply_rate', label: 'Supply Rate', width: 'w-[140px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'install_rate', label: 'Install Rate', width: 'w-[140px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'total_rate', label: 'Total Rate', width: 'w-[130px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'supply_cost', label: 'Supply Cost', width: 'w-[140px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'install_cost', label: 'Install Cost', width: 'w-[140px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'total_amount', label: 'Total Amount', width: 'w-[150px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'actions', label: '', width: 'w-[64px] shrink-0', editable: false, type: 'text', align: 'center' },
];

export function BOQItemsSpreadsheetTable({ sectionId, billId }: BOQItemsSpreadsheetTableProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["boq-items", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_items")
        .select("*")
        .eq("section_id", sectionId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as BOQItemRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      // Only update editable fields - generated columns are calculated by the database
      const updates: any = { [field]: value };

      const { error } = await supabase
        .from("boq_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-items", sectionId] });
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) : 0;
      const { error } = await supabase
        .from("boq_items")
        .insert({
          section_id: sectionId,
          item_code: '',
          description: 'New item',
          unit: 'No.',
          quantity: 0,
          supply_rate: 0,
          install_rate: 0,
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-items", sectionId] });
    },
    onError: () => {
      toast.error("Failed to add item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("boq_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-items", sectionId] });
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections", billId] });
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
      newValue = editValue.trim() === '' ? null : parseFloat(editValue);
      if (editValue.trim() === '0') {
        newValue = 0;
      }
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

  const renderCell = (item: BOQItemRow, column: typeof COLUMNS[0]) => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    const value = item[column.key as keyof BOQItemRow];
    
    if (column.key === 'actions') {
      return (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => deleteMutation.mutate(item.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    
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
            column.align === 'right' && "text-right",
            column.align === 'center' && "text-center"
          )}
          step={column.type === 'currency' ? '0.01' : '1'}
        />
      );
    }
    
    let displayValue: string;
    if (column.type === 'currency') {
      if (value === null || value === undefined || value === 0) {
        displayValue = '';
      } else {
        displayValue = formatCurrency(value as number);
      }
    } else if (column.type === 'number') {
      if (value === null || value === undefined) {
        displayValue = '';
      } else {
        displayValue = value.toString();
      }
    } else {
      displayValue = (value as string) || '';
    }
    
    return (
      <div
        onClick={() => column.editable && startEditing(item.id, column.key)}
        className={cn(
          "px-1.5 py-1 text-xs truncate",
          column.editable && "cursor-cell hover:bg-muted/50",
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
    return <div className="text-center py-4 text-muted-foreground text-xs">Loading...</div>;
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      quantity: acc.quantity + (item.quantity || 0),
      supplyTotal: acc.supplyTotal + (item.supply_cost || 0),
      installTotal: acc.installTotal + (item.install_cost || 0),
      grandTotal: acc.grandTotal + (item.total_amount || 0),
    }),
    { quantity: 0, supplyTotal: 0, installTotal: 0, grandTotal: 0 }
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
              col.align === 'right' && "text-right",
              col.align === 'center' && "text-center"
            )}
          >
            {col.label}
          </div>
        ))}
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No items yet. Click "Add Row" to start.
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id} 
              className="flex group transition-colors hover:bg-muted/30"
            >
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    "border-r last:border-r-0 min-h-[32px] flex items-center",
                    col.width,
                    col.align === 'right' && "justify-end",
                    col.align === 'center' && "justify-center"
                  )}
                >
                  {renderCell(item, col)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      
      {/* Totals Row */}
      {items.length > 0 && (
        <div className="flex bg-muted/50 border-t font-semibold">
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[0].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r font-semibold", COLUMNS[1].width)}>
            TOTAL ({items.length} items)
          </div>
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[2].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r text-right", COLUMNS[3].width)}>
            {totals.quantity.toFixed(2)}
          </div>
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[4].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[5].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[6].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r text-right", COLUMNS[7].width)}>
            {formatCurrency(totals.supplyTotal)}
          </div>
          <div className={cn("px-1.5 py-2 text-xs border-r text-right", COLUMNS[8].width)}>
            {formatCurrency(totals.installTotal)}
          </div>
          <div className={cn("px-1.5 py-2 text-xs border-r text-right font-bold", COLUMNS[9].width)}>
            {formatCurrency(totals.grandTotal)}
          </div>
          <div className={cn("px-1.5 py-2 text-xs", COLUMNS[10].width)}></div>
        </div>
      )}
      
      {/* Add row button */}
      <div className="border-t bg-muted/30">
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>
      </div>
    </div>
  );
}

