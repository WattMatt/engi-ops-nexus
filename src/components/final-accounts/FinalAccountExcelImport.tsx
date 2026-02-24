import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface FinalAccountExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  projectId: string;
}

interface ParsedItem {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  supply_rate: number;
  install_rate: number;
  amount: number;
  is_prime_cost: boolean;
  item_type: 'MEASURED' | 'PC' | 'PS'; // Database constraint values
}

interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  items: ParsedItem[];
  boqStatedTotal: number; // The stated total from Excel summary row
  _sectionNumber: number; // For ordering
}

interface ParsedBill {
  billNumber: number;
  billName: string;
  sections: ParsedSection[];
}

export function FinalAccountExcelImport({
  open,
  onOpenChange,
  accountId,
  projectId,
}: FinalAccountExcelImportProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  /**
   * Parse section code and name from sheet name
   * CORRECT structure (as per project 636):
   * - "1 Mall Portion", "1.1 P&G", "1.2 Medium Voltage" -> Bill 1 (Mall) with sub-sections
   * - "3 ASJ", "4 Boxer", etc -> SEPARATE bills (Bill 3, Bill 4, etc.)
   */
  const parseSectionFromSheetName = (sheetName: string): { 
    billNumber: number;
    billName: string;
    sectionCode: string; 
    sectionName: string; 
    sectionNumber: number; // For ordering within bill
    isBillHeader: boolean;
  } => {
    const trimmed = sheetName.trim();
    
    // Pattern: "1.2 Medium Voltage" -> Bill 1 (Mall), Section 1.2
    const dottedPattern = trimmed.match(/^(\d+)\.(\d+)\s+(.+)$/);
    if (dottedPattern) {
      const billNum = parseInt(dottedPattern[1]) || 1;
      const subSection = dottedPattern[2];
      return {
        billNumber: billNum,
        billName: billNum === 1 ? "Mall" : `Bill ${billNum}`,
        sectionCode: `${billNum}.${subSection}`,
        sectionName: dottedPattern[3].trim(),
        sectionNumber: parseInt(subSection), // For ordering: 1 = first, 2 = second
        isBillHeader: false,
      };
    }
    
    // Pattern: "1 Mall Portion" -> Bill 1 header (skip, sub-sections provide detail)
    if (/^1\s+(Mall|Portion|Mall\s*Portion)/i.test(trimmed)) {
      return {
        billNumber: 1,
        billName: "Mall",
        sectionCode: "1",
        sectionName: "Mall Portion",
        sectionNumber: 0,
        isBillHeader: true, // Skip
      };
    }
    
    // Pattern: "3 ASJ", "4 Boxer", "2 SUPERSPAR", "3 TOPS", "4 CLICKS" -> SEPARATE BILL with ONE section
    const standalonePattern = trimmed.match(/^(\d+)\s+(.+)$/);
    if (standalonePattern) {
      const billNum = parseInt(standalonePattern[1]);
      const name = standalonePattern[2].trim();
      return {
        billNumber: billNum,
        billName: name, // "SUPERSPAR", "TOPS", "CLICKS", etc.
        sectionCode: String(billNum),
        sectionName: name,
        sectionNumber: 1, // Only section in this bill
        isBillHeader: false,
      };
    }
    
    // Pattern: Standalone tenant names without leading numbers (e.g., "SUPERSPAR", "TOPS", "CLICKS", "Shoprite")
    // These are assigned sequential bill numbers starting from 2
    const knownTenantPatterns: Record<string, number> = {
      'superspar': 2,
      'spar': 2,
      'tops': 3,
      'clicks': 4,
      'shoprite': 5,
      'boxer': 6,
      'woolworths': 7,
      'checkers': 8,
      'pick n pay': 9,
      'game': 10,
    };
    
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [pattern, billNum] of Object.entries(knownTenantPatterns)) {
      if (lowerTrimmed.includes(pattern)) {
        return {
          billNumber: billNum,
          billName: trimmed, // Use original name
          sectionCode: String(billNum),
          sectionName: trimmed,
          sectionNumber: 1,
          isBillHeader: false,
        };
      }
    }
    
    // Pattern: "P&G" standalone -> Bill 1, Section 1.1
    if (/^p\s*&\s*g$/i.test(trimmed) || /^preliminaries$/i.test(trimmed)) {
      return {
        billNumber: 1,
        billName: "Mall",
        sectionCode: "1.1",
        sectionName: "Preliminaries & General",
        sectionNumber: 1,
        isBillHeader: false,
      };
    }
    
    // Pattern: Single letter section name like "A", "B", "C" - could be a section within a bill
    // These are typically subsections and should be handled by the calling context
    if (/^[A-Z]$/i.test(trimmed)) {
      return {
        billNumber: 0,
        billName: "",
        sectionCode: trimmed.toUpperCase(),
        sectionName: `Section ${trimmed.toUpperCase()}`,
        sectionNumber: trimmed.charCodeAt(0) - 64, // A=1, B=2, etc.
        isBillHeader: true, // Skip single letters
      };
    }
    
    // Unrecognized pattern - try to use as standalone bill
    // Check if it looks like a valid tenant/section name (not a system sheet)
    if (trimmed.length > 2 && !/^(sheet|data|config|temp)/i.test(trimmed)) {
      return {
        billNumber: 100, // High number to appear at end
        billName: trimmed,
        sectionCode: "100",
        sectionName: trimmed,
        sectionNumber: 1,
        isBillHeader: false, // Try to include it
      };
    }
    
    // Truly unrecognized - skip
    return {
      billNumber: 0,
      billName: "",
      sectionCode: trimmed,
      sectionName: trimmed,
      sectionNumber: 0,
      isBillHeader: true, // Skip unrecognized
    };
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Detect if a single-sheet workbook contains inline section headers like
   * "SECTION A", "SECTION B - LOW VOLTAGE..." etc.
   * Returns the parsed bills if detected, or null if not.
   */
  const parseSingleSheetWithInlineSections = (workbook: XLSX.WorkBook): ParsedBill[] | null => {
    if (workbook.SheetNames.length > 3) return null; // Multi-sheet format, skip

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
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

    // Detect inline sections by scanning for "SECTION X" patterns
    const sectionIndices: { rowIdx: number; code: string; name: string }[] = [];
    for (let i = 0; i < allRows.length; i++) {
      const joined = allRows[i].join(' ').trim();
      // Match "SECTION A", "SECTION B - LOW VOLTAGE DISTRIBUTION..."
      const sectionMatch = joined.match(/^SECTION\s+([A-Z])\s*[-–:]?\s*(.*)/i);
      if (sectionMatch) {
        sectionIndices.push({
          rowIdx: i,
          code: sectionMatch[1].toUpperCase(),
          name: sectionMatch[2]?.trim() || `Section ${sectionMatch[1].toUpperCase()}`,
        });
      }
    }

    if (sectionIndices.length < 2) return null; // Not an inline-section format

    // Try to extract bill number from header rows (e.g. "BILL NO. 10")
    let billNumber = 1;
    let billName = "Electrical Installation";
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const joined = allRows[i].join(' ').trim();
      const billMatch = joined.match(/BILL\s*(?:NO\.?|NUMBER)\s*(\d+)/i);
      if (billMatch) {
        billNumber = parseInt(billMatch[1]);
      }
      // Extract project/portion name from early rows
      if (/PORTION\s+OF\s+CONTRACT|ELECTRICAL\s+INSTALLATION/i.test(joined) && joined.length > 10) {
        billName = joined.replace(/\s*[-–]\s*$/, '').substring(0, 80);
      }
    }

    console.log(`[Single-Sheet Import] Detected ${sectionIndices.length} inline sections, Bill ${billNumber}`);

    // Find column mapping from the first header row (usually after first SECTION line)
    const patterns: Record<string, RegExp> = {
      description: /desc|particular|^description$/i,
      quantity: /^qty$|^quantity$/i,
      unit: /^unit$|^uom$/i,
      supplyRate: /^supply$/i,
      installRate: /^install$/i,
      amount: /^amount$|^total$/i,
      itemCode: /^item$|^no$|^code$|^ref$/i,
    };

    const findColumnsInRow = (row: string[]): Record<string, number> | null => {
      const colMap: Record<string, number> = {};
      row.forEach((cell, idx) => {
        const cellUpper = cell.toUpperCase().trim();
        for (const [key, pattern] of Object.entries(patterns)) {
          if (pattern.test(cellUpper) && colMap[key] === undefined) {
            colMap[key] = idx;
          }
        }
      });
      return colMap.description !== undefined || colMap.itemCode !== undefined ? colMap : null;
    };

    // Parse items for each section range
    const sections: ParsedSection[] = [];

    for (let si = 0; si < sectionIndices.length; si++) {
      const sectionStart = sectionIndices[si].rowIdx;
      const sectionEnd = si + 1 < sectionIndices.length
        ? sectionIndices[si + 1].rowIdx
        : allRows.length;

      // Also stop at SUMMARY PAGE
      let effectiveEnd = sectionEnd;
      for (let i = sectionStart; i < sectionEnd; i++) {
        const joined = allRows[i].join(' ').trim();
        if (/^SUMMARY\s*PAGE/i.test(joined)) {
          effectiveEnd = i;
          break;
        }
      }

      // Find column header row within this section
      let colMap: Record<string, number> | null = null;
      let headerRowIdx = -1;
      for (let i = sectionStart; i < Math.min(sectionStart + 10, effectiveEnd); i++) {
        colMap = findColumnsInRow(allRows[i]);
        if (colMap) {
          headerRowIdx = i;
          break;
        }
      }

      if (!colMap || headerRowIdx === -1) {
        console.log(`[Single-Sheet Import] No header row found for Section ${sectionIndices[si].code}, skipping`);
        continue;
      }

      const items: ParsedItem[] = [];
      let boqStatedTotal = 0;

      for (let i = headerRowIdx + 1; i < effectiveEnd; i++) {
        const row = allRows[i];
        const itemCode = colMap.itemCode !== undefined ? row[colMap.itemCode]?.trim() || "" : "";
        const description = colMap.description !== undefined ? row[colMap.description]?.trim() || "" : "";
        const unitRaw = colMap.unit !== undefined ? row[colMap.unit]?.trim() || "" : "";
        let quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
        const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
        const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
        let amount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;

        if (!itemCode && !description) continue;

        const textToCheck = `${itemCode} ${description}`.toLowerCase();

        // Skip total/summary rows
        if (/^total|^carried|^brought|^summary|^sub-total|^subtotal|section\s*total|bill\s*total/i.test(textToCheck)) {
          if (amount > 0 && amount > boqStatedTotal) boqStatedTotal = amount;
          continue;
        }

        // Skip single-letter section headers (A, B, C) that are category headers
        const isSectionHeader = /^[A-Z]$/i.test(itemCode) && !unitRaw && quantity === 0 && supplyRate === 0 && installRate === 0;
        if (isSectionHeader) {
          if (amount > boqStatedTotal) boqStatedTotal = amount;
          continue;
        }

        // Skip RATE ONLY items with no amount
        if (/rate\s*only/i.test(String(row[colMap.quantity !== undefined ? colMap.quantity : -1] || "")) && amount === 0) {
          continue;
        }

        // Handle percentage items
        const isPercentageItem = unitRaw === '%' || /add\s*profit|markup|percentage/i.test(description);

        // Smart amount detection - scan right for currency value if mapped amount is 0
        if (amount === 0 && (itemCode || description)) {
          for (let c = row.length - 1; c >= 0; c--) {
            const cellValue = row[c];
            if (cellValue && /[\d\s,]+[,.]?\d{2}$/.test(cellValue)) {
              const parsed = parseNumber(cellValue);
              if (parsed > 0) {
                amount = parsed;
                break;
              }
            }
          }
        }

        // Fix misplaced quantity -> amount
        if (amount === 0 && quantity > 1000 && !unitRaw) {
          amount = quantity;
          quantity = 0;
        }

        const isPrimeCost = /prime\s*cost|^pc\s|p\.?c\.?\s*sum|p\.?c\.?\s*amount/i.test(description);
        const isProvisionalSum = /provisional\s*sum|^ps\s|prov\.?\s*sum/i.test(description);
        const itemType: 'MEASURED' | 'PC' | 'PS' = isPrimeCost ? 'PC' : isProvisionalSum ? 'PS' : 'MEASURED';

        // Calculate amount from rates if still 0
        if (amount === 0 && quantity > 0 && (supplyRate > 0 || installRate > 0)) {
          amount = quantity * (supplyRate + installRate);
        }

        if (amount === 0 && !isPercentageItem && !description) continue;

        items.push({
          item_code: itemCode,
          description,
          unit: unitRaw || (isPercentageItem ? '%' : 'No.'),
          quantity,
          supply_rate: supplyRate,
          install_rate: installRate,
          amount,
          is_prime_cost: isPrimeCost,
          item_type: itemType,
        });
      }

      if (items.length > 0) {
        sections.push({
          sectionCode: sectionIndices[si].code,
          sectionName: sectionIndices[si].name || `Section ${sectionIndices[si].code}`,
          items,
          boqStatedTotal,
          _sectionNumber: sectionIndices[si].code.charCodeAt(0) - 64,
        });
        console.log(`[Single-Sheet Import] Section ${sectionIndices[si].code}: ${items.length} items, stated total: ${boqStatedTotal}`);
      }
    }

    if (sections.length === 0) return null;

    return [{
      billNumber,
      billName,
      sections,
    }];
  };

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): { section: ParsedSection; billNumber: number; billName: string } | null => {
    const parsed = parseSectionFromSheetName(sheetName);
    
    // Skip bill headers that don't have their own items
    if (parsed.isBillHeader) return null;
    
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
    
    if (allRows.length === 0) return null;
    
    const patterns: Record<string, RegExp> = {
      description: /desc|particular|item\s*description|work\s*description/i,
      quantity: /qty|quantity|qnty/i,
      unit: /^unit$|^uom$/i,
      supplyRate: /^supply$/i,
      installRate: /^install$/i,
      rate: /^rate$|unit\s*rate|total\s*rate/i,
      amount: /^amount$|tender\s*price|^total$/i,
      itemCode: /^no$|^item$|^code$|^ref$|item\s*no|item\s*code/i,
    };

    const findColumnsInRow = (row: string[]): Record<string, number> => {
      const colMap: Record<string, number> = {};
      row.forEach((cell, idx) => {
        const cellLower = cell.toLowerCase();
        for (const [key, pattern] of Object.entries(patterns)) {
          if (pattern.test(cellLower) && colMap[key] === undefined) {
            colMap[key] = idx;
          }
        }
      });
      return colMap;
    };

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
    
    if (headerRowIdx === -1) return null;
    
    const items: ParsedItem[] = [];
    let boqStatedTotal = 0; // Extract from summary/total row
    
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
      
      let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
      const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
      let quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
      const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
      const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
      let amount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
      
      // Smart amount detection: If the mapped amount column returned 0, scan right-most columns
      if (amount === 0 && (itemCode || description)) {
        for (let c = row.length - 1; c >= 0; c--) {
          const cellValue = row[c];
          if (cellValue && /[\d\s,]+[,.]?\d{2}$/.test(cellValue)) {
            const parsed = parseNumber(cellValue);
            if (parsed > 0) {
              amount = parsed;
              console.log(`[Excel Import] Found amount in column ${c} for ${itemCode}: R${amount}`);
              break;
            }
          }
        }
      }
      
      // Fix misplaced quantity->amount
      if (amount === 0 && quantity > 1000 && !unitRaw) {
        amount = quantity;
        quantity = 0;
        console.log(`[Excel Import] Corrected misplaced quantity->amount for ${itemCode}: R${amount}`);
      }
      
      // Handle percentage items
      const isPercentageItem = unitRaw === '%' || /^%$/.test(unitRaw) || /add\s*profit|markup|percentage/i.test(description);
      if (isPercentageItem && amount === 0) {
        for (let c = row.length - 1; c >= 0; c--) {
          const parsed = parseNumber(row[c]);
          if (parsed > 100 && parsed < 1000000) {
            amount = parsed;
            console.log(`[Excel Import] Found percentage item amount for ${itemCode}: R${amount}`);
            break;
          }
        }
      }
      
      if (!itemCode && !description) continue;
      
      const textToCheck = `${itemCode} ${description}`.toLowerCase();
      
      if (/^total|^carried|^brought|^summary|^sub-total|^subtotal|section\s*total|bill\s*total/i.test(textToCheck)) {
        if (amount > 0 && amount > boqStatedTotal) {
          boqStatedTotal = amount;
        }
        console.log(`[Excel Import] Skipped total row: ${itemCode} - ${description}`);
        continue;
      }
      
      const isBillSectionHeader = (
        /^[A-Z]$/i.test(itemCode) &&
        amount > 0 &&
        !unitRaw &&
        quantity === 0 &&
        supplyRate === 0 &&
        installRate === 0
      );
      
      if (isBillSectionHeader) {
        if (amount > boqStatedTotal) {
          boqStatedTotal = amount;
        }
        console.log(`[Excel Import] Skipped bill section header: ${itemCode} - ${description} (Amount: ${amount})`);
        continue;
      }
      
      const isPandG = /preliminar|p\s*&\s*g|p\.?&\.?g|firm\s*and\s*fixed|attendance|general\s*requirement|setting\s*out|site\s*establishment|water\s*for\s*works|temporary|removal\s*of\s*rubbish|protection|cleaning/i.test(description);
      
      const isPrimeCost = !isPandG && (
        /prime\s*cost|^pc\s|p\.?c\.?\s*sum|p\.?c\.?\s*amount|pc\s*rate|prime\s*cost\s*amount/i.test(description)
      );
      
      const isProvisionalSum = /provisional\s*sum|^ps\s|prov\.?\s*sum/i.test(description);
      
      const itemType: 'MEASURED' | 'PC' | 'PS' = 
        isPrimeCost ? 'PC' : isProvisionalSum ? 'PS' : 'MEASURED';
      
      items.push({
        item_code: itemCode,
        description,
        unit: unitRaw || 'No.',
        quantity,
        supply_rate: supplyRate,
        install_rate: installRate,
        amount,
        is_prime_cost: isPrimeCost,
        item_type: itemType,
      });
    }
    
    if (items.length === 0) return null;
    
    return { 
      section: {
        sectionCode: parsed.sectionCode, 
        sectionName: parsed.sectionName, 
        items,
        boqStatedTotal,
        _sectionNumber: parsed.sectionNumber,
      },
      billNumber: parsed.billNumber,
      billName: parsed.billName,
    };
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);
    setProgress(5);
    setProgressText("Reading Excel file...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      setProgress(10);
      setProgressText("Parsing sheets...");

      // Try single-sheet inline-section format first (e.g., Edgars/Prince Buthelezi)
      let parsedBills: ParsedBill[] | null = parseSingleSheetWithInlineSections(workbook);

      if (!parsedBills) {
        // Fall back to multi-sheet format
        const billsMap = new Map<number, ParsedBill>();
        
        const skipPatterns = [
          /^main\s*summary$/i,
          /^summary$/i,
          /mall\s*summary$/i,
          /bill\s*summary$/i,
          /notes/i,
          /qualifications/i,
          /cover/i,
          /^index$/i,
        ];

        console.log("Excel sheet names found:", workbook.SheetNames);
        
        for (const sheetName of workbook.SheetNames) {
          const shouldSkip = skipPatterns.some(pattern => pattern.test(sheetName.trim()));
          if (shouldSkip) {
            console.log(`Skipping sheet (matched skip pattern): "${sheetName}"`);
            continue;
          }
          
          console.log(`Processing sheet: "${sheetName}"`);
          const worksheet = workbook.Sheets[sheetName];
          const result = parseSheet(worksheet, sheetName);
          
          if (result) {
            const { section, billNumber, billName } = result;
            console.log(`  -> Parsed as Bill ${billNumber}: "${billName}", Section: "${section.sectionCode}" with ${section.items.length} items`);
            
            if (!billsMap.has(billNumber)) {
              billsMap.set(billNumber, {
                billNumber,
                billName,
                sections: [],
              });
            }
            billsMap.get(billNumber)!.sections.push(section);
          } else {
            console.log(`  -> Sheet skipped (parseSheet returned null)`);
          }
        }

        parsedBills = Array.from(billsMap.values()).sort((a, b) => a.billNumber - b.billNumber);
      }

      if (parsedBills.length === 0) {
        throw new Error("No valid data found in Excel file");
      }

      // Sort sections within each bill
      parsedBills.forEach(bill => {
        bill.sections.sort((a, b) => a._sectionNumber - b._sectionNumber);
      });

      setProgress(20);
      setProgressText(`Found ${parsedBills.length} bills, loading existing data...`);

      // ========== INCREMENTAL MERGE IMPORT ==========
      // Instead of deleting everything, we compare and only insert what's missing
      
      // Step 1: Fetch all existing data for this Final Account
      const { data: existingBills } = await supabase
        .from("final_account_bills")
        .select("id, bill_number, bill_name")
        .eq("final_account_id", accountId);

      // Build lookup map: bill_number -> bill record
      const existingBillMap = new Map<number, { id: string; bill_number: number; bill_name: string }>();
      (existingBills || []).forEach(b => existingBillMap.set(b.bill_number, b));

      // Fetch all existing sections (for bills in this account)
      const billIds = (existingBills || []).map(b => b.id);
      let existingSectionsData: { id: string; bill_id: string; section_code: string; section_name: string }[] = [];
      if (billIds.length > 0) {
        const { data } = await supabase
          .from("final_account_sections")
          .select("id, bill_id, section_code, section_name")
          .in("bill_id", billIds);
        existingSectionsData = data || [];
      }

      // Build lookup maps for sections:
      // 1. bill_id -> section_code -> section record
      // 2. bill_id -> normalized section_name -> section record (fallback matching)
      const existingSectionMap = new Map<string, Map<string, { id: string; section_code: string; section_name: string }>>();
      const existingSectionByNameMap = new Map<string, Map<string, { id: string; section_code: string; section_name: string }>>();
      
      const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      existingSectionsData.forEach(s => {
        // By section_code
        if (!existingSectionMap.has(s.bill_id)) {
          existingSectionMap.set(s.bill_id, new Map());
        }
        existingSectionMap.get(s.bill_id)!.set(s.section_code, s);
        
        // By normalized section_name (for fallback matching)
        if (!existingSectionByNameMap.has(s.bill_id)) {
          existingSectionByNameMap.set(s.bill_id, new Map());
        }
        existingSectionByNameMap.get(s.bill_id)!.set(normalizeName(s.section_name), s);
      });

      // Fetch all existing items (for sections in this account)
      const sectionIds = existingSectionsData.map(s => s.id);
      let existingItemsData: { id: string; section_id: string; item_code: string }[] = [];
      if (sectionIds.length > 0) {
        const { data } = await supabase
          .from("final_account_items")
          .select("id, section_id, item_code")
          .in("section_id", sectionIds);
        existingItemsData = data || [];
      }

      // Build lookup map: section_id -> item_code -> item record
      const existingItemMap = new Map<string, Set<string>>();
      existingItemsData.forEach(item => {
        if (!existingItemMap.has(item.section_id)) {
          existingItemMap.set(item.section_id, new Set());
        }
        existingItemMap.get(item.section_id)!.add(item.item_code);
      });

      setProgress(30);
      setProgressText("Comparing and merging data...");

      let totalItemsAdded = 0;
      let totalItemsSkipped = 0;
      let totalSectionsAdded = 0;
      let totalBillsAdded = 0;
      const progressPerBill = 60 / parsedBills.length;

      for (let bi = 0; bi < parsedBills.length; bi++) {
        const bill = parsedBills[bi];
        setProgressText(`Processing Bill ${bill.billNumber}: ${bill.billName}...`);

        let billId: string;
        let isNewBill = false;

        // Check if bill already exists
        const existingBill = existingBillMap.get(bill.billNumber);
        if (existingBill) {
          billId = existingBill.id;
          console.log(`[Merge Import] Bill ${bill.billNumber} exists, using ID: ${billId}`);
        } else {
          // Create new bill
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
          isNewBill = true;
          totalBillsAdded++;
          console.log(`[Merge Import] Created new Bill ${bill.billNumber}: ${bill.billName}`);
          
          // Initialize section map for new bill
          existingSectionMap.set(billId, new Map());
        }

        let billContractTotalDelta = 0;

        for (let si = 0; si < bill.sections.length; si++) {
          const section = bill.sections[si];
          
          let sectionId: string;
          let isNewSection = false;
          
          // Check if section already exists in this bill
          // Try matching by section_code first, then fallback to normalized section_name
          const billSections = existingSectionMap.get(billId);
          const billSectionsByName = existingSectionByNameMap.get(billId);
          
          let existingSection = billSections?.get(section.sectionCode);
          
          // Fallback: match by normalized section name (handles P&G vs Preliminaries & General, etc.)
          if (!existingSection && billSectionsByName) {
            const normalizedParsedName = normalizeName(section.sectionName);
            existingSection = billSectionsByName.get(normalizedParsedName);
            
            // Also try matching common aliases
            const aliases: Record<string, string[]> = {
              'preliminariesgeneral': ['pg', 'pandg', 'preliminaries'],
              'pg': ['preliminariesgeneral', 'pandg', 'preliminaries'],
              'pandg': ['preliminariesgeneral', 'pg', 'preliminaries'],
            };
            
            if (!existingSection && aliases[normalizedParsedName]) {
              for (const alias of aliases[normalizedParsedName]) {
                existingSection = billSectionsByName.get(alias);
                if (existingSection) {
                  console.log(`[Merge Import] Matched section "${section.sectionName}" to existing "${existingSection.section_name}" via alias`);
                  break;
                }
              }
            }
          }
          
          if (existingSection) {
            sectionId = existingSection.id;
            console.log(`[Merge Import] Section ${section.sectionCode} ("${section.sectionName}") matched existing section ${existingSection.section_code}`);
          } else {
            // Create new section
            const { data: newSection, error: sectionError } = await supabase
              .from("final_account_sections")
              .insert({
                bill_id: billId,
                section_code: section.sectionCode,
                section_name: section.sectionName,
                display_order: si,
              })
              .select()
              .single();

            if (sectionError) throw sectionError;
            sectionId = newSection.id;
            isNewSection = true;
            totalSectionsAdded++;
            console.log(`[Merge Import] Created new Section ${section.sectionCode}: ${section.sectionName}`);
            
            // Initialize item set for new section
            existingItemMap.set(sectionId, new Set());
            
            // Add to section map
            if (!billSections) {
              existingSectionMap.set(billId, new Map());
            }
            existingSectionMap.get(billId)!.set(section.sectionCode, { 
              id: sectionId, 
              section_code: section.sectionCode, 
              section_name: section.sectionName 
            });
          }

          // Filter items - only insert items that don't exist
          // Match by item_code within this section. Empty item_codes are always treated as new
          // to avoid false-positive matches on blank codes.
          const existingItemCodes = existingItemMap.get(sectionId) || new Set();
          const newItems: ParsedItem[] = [];
          
          for (const item of section.items) {
            // Empty item_code = always add (can't reliably match)
            // Existing item_code = skip to preserve manual edits
            const hasItemCode = item.item_code && item.item_code.trim() !== '';
            if (hasItemCode && existingItemCodes.has(item.item_code)) {
              totalItemsSkipped++;
              // console.log(`[Merge Import] Skipped existing item: ${item.item_code}`);
            } else {
              newItems.push(item);
            }
          }

          if (newItems.length > 0) {
            // Get current max display_order for this section
            let maxDisplayOrder = 0;
            if (!isNewSection) {
              const { data: maxOrderData } = await supabase
                .from("final_account_items")
                .select("display_order")
                .eq("section_id", sectionId)
                .order("display_order", { ascending: false })
                .limit(1);
              maxDisplayOrder = maxOrderData?.[0]?.display_order || 0;
            }

            const itemsToInsert = newItems.map((item, idx) => {
              const contractAmount = item.amount;
              billContractTotalDelta += contractAmount;
              
              return {
                section_id: sectionId,
                item_code: item.item_code,
                description: item.description,
                unit: item.unit,
                contract_quantity: item.quantity,
                final_quantity: 0,
                supply_rate: item.supply_rate,
                install_rate: item.install_rate,
                contract_amount: contractAmount,
                final_amount: 0,
                display_order: maxDisplayOrder + idx + 1,
                is_prime_cost: item.is_prime_cost,
                item_type: item.item_type,
                pc_allowance: item.is_prime_cost ? contractAmount : null,
              };
            });

            const chunkSize = 100;
            for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
              const chunk = itemsToInsert.slice(i, i + chunkSize);
              const { error: itemsError } = await supabase.from("final_account_items").insert(chunk);
              if (itemsError) throw itemsError;
            }

            totalItemsAdded += newItems.length;
            console.log(`[Merge Import] Added ${newItems.length} new items to Section ${section.sectionCode}`);

            // Update section totals (recalculate from all items)
            const { data: allSectionItems } = await supabase
              .from("final_account_items")
              .select("contract_amount")
              .eq("section_id", sectionId);
            
            const sectionTotal = (allSectionItems || []).reduce((sum, item) => sum + (item.contract_amount || 0), 0);
            
            await supabase
              .from("final_account_sections")
              .update({ 
                contract_total: sectionTotal, 
                boq_stated_total: section.boqStatedTotal > 0 ? section.boqStatedTotal : sectionTotal,
              })
              .eq("id", sectionId);
          }
        }

        // Update bill totals (recalculate from all sections)
        const { data: allBillSections } = await supabase
          .from("final_account_sections")
          .select("contract_total")
          .eq("bill_id", billId);
        
        const billTotal = (allBillSections || []).reduce((sum, s) => sum + (s.contract_total || 0), 0);
        
        await supabase
          .from("final_account_bills")
          .update({ 
            contract_total: billTotal, 
            variation_total: -billTotal 
          })
          .eq("id", billId);

        setProgress(30 + (bi + 1) * progressPerBill);
      }

      setProgress(95);
      setProgressText("Refreshing data...");

      await queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-items"] });

      setProgress(100);
      
      const summaryParts = [];
      if (totalItemsAdded > 0) summaryParts.push(`${totalItemsAdded} new items`);
      if (totalSectionsAdded > 0) summaryParts.push(`${totalSectionsAdded} new sections`);
      if (totalBillsAdded > 0) summaryParts.push(`${totalBillsAdded} new bills`);
      if (totalItemsSkipped > 0) summaryParts.push(`${totalItemsSkipped} existing items unchanged`);
      
      const message = summaryParts.length > 0 
        ? `Merge complete: ${summaryParts.join(", ")}`
        : "No new data to import - all items already exist";
      
      toast.success(message);

      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import Excel file");
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Final Account from Excel</DialogTitle>
          <DialogDescription>
            Import bills, sections, and items directly from an Excel file
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Excel File</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Supports both multi-sheet format (one sheet per section) and single-sheet format 
              with inline sections (Section A, Section B, etc.). Bill numbers are auto-detected.
            </p>
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{progressText}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
