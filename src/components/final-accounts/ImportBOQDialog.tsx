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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, FileSpreadsheet, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ImportBOQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  projectId: string;
}

type ImportStep = "select-boq" | "configure" | "preview";

interface BOQSection {
  section_code: string;
  section_name: string;
  bill_number: number | null;
  bill_name: string | null;
  items: any[];
}

export function ImportBOQDialog({ open, onOpenChange, accountId, projectId }: ImportBOQDialogProps) {
  const [step, setStep] = useState<ImportStep>("select-boq");
  const [selectedBoqId, setSelectedBoqId] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<"contract" | "both">("contract");
  const [includeRateOnly, setIncludeRateOnly] = useState(false);
  const queryClient = useQueryClient();

  // Fetch BOQ uploads for this project
  const { data: boqUploads = [], isLoading: loadingUploads } = useQuery({
    queryKey: ["boq-uploads", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_uploads")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "completed")
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

  // Group items by section
  const groupedSections = useMemo(() => {
    const sections: Record<string, BOQSection> = {};
    
    boqItems.forEach((item) => {
      const key = item.section_code || "UNASSIGNED";
      if (!sections[key]) {
        sections[key] = {
          section_code: item.section_code || "UNASSIGNED",
          section_name: item.section_name || "Unassigned Items",
          bill_number: item.bill_number,
          bill_name: item.bill_name,
          items: [],
        };
      }
      sections[key].items.push(item);
    });
    
    return Object.values(sections).sort((a, b) => 
      a.section_code.localeCompare(b.section_code)
    );
  }, [boqItems]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = boqItems.filter((item) => {
        const key = item.section_code || "UNASSIGNED";
        if (!selectedSections.has(key)) return false;
        if (!includeRateOnly && item.is_rate_only) return false;
        return true;
      });

      if (selectedItems.length === 0) {
        throw new Error("No items to import");
      }

      // Group items by bill and section for creation
      const billMap: Record<string, { billNumber: number; billName: string; sections: Record<string, any[]> }> = {};
      
      selectedItems.forEach((item) => {
        const billKey = `${item.bill_number || 1}`;
        if (!billMap[billKey]) {
          billMap[billKey] = {
            billNumber: item.bill_number || 1,
            billName: item.bill_name || `Bill ${item.bill_number || 1}`,
            sections: {},
          };
        }
        const sectionKey = item.section_code || "UNASSIGNED";
        if (!billMap[billKey].sections[sectionKey]) {
          billMap[billKey].sections[sectionKey] = [];
        }
        billMap[billKey].sections[sectionKey].push(item);
      });

      // Create bills, sections, and items
      for (const [, billData] of Object.entries(billMap)) {
        // Create or get bill
        const { data: existingBill } = await supabase
          .from("final_account_bills")
          .select("id")
          .eq("final_account_id", accountId)
          .eq("bill_number", billData.billNumber)
          .maybeSingle();

        let billId: string;
        if (existingBill) {
          billId = existingBill.id;
        } else {
          const { data: newBill, error: billError } = await supabase
            .from("final_account_bills")
            .insert({
              final_account_id: accountId,
              bill_number: billData.billNumber,
              bill_name: billData.billName,
            })
            .select()
            .single();
          if (billError) throw billError;
          billId = newBill.id;
        }

        // Create sections and items
        for (const [sectionCode, items] of Object.entries(billData.sections)) {
          const sectionName = items[0]?.section_name || sectionCode;
          
          // Check if section exists
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
                section_name: sectionName,
                display_order: sectionCode.charCodeAt(0) - 64,
              })
              .select()
              .single();
            if (sectionError) throw sectionError;
            sectionId = newSection.id;
          }

          // Get max display order for items
          const { data: maxOrderData } = await supabase
            .from("final_account_items")
            .select("display_order")
            .eq("section_id", sectionId)
            .order("display_order", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          let displayOrder = (maxOrderData?.display_order || 0) + 1;

          // Insert items
          const itemsToInsert = items.map((item) => ({
            section_id: sectionId,
            item_code: item.item_code || "",
            description: item.item_description,
            unit: item.unit || "Nr",
            contract_quantity: item.quantity || 0,
            final_quantity: importMode === "both" ? (item.quantity || 0) : 0,
            supply_rate: item.supply_rate || 0,
            install_rate: item.install_rate || 0,
            contract_amount: (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0)),
            final_amount: importMode === "both" 
              ? (item.quantity || 0) * ((item.supply_rate || 0) + (item.install_rate || 0))
              : 0,
            display_order: displayOrder++,
            source_boq_item_id: item.id,
          }));

          const { error: itemsError } = await supabase
            .from("final_account_items")
            .insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
      }

      // Update final account with source BOQ reference
      await supabase
        .from("final_accounts")
        .update({ source_boq_upload_id: selectedBoqId })
        .eq("id", accountId);

      return selectedItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      toast.success(`Imported ${count} items from BOQ`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import BOQ");
    },
  });

  const handleClose = () => {
    setStep("select-boq");
    setSelectedBoqId(null);
    setSelectedSections(new Set());
    setImportMode("contract");
    setIncludeRateOnly(false);
    onOpenChange(false);
  };

  const toggleSection = (sectionCode: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionCode)) {
      newSelected.delete(sectionCode);
    } else {
      newSelected.add(sectionCode);
    }
    setSelectedSections(newSelected);
  };

  const selectAllSections = () => {
    setSelectedSections(new Set(groupedSections.map(s => s.section_code)));
  };

  const deselectAllSections = () => {
    setSelectedSections(new Set());
  };

  const totalSelectedItems = useMemo(() => {
    return boqItems.filter((item) => {
      const key = item.section_code || "UNASSIGNED";
      if (!selectedSections.has(key)) return false;
      if (!includeRateOnly && item.is_rate_only) return false;
      return true;
    }).length;
  }, [boqItems, selectedSections, includeRateOnly]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from BOQ</DialogTitle>
          <DialogDescription>
            {step === "select-boq" && "Select a BOQ upload to import into your Final Account"}
            {step === "configure" && "Select sections and configure import options"}
            {step === "preview" && "Review and confirm the import"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "select-boq" && (
            <ScrollArea className="h-[400px] pr-4">
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
                <div className="space-y-2">
                  {boqUploads.map((boq) => (
                    <div
                      key={boq.id}
                      onClick={() => setSelectedBoqId(boq.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedBoqId === boq.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{boq.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {boq.total_items_extracted || 0} items extracted • {format(new Date(boq.created_at), "MMM d, yyyy")}
                          </p>
                          {boq.contractor_name && (
                            <p className="text-sm text-muted-foreground">
                              Contractor: {boq.contractor_name}
                            </p>
                          )}
                        </div>
                        {selectedBoqId === boq.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {step === "configure" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Sections to Import</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllSections}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAllSections}>
                      Deselect All
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupedSections.map((section) => (
                        <div
                          key={section.section_code}
                          className="flex items-center space-x-3 py-2 px-2 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            id={section.section_code}
                            checked={selectedSections.has(section.section_code)}
                            onCheckedChange={() => toggleSection(section.section_code)}
                          />
                          <label
                            htmlFor={section.section_code}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <span className="font-medium">
                              Section {section.section_code}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              - {section.section_name}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {section.items.length} items
                            </Badge>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Import Mode</Label>
                <RadioGroup
                  value={importMode}
                  onValueChange={(v) => setImportMode(v as "contract" | "both")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="contract" id="contract" />
                    <Label htmlFor="contract" className="cursor-pointer">
                      Contract data only (final quantities start at 0)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="cursor-pointer">
                      Copy to both contract and final
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rate-only"
                  checked={includeRateOnly}
                  onCheckedChange={(checked) => setIncludeRateOnly(!!checked)}
                />
                <Label htmlFor="rate-only" className="cursor-pointer text-sm">
                  Include rate-only items (items without quantities)
                </Label>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sections to import:</span>
                  <span className="font-medium">{selectedSections.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total items:</span>
                  <span className="font-medium">{totalSelectedItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Import mode:</span>
                  <span className="font-medium">
                    {importMode === "contract" ? "Contract data only" : "Contract & Final"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate-only items:</span>
                  <span className="font-medium">{includeRateOnly ? "Included" : "Excluded"}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>This will create:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Bills for each unique bill number in the BOQ</li>
                  <li>Sections matching the BOQ section codes</li>
                  <li>Line items with contract quantities and rates from the BOQ</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step !== "select-boq" && (
              <Button
                variant="ghost"
                onClick={() => setStep(step === "preview" ? "configure" : "select-boq")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === "select-boq" && (
              <Button
                onClick={() => setStep("configure")}
                disabled={!selectedBoqId}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === "configure" && (
              <Button
                onClick={() => setStep("preview")}
                disabled={selectedSections.size === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === "preview" && (
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import {totalSelectedItems} Items
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
