import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Loader2, 
  FileSpreadsheet, 
  Check, 
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatters";

interface BOQReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  projectId: string;
}

interface BOQSectionSummary {
  section_code: string;
  section_name: string;
  bill_number: number | null;
  bill_name: string | null;
  item_count: number;
  boq_total: number;
  items: any[];
}

interface ReconciliationStatus {
  imported: boolean;
  rebuilt_total: number;
  match_percentage: number;
  item_count: number;
}

export function BOQReconciliationDialog({ 
  open, 
  onOpenChange, 
  accountId, 
  projectId 
}: BOQReconciliationDialogProps) {
  const [selectedBoqId, setSelectedBoqId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch BOQ uploads for this project
  const { data: boqUploads = [], isLoading: loadingUploads } = useQuery({
    queryKey: ["boq-uploads", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_uploads")
        .select("*")
        .eq("project_id", projectId)
        .in("status", ["completed", "reviewed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch extracted items for selected BOQ
  const { data: boqItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["boq-extracted-items", selectedBoqId],
    queryFn: async () => {
      if (!selectedBoqId) return [];
      const { data, error } = await supabase
        .from("boq_extracted_items")
        .select("*")
        .eq("upload_id", selectedBoqId)
        .order("section_code", { ascending: true })
        .order("row_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBoqId,
  });

  // Fetch already imported items (via source_boq_item_id)
  const { data: importedItems = [], refetch: refetchImported } = useQuery({
    queryKey: ["imported-boq-items", accountId, selectedBoqId],
    queryFn: async () => {
      if (!selectedBoqId) return [];
      
      // Get all final account items that reference BOQ items from this upload
      const { data: sections, error: sectionsError } = await supabase
        .from("final_account_sections")
        .select(`
          id,
          section_code,
          bill_id,
          final_account_bills!inner(final_account_id)
        `)
        .eq("final_account_bills.final_account_id", accountId);
      
      if (sectionsError) throw sectionsError;
      
      const sectionIds = sections?.map(s => s.id) || [];
      if (sectionIds.length === 0) return [];
      
      const { data: items, error: itemsError } = await supabase
        .from("final_account_items")
        .select("*")
        .in("section_id", sectionIds)
        .not("source_boq_item_id", "is", null);
      
      if (itemsError) throw itemsError;
      return items || [];
    },
    enabled: !!selectedBoqId && !!accountId,
  });

  // Group BOQ items by section with totals
  const sectionSummaries = useMemo((): BOQSectionSummary[] => {
    const sections: Record<string, BOQSectionSummary> = {};
    
    boqItems.forEach((item) => {
      const key = item.section_code || "UNASSIGNED";
      if (!sections[key]) {
        sections[key] = {
          section_code: item.section_code || "UNASSIGNED",
          section_name: item.section_name || "Unassigned Items",
          bill_number: item.bill_number,
          bill_name: item.bill_name,
          item_count: 0,
          boq_total: 0,
          items: [],
        };
      }
      
      const itemTotal = (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0));
      sections[key].item_count++;
      sections[key].boq_total += itemTotal;
      sections[key].items.push(item);
    });
    
    return Object.values(sections).sort((a, b) => 
      a.section_code.localeCompare(b.section_code)
    );
  }, [boqItems]);

  // Calculate reconciliation status per section
  const reconciliationStatus = useMemo((): Record<string, ReconciliationStatus> => {
    const status: Record<string, ReconciliationStatus> = {};
    
    // Map imported items by source BOQ item ID
    const importedBySourceId = new Map<string, any>();
    importedItems.forEach(item => {
      if (item.source_boq_item_id) {
        importedBySourceId.set(item.source_boq_item_id, item);
      }
    });
    
    sectionSummaries.forEach(section => {
      let rebuilt_total = 0;
      let imported_count = 0;
      
      section.items.forEach(boqItem => {
        const importedItem = importedBySourceId.get(boqItem.id);
        if (importedItem) {
          imported_count++;
          rebuilt_total += Number(importedItem.contract_amount || 0);
        }
      });
      
      const boq_total = section.boq_total;
      const match_percentage = boq_total > 0 
        ? Math.min(100, (rebuilt_total / boq_total) * 100)
        : (imported_count > 0 ? 100 : 0);
      
      status[section.section_code] = {
        imported: imported_count > 0,
        rebuilt_total,
        match_percentage,
        item_count: imported_count,
      };
    });
    
    return status;
  }, [sectionSummaries, importedItems]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalBoqAmount = sectionSummaries.reduce((sum, s) => sum + s.boq_total, 0);
    const totalRebuiltAmount = Object.values(reconciliationStatus).reduce(
      (sum, s) => sum + s.rebuilt_total, 0
    );
    
    const percentageMatched = totalBoqAmount > 0 
      ? (totalRebuiltAmount / totalBoqAmount) * 100 
      : 0;
    
    const sectionsImported = Object.values(reconciliationStatus).filter(s => s.imported).length;
    
    return {
      totalBoqAmount,
      totalRebuiltAmount,
      percentageMatched,
      sectionsImported,
      totalSections: sectionSummaries.length,
      variance: totalRebuiltAmount - totalBoqAmount,
    };
  }, [sectionSummaries, reconciliationStatus]);

  // Import single section mutation
  const importSectionMutation = useMutation({
    mutationFn: async (sectionCode: string) => {
      const section = sectionSummaries.find(s => s.section_code === sectionCode);
      if (!section) throw new Error("Section not found");
      
      const items = section.items.filter(item => !item.is_rate_only);
      if (items.length === 0) throw new Error("No items to import in this section");
      
      // Create or get bill
      const billNumber = section.bill_number || 1;
      const { data: existingBill } = await supabase
        .from("final_account_bills")
        .select("id")
        .eq("final_account_id", accountId)
        .eq("bill_number", billNumber)
        .maybeSingle();

      let billId: string;
      if (existingBill) {
        billId = existingBill.id;
      } else {
        const { data: newBill, error: billError } = await supabase
          .from("final_account_bills")
          .insert({
            final_account_id: accountId,
            bill_number: billNumber,
            bill_name: section.bill_name || `Bill ${billNumber}`,
          })
          .select()
          .single();
        if (billError) throw billError;
        billId = newBill.id;
      }

      // Create or get section
      const { data: existingSection } = await supabase
        .from("final_account_sections")
        .select("id")
        .eq("bill_id", billId)
        .eq("section_code", sectionCode)
        .maybeSingle();

      let sectionId: string;
      if (existingSection) {
        sectionId = existingSection.id;
      } else {
        const { data: newSection, error: sectionError } = await supabase
          .from("final_account_sections")
          .insert({
            bill_id: billId,
            section_code: sectionCode,
            section_name: section.section_name,
            display_order: sectionCode.charCodeAt(0) - 64,
          })
          .select()
          .single();
        if (sectionError) throw sectionError;
        sectionId = newSection.id;
      }

      // Get max display order
      const { data: maxOrderData } = await supabase
        .from("final_account_items")
        .select("display_order")
        .eq("section_id", sectionId)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let displayOrder = (maxOrderData?.display_order || 0) + 1;

      // Check which items are already imported
      const existingSourceIds = importedItems
        .filter(i => i.source_boq_item_id)
        .map(i => i.source_boq_item_id);
      
      const newItems = items.filter(item => !existingSourceIds.includes(item.id));
      
      if (newItems.length === 0) {
        return { imported: 0, skipped: items.length };
      }

      // Insert items
      const itemsToInsert = newItems.map((item) => ({
        section_id: sectionId,
        item_code: item.item_code || "",
        description: item.item_description,
        unit: item.unit || "Nr",
        contract_quantity: item.quantity || 0,
        final_quantity: 0,
        supply_rate: item.supply_rate || 0,
        install_rate: item.install_rate || 0,
        contract_amount: (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0)),
        final_amount: 0,
        display_order: displayOrder++,
        source_boq_item_id: item.id,
      }));

      const { error: itemsError } = await supabase
        .from("final_account_items")
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      return { imported: newItems.length, skipped: items.length - newItems.length };
    },
    onSuccess: (result, sectionCode) => {
      queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      refetchImported();
      
      if (result.skipped > 0) {
        toast.success(`Imported ${result.imported} items (${result.skipped} already existed)`);
      } else {
        toast.success(`Imported ${result.imported} items from Section ${sectionCode}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import section");
    },
  });

  const handleImportSection = async (sectionCode: string) => {
    setProcessing(true);
    setSelectedSection(sectionCode);
    try {
      await importSectionMutation.mutateAsync(sectionCode);
    } finally {
      setProcessing(false);
      setSelectedSection(null);
    }
  };

  const handleImportAll = async () => {
    setProcessing(true);
    const pendingSections = sectionSummaries.filter(
      s => !reconciliationStatus[s.section_code]?.imported
    );
    
    for (const section of pendingSections) {
      setSelectedSection(section.section_code);
      try {
        await importSectionMutation.mutateAsync(section.section_code);
      } catch (error) {
        console.error(`Failed to import section ${section.section_code}:`, error);
      }
    }
    
    setProcessing(false);
    setSelectedSection(null);
    toast.success("All sections imported");
  };

  const handleClose = () => {
    setSelectedBoqId(null);
    setSelectedSection(null);
    onOpenChange(false);
  };

  const getStatusIcon = (status: ReconciliationStatus | undefined, boqTotal: number) => {
    if (!status?.imported) {
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
    
    const diff = Math.abs(status.match_percentage - 100);
    if (diff < 0.01) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (diff < 5) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>BOQ Section Reconciliation</DialogTitle>
          <DialogDescription>
            {!selectedBoqId 
              ? "Select a BOQ to begin section-by-section reconciliation"
              : "Import sections one at a time and verify costs match the original BOQ"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedBoqId ? (
            // BOQ Selection
            <ScrollArea className="flex-1">
              {loadingUploads ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : boqUploads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No BOQ uploads found for this project.</p>
                  <p className="text-sm mt-2">Upload a BOQ in the Master Library first.</p>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  {boqUploads.map((boq) => (
                    <div
                      key={boq.id}
                      onClick={() => setSelectedBoqId(boq.id)}
                      className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{boq.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {boq.total_items_extracted || 0} items • {format(new Date(boq.created_at), "MMM d, yyyy")}
                          </p>
                          {boq.contractor_name && (
                            <p className="text-sm text-muted-foreground">
                              Contractor: {boq.contractor_name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            // Section Reconciliation View
            <>
              {/* Progress Summary */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Reconciliation Progress</p>
                    <p className="text-2xl font-bold">
                      {overallProgress.percentageMatched.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {overallProgress.sectionsImported} / {overallProgress.totalSections} sections
                    </p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span>BOQ: {formatCurrency(overallProgress.totalBoqAmount)}</span>
                      <span>Rebuilt: {formatCurrency(overallProgress.totalRebuiltAmount)}</span>
                    </div>
                  </div>
                </div>
                <Progress value={overallProgress.percentageMatched} className="h-2" />
                {overallProgress.variance !== 0 && (
                  <p className={`text-sm ${overallProgress.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Variance: {formatCurrency(overallProgress.variance)}
                  </p>
                )}
              </div>

              {/* Section List */}
              <ScrollArea className="flex-1">
                {loadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionSummaries.map((section) => {
                      const status = reconciliationStatus[section.section_code];
                      const isProcessing = processing && selectedSection === section.section_code;
                      
                      return (
                        <div
                          key={section.section_code}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(status, section.boq_total)}
                              <div>
                                <p className="font-medium">
                                  Section {section.section_code} - {section.section_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {section.item_count} items • BOQ Total: {formatCurrency(section.boq_total)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {status?.imported && (
                                <div className="text-right text-sm">
                                  <p className="text-muted-foreground">Rebuilt</p>
                                  <p className={`font-medium ${
                                    Math.abs(status.match_percentage - 100) < 0.01 
                                      ? 'text-green-600' 
                                      : 'text-yellow-600'
                                  }`}>
                                    {formatCurrency(status.rebuilt_total)}
                                    <span className="ml-1 text-xs">
                                      ({status.match_percentage.toFixed(1)}%)
                                    </span>
                                  </p>
                                </div>
                              )}
                              
                              {!status?.imported ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleImportSection(section.section_code)}
                                  disabled={processing}
                                >
                                  {isProcessing ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Importing...
                                    </>
                                  ) : (
                                    "Import Section"
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleImportSection(section.section_code)}
                                  disabled={processing}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Refresh
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          
          {selectedBoqId && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedBoqId(null)}
              >
                Change BOQ
              </Button>
              <Button
                onClick={handleImportAll}
                disabled={processing || overallProgress.sectionsImported === overallProgress.totalSections}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Import All Remaining"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
