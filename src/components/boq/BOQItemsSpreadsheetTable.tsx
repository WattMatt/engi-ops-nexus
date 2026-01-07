import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  item_type: 'quantity' | 'prime_cost' | 'percentage' | 'sub_header';
  percentage_value: number | null;
  reference_item_id: string | null;
  prime_cost_amount: number | null;
}

type EditableField = 'item_code' | 'description' | 'unit' | 'quantity' | 'supply_rate' | 'install_rate' | 'notes' | 'percentage_value' | 'prime_cost_amount';

const ITEM_TYPE_LABELS: Record<string, string> = {
  quantity: 'Quantity',
  prime_cost: 'Prime Cost',
  percentage: 'Percentage',
  sub_header: 'Sub-Header',
};

const COLUMNS: { 
  key: EditableField | 'item_type' | 'total_rate' | 'supply_cost' | 'install_cost' | 'total_amount' | 'actions' | 'reference_item'; 
  label: string; 
  width: string; 
  editable: boolean; 
  type: 'text' | 'number' | 'currency' | 'select'; 
  align: 'left' | 'right' | 'center';
  showFor?: string[];
}[] = [
  { key: 'item_code', label: 'Code', width: 'w-[100px] shrink-0', editable: true, type: 'text', align: 'left' },
  { key: 'item_type', label: 'Type', width: 'w-[100px] shrink-0', editable: false, type: 'select', align: 'center' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[280px]', editable: true, type: 'text', align: 'left' },
  { key: 'unit', label: 'Unit', width: 'w-[80px] shrink-0', editable: true, type: 'text', align: 'center', showFor: ['quantity', 'prime_cost'] },
  { key: 'quantity', label: 'Qty', width: 'w-[80px] shrink-0', editable: true, type: 'number', align: 'right', showFor: ['quantity'] },
  { key: 'percentage_value', label: '%', width: 'w-[70px] shrink-0', editable: true, type: 'number', align: 'right', showFor: ['percentage'] },
  { key: 'reference_item', label: 'Ref', width: 'w-[100px] shrink-0', editable: false, type: 'select', align: 'center', showFor: ['percentage'] },
  { key: 'supply_rate', label: 'Supply', width: 'w-[100px] shrink-0', editable: true, type: 'currency', align: 'right', showFor: ['quantity'] },
  { key: 'install_rate', label: 'Install', width: 'w-[100px] shrink-0', editable: true, type: 'currency', align: 'right', showFor: ['quantity'] },
  { key: 'prime_cost_amount', label: 'Amount', width: 'w-[120px] shrink-0', editable: true, type: 'currency', align: 'right', showFor: ['prime_cost'] },
  { key: 'total_amount', label: 'Total', width: 'w-[120px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'actions', label: '', width: 'w-[50px] shrink-0', editable: false, type: 'text', align: 'center' },
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

  const shouldShowColumn = (column: typeof COLUMNS[0], itemType: string) => {
    if (!column.showFor) return true;
    return column.showFor.includes(itemType);
  };

  const handleItemTypeChange = (itemId: string, newType: string) => {
    updateMutation.mutate({ id: itemId, field: 'item_type', value: newType });
  };

  const handleReferenceChange = (itemId: string, refId: string) => {
    updateMutation.mutate({ id: itemId, field: 'reference_item_id', value: refId || null });
  };

  // Get items that can be referenced (non-header, non-percentage items above current item)
  const getReferenceableItems = (currentItemId: string) => {
    const currentIndex = items.findIndex(i => i.id === currentItemId);
    return items.filter((item, idx) => 
      idx < currentIndex && 
      item.item_type !== 'sub_header' && 
      item.item_type !== 'percentage' &&
      item.item_code
    );
  };

  const renderCell = (item: BOQItemRow, column: typeof COLUMNS[0]) => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    const value = item[column.key as keyof BOQItemRow];
    const itemType = item.item_type || 'quantity';
    
    // Don't render columns that don't apply to this item type
    if (!shouldShowColumn(column, itemType)) {
      return <div className="px-1.5 py-1 text-xs text-muted-foreground/30">-</div>;
    }

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

    // Item type selector
    if (column.key === 'item_type') {
      return (
        <Select
          value={itemType}
          onValueChange={(val) => handleItemTypeChange(item.id, val)}
        >
          <SelectTrigger className="h-6 text-xs border-0 bg-transparent px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Reference item selector for percentage type
    if (column.key === 'reference_item') {
      const referenceableItems = getReferenceableItems(item.id);
      const currentRef = items.find(i => i.id === item.reference_item_id);
      
      return (
        <Select
          value={item.reference_item_id || ''}
          onValueChange={(val) => handleReferenceChange(item.id, val)}
        >
          <SelectTrigger className="h-6 text-xs border-0 bg-transparent px-1">
            <SelectValue placeholder="Select">
              {currentRef?.item_code || 'Select'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {referenceableItems.map((refItem) => (
              <SelectItem key={refItem.id} value={refItem.id} className="text-xs">
                {refItem.item_code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          "px-1.5 py-1 text-xs truncate w-full",
          column.editable && "cursor-cell hover:bg-muted/50",
          column.align === 'right' && "text-right",
          column.align === 'center' && "text-center",
          itemType === 'sub_header' && column.key === 'description' && "font-semibold"
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
          <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[1].width)}></div>
          <div className={cn("px-1.5 py-2 text-xs border-r font-semibold", COLUMNS[2].width)}>
            TOTAL ({items.length} items)
          </div>
          {COLUMNS.slice(3, -1).map((col) => (
            <div key={col.key} className={cn("px-1.5 py-2 text-xs border-r", col.width, col.align === 'right' && "text-right")}>
              {col.key === 'total_amount' ? formatCurrency(totals.grandTotal) : ''}
            </div>
          ))}
          <div className={cn("px-1.5 py-2 text-xs", COLUMNS[COLUMNS.length - 1].width)}></div>
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

