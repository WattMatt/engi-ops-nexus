import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle2,
  AlertCircle,
  Database,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface UnifiedBOQImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  projectId: string;
}

interface BOQStructure {
  boqId: string;
  boqName: string;
  bills: {
    id: string;
    billNumber: number;
    billName: string;
    totalAmount: number;
    sections: {
      id: string;
      sectionCode: string;
      sectionName: string;
      description: string | null;
      totalAmount: number;
      items: {
        id: string;
        itemCode: string;
        description: string;
        unit: string;
        quantity: number;
        supplyRate: number;
        installRate: number;
        totalAmount: number;
        displayOrder: number;
        itemType: string | null;
        primeCostAmount: number | null;
      }[];
    }[];
  }[];
}

type Phase = 'select' | 'preview' | 'importing' | 'complete';

export function UnifiedBOQImport({ open, onOpenChange, accountId, projectId }: UnifiedBOQImportProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedBoqId, setSelectedBoqId] = useState<string | null>(null);
  const [boqStructure, setBoqStructure] = useState<BOQStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const queryClient = useQueryClient();

  // Fetch existing project BOQs (structured BOQ data)
  const { data: projectBoqs = [], isLoading: loadingBoqs } = useQuery({
    queryKey: ["project-boqs-for-import", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_boqs")
        .select("id, boq_name, boq_number, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Load BOQ structure when selected
  const loadBoqStructure = useCallback(async (boqId: string) => {
    setLoading(true);
    setSelectedBoqId(boqId);
    
    try {
      // Get BOQ info
      const { data: boq, error: boqError } = await supabase
        .from("project_boqs")
        .select("id, boq_name")
        .eq("id", boqId)
        .single();
      if (boqError) throw boqError;

      // Get bills
      const { data: bills, error: billsError } = await supabase
        .from("boq_bills")
        .select("id, bill_number, bill_name, total_amount")
        .eq("project_boq_id", boqId)
        .order("bill_number", { ascending: true });
      if (billsError) throw billsError;

      const structure: BOQStructure = {
        boqId: boq.id,
        boqName: boq.boq_name,
        bills: [],
      };

      // Get sections and items for each bill
      for (const bill of bills || []) {
        const { data: sections, error: sectionsError } = await supabase
          .from("boq_project_sections")
          .select("id, section_code, section_name, description, total_amount")
          .eq("bill_id", bill.id)
          .order("display_order", { ascending: true });
        if (sectionsError) throw sectionsError;

        const billData = {
          id: bill.id,
          billNumber: bill.bill_number,
          billName: bill.bill_name,
          totalAmount: bill.total_amount || 0,
          sections: [] as BOQStructure['bills'][0]['sections'],
        };

        for (const section of sections || []) {
          const { data: items, error: itemsError } = await supabase
            .from("boq_items")
            .select("id, item_code, description, unit, quantity, supply_rate, install_rate, total_amount, display_order, item_type, prime_cost_amount")
            .eq("section_id", section.id)
            .order("display_order", { ascending: true });
          if (itemsError) throw itemsError;

          billData.sections.push({
            id: section.id,
            sectionCode: section.section_code,
            sectionName: section.section_name,
            description: section.description,
            totalAmount: section.total_amount || 0,
            items: (items || []).map(item => ({
              id: item.id,
              itemCode: item.item_code || "",
              description: item.description,
              unit: item.unit || "",
              quantity: item.quantity || 0,
              supplyRate: item.supply_rate || 0,
              installRate: item.install_rate || 0,
              totalAmount: item.total_amount || 0,
              displayOrder: item.display_order || 0,
              itemType: item.item_type,
              primeCostAmount: item.prime_cost_amount,
            })),
          });
        }

        structure.bills.push(billData);
      }

      setBoqStructure(structure);
      setPhase('preview');
      
      const totalSections = structure.bills.reduce((sum, b) => sum + b.sections.length, 0);
      const totalItems = structure.bills.reduce((sum, b) => 
        sum + b.sections.reduce((sSum, s) => sSum + s.items.length, 0), 0);
      toast.success(`Loaded ${structure.bills.length} bills, ${totalSections} sections, ${totalItems} items`);
      
    } catch (error) {
      console.error("Failed to load BOQ structure:", error);
      toast.error("Failed to load BOQ data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Import from BOQ structure
  const handleImport = async () => {
    if (!boqStructure) return;
    
    setPhase('importing');
    const totalSections = boqStructure.bills.reduce((sum, b) => sum + b.sections.length, 0);
    setImportProgress({ current: 0, total: totalSections });
    
    let successCount = 0;
    let failedCount = 0;
    let sectionIndex = 0;

    for (const bill of boqStructure.bills) {
      try {
        // Create or get final account bill
        const { data: existingBill } = await supabase
          .from("final_account_bills")
          .select("id")
          .eq("final_account_id", accountId)
          .eq("bill_number", bill.billNumber)
          .maybeSingle();

        let billId: string;
        if (existingBill) {
          billId = existingBill.id;
          // Update bill name if changed
          await supabase
            .from("final_account_bills")
            .update({ bill_name: bill.billName })
            .eq("id", billId);
        } else {
          const { data: newBill, error: billError } = await supabase
            .from("final_account_bills")
            .insert({
              final_account_id: accountId,
              bill_number: bill.billNumber,
              bill_name: bill.billName,
            })
            .select()
            .single();
          if (billError) throw billError;
          billId = newBill.id;
        }

        for (const section of bill.sections) {
          sectionIndex++;
          setImportProgress({ current: sectionIndex, total: totalSections });

          try {
            // Create or replace section
            const { data: existingSection } = await supabase
              .from("final_account_sections")
              .select("id")
              .eq("bill_id", billId)
              .eq("section_code", section.sectionCode)
              .maybeSingle();

            let sectionId: string;
            if (existingSection) {
              // Clear existing items
              await supabase.from("final_account_items").delete().eq("section_id", existingSection.id);
              sectionId = existingSection.id;
              await supabase.from("final_account_sections")
                .update({ 
                  section_name: section.sectionName,
                  description: section.description,
                })
                .eq("id", sectionId);
            } else {
              const { data: newSection, error: sectionError } = await supabase
                .from("final_account_sections")
                .insert({
                  bill_id: billId,
                  section_code: section.sectionCode,
                  section_name: section.sectionName,
                  description: section.description,
                  display_order: section.sectionCode.charCodeAt(0) - 64,
                })
                .select()
                .single();
              if (sectionError) throw sectionError;
              sectionId = newSection.id;
            }

            // Insert items from BOQ structure - maintains exact mapping
            const itemsToInsert = section.items.map((item) => ({
              section_id: sectionId,
              item_code: item.itemCode,
              description: item.description,
              unit: item.unit,
              contract_quantity: item.quantity,
              final_quantity: 0,
              supply_rate: item.supplyRate,
              install_rate: item.installRate,
              contract_amount: item.totalAmount,
              final_amount: 0,
              display_order: item.displayOrder,
              is_prime_cost: item.itemType === 'prime_cost' || item.primeCostAmount != null,
              pc_allowance: item.primeCostAmount || 0,
              pc_actual_cost: 0,
              pc_profit_attendance_percent: 0,
              source_boq_item_id: item.id, // Link to source BOQ item!
            }));

            if (itemsToInsert.length > 0) {
              const { error: itemsError } = await supabase
                .from("final_account_items")
                .insert(itemsToInsert);
              if (itemsError) throw itemsError;
            }

            // Update section totals
            const contractTotal = section.items.reduce((sum, i) => sum + i.totalAmount, 0);
            await supabase
              .from("final_account_sections")
              .update({
                contract_total: contractTotal,
                final_total: 0,
              })
              .eq("id", sectionId);

            successCount++;
          } catch (error) {
            console.error(`Failed to import section ${section.sectionCode}:`, error);
            failedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to import bill ${bill.billNumber}:`, error);
        failedCount += bill.sections.length;
      }
    }

    // Update bill totals
    const { data: finalBills } = await supabase
      .from("final_account_bills")
      .select("id")
      .eq("final_account_id", accountId);

    for (const bill of finalBills || []) {
      const { data: sections } = await supabase
        .from("final_account_sections")
        .select("contract_total, final_total")
        .eq("bill_id", bill.id);
      
      const contractTotal = sections?.reduce((sum, s) => sum + (s.contract_total || 0), 0) || 0;
      const finalTotal = sections?.reduce((sum, s) => sum + (s.final_total || 0), 0) || 0;
      
      await supabase
        .from("final_account_bills")
        .update({
          contract_total: contractTotal,
          final_total: finalTotal,
          variation_total: finalTotal - contractTotal,
        })
        .eq("id", bill.id);
    }

    queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
    queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
    queryClient.invalidateQueries({ queryKey: ["final-account-items"] });

    setImportResult({ success: successCount, failed: failedCount });
    setPhase('complete');
  };

  // Computed values
  const totals = useMemo(() => {
    if (!boqStructure) return { bills: 0, sections: 0, items: 0, amount: 0 };
    return {
      bills: boqStructure.bills.length,
      sections: boqStructure.bills.reduce((sum, b) => sum + b.sections.length, 0),
      items: boqStructure.bills.reduce((sum, b) => 
        sum + b.sections.reduce((sSum, s) => sSum + s.items.length, 0), 0),
      amount: boqStructure.bills.reduce((sum, b) => sum + b.totalAmount, 0),
    };
  }, [boqStructure]);

  const toggleBill = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleClose = () => {
    setPhase('select');
    setSelectedBoqId(null);
    setBoqStructure(null);
    setExpandedBills(new Set());
    setExpandedSections(new Set());
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from BOQ</DialogTitle>
          <DialogDescription>
            {phase === 'select' && "Select the BOQ structure to import into Final Account"}
            {phase === 'preview' && "Review the data, then click Import to proceed"}
            {phase === 'importing' && "Importing sections..."}
            {phase === 'complete' && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Phase: Select BOQ */}
          {phase === 'select' && (
            <div className="space-y-4">
              {loadingBoqs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : projectBoqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No BOQ found for this project.</p>
                  <p className="text-sm mt-2">Please create a BOQ first in the BOQ module.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a BOQ to import its structure (bills, sections, and items) into the Final Account:
                  </p>
                  {projectBoqs.map((boq) => (
                    <Card
                      key={boq.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/50",
                        selectedBoqId === boq.id && loading && "border-primary"
                      )}
                      onClick={() => loadBoqStructure(boq.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{boq.boq_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {boq.boq_number}
                            </p>
                          </div>
                        </div>
                        {loading && selectedBoqId === boq.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phase: Preview */}
          {phase === 'preview' && boqStructure && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totals.bills}</p>
                  <p className="text-sm text-muted-foreground">Bills</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{totals.sections}</p>
                  <p className="text-sm text-muted-foreground">Sections</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{totals.items}</p>
                  <p className="text-sm text-muted-foreground">Items</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(totals.amount)}</p>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
              </div>

              {/* Structure preview */}
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {boqStructure.bills.map((bill) => (
                    <div key={bill.id} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full p-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                        onClick={() => toggleBill(bill.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedBills.has(bill.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            Bill No. {bill.billNumber} - {bill.billName}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {bill.sections.length} sections • {formatCurrency(bill.totalAmount)}
                        </span>
                      </button>
                      
                      {expandedBills.has(bill.id) && (
                        <div className="pl-6 pr-2 py-2 space-y-1">
                          {bill.sections.map((section) => (
                            <div key={section.id}>
                              <button
                                className="w-full p-2 flex items-center justify-between hover:bg-muted/30 rounded transition-colors text-sm"
                                onClick={() => toggleSection(section.id)}
                              >
                                <div className="flex items-center gap-2">
                                  {expandedSections.has(section.id) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <span>
                                    {section.sectionCode} - {section.sectionName}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {section.items.length} items • {formatCurrency(section.totalAmount)}
                                </span>
                              </button>
                              
                              {expandedSections.has(section.id) && (
                                <div className="pl-6 py-1 space-y-1">
                                  {section.items.slice(0, 10).map((item) => (
                                    <div key={item.id} className="text-xs text-muted-foreground py-1 flex justify-between">
                                      <span className="truncate flex-1">
                                        {item.itemCode && <span className="font-mono mr-2">{item.itemCode}</span>}
                                        {item.description}
                                      </span>
                                      <span className="ml-2 tabular-nums">{formatCurrency(item.totalAmount)}</span>
                                    </div>
                                  ))}
                                  {section.items.length > 10 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      ...and {section.items.length - 10} more items
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setPhase('select')}>
                  Back
                </Button>
                <Button onClick={handleImport}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import to Final Account
                </Button>
              </div>
            </div>
          )}

          {/* Phase: Importing */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Importing...</p>
              <p className="text-sm text-muted-foreground">
                Section {importProgress.current} of {importProgress.total}
              </p>
              <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Phase: Complete */}
          {phase === 'complete' && importResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-xl font-medium mb-2">Import Complete!</p>
              <div className="text-center text-muted-foreground">
                <p>{importResult.success} sections imported successfully</p>
                {importResult.failed > 0 && (
                  <p className="text-destructive">{importResult.failed} sections failed</p>
                )}
              </div>
              <Button onClick={handleClose} className="mt-6">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
