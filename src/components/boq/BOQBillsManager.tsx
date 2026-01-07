import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddBOQBillDialog } from "./AddBOQBillDialog";
import { BOQProjectSectionsManager } from "./BOQProjectSectionsManager";
import { formatCurrency } from "@/utils/formatters";
import { BOQExcelExportButton } from "./BOQExcelExportButton";
import { BOQExcelImportDialog } from "./BOQExcelImportDialog";

interface BOQBillsManagerProps {
  projectId: string;
  boqId: string;
}

export function BOQBillsManager({ boqId, projectId }: BOQBillsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["boq-bills", boqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_bills")
        .select("*")
        .eq("project_boq_id", boqId)
        .order("bill_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase
        .from("boq_bills")
        .delete()
        .eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      toast.success("Bill deleted");
    },
    onError: () => {
      toast.error("Failed to delete bill");
    },
  });

  const toggleBill = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const totals = bills.reduce(
    (acc, bill) => ({
      total: acc.total + Number(bill.total_amount || 0),
    }),
    { total: 0 }
  );

  // Memoize existing bill numbers to prevent unnecessary re-renders in child component
  const existingBillNumbers = useMemo(() => {
    return bills.map(b => b.bill_number);
  }, [bills]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">BOQ Summary</CardTitle>
          <div className="flex gap-2">
            <BOQExcelExportButton boqId={boqId} projectId={projectId} />
            <Button onClick={() => setImportDialogOpen(true)} size="sm" variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Import from Excel
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.total)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      {bills.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              No bills yet. Add your first bill to get started with your BOQ structure.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => (
            <Collapsible 
              key={bill.id} 
              open={expandedBills.has(bill.id)}
              onOpenChange={() => toggleBill(bill.id)}
            >
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:text-primary transition-colors flex-1 min-w-0">
                      {expandedBills.has(bill.id) ? (
                        <ChevronDown className="h-5 w-5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0" />
                      )}
                      <span className="font-semibold text-base truncate">
                        Bill No. {bill.bill_number} - {bill.bill_name}
                      </span>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-sm">
                        <span className="text-muted-foreground mr-2">Total:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(bill.total_amount)}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBill(bill);
                            setAddDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this bill and all its sections?')) {
                              deleteMutation.mutate(bill.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-6">
                    <BOQProjectSectionsManager billId={bill.id} boqId={boqId} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <AddBOQBillDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingBill(null);
        }}
        boqId={boqId}
        editingBill={editingBill}
        existingBillNumbers={existingBillNumbers}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingBill(null);
        }}
      />

      <BOQExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        boqId={boqId}
        projectId={projectId}
      />
    </div>
  );
}

