import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Trash2, Pencil, FileSpreadsheet, Database, Upload, Save, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddBillDialog } from "./AddBillDialog";
import { FinalAccountSectionsManager } from "./FinalAccountSectionsManager";
import { UnifiedBOQImport } from "./UnifiedBOQImport";
import { FinalAccountExcelImport } from "./FinalAccountExcelImport";
import { SaveAsTemplateDialog } from "@/components/templates/SaveAsTemplateDialog";
import { ApplyTemplateDialog } from "@/components/templates/ApplyTemplateDialog";
import { formatCurrency } from "@/utils/formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FinalAccountBillsManagerProps {
  projectId: string;
  accountId: string;
}

export function FinalAccountBillsManager({ accountId, projectId }: FinalAccountBillsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [boqImportDialogOpen, setBoqImportDialogOpen] = useState(false);
  const [excelImportDialogOpen, setExcelImportDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["final-account-bills", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_bills")
        .select("*")
        .eq("final_account_id", accountId)
        .order("bill_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sections and items for template saving
  const { data: sectionsData = [] } = useQuery({
    queryKey: ["final-account-all-sections", accountId],
    queryFn: async () => {
      const billIds = bills.map((b) => b.id);
      if (billIds.length === 0) return [];
      const { data, error } = await supabase
        .from("final_account_sections")
        .select("*")
        .in("bill_id", billIds)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: bills.length > 0,
  });

  const { data: itemsData = [] } = useQuery({
    queryKey: ["final-account-all-items", accountId],
    queryFn: async () => {
      const sectionIds = sectionsData.map((s) => s.id);
      if (sectionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("final_account_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: sectionsData.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase
        .from("final_account_bills")
        .delete()
        .eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
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
      contract: acc.contract + Number(bill.contract_total || 0),
      final: acc.final + Number(bill.final_total || 0),
      variation: acc.variation + Number(bill.variation_total || 0),
    }),
    { contract: 0, final: 0, variation: 0 }
  );

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading bills...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg">Bills Summary</CardTitle>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setApplyTemplateDialogOpen(true)}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Apply Template
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSaveTemplateDialogOpen(true)}
                  disabled={bills.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExcelImportDialogOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import from Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBoqImportDialogOpen(true)}>
                  <Database className="h-4 w-4 mr-2" />
                  Import from BOQ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Contract Total</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.contract)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Final Total</p>
              <p className="text-xl font-semibold">{formatCurrency(totals.final)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Variation</p>
              <p className={`text-xl font-semibold ${totals.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.variation)}
              </p>
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
                        <span className="text-muted-foreground mr-2">Contract:</span>
                        <span className="font-medium">{formatCurrency(bill.contract_total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-2">Final:</span>
                        <span className="font-medium">{formatCurrency(bill.final_total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-2">Variation:</span>
                        <span className={`font-medium ${Number(bill.variation_total) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(bill.variation_total)}
                        </span>
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
                  <FinalAccountSectionsManager billId={bill.id} accountId={accountId} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))
      )}

      <AddBillDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingBill(null);
        }}
        accountId={accountId}
        editingBill={editingBill}
        existingBillNumbers={bills.map(b => b.bill_number)}
        onSuccess={() => {
          setAddDialogOpen(false);
          setEditingBill(null);
        }}
      />

      <UnifiedBOQImport
        open={boqImportDialogOpen}
        onOpenChange={setBoqImportDialogOpen}
        accountId={accountId}
        projectId={projectId}
      />

      <FinalAccountExcelImport
        open={excelImportDialogOpen}
        onOpenChange={setExcelImportDialogOpen}
        accountId={accountId}
        projectId={projectId}
      />

      <SaveAsTemplateDialog
        open={saveTemplateDialogOpen}
        onOpenChange={setSaveTemplateDialogOpen}
        bills={bills}
        sections={sectionsData}
        items={itemsData}
        sourceType="final_account"
      />

      <ApplyTemplateDialog
        open={applyTemplateDialogOpen}
        onOpenChange={setApplyTemplateDialogOpen}
        targetType="final_account"
        targetId={accountId}
        onApply={() => {
          queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
        }}
      />
    </div>
  );
}
