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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface UnifiedBOQImportProps {
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
  isPrimeCost?: boolean;
  pcProfitAttendancePercent?: number;
}

interface BOQSectionSummary {
  sectionCode: string;
  sectionName: string;
  billNumber: number;
  billName: string;
  itemCount: number;
  boqTotal: number;
  calculatedTotal: number;
  items: ParsedBOQItem[];
  primeCostItems: ParsedBOQItem[];
}

// ===== PARSING UTILITIES =====

const PRIME_COST_PATTERNS = [
  /prime\s*cost/i,
  /\bP\.?C\.?\b/,
  /provisional\s*sum/i,
  /\bP\.?S\.?\b/,
  /^PC\s+/i,
  /^PS\s+/i,
  /allow(?:ance)?\s+for/i,
  /contingency/i,
  /provisional\s+amount/i,
];

function isPrimeCostItem(description: string, itemCode: string): boolean {
  const textToCheck = `${itemCode} ${description}`;
  return PRIME_COST_PATTERNS.some(pattern => pattern.test(textToCheck));
}

// Detect P&A rows - these reference a parent item and contain a percentage
function detectPARow(description: string, quantity: number): { percentage: number } | null {
  // Common P&A patterns
  const patterns = [
    /allow\s*(?:for\s*)?profit/i,
    /(?:add|allow)\s*(?:for\s*)?(?:P\.?&\.?A\.?|profit)/i,
    /profit\s*(?:and\s*attendance)?/i,
    /(?:P\.?&\.?A\.?)/i,
  ];
  
  if (!patterns.some(p => p.test(description))) return null;
  
  // Extract percentage from description or use quantity
  let percentage = 0;
  
  // Try description first: "10,00%" or "10.00%" or "10%"
  const pctMatch = description.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    percentage = parseFloat(pctMatch[1].replace(',', '.')) || 0;
  }
  
  // Fallback: quantity field often contains the percentage value
  if (!percentage && quantity > 0 && quantity <= 100) {
    percentage = quantity;
  }
  
  return percentage > 0 ? { percentage } : null;
}

// Parse number from various formats
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let str = String(value).trim();
  str = str.replace(/^R\s*/i, '').replace(/\s/g, '');
  
  // South African format: comma as decimal
  if (/,\d{2}$/.test(str)) {
    str = str.replace(/,/g, '.');
  } else {
    str = str.replace(/,/g, '');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Check if row is header/subtotal (should be excluded from totals)
function isHeaderOrSubtotalRow(itemCode: string, description: string): boolean {
  if (!itemCode) return false;
  if (/^[A-Z]$/i.test(itemCode)) return true;
  if (/^[A-Z]\d$/i.test(itemCode)) return true;
  if (/\b(sub)?total\b/i.test(description)) return true;
  if (/\b(carried|brought)\s*(forward|f\/w|fwd)\b/i.test(description)) return true;
  return false;
}

// Find column indices from header row
function findColumnsInRow(values: string[]): Record<string, number> {
  const patterns: Record<string, RegExp> = {
    description: /desc|particular|item\s*description|work\s*description/i,
    quantity: /qty|quantity|qnty/i,
    unit: /^unit$|^uom$/i,
    supplyRate: /supply|material/i,
    installRate: /install|labour|labor/i,
    rate: /^rate$|unit\s*rate|total\s*rate/i,
    amount: /tender\s*price|amount|^total$|value|sum/i,
    itemCode: /^no$|^item$|^code$|^ref$|item\s*no|item\s*code/i,
  };
  
  const colMap: Record<string, number> = {};
  
  values.forEach((val, idx) => {
    const v = (val || "").toLowerCase().trim();
    if (!v || v.startsWith("column_")) return;
    
    for (const [key, pattern] of Object.entries(patterns)) {
      if (colMap[key] === undefined && pattern.test(v)) {
        colMap[key] = idx;
      }
    }
  });
  
  return colMap;
}

// Parse section info from sheet name
function parseSectionFromSheetName(sheetName: string): { sectionCode: string; sectionName: string; billNumber: number } {
  const trimmed = sheetName.trim();
  
  // "1.2 Medium Voltage" -> code: "1.2", name: "Medium Voltage"
  const numericDotPattern = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (numericDotPattern) {
    return {
      sectionCode: numericDotPattern[1],
      sectionName: numericDotPattern[2].trim(),
      billNumber: parseInt(numericDotPattern[1].split('.')[0]) || 1,
    };
  }
  
  // "4 Boxer" -> code: "4", name: "Boxer"
  const numericSpacePattern = trimmed.match(/^(\d+)\s+(.+)$/);
  if (numericSpacePattern) {
    return {
      sectionCode: numericSpacePattern[1],
      sectionName: numericSpacePattern[2].trim(),
      billNumber: parseInt(numericSpacePattern[1]) >= 3 ? 2 : 1,
    };
  }
  
  return { sectionCode: trimmed, sectionName: trimmed, billNumber: 1 };
}

// Main parsing function for a single sheet
function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): BOQSectionSummary {
  const { sectionCode, sectionName, billNumber } = parseSectionFromSheetName(sheetName);
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const allRows: string[][] = [];
  
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? String(cell.v ?? "").trim() : "");
    }
    allRows.push(row);
  }
  
  if (allRows.length === 0) {
    return { sectionCode, sectionName, billNumber, billName: sheetName, itemCount: 0, boqTotal: 0, calculatedTotal: 0, items: [], primeCostItems: [] };
  }
  
  // Find header row
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(30, allRows.length); i++) {
    const row = allRows[i];
    const testMap = findColumnsInRow(row);
    if (testMap.description !== undefined) {
      headerRowIdx = i;
      colMap = testMap;
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    return { sectionCode, sectionName, billNumber, billName: sheetName, itemCount: 0, boqTotal: 0, calculatedTotal: 0, items: [], primeCostItems: [] };
  }
  
  const items: ParsedBOQItem[] = [];
  const primeCostTracker: { index: number; item: ParsedBOQItem }[] = [];
  
  // Skip patterns for totals
  const skipPatterns = [
    /^(sub)?total/i, /^carried/i, /^brought/i, /^to\s+(collection|summary)/i,
    /^page\s+(total|sub)/i, /^total\s+to/i, /^total\s+carried/i,
    /^section\s+total/i, /^bill\s+total/i, /^grand\s+total/i,
    /total\s+for\s+section/i, /carried\s+to\s+summary/i,
  ];
  
  // Parse rows
  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
    let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
    const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
    const quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
    const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
    const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
    const totalRate = colMap.rate !== undefined ? parseNumber(row[colMap.rate]) : supplyRate + installRate;
    const parsedAmount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
    const calculatedAmount = quantity * (totalRate || supplyRate + installRate);
    const amount = parsedAmount > 0 ? parsedAmount : calculatedAmount;
    
    // Validate item code
    if (itemCode && !/^[A-Z]/i.test(itemCode)) {
      itemCode = "";
    }
    
    // Skip empty rows
    if (!itemCode && !description) continue;
    
    // Skip totals
    const textToCheck = `${itemCode} ${description}`.toLowerCase();
    if (skipPatterns.some(pattern => pattern.test(itemCode) || pattern.test(description) || pattern.test(textToCheck))) {
      continue;
    }
    
    // Check if this is a Prime Cost item
    const isPrimeC = isPrimeCostItem(description, itemCode);
    
    // Check if this is a P&A row (follows a PC item)
    const paInfo = detectPARow(description, quantity);
    
    if (paInfo && primeCostTracker.length > 0) {
      // Apply P&A percentage to the most recent PC item
      const lastPC = primeCostTracker[primeCostTracker.length - 1];
      lastPC.item.pcProfitAttendancePercent = paInfo.percentage;
      console.log(`[P&A] Applied ${paInfo.percentage}% to PC item at row ${lastPC.index}: ${lastPC.item.description.substring(0, 40)}`);
    }
    
    const item: ParsedBOQItem = {
      rowIndex: i,
      itemCode: itemCode || "",
      description: description || "",
      unit: unitRaw || "",
      quantity,
      supplyRate,
      installRate,
      totalRate: totalRate || supplyRate + installRate,
      amount,
      sectionCode,
      sectionName,
      billNumber,
      billName: sheetName,
      isPrimeCost: isPrimeC,
      pcProfitAttendancePercent: 0,
    };
    
    items.push(item);
    
    // Track PC items for P&A matching
    if (isPrimeC) {
      primeCostTracker.push({ index: i, item });
    }
  }
  
  // Calculate totals excluding headers
  const calculatedTotal = items
    .filter(item => !isHeaderOrSubtotalRow(item.itemCode, item.description))
    .reduce((sum, item) => sum + item.amount, 0);
  
  // Get prime cost items
  const primeCostItems = items.filter(i => i.isPrimeCost);
  
  return {
    sectionCode,
    sectionName,
    billNumber,
    billName: sheetName,
    itemCount: items.length,
    boqTotal: calculatedTotal, // For now, same as calculated
    calculatedTotal,
    items,
    primeCostItems,
  };
}

// ===== MAIN COMPONENT =====

type Phase = 'select' | 'parsed' | 'importing' | 'complete';

export function UnifiedBOQImport({ open, onOpenChange, accountId, projectId }: UnifiedBOQImportProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedBoqId, setSelectedBoqId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [sections, setSections] = useState<BOQSectionSummary[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const queryClient = useQueryClient();

  // Fetch BOQ uploads
  const { data: boqUploads = [], isLoading } = useQuery({
    queryKey: ["boq-uploads-unified", projectId],
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

  // Parse BOQ file
  const handleSelectBoq = useCallback(async (boq: any) => {
    setSelectedBoqId(boq.id);
    setParsing(true);
    
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(boq.file_path);
      
      if (downloadError) throw downloadError;
      
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      const parsedSections: BOQSectionSummary[] = [];
      
      for (const sheetName of workbook.SheetNames) {
        // Skip summary/cover sheets
        if (/summary|cover|note|qualification|index|contents/i.test(sheetName)) {
          continue;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const section = parseSheet(worksheet, sheetName);
        
        if (section.items.length > 0) {
          parsedSections.push(section);
        }
      }
      
      // Sort by bill number then section code
      parsedSections.sort((a, b) => {
        if (a.billNumber !== b.billNumber) return a.billNumber - b.billNumber;
        const aParts = a.sectionCode.split('.').map(p => parseInt(p) || 0);
        const bParts = b.sectionCode.split('.').map(p => parseInt(p) || 0);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          if ((aParts[i] || 0) !== (bParts[i] || 0)) return (aParts[i] || 0) - (bParts[i] || 0);
        }
        return a.sectionCode.localeCompare(b.sectionCode);
      });
      
      setSections(parsedSections);
      setPhase('parsed');
      
      const totalItems = parsedSections.reduce((sum, s) => sum + s.itemCount, 0);
      const totalPC = parsedSections.reduce((sum, s) => sum + s.primeCostItems.length, 0);
      toast.success(`Parsed ${parsedSections.length} sections with ${totalItems} items (${totalPC} Prime Costs)`);
      
    } catch (error) {
      console.error("Failed to parse BOQ:", error);
      toast.error("Failed to parse BOQ file");
    } finally {
      setParsing(false);
    }
  }, []);

  // Import all sections
  const handleImportAll = async () => {
    if (sections.length === 0) return;
    
    setPhase('importing');
    setImportProgress({ current: 0, total: sections.length });
    
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      setImportProgress({ current: i + 1, total: sections.length });
      
      try {
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

        // Create or replace section
        const { data: existingSection } = await supabase
          .from("final_account_sections")
          .select("id")
          .eq("bill_id", billId)
          .eq("section_code", section.sectionCode)
          .maybeSingle();

        let sectionId: string;
        if (existingSection) {
          await supabase.from("final_account_items").delete().eq("section_id", existingSection.id);
          sectionId = existingSection.id;
          await supabase.from("final_account_sections")
            .update({ section_name: section.sectionName })
            .eq("id", sectionId);
        } else {
          const { data: newSection, error: sectionError } = await supabase
            .from("final_account_sections")
            .insert({
              bill_id: billId,
              section_code: section.sectionCode,
              section_name: section.sectionName,
              display_order: section.sectionCode.charCodeAt(0) - 64,
            })
            .select()
            .single();
          if (sectionError) throw sectionError;
          sectionId = newSection.id;
        }

        // Insert items
        const itemsToInsert = section.items.map((item, index) => {
          const isHeader = isHeaderOrSubtotalRow(item.itemCode, item.description);
          const amount = isHeader ? 0 : item.amount;
          
          return {
            section_id: sectionId,
            item_code: item.itemCode || "",
            description: item.description,
            unit: item.unit || "",
            contract_quantity: isHeader ? 0 : item.quantity,
            final_quantity: 0,
            supply_rate: isHeader ? 0 : item.supplyRate,
            install_rate: isHeader ? 0 : item.installRate,
            contract_amount: amount,
            final_amount: 0,
            display_order: index + 1,
            is_prime_cost: item.isPrimeCost || false,
            pc_allowance: item.isPrimeCost ? amount : 0,
            pc_actual_cost: 0,
            pc_profit_attendance_percent: item.pcProfitAttendancePercent || 0,
          };
        });

        const { error: itemsError } = await supabase
          .from("final_account_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // Update section totals
        await supabase
          .from("final_account_sections")
          .update({
            contract_total: section.calculatedTotal,
            boq_stated_total: section.boqTotal,
            final_total: 0,
          })
          .eq("id", sectionId);

        successCount++;
      } catch (error) {
        console.error(`Failed to import section ${section.sectionCode}:`, error);
        failedCount++;
      }
    }
    
    // Update source reference
    if (selectedBoqId) {
      await supabase
        .from("final_accounts")
        .update({ source_boq_upload_id: selectedBoqId })
        .eq("id", accountId);
    }
    
    queryClient.invalidateQueries({ queryKey: ["final-account-bills"] });
    queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
    queryClient.invalidateQueries({ queryKey: ["final-account-items"] });
    
    setImportResult({ success: successCount, failed: failedCount });
    setPhase('complete');
  };

  // Computed values
  const totals = useMemo(() => {
    const totalItems = sections.reduce((sum, s) => sum + s.itemCount, 0);
    const totalAmount = sections.reduce((sum, s) => sum + s.calculatedTotal, 0);
    const totalPC = sections.reduce((sum, s) => sum + s.primeCostItems.length, 0);
    const pcWithPA = sections.flatMap(s => s.primeCostItems).filter(i => i.pcProfitAttendancePercent > 0).length;
    return { totalItems, totalAmount, totalPC, pcWithPA };
  }, [sections]);

  const handleClose = () => {
    setPhase('select');
    setSelectedBoqId(null);
    setSections([]);
    setExpandedSection(null);
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import BOQ to Final Account</DialogTitle>
          <DialogDescription>
            {phase === 'select' && "Select a BOQ file to parse and import"}
            {phase === 'parsed' && "Review parsed data, then click Import All to proceed"}
            {phase === 'importing' && "Importing sections..."}
            {phase === 'complete' && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Phase: Select BOQ */}
          {phase === 'select' && !parsing && (
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : boqUploads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No BOQ uploads found</p>
                  <p className="text-sm mt-2">Upload a BOQ in the Master Library first</p>
                </div>
              ) : (
                <div className="space-y-2 p-1">
                  {boqUploads.map((boq) => (
                    <div
                      key={boq.id}
                      onClick={() => handleSelectBoq(boq)}
                      className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{boq.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(boq.created_at), "MMM d, yyyy")}
                            {boq.contractor_name && ` • ${boq.contractor_name}`}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {/* Parsing indicator */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Parsing BOQ file...</p>
              <p className="text-sm text-muted-foreground">Extracting sections, items, and Prime Costs</p>
            </div>
          )}

          {/* Phase: Parsed - Show summary and sections */}
          {phase === 'parsed' && (
            <>
              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{sections.length}</p>
                    <p className="text-xs text-muted-foreground">Sections</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totals.totalItems}</p>
                    <p className="text-xs text-muted-foreground">Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totals.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totals.totalPC}</p>
                    <p className="text-xs text-muted-foreground">Prime Costs ({totals.pcWithPA} with P&A)</p>
                  </div>
                </div>
              </div>

              {/* Sections list */}
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {sections.map((section) => (
                    <div key={`${section.billNumber}-${section.sectionCode}`} className="border rounded-lg overflow-hidden">
                      <div
                        onClick={() => setExpandedSection(expandedSection === section.sectionCode ? null : section.sectionCode)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {expandedSection === section.sectionCode ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{section.sectionCode}</span>
                          <span className="text-muted-foreground">- {section.sectionName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{section.itemCount} items</span>
                          <span className="font-medium">{formatCurrency(section.calculatedTotal)}</span>
                          {section.primeCostItems.length > 0 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              {section.primeCostItems.length} PC
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded section details */}
                      {expandedSection === section.sectionCode && (
                        <div className="bg-muted/30 p-3 border-t">
                          <div className="max-h-[200px] overflow-auto space-y-1 text-xs">
                            {section.items.slice(0, 25).map((item, idx) => (
                              <div 
                                key={idx} 
                                className={cn(
                                  "flex justify-between gap-2 py-1 px-2 rounded",
                                  isHeaderOrSubtotalRow(item.itemCode, item.description) 
                                    ? "bg-muted text-muted-foreground italic" 
                                    : "bg-background",
                                  item.isPrimeCost ? "border-l-2 border-blue-500" : ""
                                )}
                              >
                                <span className="flex-1 truncate">
                                  <span className="font-mono text-muted-foreground mr-2">{item.itemCode || '-'}</span>
                                  {item.description.substring(0, 60)}
                                  {item.isPrimeCost && (
                                    <span className="ml-2 text-blue-600">
                                      [PC: {item.pcProfitAttendancePercent || 0}% P&A]
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium shrink-0">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))}
                            {section.items.length > 25 && (
                              <p className="text-muted-foreground py-1 text-center">
                                ...and {section.items.length - 25} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Prime Cost warning */}
              {totals.totalPC > 0 && totals.pcWithPA < totals.totalPC && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {totals.totalPC - totals.pcWithPA} of {totals.totalPC} Prime Cost items have 0% P&A. 
                      You may need to manually update these after import.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Phase: Importing */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-muted stroke-current" strokeWidth="8" fill="transparent" r="56" cx="64" cy="64" />
                  <circle
                    className="text-primary stroke-current transition-all duration-300"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - importProgress.current / Math.max(importProgress.total, 1))}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {Math.round((importProgress.current / Math.max(importProgress.total, 1)) * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-lg font-medium">
                Importing {importProgress.current} of {importProgress.total} sections
              </p>
            </div>
          )}

          {/* Phase: Complete */}
          {phase === 'complete' && importResult && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                importResult.failed === 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertCircle className="h-10 w-10 text-amber-600" />
                )}
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">
                  {importResult.failed === 0 ? 'Import Successful!' : 'Import Completed with Issues'}
                </p>
                <p className="text-muted-foreground mt-2">
                  Imported <strong>{importResult.success}</strong> of{' '}
                  <strong>{importResult.success + importResult.failed}</strong> sections
                </p>
                {importResult.failed > 0 && (
                  <p className="text-amber-600 text-sm mt-1">
                    {importResult.failed} section(s) failed
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {phase === 'complete' ? 'Done' : 'Cancel'}
          </Button>
          
          {phase === 'parsed' && (
            <Button onClick={handleImportAll} disabled={sections.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import All ({sections.length} sections)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
