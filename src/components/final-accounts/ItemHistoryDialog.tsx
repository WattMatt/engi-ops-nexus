import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { History, RotateCcw, Loader2 } from "lucide-react";

interface ItemHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemCode: string;
}

interface HistoryEntry {
  id: string;
  item_id: string;
  action_type: string;
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  change_summary: string | null;
}

export function ItemHistoryDialog({
  open,
  onOpenChange,
  itemId,
  itemCode,
}: ItemHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["item-history", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_item_history")
        .select("*")
        .eq("item_id", itemId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data as HistoryEntry[];
    },
    enabled: open && !!itemId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (historyEntry: HistoryEntry) => {
      if (!historyEntry.old_values && !historyEntry.new_values) {
        throw new Error("No values to restore");
      }

      // For 'updated' actions, restore to old_values
      // For 'created' actions, we can restore to the new_values (initial state)
      const valuesToRestore = historyEntry.action_type === 'updated' 
        ? historyEntry.old_values 
        : historyEntry.new_values;

      if (!valuesToRestore) {
        throw new Error("No values available for restore");
      }

      // Extract only the editable fields
      const { error } = await supabase
        .from("final_account_items")
        .update({
          item_code: valuesToRestore.item_code,
          description: valuesToRestore.description,
          unit: valuesToRestore.unit,
          contract_quantity: valuesToRestore.contract_quantity,
          final_quantity: valuesToRestore.final_quantity,
          supply_rate: valuesToRestore.supply_rate,
          install_rate: valuesToRestore.install_rate,
          contract_amount: valuesToRestore.contract_amount,
          final_amount: valuesToRestore.final_amount,
          variation_amount: valuesToRestore.variation_amount,
          pc_allowance: valuesToRestore.pc_allowance,
          pc_actual_cost: valuesToRestore.pc_actual_cost,
          pa_percentage: valuesToRestore.pa_percentage,
        })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item restored to previous state");
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      queryClient.invalidateQueries({ queryKey: ["item-history", itemId] });
    },
    onError: (error) => {
      toast.error("Failed to restore: " + error.message);
    },
    onSettled: () => {
      setRestoringId(null);
    },
  });

  const handleRestore = (entry: HistoryEntry) => {
    setRestoringId(entry.id);
    restoreMutation.mutate(entry);
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return value.toLocaleString("en-ZA", { minimumFractionDigits: 2 });
    }
    return String(value);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800";
      case "updated":
        return "bg-blue-100 text-blue-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderChanges = (entry: HistoryEntry) => {
    if (entry.action_type === "created") {
      return <span className="text-sm text-muted-foreground">Initial values</span>;
    }

    if (!entry.old_values || !entry.new_values) return null;

    const importantFields = [
      { key: "contract_quantity", label: "Contract Qty" },
      { key: "final_quantity", label: "Final Qty" },
      { key: "supply_rate", label: "Supply Rate" },
      { key: "install_rate", label: "Install Rate" },
      { key: "contract_amount", label: "Contract Amt" },
      { key: "final_amount", label: "Final Amt" },
      { key: "pc_actual_cost", label: "PC Actual" },
    ];

    const changes = importantFields
      .filter(
        (f) =>
          entry.old_values![f.key] !== entry.new_values![f.key]
      )
      .map((f) => ({
        ...f,
        oldVal: entry.old_values![f.key],
        newVal: entry.new_values![f.key],
      }));

    if (changes.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {changes.map((change) => (
          <div key={change.key} className="text-xs flex items-center gap-2">
            <span className="text-muted-foreground">{change.label}:</span>
            <span className="text-red-600 line-through">
              {formatValue(change.oldVal)}
            </span>
            <span>→</span>
            <span className="text-green-600 font-medium">
              {formatValue(change.newVal)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Edit History - {itemCode}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No edit history available
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getActionBadgeColor(entry.action_type)}>
                          {entry.action_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.changed_at), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                      {entry.change_summary && (
                        <p className="text-sm font-medium">{entry.change_summary}</p>
                      )}
                      {renderChanges(entry)}
                    </div>

                    {entry.action_type === "updated" && index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(entry)}
                        disabled={restoringId === entry.id}
                        className="ml-4"
                      >
                        {restoringId === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
