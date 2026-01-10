import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface BOQExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boqId: string;
  projectId: string;
}

interface ParsedItem {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  supply_rate: number;
  install_rate: number;
  total_rate: number; // Combined rate from Excel (supply + install, or single "Rate" column)
  direct_amount: number; // The actual amount from Excel
  item_type: 'quantity' | 'prime_cost' | 'percentage' | 'sub_header';
  prime_cost_amount?: number;
}

interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  items: ParsedItem[];
  boqStatedTotal: number;
  _sectionNumber: number;
}

interface ParsedBill {
  billNumber: number;
  billName: string;
  sections: ParsedSection[];
}

export function BOQExcelImportDialog({
  open,
  onOpenChange,
  boqId,
  projectId,
}: BOQExcelImportDialogProps) {
  const { toast } = useToast();
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
   * CORRECT structure (aligned with Final Account import):
   * - "1 Mall Portion", "1.1 P&G", "1.2 Medium Voltage" -> Bill 1 (Mall) with sub-sections
   * - "3 ASJ", "4 Boxer", etc -> SEPARATE bills (Bill 3, Bill 4, etc.)
   */
  const parseSectionFromSheetName = (sheetName: string): { 
    billNumber: number;
    billName: string;
    sectionCode: string; 
    sectionName: string; 
    sectionNumber: number;
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
        sectionNumber: parseInt(subSection),
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
        isBillHeader: true,
      };
    }
    
    // Pattern: "3 ASJ", "4 Boxer" -> SEPARATE BILL with ONE section
    const standalonePattern = trimmed.match(/^(\d+)\s+(.+)$/);
    if (standalonePattern) {
      const billNum = parseInt(standalonePattern[1]);
      const name = standalonePattern[2].trim();
      return {
        billNumber: billNum,
        billName: name,
        sectionCode: String(billNum),
        sectionName: name,
        sectionNumber: 1,
        isBillHeader: false,
      };
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
    
    // Unrecognized pattern - skip
    return {
      billNumber: 0,
      billName: "",
      sectionCode: trimmed,
      sectionName: trimmed,
      sectionNumber: 0,
      isBillHeader: true,
    };
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Parse sheet - EXACTLY like Final Account import
   * This is the PROVEN working logic - no custom modifications!
   */
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
    let boqStatedTotal = 0;
    
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
      
      let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
      const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
      const quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
      const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
      const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
      const amount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
      
      if (!itemCode && !description) continue;
      
      const textToCheck = `${itemCode} ${description}`.toLowerCase();
      
      // Check if this is a summary/total row - extract the stated total
      if (/total|carried|brought|summary|sub-total|subtotal/i.test(textToCheck)) {
        if (amount > 0 && amount > boqStatedTotal) {
          boqStatedTotal = amount;
        }
        continue; // Don't add as item
      }
      
      // Detect section header rows - skip them (EXACT same logic as Final Account)
      const isSectionHeader = (
        /^[A-Z]$/i.test(itemCode) &&
        amount > 0 &&
        !unitRaw &&
        quantity === 0 &&
        supplyRate === 0 &&
        installRate === 0
      );
      
      if (isSectionHeader) {
        if (amount > boqStatedTotal) {
          boqStatedTotal = amount;
        }
        continue;
      }
      
      // Detect Prime Cost and Provisional Sum items (same as Final Account)
      const isPrimeCost = /prime\s*cost|^pc\s|p\.?c\.?\s*amount|allowance\s*for/i.test(description) 
        || unitRaw.toLowerCase() === 'sum' && /supply|delivery|cost|amount/i.test(description);
      const isProvisionalSum = /provisional\s*sum|^ps\s/i.test(description);
      
      // Map to BOQ item types (quantity is default, prime_cost for PC/PS/Sum items)
      let itemType: 'quantity' | 'prime_cost' | 'percentage' | 'sub_header' = 'quantity';
      if (isPrimeCost || isProvisionalSum) itemType = 'prime_cost';
      
      items.push({
        item_code: itemCode,
        description,
        unit: unitRaw || 'No.',
        quantity,
        supply_rate: supplyRate,
        install_rate: installRate,
        total_rate: supplyRate + installRate, // Calculate total rate directly
        direct_amount: amount, // EXACT value from Excel - no modifications!
        item_type: itemType,
        prime_cost_amount: (isPrimeCost || isProvisionalSum) ? amount : undefined,
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
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
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

      // Group sections by bill (same approach as Final Account import)
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

      for (const sheetName of workbook.SheetNames) {
        const shouldSkip = skipPatterns.some(pattern => pattern.test(sheetName.trim()));
        if (shouldSkip) {
          console.log(`[BOQ Import] Skipping sheet "${sheetName}" (summary/notes sheet)`);
          continue;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const result = parseSheet(worksheet, sheetName);
        if (result) {
          const { section, billNumber, billName } = result;
          
          if (!billsMap.has(billNumber)) {
            billsMap.set(billNumber, {
              billNumber,
              billName,
              sections: [],
            });
          }
          billsMap.get(billNumber)!.sections.push(section);
        }
      }

      // Convert to array and sort by bill number
      const parsedBills = Array.from(billsMap.values()).sort((a, b) => a.billNumber - b.billNumber);

      if (parsedBills.length === 0) {
        throw new Error("No valid data found in Excel file");
      }

      // Sort sections within each bill
      parsedBills.forEach(bill => {
        bill.sections.sort((a, b) => a._sectionNumber - b._sectionNumber);
      });

      console.log("[BOQ Import] Bills structure:", parsedBills.map(b => ({
        number: b.billNumber,
        name: b.billName,
        sections: b.sections.map(s => `${s.sectionCode}: ${s.sectionName}`),
      })));

      setProgress(20);
      setProgressText(`Found ${parsedBills.length} bills, clearing existing data...`);

      // Delete existing bills/sections/items for this BOQ
      const { data: existingBills } = await supabase
        .from("boq_bills")
        .select("id")
        .eq("project_boq_id", boqId);

      if (existingBills && existingBills.length > 0) {
        const billIds = existingBills.map(b => b.id);
        
        const { data: existingSections } = await supabase
          .from("boq_project_sections")
          .select("id")
          .in("bill_id", billIds);

        if (existingSections && existingSections.length > 0) {
          const sectionIds = existingSections.map(s => s.id);
          await supabase.from("boq_items").delete().in("section_id", sectionIds);
          await supabase.from("boq_project_sections").delete().in("id", sectionIds);
        }
        
        await supabase.from("boq_bills").delete().in("id", billIds);
      }

      setProgress(30);
      setProgressText("Creating bills and sections...");

      let totalItems = 0;
      let totalSections = 0;
      const progressPerBill = 60 / parsedBills.length;

      for (let bi = 0; bi < parsedBills.length; bi++) {
        const bill = parsedBills[bi];
        setProgressText(`Importing Bill ${bill.billNumber}: ${bill.billName}...`);

        // Create bill
        const { data: newBill, error: billError } = await supabase
          .from("boq_bills")
          .insert({
            project_boq_id: boqId,
            bill_number: bill.billNumber,
            bill_name: bill.billName,
            display_order: bi,
          })
          .select()
          .single();

        if (billError) throw billError;

        for (let si = 0; si < bill.sections.length; si++) {
          const section = bill.sections[si];
          
          // Create section
          const { data: newSection, error: sectionError } = await supabase
            .from("boq_project_sections")
            .insert({
              bill_id: newBill.id,
              section_code: section.sectionCode,
              section_name: section.sectionName,
              display_order: si,
            })
            .select()
            .single();

          if (sectionError) throw sectionError;

          // Insert items in batches - store all data from Excel including rates and costs
          const itemsToInsert = section.items.map((item, idx) => ({
            section_id: newSection.id,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            total_rate: item.total_rate, // Combined rate (supply + install or single rate column)
            supply_cost: item.quantity * item.supply_rate, // Calculated supply cost
            install_cost: item.quantity * item.install_rate, // Calculated install cost
            total_amount: item.direct_amount, // Use actual Excel amount - no more calculation mismatches!
            item_type: item.item_type,
            prime_cost_amount: item.prime_cost_amount || null,
            display_order: idx + 1,
          }));

          const chunkSize = 100;
          for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
            const chunk = itemsToInsert.slice(i, i + chunkSize);
            const { error: itemsError } = await supabase.from("boq_items").insert(chunk);
            if (itemsError) throw itemsError;
          }

          totalItems += itemsToInsert.length;
          totalSections++;
        }

        setProgress(30 + (bi + 1) * progressPerBill);
      }

      setProgress(95);
      setProgressText("Refreshing data...");

      await queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      await queryClient.invalidateQueries({ queryKey: ["boq-project-sections"] });
      await queryClient.invalidateQueries({ queryKey: ["boq-items"] });

      setProgress(100);
      
      toast({
        title: "Success",
        description: `Imported ${totalItems} items across ${totalSections} sections in ${parsedBills.length} bills`,
      });

      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import Excel file",
        variant: "destructive",
      });
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
          <DialogTitle>Import BOQ from Excel</DialogTitle>
          <DialogDescription>
            Import bill of quantities data from an Excel file with the same structure as Final Account imports.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={loading}
            />
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progressText}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
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
