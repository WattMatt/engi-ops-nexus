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
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

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
  rowType?: 'header' | 'subheader' | 'description' | 'item';
}

interface BOQSectionSummary {
  sectionCode: string;
  sectionName: string;
  billNumber: number;
  billName: string;
  itemCount: number;
  boqTotal: number;
  items: ParsedBOQItem[];
  extractionConfidence: 'high' | 'medium' | 'low' | 'failed';
  parseAttempts: number;
  lastParseStrategy?: string;
}

interface ReconciliationStatus {
  imported: boolean;
  rebuiltTotal: number;
  matchPercentage: number;
  itemCount: number;
}

// Parse number from various formats (South African: "1 234,56" or "R 1 234,56" or standard)
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let str = String(value).trim();
  
  // Remove currency symbol and spaces
  str = str.replace(/^R\s*/i, '').replace(/\s/g, '');
  
  // Handle South African format: comma as decimal separator
  // If there's a comma followed by exactly 2 digits at end, treat as decimal
  if (/,\d{2}$/.test(str)) {
    str = str.replace(/,/g, '.');
  } else {
    // Otherwise remove commas (thousand separators)
    str = str.replace(/,/g, '');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Helper to find columns in a row by matching patterns
function findColumnsInRow(values: string[], patterns: Record<string, RegExp>): Record<string, number> {
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

// Parse section code and name from sheet name
function parseSectionFromSheetName(sheetName: string): { sectionCode: string; sectionName: string; billNumber: number } {
  const trimmed = sheetName.trim();
  
  // Pattern: "1.2 Medium Voltage" -> code: "1.2", name: "Medium Voltage"
  const numericDotPattern = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (numericDotPattern) {
    return {
      sectionCode: numericDotPattern[1],
      sectionName: numericDotPattern[2].trim(),
      billNumber: parseInt(numericDotPattern[1].split('.')[0]) || 1,
    };
  }
  
  // Pattern: "4 Boxer" -> code: "4", name: "Boxer"
  const numericSpacePattern = trimmed.match(/^(\d+)\s+(.+)$/);
  if (numericSpacePattern) {
    return {
      sectionCode: numericSpacePattern[1],
      sectionName: numericSpacePattern[2].trim(),
      billNumber: parseInt(numericSpacePattern[1]) >= 3 ? 2 : 1, // Shops (3+) go to Bill 2
    };
  }
  
  // Pattern: "P&G" or just a name -> code is the name
  return {
    sectionCode: trimmed,
    sectionName: trimmed,
    billNumber: 1,
  };
}

// Parse a single sheet - treat entire sheet as one section
function parseSheetForBOQ(worksheet: XLSX.WorkSheet, sheetName: string): {
  items: ParsedBOQItem[];
  sectionCode: string;
  sectionName: string;
  billNumber: number;
} {
  const items: ParsedBOQItem[] = [];
  
  // Derive section info from sheet name
  const { sectionCode, sectionName, billNumber } = parseSectionFromSheetName(sheetName);
  
  // Get all data from the sheet
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
  
  if (allRows.length === 0) return { items, sectionCode, sectionName, billNumber };
  
  // Patterns for finding column headers (order matters - more specific first)
  const patterns = {
    description: /desc|particular|item\s*description|work\s*description/i,
    quantity: /qty|quantity|qnty/i,
    unit: /^unit$|^uom$/i,
    supplyRate: /supply|material/i,
    installRate: /install|labour|labor/i,
    rate: /^rate$|unit\s*rate|total\s*rate/i,
    amount: /tender\s*price|amount|^total$|value|sum/i,
    itemCode: /^no$|^item$|^code$|^ref$|item\s*no|item\s*code/i,
  };
  
  // Find header row by scanning for column names
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(30, allRows.length); i++) {
    const row = allRows[i];
    const testMap = findColumnsInRow(row, patterns);
    if (testMap.description !== undefined) {
      headerRowIdx = i;
      colMap = testMap;
      console.log(`[BOQ Parse] Found header row at index ${i} in sheet "${sheetName}":`, colMap);
      break;
    }
  }
  
  if (headerRowIdx === -1) {
    console.log(`[BOQ Parse] No header row found in sheet "${sheetName}"`);
    return { items, sectionCode, sectionName, billNumber };
  }
  
  // Process data rows after header - FULL BOQ REPLICA (all rows including headers and descriptions)
  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
    
    // Extract all values from the row
    let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
    const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
    const quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
    const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
    const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
    const totalRate = colMap.rate !== undefined ? parseNumber(row[colMap.rate]) : supplyRate + installRate;
    const amount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : quantity * (totalRate || supplyRate + installRate);
    
    // VALIDATION: Item codes must follow BOQ patterns (e.g., "B1", "B1.2", "C3.4.1")
    // Reject pure numbers like "1.217" which are likely from wrong columns
    if (itemCode && !/^[A-Z]/i.test(itemCode)) {
      console.log(`[BOQ Parse] Invalid item code "${itemCode}" at row ${i} - clearing`);
      itemCode = "";
    }
    
    // Skip completely empty rows (no item code and no description)
    if (!itemCode && !description) continue;
    
    // Skip ONLY totals/subtotals/carried forward lines - check BOTH itemCode and description
    const skipPatterns = [
      /^(sub)?total/i,
      /^carried/i,
      /^brought/i,
      /^to\s+(collection|summary)/i,
      /^page\s+(total|sub)/i,
      /^total\s+to/i,
      /^total\s+carried/i,
      /^section\s+total/i,
      /^bill\s+total/i,
      /^grand\s+total/i,
      /total\s+for\s+section/i,
      /carried\s+to\s+summary/i,
    ];
    
    // Check both itemCode AND description for total patterns
    const textToCheck = `${itemCode} ${description}`.toLowerCase();
    if (skipPatterns.some(pattern => pattern.test(itemCode) || pattern.test(description) || pattern.test(textToCheck))) {
      console.log(`[BOQ Parse] Skipping total/carried row: "${itemCode}" "${description}"`);
      continue;
    }
    
    // Determine the row type for display purposes
    let rowType: 'header' | 'subheader' | 'description' | 'item' = 'item';
    
    // Main section header (e.g., "B1", "B2" with all caps description)
    if (itemCode && /^[A-Z]\d*$/i.test(itemCode) && description === description.toUpperCase() && !unitRaw) {
      rowType = 'header';
    }
    // Description/specification row (no item code, just text, no amounts)
    else if (!itemCode && description && quantity === 0 && amount === 0) {
      rowType = 'description';
    }
    // Sub-item header (e.g., "B2.4", "B3.3.1" with descriptive text but no unit/qty)
    else if (itemCode && /^[A-Z]\d+\.\d+/i.test(itemCode) && !unitRaw && quantity === 0) {
      rowType = 'subheader';
    }
    
    // Log items for debugging
    if (items.length < 10) {
      console.log(`[BOQ Parse] Row ${i} [${rowType}] ${itemCode}: "${description.substring(0, 60)}..." unit=${unitRaw} qty=${quantity} amount=${amount}`);
    }
    
    items.push({
      rowIndex: i,
      itemCode: itemCode || "",
      description: description || "",
      unit: unitRaw || "",
      quantity,
      supplyRate,
      installRate,
      totalRate: totalRate || supplyRate + installRate,
      amount: amount || quantity * (totalRate || supplyRate + installRate),
      sectionCode,
      sectionName,
      billNumber,
      billName: sheetName,
      rowType, // Add row type for styling
    });
  }
  
  // Log section total for verification
  const sectionTotal = items.reduce((sum, item) => sum + item.amount, 0);
  console.log(`[BOQ Parse] Sheet "${sheetName}" -> Section "${sectionCode}: ${sectionName}" with ${items.length} items, Total: R ${sectionTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  return { items, sectionCode, sectionName, billNumber };
}

// Alternative parsing strategy - uses positional column detection for common BOQ layouts
function parseSheetAlternative(worksheet: XLSX.WorkSheet, sheetName: string): {
  items: ParsedBOQItem[];
  sectionCode: string;
  sectionName: string;
  billNumber: number;
} {
  const items: ParsedBOQItem[] = [];
  const { sectionCode, sectionName, billNumber } = parseSectionFromSheetName(sheetName);
  
  // Get all data from the sheet
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
  
  if (allRows.length < 3) return { items, sectionCode, sectionName, billNumber };
  
  console.log(`[BOQ Parse Alt] Trying alternative parsing for sheet "${sheetName}"`);
  
  // Strategy 2: Common BOQ layout - assume fixed positions
  // Col 0: Item Code, Col 1: Description, Col 2: Unit, Col 3: Qty, Col 4+: Rates/Amounts
  // Find first row with data that looks like a BOQ item
  let dataStartRow = 0;
  for (let i = 0; i < Math.min(20, allRows.length); i++) {
    const row = allRows[i];
    // Look for row with item code pattern and description
    if (row[0] && /^[A-Z]\d*\.?/i.test(row[0]) && row[1] && row[1].length > 5) {
      dataStartRow = i;
      console.log(`[BOQ Parse Alt] Found data start at row ${i}`);
      break;
    }
  }
  
  // Process rows with positional assumption
  for (let i = dataStartRow; i < allRows.length; i++) {
    const row = allRows[i];
    
    let itemCode = (row[0] || "").trim();
    const description = (row[1] || "").trim();
    const unit = (row[2] || "").trim();
    const quantity = parseNumber(row[3]);
    
    // Try to find amount in last columns (often column 5, 6, or 7)
    let amount = 0;
    for (let c = row.length - 1; c >= 4; c--) {
      const val = parseNumber(row[c]);
      if (val > 0) {
        amount = val;
        break;
      }
    }
    
    // Skip if no item code and no description
    if (!itemCode && !description) continue;
    
    // Validate item code
    if (itemCode && !/^[A-Z]/i.test(itemCode)) {
      itemCode = "";
    }
    
    // Skip totals
    const textToCheck = `${itemCode} ${description}`.toLowerCase();
    if (/total|carried|brought|summary/i.test(textToCheck)) continue;
    
    items.push({
      rowIndex: i,
      itemCode: itemCode || "",
      description: description || "",
      unit: unit || "",
      quantity,
      supplyRate: 0,
      installRate: 0,
      totalRate: quantity > 0 && amount > 0 ? amount / quantity : 0,
      amount,
      sectionCode,
      sectionName,
      billNumber,
      billName: sheetName,
      rowType: 'item',
    });
  }
  
  console.log(`[BOQ Parse Alt] Alternative parse found ${items.length} items`);
  return { items, sectionCode, sectionName, billNumber };
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
      
      return items?.map(item => ({
        ...item,
        sectionCode: sections?.find(s => s.id === item.section_id)?.section_code
      })) || [];
    },
    enabled: !!accountId && parsedSections.length > 0,
  });

  // Parse BOQ file from storage using XLSX directly - returns parsed sections
  const parseBoqFile = useCallback(async (boq: any): Promise<BOQSectionSummary[]> => {
    setParsingFile(true);
    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(boq.file_path);
      
      if (downloadError) throw downloadError;
      
      // Parse with XLSX
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      console.log(`[BOQ Parse] Workbook has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
      
      // Parse each sheet - each sheet becomes a section
      const sections: BOQSectionSummary[] = [];
      let totalItems = 0;
      
      for (const sheetName of workbook.SheetNames) {
        // Skip summary/cover sheets
        if (/summary|cover|note|qualification|index|contents/i.test(sheetName)) {
          console.log(`[BOQ Parse] Skipping sheet: ${sheetName}`);
          continue;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const { items, sectionCode, sectionName, billNumber } = parseSheetForBOQ(worksheet, sheetName);
        
        const boqTotal = items.reduce((sum, item) => sum + item.amount, 0);
        
        // Calculate extraction confidence based on items found and totals
        let extractionConfidence: 'high' | 'medium' | 'low' | 'failed' = 'failed';
        if (items.length > 0) {
          // High confidence: has items with valid amounts
          const itemsWithAmounts = items.filter(i => i.amount > 0).length;
          const amountRatio = itemsWithAmounts / items.length;
          
          if (amountRatio > 0.5 && boqTotal > 0) {
            extractionConfidence = 'high';
          } else if (amountRatio > 0.2 || items.length > 3) {
            extractionConfidence = 'medium';
          } else {
            extractionConfidence = 'low';
          }
        }
        
        // Include ALL sections, even those with 0 items (for retry)
        sections.push({
          sectionCode,
          sectionName,
          billNumber,
          billName: sheetName,
          itemCount: items.length,
          boqTotal,
          items,
          extractionConfidence,
          parseAttempts: 1,
          lastParseStrategy: 'standard',
        });
        
        totalItems += items.length;
        
        if (items.length === 0) {
          console.log(`[BOQ Parse] Sheet "${sheetName}" has no items - marked for retry`);
        }
      }
      
      // Sort sections: by bill number, then by section code (proper numerical sort)
      const sortedSections = sections.sort((a, b) => {
        if (a.billNumber !== b.billNumber) return a.billNumber - b.billNumber;
        
        // Natural sort for section codes like "1.2", "1.10", "P&G"
        const aParts = a.sectionCode.split('.').map(p => parseInt(p) || 0);
        const bParts = b.sectionCode.split('.').map(p => parseInt(p) || 0);
        
        // Compare each part numerically
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return aVal - bVal;
        }
        
        // Fallback to string comparison for non-numeric codes
        return a.sectionCode.localeCompare(b.sectionCode);
      });
      
      console.log(`[BOQ Parse] Total sections: ${sortedSections.length}, Total items: ${totalItems}`);
      setParsedSections(sortedSections);
      toast.success(`Parsed ${sortedSections.length} sections with ${totalItems} items from BOQ`);
      return sortedSections;
    } catch (error) {
      console.error("Failed to parse BOQ:", error);
      toast.error("Failed to parse BOQ file");
      return [];
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
    
    let successCount = 0;
    const failedSections: string[] = [];
    const skippedSections: string[] = [];
    
    for (const section of parsedSections) {
      // Skip already imported sections
      if (reconciliationStatus[section.sectionCode]?.imported) {
        continue;
      }
      
      setSelectedSection(section.sectionCode);
      
      // Skip sections with no items
      if (section.items.length === 0) {
        skippedSections.push(`${section.sectionCode} (no items)`);
        continue;
      }
      
      try {
        await importSectionMutation.mutateAsync(section.sectionCode);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to import section ${section.sectionCode}:`, error);
        failedSections.push(`${section.sectionCode}: ${error.message || 'Unknown error'}`);
      }
    }
    
    setProcessing(false);
    setSelectedSection(null);
    
    // Show summary
    if (failedSections.length > 0 || skippedSections.length > 0) {
      const messages: string[] = [];
      if (successCount > 0) messages.push(`${successCount} imported`);
      if (skippedSections.length > 0) messages.push(`${skippedSections.length} skipped (no items)`);
      if (failedSections.length > 0) messages.push(`${failedSections.length} failed`);
      toast.warning(`Import complete: ${messages.join(', ')}`);
      
      if (skippedSections.length > 0) {
        console.log("[Import All] Skipped sections:", skippedSections);
      }
      if (failedSections.length > 0) {
        console.log("[Import All] Failed sections:", failedSections);
      }
    } else if (successCount > 0) {
      toast.success(`${successCount} sections imported`);
    } else {
      toast.info("No remaining sections to import");
    }
  };

  // Reprise All - Re-parse BOQ and update ALL sections with fresh data
  const handleRepriseAll = async () => {
    if (!selectedBoqId) return;
    
    setProcessing(true);
    setSelectedSection("Reparsing...");
    
    try {
      // Get the selected BOQ
      const selectedBoq = boqUploads.find(b => b.id === selectedBoqId);
      if (!selectedBoq) throw new Error("BOQ not found");
      
      // Re-parse the BOQ file and get fresh sections directly
      const freshSections = await parseBoqFile(selectedBoq);
      
      if (freshSections.length === 0) {
        toast.error("No sections found in BOQ");
        return;
      }
      
      toast.info(`BOQ re-parsed. Now updating ${freshSections.length} sections...`);
      
      // Track success/failure
      let successCount = 0;
      const failedSections: string[] = [];
      const skippedSections: string[] = [];
      
      // Import all sections using the freshly parsed data
      for (const section of freshSections) {
        setSelectedSection(section.sectionCode);
        
        // Skip sections with no items
        if (section.items.length === 0) {
          console.log(`[Reprise] Skipping section ${section.sectionCode} - no items`);
          skippedSections.push(`${section.sectionCode} (no items)`);
          continue;
        }
        
        try {
          await importSectionMutation.mutateAsync(section.sectionCode);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to update section ${section.sectionCode}:`, error);
          failedSections.push(`${section.sectionCode}: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Show summary
      if (failedSections.length > 0 || skippedSections.length > 0) {
        const messages: string[] = [];
        if (successCount > 0) messages.push(`${successCount} imported`);
        if (skippedSections.length > 0) messages.push(`${skippedSections.length} skipped (no items found)`);
        if (failedSections.length > 0) messages.push(`${failedSections.length} failed`);
        toast.warning(`Import complete: ${messages.join(', ')}`);
        
        // Log details for debugging
        if (skippedSections.length > 0) {
          console.log("[Reprise] Skipped sections:", skippedSections);
        }
        if (failedSections.length > 0) {
          console.log("[Reprise] Failed sections:", failedSections);
        }
      } else {
        toast.success(`All ${successCount} sections reprised with updated items`);
      }
    } catch (error) {
      console.error("Reprise failed:", error);
      toast.error("Failed to reprise sections");
    } finally {
      setProcessing(false);
      setSelectedSection(null);
    }
  };

  // Retry parsing a failed section with alternative strategy
  const handleRetrySection = async (sectionCode: string) => {
    if (!selectedBoqId) return;
    
    setProcessing(true);
    setSelectedSection(sectionCode);
    
    try {
      const selectedBoq = boqUploads.find(b => b.id === selectedBoqId);
      if (!selectedBoq) throw new Error("BOQ not found");
      
      // Download file again
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-uploads")
        .download(selectedBoq.file_path);
      
      if (downloadError) throw downloadError;
      
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      // Find the section to retry
      const sectionToRetry = parsedSections.find(s => s.sectionCode === sectionCode);
      if (!sectionToRetry) throw new Error("Section not found");
      
      const worksheet = workbook.Sheets[sectionToRetry.billName];
      if (!worksheet) throw new Error("Worksheet not found");
      
      // Try alternative parsing strategy
      console.log(`[Retry] Attempting alternative parse for section ${sectionCode}`);
      const altResult = parseSheetAlternative(worksheet, sectionToRetry.billName);
      
      if (altResult.items.length === 0) {
        toast.warning(`Alternative parsing also found no items for ${sectionCode}`);
        return;
      }
      
      if (altResult.items.length > sectionToRetry.items.length) {
        // Alternative found more items - update the section
        const boqTotal = altResult.items.reduce((sum, item) => sum + item.amount, 0);
        
        const updatedSections = parsedSections.map(s => {
          if (s.sectionCode === sectionCode) {
            return {
              ...s,
              items: altResult.items,
              itemCount: altResult.items.length,
              boqTotal,
              extractionConfidence: 'medium' as const,
              parseAttempts: s.parseAttempts + 1,
              lastParseStrategy: 'alternative',
            };
          }
          return s;
        });
        
        setParsedSections(updatedSections);
        toast.success(`Retry found ${altResult.items.length} items (was ${sectionToRetry.items.length})`);
        
        // Auto-import the retried section
        await importSectionMutation.mutateAsync(sectionCode);
      } else {
        toast.info(`Alternative parsing found ${altResult.items.length} items (same or fewer than current ${sectionToRetry.items.length})`);
      }
    } catch (error) {
      console.error("Retry failed:", error);
      toast.error("Failed to retry section parsing");
    } finally {
      setProcessing(false);
      setSelectedSection(null);
    }
  };

  // Retry all failed sections
  const handleRetryAllFailed = async () => {
    const failedSections = parsedSections.filter(s => s.extractionConfidence === 'failed' || s.items.length === 0);
    
    if (failedSections.length === 0) {
      toast.info("No failed sections to retry");
      return;
    }
    
    setProcessing(true);
    let improved = 0;
    
    for (const section of failedSections) {
      setSelectedSection(section.sectionCode);
      try {
        await handleRetrySection(section.sectionCode);
        const updated = parsedSections.find(s => s.sectionCode === section.sectionCode);
        if (updated && updated.items.length > section.items.length) {
          improved++;
        }
      } catch (error) {
        console.error(`Retry failed for ${section.sectionCode}:`, error);
      }
    }
    
    setProcessing(false);
    setSelectedSection(null);
    toast.success(`Retry complete. ${improved} sections improved.`);
  };

  const handleClose = () => {
    setSelectedBoqId(null);
    setSelectedSection(null);
    setParsedSections([]);
    onOpenChange(false);
  };

  const getStatusIcon = (status: ReconciliationStatus | undefined) => {
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
            <>
              {/* Progress Summary with extraction quality */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Import Progress</p>
                    <p className="text-2xl font-bold">
                      {overallProgress.sectionsImported} / {overallProgress.totalSections}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      sections imported
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {/* Extraction quality summary */}
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600">
                        ● {parsedSections.filter(s => s.extractionConfidence === 'high').length} high
                      </span>
                      <span className="text-blue-600">
                        ● {parsedSections.filter(s => s.extractionConfidence === 'medium').length} medium
                      </span>
                      <span className="text-yellow-600">
                        ● {parsedSections.filter(s => s.extractionConfidence === 'low').length} low
                      </span>
                      <span className="text-red-600">
                        ● {parsedSections.filter(s => s.extractionConfidence === 'failed').length} failed
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">extraction confidence</p>
                  </div>
                </div>
                <Progress 
                  value={(overallProgress.sectionsImported / Math.max(1, overallProgress.totalSections)) * 100} 
                  className="h-2 mt-3" 
                />
              </div>

              {/* Section List */}
              <ScrollArea className="flex-1 h-[350px]">
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
                      const hasFailed = section.extractionConfidence === 'failed' || section.items.length === 0;
                      const isLowConfidence = section.extractionConfidence === 'low';
                      
                      return (
                        <div
                          key={`${section.billNumber}-${section.sectionCode}`}
                          className={cn(
                            "p-4 border rounded-lg",
                            hasFailed && "border-red-200 bg-red-50/50",
                            isLowConfidence && !hasFailed && "border-yellow-200 bg-yellow-50/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(status)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    Section {section.sectionCode} - {section.sectionName}
                                  </p>
                                  {/* Confidence badge */}
                                  {section.extractionConfidence === 'high' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">High</span>
                                  )}
                                  {section.extractionConfidence === 'medium' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Medium</span>
                                  )}
                                  {section.extractionConfidence === 'low' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Low</span>
                                  )}
                                  {section.extractionConfidence === 'failed' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">No Data</span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Bill {section.billNumber} • {section.itemCount} items
                                  {section.parseAttempts > 1 && ` • ${section.parseAttempts} attempts`}
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
                              
                              {/* Show Retry button for failed sections */}
                              {hasFailed ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRetrySection(section.sectionCode)}
                                  disabled={processing}
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  {isProcessing ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Retrying...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Retry Parse
                                    </>
                                  )}
                                </Button>
                              ) : !status?.imported ? (
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
              {/* Show Retry Failed button if there are failed sections */}
              {parsedSections.some(s => s.extractionConfidence === 'failed' || s.items.length === 0) && (
                <Button
                  variant="outline"
                  onClick={handleRetryAllFailed}
                  disabled={processing}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed ({parsedSections.filter(s => s.extractionConfidence === 'failed' || s.items.length === 0).length})
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleRepriseAll}
                disabled={processing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprise All
              </Button>
              <Button
                onClick={handleImportAll}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {selectedSection}...
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