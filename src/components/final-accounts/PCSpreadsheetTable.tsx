import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Layers, Truck, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PrimeCostDocuments } from "./PrimeCostDocuments";
import { PrimeCostBreakdown } from "./PrimeCostBreakdown";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface PCSpreadsheetTableProps {
  items: any[];
  sectionId: string;
  accountId: string;
  projectId: string;
}

type EditableField = 'item_code' | 'description' | 'pc_allowance' | 'pc_actual_cost' | 'pc_profit_attendance_percent';

const PROCUREMENT_STATUSES = [
  { value: 'not_started', label: 'Not Started', icon: Clock, color: 'text-muted-foreground' },
  { value: 'pending_quote', label: 'Pending Quote', icon: AlertCircle, color: 'text-amber-500' },
  { value: 'quote_received', label: 'Quote Received', icon: FileText, color: 'text-blue-500' },
  { value: 'pending_approval', label: 'Pending Approval', icon: Clock, color: 'text-orange-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'ordered', label: 'Ordered', icon: Package, color: 'text-purple-500' },
  { value: 'in_transit', label: 'In Transit', icon: Truck, color: 'text-indigo-500' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'cancelled', label: 'Cancelled', icon: AlertCircle, color: 'text-destructive' },
] as const;

const COLUMNS: { 
  key: EditableField | 'pa_value' | 'adjustment' | 'documents' | 'procurement'; 
  label: string; 
  width: string; 
  editable: boolean; 
  type: 'text' | 'number' | 'currency' | 'percent' | 'action' | 'procurement'; 
  align: 'left' | 'right' | 'center';
}[] = [
  { key: 'item_code', label: 'Code', width: 'w-[80px] shrink-0', editable: false, type: 'text', align: 'right' },
  { key: 'description', label: 'Description', width: 'flex-1 min-w-[100px]', editable: false, type: 'text', align: 'left' },
  { key: 'pc_allowance', label: 'Allowance', width: 'w-[110px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'pc_actual_cost', label: 'Actual', width: 'w-[140px] shrink-0', editable: true, type: 'currency', align: 'right' },
  { key: 'pc_profit_attendance_percent', label: 'P&A%', width: 'w-[70px] shrink-0', editable: true, type: 'percent', align: 'right' },
  { key: 'adjustment', label: 'Adj.', width: 'w-[100px] shrink-0', editable: false, type: 'currency', align: 'right' },
  { key: 'procurement', label: 'Procurement', width: 'w-[160px] shrink-0', editable: false, type: 'procurement', align: 'center' },
  { key: 'documents', label: 'Docs', width: 'w-[60px] shrink-0', editable: false, type: 'action', align: 'center' },
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
  const [procurementPopover, setProcurementPopover] = useState<string | null>(null);
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

  // Function to recalculate section totals including PC and P&A items
  const recalculateSectionTotals = async (itemSectionId: string) => {
    const { data: allItems } = await supabase
      .from("final_account_items")
      .select("id, contract_amount, final_amount, variation_amount, is_prime_cost, pc_actual_cost, pc_allowance, is_pa_item, pa_parent_item_id, pa_percentage")
      .eq("section_id", itemSectionId);

    if (allItems) {
      const itemMap = new Map(allItems.map(item => [item.id, item]));
      
      const totals = allItems.reduce(
        (acc, item) => {
          let finalAmt = Number(item.final_amount || 0);
          let contractAmt = Number(item.contract_amount || 0);
          
          if (item.is_prime_cost) {
            finalAmt = Number(item.pc_actual_cost) || 0;
            contractAmt = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
          }
          
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

      // Get the section to find its bill_id
      const { data: section } = await supabase
        .from("final_account_sections")
        .select("bill_id")
        .eq("id", itemSectionId)
        .single();

      await supabase
        .from("final_account_sections")
        .update({
          contract_total: totals.contract,
          final_total: totals.final,
          variation_total: totals.variation,
        })
        .eq("id", itemSectionId);

      // Trigger bill totals update via the database trigger
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const updates: any = { [field]: value };

      // If updating pc_actual_cost, also update final_amount and variation_amount
      if (field === 'pc_actual_cost') {
        const item = items.find(i => i.id === id);
        if (item) {
          const contractAmount = Number(item.contract_amount) || Number(item.pc_allowance) || 0;
          updates.final_amount = Number(value) || 0;
          updates.variation_amount = updates.final_amount - contractAmount;
        }
      }

      const { error } = await supabase
        .from("final_account_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // Find the section ID for this item and recalculate totals
      const item = items.find(i => i.id === id);
      if (item) {
        // Get section_id from item
        const { data: itemData } = await supabase
          .from("final_account_items")
          .select("section_id")
          .eq("id", id)
          .single();
        
        if (itemData?.section_id) {
          await recalculateSectionTotals(itemData.section_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items-prime-costs-grouped", accountId] });
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
    },
    onError: () => {
      toast.error("Failed to update item");
    },
  });

  // Procurement status update mutation
  const updateProcurementMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("final_account_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-items-prime-costs-grouped", accountId] });
      toast.success("Procurement status updated");
    },
    onError: () => {
      toast.error("Failed to update procurement status");
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
    
    // Special handling for procurement status
    if (column.key === 'procurement') {
      const status = item.procurement_status || 'not_started';
      const statusConfig = PROCUREMENT_STATUSES.find(s => s.value === status) || PROCUREMENT_STATUSES[0];
      const StatusIcon = statusConfig.icon;
      
      return (
        <Popover open={procurementPopover === item.id} onOpenChange={(open) => setProcurementPopover(open ? item.id : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 gap-1.5 text-xs font-normal w-full justify-start", statusConfig.color)}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="truncate">{statusConfig.label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    updateProcurementMutation.mutate({ 
                      id: item.id, 
                      updates: { procurement_status: value } 
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCUREMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Supplier</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    placeholder="Supplier name"
                    defaultValue={item.supplier_name || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (item.supplier_name || '')) {
                        updateProcurementMutation.mutate({ 
                          id: item.id, 
                          updates: { supplier_name: e.target.value || null } 
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">PO Number</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    placeholder="PO-XXX"
                    defaultValue={item.po_number || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (item.po_number || '')) {
                        updateProcurementMutation.mutate({ 
                          id: item.id, 
                          updates: { po_number: e.target.value || null } 
                        });
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Quote Amount</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    type="number"
                    placeholder="0.00"
                    defaultValue={item.quote_amount || ''}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value) || null;
                      if (val !== item.quote_amount) {
                        updateProcurementMutation.mutate({ 
                          id: item.id, 
                          updates: { quote_amount: val } 
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Expected Delivery</Label>
                  <Input
                    className="h-7 text-xs mt-1"
                    type="date"
                    defaultValue={item.expected_delivery || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (item.expected_delivery || '')) {
                        updateProcurementMutation.mutate({ 
                          id: item.id, 
                          updates: { expected_delivery: e.target.value || null } 
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {item.expected_delivery && (
                <div className="text-xs text-muted-foreground">
                  Expected: {format(new Date(item.expected_delivery), 'dd MMM yyyy')}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    
    // Special handling for documents button
    if (column.key === 'documents') {
      const docCount = documentCounts?.[item.id] || 0;
      return (
        <div className="flex items-center justify-center py-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 gap-1"
            onClick={() => setDocumentsDialog({ open: true, itemId: item.id, description: item.description })}
            title={docCount > 0 ? `${docCount} document(s)` : "Add documents"}
          >
            <FileText className={cn("h-3.5 w-3.5", docCount > 0 ? "text-primary" : "text-muted-foreground")} />
            {docCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-medium">
                {docCount}
              </Badge>
            )}
          </Button>
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
        <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[0].width)}>
          Subtotal
        </div>
        <div className={cn("px-1.5 py-2 text-xs border-r", COLUMNS[1].width)}>
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
        <div className={cn(
          "px-1.5 py-2 text-xs text-right font-medium border-r",
          COLUMNS[5].width,
          totals.adjustment >= 0 ? "text-destructive" : "text-green-600"
        )}>
          {totals.adjustment >= 0 ? "+" : ""}{formatCurrency(totals.adjustment)}
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-center border-r", COLUMNS[6].width)}>
          -
        </div>
        <div className={cn("px-1.5 py-2 text-xs text-center", COLUMNS[7].width)}>
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
