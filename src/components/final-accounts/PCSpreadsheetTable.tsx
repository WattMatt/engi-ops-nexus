import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Layers } from "lucide-react";
import { PrimeCostDocuments } from "./PrimeCostDocuments";
import { PrimeCostBreakdown } from "./PrimeCostBreakdown";
import { Badge } from "@/components/ui/badge";

interface PCSpreadsheetTableProps {
  items: any[];
  sectionId: string;
  accountId: string;
  projectId: string;
}

type EditableField = 'item_code' | 'description' | 'pc_allowance' | 'pc_actual_cost' | 'pc_profit_attendance_percent';

const COLUMNS: { 
  key: EditableField | 'pa_value' | 'adjustment' | 'documents'; 
  label: string; 
  width: string; 
  editable: boolean; 
  type: 'text' | 'number' | 'currency' | 'percent' | 'action'; 
  align: 'left' | 'right' | 'center';
}[] = [
  { key: 'item_code', label: 'Code', width: 'w-[90px] shrink-0', editable: false, type: 'text', align: 'right' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[120px]', editable: false, type: 'text', align: 'right' },
  { key: 'pc_allowance', label: 'PC Allowance', width: 'w-[190px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'pc_actual_cost', label: 'Actual Cost', width: 'w-[230px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'pc_profit_attendance_percent', label: 'P&A %', width: 'w-[100px] shrink-0', editable: true, type: 'percent', align: 'right' },
  { key: 'pa_value', label: 'P&A Value', width: 'w-[180px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'adjustment', label: 'Adjustment', width: 'w-[190px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'documents', label: 'Docs', width: 'w-[70px] shrink-0', editable: false, type: 'action', align: 'right' },
];

export function PCSpreadsheetTable({ items, sectionId, accountId, projectId }: PCSpreadsheetTableProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [documentsDialog, setDocumentsDialog] = useState<{ open: boolean; itemId: string; description: string }>({
    open: false,
    itemId: "",
    description: "",
  });
  const [breakdownDialog, setBreakdownDialog] = useState<{ 
    open: boolean; 
    itemId: string; 
    description: string;
    currentActualCost: number;
  }>({
    open: false,
    itemId: "",
    description: "",
    currentActualCost: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch document counts for all items in this section
  const { data: documentCounts } = useQuery({
    queryKey: ["prime-cost-document-counts", sectionId],
    queryFn: async () => {
      const itemIds = items.map(i => i.id);
      const { data, error } = await supabase
        .from("prime_cost_documents")
        .select("prime_cost_item_id")
        .in("prime_cost_item_id", itemIds);
      
      if (error) throw error;
      
      // Count documents per item
      const counts: Record<string, number> = {};
      (data || []).forEach(doc => {
        counts[doc.prime_cost_item_id] = (counts[doc.prime_cost_item_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch component counts for all items in this section
  const { data: componentCounts } = useQuery({
    queryKey: ["prime-cost-component-counts", sectionId],
    queryFn: async () => {
      const itemIds = items.map(i => i.id);
      const { data, error } = await supabase
        .from("prime_cost_components")
        .select("prime_cost_item_id")
        .in("prime_cost_item_id", itemIds);
      
      if (error) throw error;
      
      // Count components per item
      const counts: Record<string, number> = {};
      (data || []).forEach(comp => {
        counts[comp.prime_cost_item_id] = (counts[comp.prime_cost_item_id] || 0) + 1;
      });
      return counts;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const updates: any = { [field]: value };

      const { error } = await supabase
        .from("final_account_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items-prime-costs-grouped", accountId] });
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
    setEditValue(value?.toString() || '0');
  }, [items]);

  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    
    const item = items.find(i => i.id === activeCell.rowId);
    if (!item) return;
    
    const column = COLUMNS.find(c => c.key === activeCell.field);
    let newValue: any = editValue;
    
    if (column?.type === 'number' || column?.type === 'currency' || column?.type === 'percent') {
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

  const calculatePAValue = (item: any) => {
    const actual = Number(item.pc_actual_cost) || 0;
    const paPercent = Number(item.pc_profit_attendance_percent) || 0;
    return actual * (paPercent / 100);
  };

  const calculateAdjustment = (item: any) => {
    const allowance = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
    const actual = Number(item.pc_actual_cost) || 0;
    const paPercent = Number(item.pc_profit_attendance_percent) || 0;
    return (actual - allowance) * (1 + paPercent / 100);
  };

  const renderCell = (item: any, column: typeof COLUMNS[0]) => {
    const isActive = activeCell?.rowId === item.id && activeCell?.field === column.key;
    
    // Special handling for documents button
    if (column.key === 'documents') {
      const docCount = documentCounts?.[item.id] || 0;
      return (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDocumentsDialog({ open: true, itemId: item.id, description: item.description })}
            title={docCount > 0 ? `${docCount} document(s)` : "Add documents"}
          >
            <FileText className={cn("h-4 w-4", docCount > 0 ? "text-primary" : "text-muted-foreground")} />
            {docCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {docCount}
              </span>
            )}
          </Button>
        </div>
      );
    }
    
    // Special handling for P&A Value (calculated)
    if (column.key === 'pa_value') {
      const paValue = calculatePAValue(item);
      return (
        <div className="px-1.5 py-1 text-xs text-right text-muted-foreground">
          {paValue > 0 ? formatCurrency(paValue) : "-"}
        </div>
      );
    }
    
    // Special handling for adjustment (calculated)
    if (column.key === 'adjustment') {
      const adjustment = calculateAdjustment(item);
      return (
        <div
          className={cn(
            "px-1.5 py-1 text-xs text-right font-medium whitespace-nowrap",
            adjustment >= 0 ? "text-destructive" : "text-green-600"
          )}
        >
          {adjustment !== 0 ? (adjustment >= 0 ? "+" : "") + formatCurrency(adjustment) : "-"}
        </div>
      );
    }

    // For pc_allowance, use contract_amount as fallback
    if (column.key === 'pc_allowance') {
      const value = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
      return (
        <div className="px-1.5 py-1 text-xs text-right">
          {formatCurrency(value)}
        </div>
      );
    }

    // Special handling for pc_actual_cost - show breakdown indicator
    if (column.key === 'pc_actual_cost') {
      const compCount = componentCounts?.[item.id] || 0;
      const value = Number(item.pc_actual_cost) || 0;
      
      if (isActive) {
        return (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-primary/10 border-2 border-primary outline-none px-1.5 py-0.5 text-xs text-right"
            step="0.01"
          />
        );
      }
      
      return (
        <div
          className="flex items-center justify-end gap-1 px-1.5 py-1 cursor-pointer hover:bg-muted/50 group whitespace-nowrap flex-nowrap"
          onClick={() => setBreakdownDialog({ 
            open: true, 
            itemId: item.id, 
            description: item.description,
            currentActualCost: value,
          })}
          title="Click to view/edit breakdown"
        >
          {compCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal gap-0.5 shrink-0">
              <Layers className="h-3 w-3" />
              {compCount}
            </Badge>
          )}
          <span className="text-xs shrink-0">{formatCurrency(value)}</span>
        </div>
      );
    }
    
    const value = item[column.key as keyof typeof item];
    
    if (isActive && column.editable) {
      return (
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-full bg-primary/10 border-2 border-primary outline-none px-1.5 py-0.5 text-xs",
            column.align === 'right' && "text-right"
          )}
          step={column.type === 'currency' ? '0.01' : column.type === 'percent' ? '0.1' : '1'}
        />
      );
    }
    
    let displayValue: string;
    if (column.type === 'currency') {
      displayValue = formatCurrency(value as number || 0);
    } else if (column.type === 'percent') {
      displayValue = `${(value as number || 0).toFixed(1)}%`;
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

  // Calculate section totals
  const totals = items.reduce(
    (acc, item) => {
      const allowance = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
      const actual = Number(item.pc_actual_cost) || 0;
      const paValue = calculatePAValue(item);
      return {
        allowance: acc.allowance + allowance,
        actual: acc.actual + actual,
        paValue: acc.paValue + paValue,
        adjustment: acc.adjustment + calculateAdjustment(item),
      };
    },
    { allowance: 0, actual: 0, paValue: 0, adjustment: 0 }
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
      <div className="divide-y">
        {items.map((item) => (
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
                  col.align === 'right' && "justify-end"
                )}
              >
                {renderCell(item, col)}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Totals row */}
      <div className="flex bg-muted/50 border-t font-semibold">
        <div className={cn("px-1.5 py-2 text-xs border-r text-right", COLUMNS[0].width)}>
          Subtotal
        </div>
        <div className={cn("px-1.5 py-2 text-xs border-r text-right", COLUMNS[1].width)}>
          {items.length} items
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-right border-r", COLUMNS[2].width)}>
          {formatCurrency(totals.allowance)}
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-right border-r", COLUMNS[3].width)}>
          {formatCurrency(totals.actual)}
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-right border-r", COLUMNS[4].width)}>
          -
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-right border-r", COLUMNS[5].width)}>
          {formatCurrency(totals.paValue)}
        </div>
        <div className={cn(
          "px-1.5 py-2 text-xs text-right font-medium border-r",
          COLUMNS[6].width,
          totals.adjustment >= 0 ? "text-destructive" : "text-green-600"
        )}>
          {totals.adjustment >= 0 ? "+" : ""}{formatCurrency(totals.adjustment)}
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-right", COLUMNS[7].width)}>
          -
        </div>
      </div>

      {/* Documents Dialog */}
      <PrimeCostDocuments
        open={documentsDialog.open}
        onOpenChange={(open) => setDocumentsDialog({ ...documentsDialog, open })}
        itemId={documentsDialog.itemId}
        itemDescription={documentsDialog.description}
      />

      {/* Breakdown Dialog */}
      <PrimeCostBreakdown
        open={breakdownDialog.open}
        onOpenChange={(open) => setBreakdownDialog({ ...breakdownDialog, open })}
        itemId={breakdownDialog.itemId}
        itemDescription={breakdownDialog.description}
        projectId={projectId}
        currentActualCost={breakdownDialog.currentActualCost}
        onActualCostChange={(newTotal) => {
          updateMutation.mutate({ 
            id: breakdownDialog.itemId, 
            field: 'pc_actual_cost', 
            value: newTotal 
          });
          queryClient.invalidateQueries({ queryKey: ["prime-cost-component-counts", sectionId] });
        }}
      />
    </div>
  );
}
