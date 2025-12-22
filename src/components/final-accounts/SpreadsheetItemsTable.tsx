import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ItemHistoryDialog } from "./ItemHistoryDialog";

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
  const unit = item.unit?.trim() || '';
  const hasValues = (item.contract_quantity ?? 0) > 0 || (item.contract_amount ?? 0) > 0;
  
  // If item has a unit, it's a real line item (not a header/description)
  const hasUnit = unit !== '';
  
  // No item code AND no unit = description row
  // But if it has a unit, it's a regular item even without a code
  if (!code && !hasUnit) return 'description';
  
  // Has a unit = regular item (regardless of code pattern)
  if (hasUnit) return 'item';
  
  // Main header: B1, B2, C1, etc. (letter + single number, no dots) - only if no unit and no values
  if (/^[A-Z]\d*$/i.test(code) && !hasValues) return 'header';
  
  // Sub-header: B2.3, B2.4 without values (parent item for sub-items) - only if no unit
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
  const [historyItem, setHistoryItem] = useState<{ id: string; code: string } | null>(null);
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
      const item = items.find(i => i.id === id);
      if (!item) throw new Error("Item not found");

      const updates: any = { [field]: value };
      
      // Only recalculate amounts when quantity or rate fields change
      const amountFields = ['contract_quantity', 'final_quantity', 'supply_rate', 'install_rate'];
      if (amountFields.includes(field)) {
        const contractQty = field === 'contract_quantity' ? (value || 0) : (item.contract_quantity || 0);
        const finalQty = field === 'final_quantity' ? (value || 0) : (item.final_quantity || 0);
        const supplyRate = field === 'supply_rate' ? (value || 0) : (item.supply_rate || 0);
        const installRate = field === 'install_rate' ? (value || 0) : (item.install_rate || 0);
        
        const totalRate = supplyRate + installRate;
        updates.contract_amount = contractQty * totalRate;
        updates.final_amount = finalQty * totalRate;
        updates.variation_amount = updates.final_amount - updates.contract_amount;
      }

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
          contract_quantity: null,
          final_quantity: null,
          supply_rate: null,
          install_rate: null,
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
      .select("id, item_code, unit, contract_amount, final_amount, variation_amount, is_prime_cost, pc_actual_cost, pc_allowance, is_pa_item, pa_parent_item_id, pa_percentage, contract_quantity")
      .eq("section_id", sectionId);

    if (allItems) {
      // First pass: build a map of items for P&A parent lookups
      const itemMap = new Map(allItems.map(item => [item.id, item]));
      
      // Helper to check if an item is a header row (should not count towards totals)
      const isHeaderRow = (item: any): boolean => {
        const code = item.item_code?.trim() || '';
        const unit = item.unit?.trim() || '';
        
        // Items with units are always real items
        if (unit) return false;
        
        // Header pattern: single letter followed by optional number and period (A., B., B1., etc.)
        // or just a letter with number but no unit (like A1 without values being a header)
        if (/^[A-Z]\.?$/i.test(code)) return true;
        
        // Sub-section headers ending with period like "B."
        if (/^[A-Z]\d*\.$/i.test(code)) return true;
        
        return false;
      };
      
      const totals = allItems.reduce(
        (acc, item) => {
          // Skip header rows - they shouldn't contribute to totals
          if (isHeaderRow(item)) {
            return acc;
          }
          
          let finalAmt = Number(item.final_amount || 0);
          let contractAmt = Number(item.contract_amount || 0);
          
          // For Prime Cost items, use pc_actual_cost as final amount
          if (item.is_prime_cost) {
            finalAmt = Number(item.pc_actual_cost) || 0;
            contractAmt = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
          }
          
          // For P&A items, calculate based on parent's pc_actual_cost
          if (item.is_pa_item && item.pa_parent_item_id) {
            const parentItem = itemMap.get(item.pa_parent_item_id);
            if (parentItem) {
              const parentActual = Number(parentItem.pc_actual_cost) || 0;
              const parentAllowance = Number(parentItem.pc_allowance) || Number(parentItem.contract_amount) || 0;
              const paPercent = Number(item.pa_percentage) || 0;
              finalAmt = parentActual * (paPercent / 100);
              contractAmt = parentAllowance * (paPercent / 100);
            }
          }
          
          return {
            contract: acc.contract + contractAmt,
            final: acc.final + finalAmt,
            variation: acc.variation + (finalAmt - contractAmt),
          };
        },
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
      // Empty string means null (not entered), otherwise parse the number
      newValue = editValue.trim() === '' ? null : parseFloat(editValue);
      // If user explicitly typed 0, keep it as 0
      if (editValue.trim() === '0') {
        newValue = 0;
      }
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
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setHistoryItem({ id: item.id, code: item.item_code || 'Item' })}
            className="p-1 text-muted-foreground hover:text-primary transition-colors"
            title="View edit history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
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
            column.align === 'right' && "text-right"
          )}
          step={column.type === 'currency' ? '0.01' : '1'}
        />
      );
    }
    
    // For header/description rows OR rows without a unit, hide numeric values but keep editable
    const hasNoUnit = !item.unit || item.unit.trim() === '';
    const isNumericColumn = column.type === 'number' || column.type === 'currency';
    const shouldHideValue = (isHeader || isSubheader || isDescription || hasNoUnit) && 
      isNumericColumn && column.key !== 'description' && column.key !== 'item_code' && column.key !== 'unit';
    
    if (shouldHideValue) {
      return (
        <div 
          onClick={() => column.editable && startEditing(item.id, column.key)}
          className={cn(
            "px-1.5 py-1 text-xs h-full",
            column.editable && "cursor-cell hover:bg-muted/50"
          )}
        >
          &nbsp;
        </div>
      );
    }
    
    // For P&A items, show percentage in rate columns instead of currency
    let displayValue;
    let calculatedVariation: number | null = null;
    
    if (isPAItem && (column.key === 'supply_rate' || column.key === 'install_rate')) {
      // Show the pa_percentage as a percentage value
      if (column.key === 'supply_rate' && item.pa_percentage) {
        displayValue = `${item.pa_percentage.toFixed(2)}%`;
      } else {
        displayValue = '-';
      }
    } else if (isPAItem && column.key === 'final_amount') {
      // For P&A items, calculate based on parent's pc_actual_cost
      const parentItem = items.find(i => i.id === item.pa_parent_item_id);
      const parentActual = Number(parentItem?.pc_actual_cost) || 0;
      const paPercent = Number(item.pa_percentage) || 0;
      const paValue = parentActual * (paPercent / 100);
      displayValue = formatCurrency(paValue);
    } else if (isPAItem && column.key === 'variation_amount') {
      // For P&A items, calculate variation based on parent's actual vs allowance
      const parentItem = items.find(i => i.id === item.pa_parent_item_id);
      const parentActual = Number(parentItem?.pc_actual_cost) || 0;
      const parentAllowance = Number(parentItem?.pc_allowance) || Number(parentItem?.contract_amount) || 0;
      const paPercent = Number(item.pa_percentage) || 0;
      const paFinal = parentActual * (paPercent / 100);
      const paContract = parentAllowance * (paPercent / 100);
      calculatedVariation = paFinal - paContract;
      displayValue = formatCurrency(calculatedVariation);
    } else if (isPrimeCost && column.key === 'final_amount') {
      // For Prime Cost items, show pc_actual_cost as the Final Amount
      const pcActual = Number(item.pc_actual_cost) || 0;
      displayValue = formatCurrency(pcActual);
    } else if (isPrimeCost && column.key === 'variation_amount') {
      // For Prime Cost items, variation = pc_actual_cost - pc_allowance
      const pcActual = Number(item.pc_actual_cost) || 0;
      const pcAllowance = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
      calculatedVariation = pcActual - pcAllowance;
      displayValue = formatCurrency(calculatedVariation);
    } else if (column.type === 'currency') {
      // For rows with a unit: show R 0,00 for null (ready for entry)
      // For rows without a unit: show empty (description row)
      const hasUnit = item.unit && item.unit.trim() !== '';
      if (value === null || value === undefined) {
        displayValue = hasUnit ? formatCurrency(0) : '';
      } else {
        displayValue = formatCurrency(value as number);
      }
    } else if (column.type === 'number') {
      // For rows with a unit: show 0 for null (ready for entry)
      // For rows without a unit: show empty (description row)
      const hasUnit = item.unit && item.unit.trim() !== '';
      if (value === null || value === undefined) {
        displayValue = hasUnit ? '0' : '';
      } else {
        displayValue = value;
      }
    } else {
      displayValue = value || '';
    }
    
    // Use calculated variation for coloring if available, otherwise use stored value
    const variationValue = calculatedVariation !== null ? calculatedVariation : Number(value);
    const variationClass = column.key === 'variation_amount' 
      ? variationValue >= 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'
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

      {/* History Dialog */}
      {historyItem && (
        <ItemHistoryDialog
          open={!!historyItem}
          onOpenChange={(open) => !open && setHistoryItem(null)}
          itemId={historyItem.id}
          itemCode={historyItem.code}
        />
      )}
    </div>
  );
}
