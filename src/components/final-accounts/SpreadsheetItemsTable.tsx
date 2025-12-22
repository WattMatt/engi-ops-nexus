import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpreadsheetItemsTableProps {
  sectionId: string;
  billId: string;
  accountId: string;
  shopSubsectionId?: string;
}

interface ItemRow {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  contract_quantity: number | null;
  final_quantity: number | null;
  supply_rate: number | null;
  install_rate: number | null;
  contract_amount: number;
  final_amount: number;
  variation_amount: number;
  is_rate_only: boolean;
  display_order: number;
  notes: string | null;
  // Prime Cost fields
  is_prime_cost: boolean;
  pc_allowance: number | null;
  pc_actual_cost: number | null;
  // P&A fields
  is_pa_item: boolean;
  pa_parent_item_id: string | null;
  pa_percentage: number | null;
}

// Determine the row type based on item code pattern and flags
function getItemRowType(item: ItemRow): 'header' | 'subheader' | 'description' | 'item' | 'prime_cost' | 'pa_item' {
  // Check for P&A item first
  if (item.is_pa_item) return 'pa_item';
  
  // Check for Prime Cost item
  if (item.is_prime_cost) return 'prime_cost';
  
  const code = item.item_code?.trim() || '';
  const hasValues = (item.contract_quantity ?? 0) > 0 || (item.contract_amount ?? 0) > 0;
  
  // No item code = description row
  if (!code) return 'description';
  
  // Main header: B1, B2, C1, etc. (letter + single number, no dots)
  if (/^[A-Z]\d*$/i.test(code) && !hasValues) return 'header';
  
  // Sub-header: B2.3, B2.4 without values (parent item for sub-items)
  if (/^[A-Z]\d+\.\d+$/i.test(code) && !hasValues) return 'subheader';
  
  return 'item';
}

type EditableField = 'item_code' | 'description' | 'unit' | 'contract_quantity' | 'final_quantity' | 'supply_rate' | 'install_rate' | 'notes';

const COLUMNS: { key: EditableField | 'contract_amount' | 'final_amount' | 'variation_amount' | 'actions'; label: string; width: string; editable: boolean; type: 'text' | 'number' | 'currency'; align: 'left' | 'right' }[] = [
  { key: 'item_code', label: 'Code', width: 'w-[140px] shrink-0', editable: true, type: 'text', align: 'right' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[360px]', editable: true, type: 'text', align: 'right' },
  { key: 'unit', label: 'Unit', width: 'w-[100px] shrink-0', editable: true, type: 'text', align: 'right' },
  { key: 'contract_quantity', label: 'Contract Qty', width: 'w-[150px] shrink-0', editable: true, type: 'number', align: 'right' },
  { key: 'final_quantity', label: 'Final Qty', width: 'w-[130px] shrink-0', editable: true, type: 'number', align: 'right' },
  { key: 'supply_rate', label: 'Supply Rate', width: 'w-[170px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'install_rate', label: 'Install Rate', width: 'w-[170px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'contract_amount', label: 'Contract Amt', width: 'w-[180px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'final_amount', label: 'Final Amt', width: 'w-[170px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'variation_amount', label: 'Variation', width: 'w-[160px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'actions', label: '', width: 'w-[64px] shrink-0', editable: false, type: 'text', align: 'right' },
];

export function SpreadsheetItemsTable({ sectionId, billId, accountId, shopSubsectionId }: SpreadsheetItemsTableProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["final-account-items", sectionId, shopSubsectionId],
    queryFn: async () => {
      let query = supabase
        .from("final_account_items")
        .select("*")
        .eq("section_id", sectionId)
        .order("display_order", { ascending: true });
      
      if (shopSubsectionId) {
        query = query.eq("shop_subsection_id", shopSubsectionId);
      } else {
        query = query.is("shop_subsection_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ItemRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      // Calculate amounts if quantity or rate changed
      const item = items.find(i => i.id === id);
      if (!item) throw new Error("Item not found");

      const updates: any = { [field]: value };
      
      // Recalculate amounts
      const contractQty = field === 'contract_quantity' ? (value || 0) : (item.contract_quantity || 0);
      const finalQty = field === 'final_quantity' ? (value || 0) : (item.final_quantity || 0);
      const supplyRate = field === 'supply_rate' ? (value || 0) : (item.supply_rate || 0);
      const installRate = field === 'install_rate' ? (value || 0) : (item.install_rate || 0);
      
      const totalRate = supplyRate + installRate;
      updates.contract_amount = contractQty * totalRate;
      updates.final_amount = finalQty * totalRate;
      updates.variation_amount = updates.final_amount - updates.contract_amount;

      const { error } = await supabase
        .from("final_account_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // If this is a Prime Cost item, recalculate any linked P&A items
      if (item.is_prime_cost) {
        const childPAItems = items.filter(i => i.pa_parent_item_id === id);
        for (const paItem of childPAItems) {
          const paPercentage = paItem.pa_percentage || 0;
          // P&A amount = parent final amount * percentage / 100
          const paContractAmount = updates.contract_amount * (paPercentage / 100);
          const paFinalAmount = updates.final_amount * (paPercentage / 100);
          
          await supabase
            .from("final_account_items")
            .update({
              contract_amount: paContractAmount,
              final_amount: paFinalAmount,
              variation_amount: paFinalAmount - paContractAmount,
            })
            .eq("id", paItem.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items", sectionId, shopSubsectionId] });
      recalculateSectionTotals();
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) : 0;
      const { error } = await supabase
        .from("final_account_items")
        .insert({
          section_id: sectionId,
          shop_subsection_id: shopSubsectionId || null,
          item_code: '',
          description: 'New item',
          unit: 'No.',
          contract_quantity: 0,
          final_quantity: 0,
          supply_rate: 0,
          install_rate: 0,
          contract_amount: 0,
          final_amount: 0,
          variation_amount: 0,
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items", sectionId, shopSubsectionId] });
    },
    onError: () => {
      toast.error("Failed to add item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("final_account_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items", sectionId, shopSubsectionId] });
      recalculateSectionTotals();
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  const recalculateSectionTotals = async () => {
    const { data: allItems } = await supabase
      .from("final_account_items")
      .select("contract_amount, final_amount, variation_amount")
      .eq("section_id", sectionId);

    if (allItems) {
      const totals = allItems.reduce(
        (acc, item) => ({
          contract: acc.contract + Number(item.contract_amount || 0),
          final: acc.final + Number(item.final_amount || 0),
          variation: acc.variation + Number(item.variation_amount || 0),
        }),
        { contract: 0, final: 0, variation: 0 }
      );

      await supabase
        .from("final_account_sections")
        .update({
          contract_total: totals.contract,
          final_total: totals.final,
          variation_total: totals.variation,
        })
        .eq("id", sectionId);

      queryClient.invalidateQueries({ queryKey: ["final-account-sections", billId] });
      queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
    }
  };

  const startEditing = useCallback((rowId: string, field: string) => {
    const item = items.find(i => i.id === rowId);
    if (!item) return;
    
    const value = item[field as keyof ItemRow];
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
    
    const currentValue = item[activeCell.field as keyof ItemRow];
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
      
      // Move to next cell
      const currentRowIndex = items.findIndex(i => i.id === activeCell.rowId);
      const editableColumns = COLUMNS.filter(c => c.editable);
      const currentColIndex = editableColumns.findIndex(c => c.key === activeCell.field);
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Move left or up
          if (currentColIndex > 0) {
            startEditing(activeCell.rowId, editableColumns[currentColIndex - 1].key);
          } else if (currentRowIndex > 0) {
            startEditing(items[currentRowIndex - 1].id, editableColumns[editableColumns.length - 1].key);
          }
        } else {
          // Move right or down
          if (currentColIndex < editableColumns.length - 1) {
            startEditing(activeCell.rowId, editableColumns[currentColIndex + 1].key);
          } else if (currentRowIndex < items.length - 1) {
            startEditing(items[currentRowIndex + 1].id, editableColumns[0].key);
          }
        }
      } else if (e.key === 'Enter') {
        // Move down
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

  const renderCell = (item: ItemRow, column: typeof COLUMNS[0], rowType: 'header' | 'subheader' | 'description' | 'item' | 'prime_cost' | 'pa_item' = 'item') => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    const value = item[column.key as keyof ItemRow];
    const isHeader = rowType === 'header';
    const isSubheader = rowType === 'subheader';
    const isDescription = rowType === 'description';
    const isPrimeCost = rowType === 'prime_cost';
    const isPAItem = rowType === 'pa_item';
    
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
    
    // For header/description rows, show empty for numeric columns
    const shouldHideValue = (isHeader || isSubheader || isDescription) && 
      (column.type === 'number' || column.type === 'currency') &&
      column.key !== 'contract_amount'; // Show contract_amount if it has a value
    
    if (shouldHideValue && (value === 0 || value === null)) {
      return <div className="px-1.5 py-1 text-xs">&nbsp;</div>;
    }
    
    // For P&A items, show percentage in rate columns instead of currency
    let displayValue;
    if (isPAItem && (column.key === 'supply_rate' || column.key === 'install_rate')) {
      // Show the pa_percentage as a percentage value
      if (column.key === 'supply_rate' && item.pa_percentage) {
        displayValue = `${item.pa_percentage.toFixed(2)}%`;
      } else {
        displayValue = '-';
      }
    } else if (isPrimeCost && column.key === 'final_amount') {
      // For Prime Cost items, show pc_actual_cost as the Final Amount
      const pcActual = Number(item.pc_actual_cost) || 0;
      displayValue = formatCurrency(pcActual);
    } else if (column.type === 'currency') {
      displayValue = formatCurrency(value as number);
    } else if (column.type === 'number') {
      displayValue = value ?? '-';
    } else {
      displayValue = value || '-';
    }
    
    const variationClass = column.key === 'variation_amount' 
      ? Number(value) >= 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'
      : '';
    
    return (
      <div
        onClick={() => column.editable && startEditing(item.id, column.key)}
        className={cn(
          "px-1.5 py-1 text-xs truncate",
          column.editable && "cursor-cell hover:bg-muted/50",
          column.align === 'right' && "text-right",
          variationClass,
          isHeader && "font-semibold text-primary",
          isDescription && "italic text-muted-foreground"
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
      <div className="divide-y">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No items yet. Click "Add Row" to start.
          </div>
        ) : (
          items.map((item) => {
            const rowType = getItemRowType(item);
            const isHeader = rowType === 'header';
            const isSubheader = rowType === 'subheader';
            const isDescription = rowType === 'description';
            const isPrimeCost = rowType === 'prime_cost';
            const isPAItem = rowType === 'pa_item';
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "flex group transition-colors",
                  isHeader && "bg-primary/10 font-semibold",
                  isSubheader && "bg-muted/50 font-medium",
                  isDescription && "bg-muted/20 italic",
                  isPrimeCost && "bg-amber-50 dark:bg-amber-950/30",
                  isPAItem && "bg-blue-50 dark:bg-blue-950/30 pl-4",
                  !isHeader && !isSubheader && !isDescription && !isPrimeCost && !isPAItem && "hover:bg-muted/30"
                )}
              >
                {COLUMNS.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      "border-r last:border-r-0 min-h-[32px] flex items-center",
                      col.width,
                      col.align === 'right' && "justify-end",
                      // Indent descriptions and P&A items
                      col.key === 'description' && isDescription && "pl-6",
                      col.key === 'description' && isPAItem && "pl-8"
                    )}
                  >
                    {renderCell(item, col, rowType)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
      
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
