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
  AlertTriangle,
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
  isPrimeCost?: boolean;
  pcProfitAttendancePercent?: number;
}

// Prime Cost detection patterns
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

// Detect if an item is a Prime Cost item
function isPrimeCostItem(description: string, itemCode: string): boolean {
  const textToCheck = `${itemCode} ${description}`;
  return PRIME_COST_PATTERNS.some(pattern => pattern.test(textToCheck));
}

// Extract P&A percentage from description if present (inline in same row)
function extractProfitAttendancePercent(description: string): number {
  // Match patterns like "P&A 10%", "profit and attendance 15%", "10% P&A"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*%\s*(?:P\.?&\.?A\.?|profit\s*(?:and|&)\s*attendance)/i,
    /(?:P\.?&\.?A\.?|profit\s*(?:and|&)\s*attendance)\s*(?:of|at|@)?\s*(\d+(?:\.\d+)?)\s*%/i,
    /plus\s+(\d+(?:\.\d+)?)\s*%/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseFloat(match[1]) || 0;
    }
  }
  return 0;
}

// Detect if this is a P&A row that references another item
// Returns { referencedItemCode, percentage } or null
function detectProfitAttendanceRow(description: string, itemCode: string, quantity: number): { referencedItemCode: string; percentage: number } | null {
  // Patterns like "Allow profit to item B1.1" or "Add P&A to B1.1"
  const patterns = [
    /allow\s*(?:for\s*)?profit\s*(?:and\s*attendance\s*)?(?:to|on|for)\s*(?:item\s*)?([A-Z]\d+(?:\.\d+)*)/i,
    /(?:add|allow)\s*(?:for\s*)?(?:P\.?&\.?A\.?|profit)\s*(?:to|on|for)\s*(?:item\s*)?([A-Z]\d+(?:\.\d+)*)/i,
    /profit\s*(?:and\s*attendance\s*)?(?:to|on|for)\s*(?:item\s*)?([A-Z]\d+(?:\.\d+)*)/i,
    /(?:P\.?&\.?A\.?)\s*(?:to|on|for)\s*(?:item\s*)?([A-Z]\d+(?:\.\d+)*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      // The quantity field often contains the percentage value (e.g., 10 for 10%)
      // Or it might be in the description
      let percentage = quantity || 0;
      
      // Also check if percentage is in description
      const pctMatch = description.match(/(\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) {
        percentage = parseFloat(pctMatch[1]) || percentage;
      }
      
      return {
        referencedItemCode: match[1].toUpperCase(),
        percentage: percentage,
      };
    }
  }
  
  return null;
}

// Apply P&A percentages from separate rows to their parent PC items
function applyProfitAttendanceToItems(items: ParsedBOQItem[]): ParsedBOQItem[] {
  const itemsByCode = new Map<string, ParsedBOQItem>();
  const primeCostItems: { index: number; item: ParsedBOQItem }[] = [];
  const paRows: { index: number; referencedCode: string; percentage: number }[] = [];
  
  // First pass: identify all items, PC items, and P&A rows
  items.forEach((item, index) => {
    if (item.itemCode) {
      itemsByCode.set(item.itemCode.toUpperCase(), item);
    }
    
    // Track prime cost items for position-based fallback matching
    if (item.isPrimeCost) {
      primeCostItems.push({ index, item });
    }
    
    // Check if this is a P&A row
    const paInfo = detectProfitAttendanceRow(item.description, item.itemCode, item.quantity);
    if (paInfo) {
      paRows.push({
        index,
        referencedCode: paInfo.referencedItemCode,
        percentage: paInfo.percentage,
      });
    }
  });
  
  // Second pass: apply P&A percentages to parent items
  for (const paRow of paRows) {
    // First try: match by item code reference
    let parentItem = itemsByCode.get(paRow.referencedCode);
    
    // Fallback: if no match by code, find the nearest preceding prime cost item
    // This handles cases where item codes aren't properly extracted
    if (!parentItem || !parentItem.isPrimeCost) {
      // Find the closest prime cost item before this P&A row
      const precedingPCs = primeCostItems.filter(pc => pc.index < paRow.index);
      if (precedingPCs.length > 0) {
        // Get the most recent PC item (closest one before this P&A row)
        const nearestPC = precedingPCs[precedingPCs.length - 1];
        parentItem = nearestPC.item;
        console.log(`[P&A Fallback] Applied ${paRow.percentage}% from row ${paRow.index} to preceding PC at row ${nearestPC.index}`);
      }
    }
    
    if (parentItem && parentItem.isPrimeCost) {
      parentItem.pcProfitAttendancePercent = paRow.percentage;
    }
  }
  
  return items;
}

// Detect if an item is a header or subtotal row that should be excluded from totals
// These contain aggregated amounts that would cause double-counting
function isHeaderOrSubtotalRow(itemCode: string, description: string): boolean {
  if (!itemCode) return false;
  
  // Single letter codes (A, B, C) - main section headers with section totals
  if (/^[A-Z]$/i.test(itemCode)) return true;
  
  // Two-character codes like A1, B2, C3 - subsection headers with subtotals
  if (/^[A-Z]\d$/i.test(itemCode)) return true;
  
  // Check for "total" or "subtotal" in description
  if (/\b(sub)?total\b/i.test(description)) return true;
  
  // Check for "carried forward" or "brought forward" 
  if (/\b(carried|brought)\s*(forward|f\/w|fwd)\b/i.test(description)) return true;
  
  return false;
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
    // CRITICAL: Use parsed amount from spreadsheet if available, don't recalculate
    // Only calculate if no amount column exists
    const parsedAmount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
    const calculatedAmount = quantity * (totalRate || supplyRate + installRate);
    const amount = parsedAmount > 0 ? parsedAmount : calculatedAmount;
    
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
    
    // Detect Prime Cost items
    const isPrimeC = isPrimeCostItem(description, itemCode);
    const pcPaPercent = isPrimeC ? extractProfitAttendancePercent(description) : 0;
    
    // Log items for debugging
    if (items.length < 10) {
      console.log(`[BOQ Parse] Row ${i} [${rowType}]${isPrimeC ? ' [PC]' : ''} ${itemCode}: "${description.substring(0, 60)}..." unit=${unitRaw} qty=${quantity} amount=${amount}`);
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
      amount, // Use the amount as parsed/calculated above - don't recalculate
      sectionCode,
      sectionName,
      billNumber,
      billName: sheetName,
      rowType, // Add row type for styling
      isPrimeCost: isPrimeC,
      pcProfitAttendancePercent: pcPaPercent,
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
    
    // Detect Prime Cost items
    const isPrimeC = isPrimeCostItem(description, itemCode);
    const pcPaPercent = isPrimeC ? extractProfitAttendancePercent(description) : 0;
    
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
      isPrimeCost: isPrimeC,
      pcProfitAttendancePercent: pcPaPercent,
    });
  }
  
  console.log(`[BOQ Parse Alt] Alternative parse found ${items.length} items`);
  return { items, sectionCode, sectionName, billNumber };
}

type ImportPhase = 'select' | 'review' | 'confirm' | 'importing' | 'complete';

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
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; phase: string } | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>('select');
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [previewSection, setPreviewSection] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; total: number } | null>(null);
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

  // Fetch already imported sections for this account (simplified - just check which sections exist)
  const { data: importedSections = [], refetch: refetchImported } = useQuery({
    queryKey: ["final-account-sections-status", accountId],
    queryFn: async () => {
      // Get all sections with their item counts directly
      const { data: sections, error: sectionsError } = await supabase
        .from("final_account_sections")
        .select(`
          id,
          section_code,
          section_name,
          contract_total,
          bill_id,
          final_account_bills!inner(final_account_id)
        `)
        .eq("final_account_bills.final_account_id", accountId);
      
      if (sectionsError) throw sectionsError;
      
      // Get item counts per section
      const sectionIds = sections?.map(s => s.id) || [];
      if (sectionIds.length === 0) return [];
      
      // Use a more efficient count query
      const { data: itemCounts, error: countError } = await supabase
        .from("final_account_items")
        .select("section_id")
        .in("section_id", sectionIds);
      
      if (countError) throw countError;
      
      // Count items per section
      const countMap: Record<string, number> = {};
      itemCounts?.forEach(item => {
        countMap[item.section_id] = (countMap[item.section_id] || 0) + 1;
      });
      
      return sections?.map(s => ({
        sectionCode: s.section_code,
        sectionName: s.section_name,
        contractTotal: s.contract_total || 0,
        itemCount: countMap[s.id] || 0,
      })) || [];
    },
    enabled: !!accountId,
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
        const parseResult = parseSheetForBOQ(worksheet, sheetName);
        
        // Apply P&A percentages from separate rows to their parent PC items
        const itemsWithPA = applyProfitAttendanceToItems(parseResult.items);
        const { sectionCode, sectionName, billNumber } = parseResult;
        
        // Calculate BOQ total EXCLUDING header/subtotal rows (same filtering used during import)
        // This ensures boqTotal matches what will be stored as contract_total
        const boqTotal = itemsWithPA
          .filter(item => !isHeaderOrSubtotalRow(item.itemCode, item.description))
          .reduce((sum, item) => sum + item.amount, 0);
        
        // Calculate extraction confidence based on items found and totals
        let extractionConfidence: 'high' | 'medium' | 'low' | 'failed' = 'failed';
        if (itemsWithPA.length > 0) {
          // High confidence: has items with valid amounts
          const itemsWithAmounts = itemsWithPA.filter(i => i.amount > 0).length;
          const amountRatio = itemsWithAmounts / itemsWithPA.length;
          
          if (amountRatio > 0.5 && boqTotal > 0) {
            extractionConfidence = 'high';
          } else if (amountRatio > 0.2 || itemsWithPA.length > 3) {
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
          itemCount: itemsWithPA.length,
          boqTotal,
          items: itemsWithPA,
          extractionConfidence,
          parseAttempts: 1,
          lastParseStrategy: 'standard',
        });
        
        totalItems += itemsWithPA.length;
        
        if (itemsWithPA.length === 0) {
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
    const sections = await parseBoqFile(boq);
    // Auto-select all sections with items for import
    const sectionsWithItems = sections.filter(s => s.items.length > 0);
    setSelectedForImport(new Set(sectionsWithItems.map(s => s.sectionCode)));
    setImportPhase('review');
  }, [parseBoqFile]);

  // Calculate reconciliation status per section - use importedSections directly
  const reconciliationStatus = useMemo((): Record<string, ReconciliationStatus> => {
    const status: Record<string, ReconciliationStatus> = {};
    
    // Build map from imported sections data
    const importedByCode: Record<string, { total: number; count: number }> = {};
    importedSections.forEach(section => {
      importedByCode[section.sectionCode] = {
        total: section.contractTotal || 0,
        count: section.itemCount || 0,
      };
    });
    
    parsedSections.forEach(section => {
      const imported = importedByCode[section.sectionCode];
      const rebuiltTotal = imported?.total || 0;
      const itemCount = imported?.count || 0;
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
  }, [parsedSections, importedSections]);

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

      // Insert items - exclude amounts from header/subtotal rows to prevent double-counting
      const itemsToInsert = items.map((item, index) => {
        // Header/subtotal rows contain aggregated amounts - zero them out
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
      
      // Track prime cost items for auto-import to Prime Cost manager
      const primeCostItems = items.filter(item => item.isPrimeCost);
      
      // Calculate actual total from non-header items only (using same filter function)
      const actualTotal = items
        .filter(item => !isHeaderOrSubtotalRow(item.itemCode, item.description))
        .reduce((sum, item) => sum + item.amount, 0);

      const { error: itemsError } = await supabase
        .from("final_account_items")
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Update section totals with actual calculated total (excluding headers)
      // Also store the BOQ stated total for discrepancy tracking
      await supabase
        .from("final_account_sections")
        .update({
          contract_total: actualTotal,
          boq_stated_total: section.boqTotal,
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

  // Proceed to confirmation step
  const handleProceedToConfirm = () => {
    if (selectedForImport.size === 0) {
      toast.warning("Please select at least one section to import");
      return;
    }
    setImportPhase('confirm');
  };

  // Go back to review
  const handleBackToReview = () => {
    setImportPhase('review');
    setImportResults(null);
  };

  // Toggle section selection
  const toggleSectionSelection = (sectionCode: string) => {
    const newSet = new Set(selectedForImport);
    if (newSet.has(sectionCode)) {
      newSet.delete(sectionCode);
    } else {
      newSet.add(sectionCode);
    }
    setSelectedForImport(newSet);
  };

  // Select/Deselect all
  const handleSelectAll = () => {
    const sectionsWithItems = parsedSections.filter(s => s.items.length > 0);
    setSelectedForImport(new Set(sectionsWithItems.map(s => s.sectionCode)));
  };

  const handleDeselectAll = () => {
    setSelectedForImport(new Set());
  };

  const handleImportAll = async () => {
    setProcessing(true);
    setImportPhase('importing');
    
    const sectionsToImport = parsedSections.filter(
      s => selectedForImport.has(s.sectionCode) && s.items.length > 0
    );
    
    if (sectionsToImport.length === 0) {
      toast.info("No sections to import");
      setProcessing(false);
      setImportPhase('review');
      return;
    }
    
    setImportProgress({ current: 0, total: sectionsToImport.length, phase: "Importing" });
    
    let successCount = 0;
    let processed = 0;
    
    for (const section of sectionsToImport) {
      processed++;
      setImportProgress({ current: processed, total: sectionsToImport.length, phase: "Importing" });
      
      try {
        await importSectionMutation.mutateAsync(section.sectionCode);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to import section ${section.sectionCode}:`, error);
      }
    }
    
    setImportProgress(null);
    setProcessing(false);
    setImportResults({ success: successCount, failed: sectionsToImport.length - successCount, total: sectionsToImport.length });
    setImportPhase('complete');
  };

  // Reprise All - Re-parse BOQ and update ALL sections with fresh data
  const handleRepriseAll = async () => {
    if (!selectedBoqId) return;
    
    setProcessing(true);
    setImportProgress({ current: 0, total: 100, phase: "Parsing BOQ" });
    
    try {
      const selectedBoq = boqUploads.find(b => b.id === selectedBoqId);
      if (!selectedBoq) throw new Error("BOQ not found");
      
      const freshSections = await parseBoqFile(selectedBoq);
      
      if (freshSections.length === 0) {
        toast.error("No sections found in BOQ");
        setImportProgress(null);
        setProcessing(false);
        return;
      }
      
      const sectionsWithItems = freshSections.filter(s => s.items.length > 0);
      
      if (sectionsWithItems.length === 0) {
        toast.error("No sections with items found");
        setImportProgress(null);
        setProcessing(false);
        return;
      }
      
      let successCount = 0;
      let processed = 0;
      
      for (const section of sectionsWithItems) {
        processed++;
        setImportProgress({ current: processed, total: sectionsWithItems.length, phase: "Importing" });
        
        try {
          await importSectionMutation.mutateAsync(section.sectionCode);
          successCount++;
        } catch (error: any) {
          console.error(`Failed to update section ${section.sectionCode}:`, error);
        }
      }
      
      setImportProgress(null);
      
      if (successCount === sectionsWithItems.length) {
        toast.success(`All ${successCount} sections imported successfully`);
      } else {
        toast.warning(`${successCount}/${sectionsWithItems.length} sections imported`);
      }
    } catch (error) {
      console.error("Reprise failed:", error);
      toast.error("Failed to reprise sections");
      setImportProgress(null);
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
      
      // Apply P&A percentages to alternative results
      const altItemsWithPA = applyProfitAttendanceToItems(altResult.items);
      
      if (altItemsWithPA.length === 0) {
        toast.warning(`Alternative parsing also found no items for ${sectionCode}`);
        return;
      }
      
      if (altItemsWithPA.length > sectionToRetry.items.length) {
        // Alternative found more items - update the section
        const boqTotal = altItemsWithPA.reduce((sum, item) => sum + item.amount, 0);
        
        const updatedSections = parsedSections.map(s => {
          if (s.sectionCode === sectionCode) {
            return {
              ...s,
              items: altItemsWithPA,
              itemCount: altItemsWithPA.length,
              boqTotal,
              extractionConfidence: 'medium' as const,
              parseAttempts: s.parseAttempts + 1,
              lastParseStrategy: 'alternative',
            };
          }
          return s;
        });
        
        setParsedSections(updatedSections);
        toast.success(`Retry found ${altItemsWithPA.length} items (was ${sectionToRetry.items.length})`);
        
        // Auto-import the retried section
        await importSectionMutation.mutateAsync(sectionCode);
      } else {
        toast.info(`Alternative parsing found ${altItemsWithPA.length} items (same or fewer than current ${sectionToRetry.items.length})`);
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
    setImportPhase('select');
    setSelectedForImport(new Set());
    setPreviewSection(null);
    setImportResults(null);
    onOpenChange(false);
  };

  // Get the description based on current phase
  const getPhaseDescription = () => {
    switch (importPhase) {
      case 'select':
        return "Select a BOQ to begin section-by-section reconciliation";
      case 'review':
        return "Step 1 of 3: Review and select sections to import";
      case 'confirm':
        return "Step 2 of 3: Confirm your selections before importing";
      case 'importing':
        return "Step 3 of 3: Importing selected sections...";
      case 'complete':
        return "Import complete - review results below";
      default:
        return "Import sections one at a time and verify costs match the original BOQ";
    }
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
            {getPhaseDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {selectedBoqId && !parsingFile && (
          <div className="flex items-center justify-center gap-2 pb-2">
            {['Review', 'Confirm', 'Import'].map((step, idx) => {
              const stepPhases: ImportPhase[] = ['review', 'confirm', 'importing'];
              const phaseOrder = { 'select': 0, 'review': 1, 'confirm': 2, 'importing': 3, 'complete': 4 };
              const currentOrder = phaseOrder[importPhase] || 0;
              const stepOrder = idx + 1;
              const isActive = currentOrder === stepOrder;
              const isComplete = currentOrder > stepOrder || importPhase === 'complete';
              
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    isComplete ? "bg-green-500 text-white" :
                    isActive ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isActive || isComplete ? "font-medium" : "text-muted-foreground"
                  )}>
                    {step}
                  </span>
                  {idx < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Phase: Select BOQ */}
          {importPhase === 'select' && !selectedBoqId ? (
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

          /* Phase: Review - Select sections */
          ) : importPhase === 'review' ? (
            <>
              {/* Summary with selection controls */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Select Sections to Import</p>
                    <p className="text-2xl font-bold">
                      {selectedForImport.size} / {parsedSections.filter(s => s.items.length > 0).length} selected
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatCurrency(parsedSections
                        .filter(s => selectedForImport.has(s.sectionCode))
                        .reduce((sum, s) => sum + s.boqTotal, 0)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Selected total</p>
                  </div>
                </div>
                {/* Selection controls */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Sections list with checkboxes */}
              <ScrollArea className="flex-1 h-[300px]">
                {parsedSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No sections found in BOQ.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {parsedSections.map((section) => {
                      const isEmpty = section.items.length === 0;
                      const isSelected = selectedForImport.has(section.sectionCode);
                      const status = reconciliationStatus[section.sectionCode];
                      
                      return (
                        <div
                          key={`${section.billNumber}-${section.sectionCode}`}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded cursor-pointer transition-colors",
                            isEmpty ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50',
                            isSelected && !isEmpty ? 'bg-primary/10 border border-primary/30' : ''
                          )}
                          onClick={() => !isEmpty && toggleSectionSelection(section.sectionCode)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center",
                              isEmpty ? 'border-muted' : 
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                            )}>
                              {isSelected && !isEmpty && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div>
                              <span className="text-sm font-medium">
                                {section.sectionCode} - {section.sectionName}
                              </span>
                              {status?.imported && (
                                <span className="ml-2 text-xs text-amber-600">(will replace existing)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {isEmpty ? (
                                <span className="text-amber-600">No items parsed</span>
                              ) : (
                                <>{section.itemCount} items • {formatCurrency(section.boqTotal)}</>
                              )}
                            </span>
                            {!isEmpty && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewSection(previewSection === section.sectionCode ? null : section.sectionCode);
                                }}
                              >
                                {previewSection === section.sectionCode ? 'Hide' : 'Preview'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Preview panel */}
              {previewSection && (
                <div className="mt-4 border rounded-lg p-3 bg-muted/30 max-h-[150px] overflow-auto">
                  <p className="text-xs font-medium mb-2">Preview: {previewSection}</p>
                  <div className="space-y-1">
                    {parsedSections
                      .find(s => s.sectionCode === previewSection)
                      ?.items.slice(0, 10)
                      .map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="truncate flex-1">{item.itemCode} {item.description.substring(0, 50)}...</span>
                          <span className="ml-2 text-muted-foreground">{formatCurrency(item.amount)}</span>
                        </div>
                      ))
                    }
                    {(parsedSections.find(s => s.sectionCode === previewSection)?.items.length || 0) > 10 && (
                      <p className="text-xs text-muted-foreground">...and more items</p>
                    )}
                  </div>
                </div>
              )}
            </>

          /* Phase: Confirm */
          ) : importPhase === 'confirm' ? (
            <div className="flex flex-col gap-4">
              {/* Validation Summary */}
              {(() => {
                const selectedSections = parsedSections.filter(s => selectedForImport.has(s.sectionCode));
                const totalBoqAmount = selectedSections.reduce((sum, s) => sum + s.boqTotal, 0);
                
                // Calculate per-section validation
                const sectionValidation = selectedSections.map(section => {
                  // Calculate from individual line items (excluding headers/subtotals)
                  const calculatedTotal = section.items
                    .filter(item => !isHeaderOrSubtotalRow(item.itemCode, item.description))
                    .reduce((sum, item) => sum + item.amount, 0);
                  
                  const variance = section.boqTotal - calculatedTotal;
                  const variancePercent = calculatedTotal > 0 ? (variance / calculatedTotal) * 100 : 0;
                  
                  return {
                    ...section,
                    calculatedTotal,
                    variance,
                    variancePercent,
                    hasIssue: Math.abs(variancePercent) > 1, // More than 1% variance is flagged
                  };
                });
                
                const sectionsWithIssues = sectionValidation.filter(s => s.hasIssue);
                const totalCalculated = sectionValidation.reduce((sum, s) => sum + s.calculatedTotal, 0);
                const overallVariance = totalBoqAmount - totalCalculated;

                return (
                  <>
                    {/* Overall Summary */}
                    <div className={cn(
                      "rounded-lg p-4 border",
                      sectionsWithIssues.length > 0 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                        : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    )}>
                      <div className="flex items-start gap-3">
                        {sectionsWithIssues.length > 0 ? (
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            "font-medium",
                            sectionsWithIssues.length > 0 
                              ? "text-red-800 dark:text-red-200"
                              : "text-green-800 dark:text-green-200"
                          )}>
                            {sectionsWithIssues.length > 0 
                              ? `Validation Issues Found (${sectionsWithIssues.length} sections)`
                              : "All Sections Validated Successfully"
                            }
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">BOQ Stated Total</p>
                              <p className="font-bold text-lg">{formatCurrency(totalBoqAmount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Calculated Total</p>
                              <p className="font-bold text-lg">{formatCurrency(totalCalculated)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Variance</p>
                              <p className={cn(
                                "font-bold text-lg",
                                Math.abs(overallVariance) > 100 ? "text-red-600" : "text-green-600"
                              )}>
                                {overallVariance >= 0 ? '+' : ''}{formatCurrency(overallVariance)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section-by-Section Validation Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                        <p className="text-sm font-medium">Section Validation Summary</p>
                        <span className="text-xs text-muted-foreground">
                          {selectedSections.length} sections • {selectedSections.reduce((sum, s) => sum + s.itemCount, 0)} items
                        </span>
                      </div>
                      <ScrollArea className="h-[180px]">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 sticky top-0">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium">Section</th>
                              <th className="text-right py-2 px-3 font-medium">Items</th>
                              <th className="text-right py-2 px-3 font-medium">BOQ Total</th>
                              <th className="text-right py-2 px-3 font-medium">Calculated</th>
                              <th className="text-right py-2 px-3 font-medium">Variance</th>
                              <th className="text-center py-2 px-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionValidation.map((section) => (
                              <tr 
                                key={section.sectionCode}
                                className={cn(
                                  "border-b last:border-0",
                                  section.hasIssue ? "bg-red-50/50 dark:bg-red-950/20" : ""
                                )}
                              >
                                <td className="py-2 px-3">
                                  <span className="font-medium">{section.sectionCode}</span>
                                  <span className="text-muted-foreground ml-1 text-xs truncate max-w-[150px] inline-block align-bottom">
                                    {section.sectionName.substring(0, 20)}
                                  </span>
                                </td>
                                <td className="text-right py-2 px-3 text-muted-foreground">
                                  {section.itemCount}
                                </td>
                                <td className="text-right py-2 px-3">
                                  {formatCurrency(section.boqTotal)}
                                </td>
                                <td className="text-right py-2 px-3">
                                  {formatCurrency(section.calculatedTotal)}
                                </td>
                                <td className={cn(
                                  "text-right py-2 px-3 font-medium",
                                  section.hasIssue ? "text-red-600" : "text-green-600"
                                )}>
                                  {section.variance >= 0 ? '+' : ''}{formatCurrency(section.variance)}
                                  <span className="text-xs ml-1">
                                    ({section.variancePercent >= 0 ? '+' : ''}{section.variancePercent.toFixed(1)}%)
                                  </span>
                                </td>
                                <td className="text-center py-2 px-3">
                                  {section.hasIssue ? (
                                    <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </div>
                  </>
                );
              })()}

              {/* Prime Cost Summary */}
              {(() => {
                const selectedSections = parsedSections.filter(s => selectedForImport.has(s.sectionCode));
                const primeCostItems = selectedSections.flatMap(s => 
                  s.items.filter(i => i.isPrimeCost).map(i => ({
                    ...i,
                    sectionCode: s.sectionCode,
                    sectionName: s.sectionName
                  }))
                );
                
                if (primeCostItems.length === 0) return null;
                
                return (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Prime Cost Items ({primeCostItems.length})
                    </p>
                    <div className="space-y-1 max-h-[100px] overflow-auto">
                      {primeCostItems.map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between gap-2 py-1 border-b border-blue-100 dark:border-blue-900 last:border-0">
                          <span className="truncate flex-1 text-blue-700 dark:text-blue-300">
                            [{item.sectionCode}] {item.description.substring(0, 50)}...
                          </span>
                          <div className="flex gap-3 text-right shrink-0">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {formatCurrency(item.amount)}
                            </span>
                            <span className={item.pcProfitAttendancePercent > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                              P&A: {item.pcProfitAttendancePercent || 0}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {primeCostItems.some(i => !i.pcProfitAttendancePercent) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠ Some PC items have 0% P&A - verify this is correct
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Warning banner */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Importing will replace existing sections with the same codes. Review the validation above before confirming.
                  </p>
                </div>
              </div>
            </div>


          /* Phase: Importing */
          ) : importPhase === 'importing' && importProgress ? (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    className="text-muted stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className="text-primary stroke-current transition-all duration-300"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - importProgress.current / importProgress.total)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">{importProgress.phase}</p>
                <p className="text-sm text-muted-foreground">
                  {importProgress.current} of {importProgress.total} sections
                </p>
              </div>
            </div>

          /* Phase: Complete */
          ) : importPhase === 'complete' && importResults ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                importResults.failed === 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {importResults.failed === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertTriangle className="h-10 w-10 text-amber-600" />
                )}
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">
                  {importResults.failed === 0 ? 'Import Successful!' : 'Import Completed with Issues'}
                </p>
                <p className="text-muted-foreground mt-2">
                  Successfully imported <strong>{importResults.success}</strong> of{' '}
                  <strong>{importResults.total}</strong> sections
                </p>
                {importResults.failed > 0 && (
                  <p className="text-amber-600 text-sm mt-1">
                    {importResults.failed} section(s) failed to import
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 w-full max-w-md">
                <p className="text-sm text-center">
                  You can now close this dialog and review the imported sections in the Bills & Sections tab.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - phase-based */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {importPhase === 'complete' ? 'Done' : 'Cancel'}
          </Button>
          
          {importPhase === 'review' && parsedSections.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBoqId(null);
                  setParsedSections([]);
                  setImportPhase('select');
                }}
              >
                Change BOQ
              </Button>
              <Button
                onClick={handleProceedToConfirm}
                disabled={selectedForImport.size === 0}
              >
                Continue to Confirm ({selectedForImport.size})
              </Button>
            </div>
          )}

          {importPhase === 'confirm' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBackToReview}>
                Back to Review
              </Button>
              <Button onClick={handleImportAll}>
                Confirm & Import
              </Button>
            </div>
          )}

          {importPhase === 'complete' && (
            <Button onClick={handleClose}>
              Close & View Results
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}