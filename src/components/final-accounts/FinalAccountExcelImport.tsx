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
  amount: number; // Pre-calculated amount from Excel - use this as contract_amount
}

interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  items: ParsedItem[];
  _sectionNumber: number; // For ordering
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
   * CORRECT structure from Excel (Prince Buthelezi Mall example):
   * - This is ONE BILL with multiple SECTIONS
   * - "1.1 P&G" or "1.2 Medium Voltage" -> Sub-sections of "Mall Portion" (section 1)
   * - "1 Mall Portion" -> Main section header (skip, sub-sections handle this)
   * - "3 ASJ", "4 Boxer", etc -> Section 3, Section 4, etc. under the same bill
   * ALL belong to the SAME BILL (project tender)
   */
  const parseSectionFromSheetName = (sheetName: string): { 
    sectionCode: string; 
    sectionName: string; 
    sectionNumber: number; // For ordering
    isMallSubSection: boolean; // True for "1.x" patterns
    isBillHeader: boolean;
  } => {
    const trimmed = sheetName.trim();
    
    // Pattern: "1.2 Medium Voltage" -> Sub-section of Mall Portion (section 1)
    const dottedPattern = trimmed.match(/^(\d+)\.(\d+)\s+(.+)$/);
    if (dottedPattern) {
      const mainSection = parseInt(dottedPattern[1]) || 1;
      const subSection = dottedPattern[2];
      return {
        sectionCode: `${mainSection}.${subSection}`,
        sectionName: dottedPattern[3].trim(),
        sectionNumber: mainSection * 100 + parseInt(subSection), // For ordering: 1.2 = 102
        isMallSubSection: mainSection === 1,
        isBillHeader: false,
      };
    }
    
    // Pattern: "1 Mall Portion" -> Skip this header sheet (sub-sections provide the detail)
    if (/^1\s+(Mall|Portion|Mall\s*Portion)/i.test(trimmed)) {
      return {
        sectionCode: "1",
        sectionName: "Mall Portion",
        sectionNumber: 100,
        isMallSubSection: false,
        isBillHeader: true, // Skip
      };
    }
    
    // Pattern: "3 ASJ", "4 Boxer", etc -> Section 3, Section 4 in the main bill
    const standalonePattern = trimmed.match(/^(\d+)\s+(.+)$/);
    if (standalonePattern) {
      const sectionNum = parseInt(standalonePattern[1]);
      const name = standalonePattern[2].trim();
      return {
        sectionCode: String(sectionNum),
        sectionName: name,
        sectionNumber: sectionNum * 100, // 3 = 300, 4 = 400, etc.
        isMallSubSection: false,
        isBillHeader: false,
      };
    }
    
    // Pattern: "P&G" standalone -> Section 1.1
    if (/^p\s*&\s*g$/i.test(trimmed) || /^preliminaries$/i.test(trimmed)) {
      return {
        sectionCode: "1.1",
        sectionName: "Preliminaries & General",
        sectionNumber: 101,
        isMallSubSection: true,
        isBillHeader: false,
      };
    }
    
    // Unrecognized pattern - skip
    return {
      sectionCode: trimmed,
      sectionName: trimmed,
      sectionNumber: 9999, // Will be filtered out
      isMallSubSection: false,
      isBillHeader: false,
    };
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedSection | null => {
    const { sectionCode, sectionName, sectionNumber, isBillHeader } = parseSectionFromSheetName(sheetName);
    
    // Skip bill headers that don't have their own items (e.g., "1 Mall Portion" summary sheet)
    if (isBillHeader) return null;
    
    // Skip invalid sections
    if (sectionNumber === 9999) return null;
    
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
    
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
      
      let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
      const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
      const quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
      const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
      const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
      // Use the pre-calculated AMOUNT from Excel - this is critical for accuracy
      const amount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
      
      if (!itemCode && !description) continue;
      
      const textToCheck = `${itemCode} ${description}`.toLowerCase();
      if (/total|carried|brought|summary|sub-total|subtotal/i.test(textToCheck)) continue;
      
      items.push({
        item_code: itemCode,
        description,
        unit: unitRaw || 'No.',
        quantity,
        supply_rate: supplyRate,
        install_rate: installRate,
        amount, // Use Excel's pre-calculated amount
      });
    }
    
    if (items.length === 0) return null;
    
    return { 
      sectionCode, 
      sectionName, 
      items,
      _sectionNumber: sectionNumber,
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

      const parsedSections: ParsedSection[] = [];
      
      const skipPatterns = [
        /^main\s*summary$/i,
        /^summary$/i,
        /notes/i,
        /qualifications/i,
        /cover/i,
        // DON'T skip P&G - it should be included as Bill 1's section 1.1
      ];

      for (const sheetName of workbook.SheetNames) {
        const shouldSkip = skipPatterns.some(pattern => pattern.test(sheetName.trim()));
        if (shouldSkip) continue;
        
        const worksheet = workbook.Sheets[sheetName];
        const section = parseSheet(worksheet, sheetName);
        if (section) {
          parsedSections.push(section);
        }
      }

      if (parsedSections.length === 0) {
        throw new Error("No valid data found in Excel file");
      }

      setProgress(20);
      setProgressText(`Found ${parsedSections.length} sections, creating single bill...`);

      // Sort sections by their section number for proper ordering
      parsedSections.sort((a, b) => a._sectionNumber - b._sectionNumber);

      setProgress(25);
      setProgressText("Clearing existing data...");

      // Delete existing bills/sections/items for this Final Account
      const { data: existingBills } = await supabase
        .from("final_account_bills")
        .select("id")
        .eq("final_account_id", accountId);

      if (existingBills && existingBills.length > 0) {
        const billIds = existingBills.map(b => b.id);
        
        const { data: existingSections } = await supabase
          .from("final_account_sections")
          .select("id")
          .in("bill_id", billIds);

        if (existingSections && existingSections.length > 0) {
          const sectionIds = existingSections.map(s => s.id);
          await supabase.from("final_account_items").delete().in("section_id", sectionIds);
          await supabase.from("final_account_sections").delete().in("id", sectionIds);
        }
        
        await supabase.from("final_account_bills").delete().in("id", billIds);
      }

      setProgress(30);
      setProgressText("Creating bill and sections...");

      let totalItems = 0;

      // Create a SINGLE bill for the entire Excel file
      const { data: newBill, error: billError } = await supabase
        .from("final_account_bills")
        .insert({
          final_account_id: accountId,
          bill_number: 1,
          bill_name: "Prince Buthelezi Mall", // Can be customized later
        })
        .select()
        .single();

      if (billError) throw billError;

      let billContractTotal = 0;
      const progressPerSection = 60 / parsedSections.length;

      for (let si = 0; si < parsedSections.length; si++) {
        const section = parsedSections[si];
        setProgressText(`Importing Section ${section.sectionCode}: ${section.sectionName}...`);
        
        // Create section
        const { data: newSection, error: sectionError } = await supabase
          .from("final_account_sections")
          .insert({
            bill_id: newBill.id,
            section_code: section.sectionCode,
            section_name: section.sectionName,
            display_order: si,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert items - USE the pre-calculated amount from Excel for accuracy
        let sectionTotal = 0;
        const itemsToInsert = section.items.map((item, idx) => {
          // Use Excel's AMOUNT column directly - this is the actual tender price
          const contractAmount = item.amount;
          sectionTotal += contractAmount;
          
          return {
            section_id: newSection.id,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            contract_quantity: item.quantity,
            final_quantity: 0,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            contract_amount: contractAmount, // Use Excel's pre-calculated amount
            final_amount: 0,
            display_order: idx + 1,
          };
        });

        const chunkSize = 100;
        for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
          const chunk = itemsToInsert.slice(i, i + chunkSize);
          const { error: itemsError } = await supabase.from("final_account_items").insert(chunk);
          if (itemsError) throw itemsError;
        }

        // Update section totals
        await supabase
          .from("final_account_sections")
          .update({ contract_total: sectionTotal, final_total: 0 })
          .eq("id", newSection.id);

        billContractTotal += sectionTotal;
        totalItems += itemsToInsert.length;
        
        setProgress(30 + (si + 1) * progressPerSection);
      }

      // Update bill totals
      await supabase
        .from("final_account_bills")
        .update({ 
          contract_total: billContractTotal, 
          final_total: 0,
          variation_total: -billContractTotal 
        })
        .eq("id", newBill.id);

      setProgress(95);
      setProgressText("Refreshing data...");

      await queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-items"] });

      setProgress(100);
      
      toast.success(`Imported ${totalItems} items across ${parsedSections.length} sections`);

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
              Sheets like "1.2 Medium Voltage" become sections within Bill 1 (Mall Portion). 
              Sheets like "3 ASJ" or "4 Boxer" become their own bills with the tenant name.
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
