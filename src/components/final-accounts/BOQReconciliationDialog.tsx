import { useState, useMemo, useCallback } from "react";
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
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatters";
import { parseExcelFile, detectBOQColumns } from "@/utils/excelParser";

interface BOQReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  projectId: string;
}

interface ParsedBOQItem {
  rowIndex: number;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  supplyRate: number;
  installRate: number;
  totalRate: number;
  amount: number;
  sectionCode: string;
  sectionName: string;
  billNumber: number;
  billName: string;
}

interface BOQSectionSummary {
  sectionCode: string;
  sectionName: string;
  billNumber: number;
  billName: string;
  itemCount: number;
  boqTotal: number;
  items: ParsedBOQItem[];
}

interface ReconciliationStatus {
  imported: boolean;
  rebuiltTotal: number;
  matchPercentage: number;
  itemCount: number;
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
  const [parsedSections, setParsedSections] = useState<BOQSectionSummary[]>([]);
  const [parsingFile, setParsingFile] = useState(false);
  const queryClient = useQueryClient();

  // Fetch BOQ uploads for this project
  const { data: boqUploads = [], isLoading: loadingUploads } = useQuery({
    queryKey: ["boq-uploads-for-reconciliation", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_uploads")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch already imported items for this account
  const { data: importedItems = [], refetch: refetchImported } = useQuery({
    queryKey: ["final-account-all-items", accountId],
    queryFn: async () => {
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
        .select("*, section_id")
        .in("section_id", sectionIds);
      
      if (itemsError) throw itemsError;
      
      // Return items with section info
      return items?.map(item => ({
        ...item,
        sectionCode: sections?.find(s => s.id === item.section_id)?.section_code
      })) || [];
    },
    enabled: !!accountId && parsedSections.length > 0,
  });

  // Parse BOQ file from storage
  const parseBoqFile = useCallback(async (boq: any) => {
    setParsingFile(true);
    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(boq.file_path);
      
      if (downloadError) throw downloadError;
      
      // Create File object and parse
      const file = new File([fileData], boq.file_name, { type: fileData.type });
      const parsed = await parseExcelFile(file);
      
      // Extract sections and items from parsed sheets
      const sections: Record<string, BOQSectionSummary> = {};
      let currentBillNumber = 1;
      let currentBillName = "Bill 1";
      let currentSectionCode = "A";
      let currentSectionName = "General";
      
      for (const sheet of parsed.sheets) {
        // Skip summary/cover sheets
        if (/summary|cover|note|qualification/i.test(sheet.name)) continue;
        
        // Detect columns for this sheet
        const colMap = detectBOQColumns(sheet.headers);
        if (colMap.description === undefined) continue;
        
        // Check if sheet name indicates a bill
        const billMatch = sheet.name.match(/bill\s*(\d+)/i);
        if (billMatch) {
          currentBillNumber = parseInt(billMatch[1]);
          currentBillName = sheet.name;
        }
        
        // Process each row
        for (let rowIdx = 0; rowIdx < sheet.rows.length; rowIdx++) {
          const row = sheet.rows[rowIdx];
          const descCol = sheet.headers[colMap.description!];
          const description = String(row[descCol] || "").trim();
          
          if (!description) continue;
          
          // Check if this is a section header
          const sectionMatch = description.match(/^([A-Z])\.\s*(.+)/i) || 
                              description.match(/^SECTION\s+([A-Z])\s*[:-]?\s*(.+)/i);
          if (sectionMatch) {
            currentSectionCode = sectionMatch[1].toUpperCase();
            currentSectionName = sectionMatch[2].trim();
            continue;
          }
          
          // Skip totals and subtotals
          if (/^(sub)?total|^carried|^brought/i.test(description)) continue;
          
          // Extract item data
          const itemCode = colMap.itemCode !== undefined 
            ? String(row[sheet.headers[colMap.itemCode]] || "").trim() 
            : "";
          const unit = colMap.unit !== undefined 
            ? String(row[sheet.headers[colMap.unit]] || "Nr").trim() 
            : "Nr";
          const quantity = colMap.quantity !== undefined 
            ? parseFloat(String(row[sheet.headers[colMap.quantity]] || 0)) || 0 
            : 0;
          const supplyRate = colMap.supplyRate !== undefined 
            ? parseFloat(String(row[sheet.headers[colMap.supplyRate]] || 0)) || 0 
            : 0;
          const installRate = colMap.installRate !== undefined 
            ? parseFloat(String(row[sheet.headers[colMap.installRate]] || 0)) || 0 
            : 0;
          const totalRate = colMap.totalRate !== undefined 
            ? parseFloat(String(row[sheet.headers[colMap.totalRate]] || 0)) || 0 
            : supplyRate + installRate;
          const amount = colMap.amount !== undefined 
            ? parseFloat(String(row[sheet.headers[colMap.amount]] || 0)) || 0 
            : quantity * totalRate;
          
          // Skip rate-only items (no quantity)
          if (quantity === 0 && amount === 0) continue;
          
          // Create section key
          const sectionKey = `${currentBillNumber}-${currentSectionCode}`;
          
          if (!sections[sectionKey]) {
            sections[sectionKey] = {
              sectionCode: currentSectionCode,
              sectionName: currentSectionName,
              billNumber: currentBillNumber,
              billName: currentBillName,
              itemCount: 0,
              boqTotal: 0,
              items: [],
            };
          }
          
          const item: ParsedBOQItem = {
            rowIndex: rowIdx,
            itemCode,
            description,
            unit,
            quantity,
            supplyRate,
            installRate,
            totalRate: totalRate || supplyRate + installRate,
            amount: amount || quantity * (totalRate || supplyRate + installRate),
            sectionCode: currentSectionCode,
            sectionName: currentSectionName,
            billNumber: currentBillNumber,
            billName: currentBillName,
          };
          
          sections[sectionKey].items.push(item);
          sections[sectionKey].itemCount++;
          sections[sectionKey].boqTotal += item.amount;
        }
      }
      
      const sortedSections = Object.values(sections).sort((a, b) => {
        if (a.billNumber !== b.billNumber) return a.billNumber - b.billNumber;
        return a.sectionCode.localeCompare(b.sectionCode);
      });
      
      setParsedSections(sortedSections);
      toast.success(`Parsed ${sortedSections.length} sections from BOQ`);
    } catch (error) {
      console.error("Failed to parse BOQ:", error);
      toast.error("Failed to parse BOQ file");
    } finally {
      setParsingFile(false);
    }
  }, []);

  // Handle BOQ selection
  const handleSelectBoq = useCallback(async (boq: any) => {
    setSelectedBoqId(boq.id);
    await parseBoqFile(boq);
  }, [parseBoqFile]);

  // Calculate reconciliation status per section
  const reconciliationStatus = useMemo((): Record<string, ReconciliationStatus> => {
    const status: Record<string, ReconciliationStatus> = {};
    
    // Group imported items by section code
    const importedBySection: Record<string, number> = {};
    const itemCountBySection: Record<string, number> = {};
    
    importedItems.forEach(item => {
      const code = item.sectionCode || "UNKNOWN";
      importedBySection[code] = (importedBySection[code] || 0) + Number(item.contract_amount || 0);
      itemCountBySection[code] = (itemCountBySection[code] || 0) + 1;
    });
    
    parsedSections.forEach(section => {
      const rebuiltTotal = importedBySection[section.sectionCode] || 0;
      const itemCount = itemCountBySection[section.sectionCode] || 0;
      const matchPercentage = section.boqTotal > 0 
        ? Math.min(100, (rebuiltTotal / section.boqTotal) * 100)
        : (itemCount > 0 ? 100 : 0);
      
      status[section.sectionCode] = {
        imported: itemCount > 0,
        rebuiltTotal,
        matchPercentage,
        itemCount,
      };
    });
    
    return status;
  }, [parsedSections, importedItems]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalBoqAmount = parsedSections.reduce((sum, s) => sum + s.boqTotal, 0);
    const totalRebuiltAmount = Object.values(reconciliationStatus).reduce(
      (sum, s) => sum + s.rebuiltTotal, 0
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
      totalSections: parsedSections.length,
      variance: totalRebuiltAmount - totalBoqAmount,
    };
  }, [parsedSections, reconciliationStatus]);

  // Import single section mutation
  const importSectionMutation = useMutation({
    mutationFn: async (sectionCode: string) => {
      const section = parsedSections.find(s => s.sectionCode === sectionCode);
      if (!section) throw new Error("Section not found");
      
      const items = section.items;
      if (items.length === 0) throw new Error("No items to import in this section");
      
      // Create or get bill
      const { data: existingBill } = await supabase
        .from("final_account_bills")
        .select("id")
        .eq("final_account_id", accountId)
        .eq("bill_number", section.billNumber)
        .maybeSingle();

      let billId: string;
      if (existingBill) {
        billId = existingBill.id;
      } else {
        const { data: newBill, error: billError } = await supabase
          .from("final_account_bills")
          .insert({
            final_account_id: accountId,
            bill_number: section.billNumber,
            bill_name: section.billName,
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
        // Delete existing items to re-import
        await supabase
          .from("final_account_items")
          .delete()
          .eq("section_id", existingSection.id);
        sectionId = existingSection.id;
        
        // Update section name
        await supabase
          .from("final_account_sections")
          .update({ section_name: section.sectionName })
          .eq("id", sectionId);
      } else {
        const { data: newSection, error: sectionError } = await supabase
          .from("final_account_sections")
          .insert({
            bill_id: billId,
            section_code: sectionCode,
            section_name: section.sectionName,
            display_order: sectionCode.charCodeAt(0) - 64,
          })
          .select()
          .single();
        if (sectionError) throw sectionError;
        sectionId = newSection.id;
      }

      // Insert items
      const itemsToInsert = items.map((item, index) => ({
        section_id: sectionId,
        item_code: item.itemCode || `${sectionCode}${index + 1}`,
        description: item.description,
        unit: item.unit || "Nr",
        contract_quantity: item.quantity,
        final_quantity: 0,
        supply_rate: item.supplyRate,
        install_rate: item.installRate,
        contract_amount: item.amount,
        final_amount: 0,
        display_order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from("final_account_items")
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Update section totals
      await supabase
        .from("final_account_sections")
        .update({
          contract_total: section.boqTotal,
          final_total: 0,
        })
        .eq("id", sectionId);

      return { imported: items.length, sectionCode };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
      refetchImported();
      toast.success(`Imported ${result.imported} items from Section ${result.sectionCode}`);
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
    
    for (const section of parsedSections) {
      setSelectedSection(section.sectionCode);
      try {
        await importSectionMutation.mutateAsync(section.sectionCode);
      } catch (error) {
        console.error(`Failed to import section ${section.sectionCode}:`, error);
      }
    }
    
    setProcessing(false);
    setSelectedSection(null);
    toast.success("All sections imported");
  };

  const handleClose = () => {
    setSelectedBoqId(null);
    setSelectedSection(null);
    setParsedSections([]);
    onOpenChange(false);
  };

  const getStatusIcon = (status: ReconciliationStatus | undefined, boqTotal: number) => {
    if (!status?.imported) {
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
    
    const diff = Math.abs(status.matchPercentage - 100);
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
                      onClick={() => handleSelectBoq(boq)}
                      className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{boq.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(boq.created_at), "MMM d, yyyy")}
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
          ) : parsingFile ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Parsing BOQ file...</p>
            </div>
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
                {parsedSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No sections found in BOQ.</p>
                    <p className="text-sm mt-2">The file may not have recognizable section structure.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parsedSections.map((section) => {
                      const status = reconciliationStatus[section.sectionCode];
                      const isProcessing = processing && selectedSection === section.sectionCode;
                      
                      return (
                        <div
                          key={`${section.billNumber}-${section.sectionCode}`}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(status, section.boqTotal)}
                              <div>
                                <p className="font-medium">
                                  Section {section.sectionCode} - {section.sectionName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Bill {section.billNumber} • {section.itemCount} items • BOQ Total: {formatCurrency(section.boqTotal)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {status?.imported && (
                                <div className="text-right text-sm">
                                  <p className="text-muted-foreground">Rebuilt</p>
                                  <p className={`font-medium ${
                                    Math.abs(status.matchPercentage - 100) < 0.01 
                                      ? 'text-green-600' 
                                      : 'text-yellow-600'
                                  }`}>
                                    {formatCurrency(status.rebuiltTotal)}
                                    <span className="ml-1 text-xs">
                                      ({status.matchPercentage.toFixed(1)}%)
                                    </span>
                                  </p>
                                </div>
                              )}
                              
                              {!status?.imported ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleImportSection(section.sectionCode)}
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
                                  onClick={() => handleImportSection(section.sectionCode)}
                                  disabled={processing}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Re-import
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
          
          {selectedBoqId && !parsingFile && parsedSections.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBoqId(null);
                  setParsedSections([]);
                }}
              >
                Change BOQ
              </Button>
              <Button
                onClick={handleImportAll}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing {selectedSection}...
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