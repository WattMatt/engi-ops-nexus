import { useState } from "react";
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

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading bills...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">BOQ Summary</CardTitle>
          <div className="flex gap-2">
            <BOQExcelExportButton boqId={boqId} projectId={projectId} />
            <Button onClick={() => setImportDialogOpen(true)} size="sm" variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import from Excel
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No bills yet. Add your first bill to get started.</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        bills.map((bill) => (
          <Collapsible 
            key={bill.id} 
            open={expandedBills.has(bill.id)}
            onOpenChange={() => toggleBill(bill.id)}
          >
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                    {expandedBills.has(bill.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">Bill No. {bill.bill_number} - {bill.bill_name}</span>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground mr-2">Total:</span>
                        <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
                      </div>
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <BOQProjectSectionsManager billId={bill.id} boqId={boqId} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))
      )}

      <AddBOQBillDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingBill(null);
        }}
        boqId={boqId}
        editingBill={editingBill}
        existingBillNumbers={bills.map(b => b.bill_number)}
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

