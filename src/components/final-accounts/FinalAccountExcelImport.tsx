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
}

interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  items: ParsedItem[];
  _billNumber: number;
  _isSubSection: boolean;
}

interface ParsedBill {
  billNumber: number;
  billName: string;
  sections: Omit<ParsedSection, '_billNumber' | '_isSubSection'>[];
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
   * Examples:
   * - "1.2 Medium Voltage" -> code: "1.2", name: "Medium Voltage", billNumber: 1
   * - "1.3 Low Voltage" -> code: "1.3", name: "Low Voltage", billNumber: 1
   * - "4 Boxer" -> code: "4", name: "Boxer", billNumber: 4
   * - "P&G" -> code: "P&G", name: "P&G", billNumber: 1
   */
  const parseSectionFromSheetName = (sheetName: string): { 
    sectionCode: string; 
    sectionName: string; 
    billNumber: number;
    isSubSection: boolean;
  } => {
    const trimmed = sheetName.trim();
    
    // Pattern: "1.2 Medium Voltage" -> sub-section of Bill 1
    const dottedPattern = trimmed.match(/^(\d+\.\d+)\s+(.+)$/);
    if (dottedPattern) {
      const billNum = parseInt(dottedPattern[1].split('.')[0]) || 1;
      return {
        sectionCode: dottedPattern[1],
        sectionName: dottedPattern[2].trim(),
        billNumber: billNum,
        isSubSection: true,
      };
    }
    
    // Pattern: "4 Boxer" -> standalone bill for anchor tenant
    const standalonePattern = trimmed.match(/^(\d+)\s+(.+)$/);
    if (standalonePattern) {
      const billNum = parseInt(standalonePattern[1]);
      return {
        sectionCode: standalonePattern[1],
        sectionName: standalonePattern[2].trim(),
        billNumber: billNum,
        isSubSection: false,
      };
    }
    
    // Pattern: "P&G" or other text - treat as part of Bill 1
    return {
      sectionCode: trimmed,
      sectionName: trimmed,
      billNumber: 1,
      isSubSection: true,
    };
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedSection | null => {
    const { sectionCode, sectionName, billNumber, isSubSection } = parseSectionFromSheetName(sheetName);
    
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
      supplyRate: /supply|material/i,
      installRate: /install|labour|labor/i,
      rate: /^rate$|unit\s*rate|total\s*rate/i,
      amount: /tender\s*price|amount|^total$|value|sum/i,
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
      });
    }
    
    if (items.length === 0) return null;
    
    return { 
      sectionCode, 
      sectionName, 
      items,
      _billNumber: billNumber,
      _isSubSection: isSubSection,
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
        /^p\s*&\s*g$/i,
        /^preliminaries$/i,
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
      setProgressText(`Found ${parsedSections.length} sections, organizing into bills...`);

      // Group sections into bills
      const bills: ParsedBill[] = [];
      const billMap = new Map<number, { sections: ParsedSection[]; isSubSection: boolean }>();

      for (const section of parsedSections) {
        const billNum = section._billNumber;
        const existing = billMap.get(billNum);
        
        if (existing) {
          existing.sections.push(section);
        } else {
          billMap.set(billNum, { 
            sections: [section], 
            isSubSection: section._isSubSection 
          });
        }
      }

      for (const [billNumber, { sections, isSubSection }] of billMap) {
        let billName: string;
        
        if (isSubSection) {
          billName = billNumber === 1 ? "Main Summary" : `Bill ${billNumber} Summary`;
        } else {
          billName = sections[0].sectionName;
        }
        
        bills.push({
          billNumber,
          billName,
          sections: sections.map(s => ({
            sectionCode: s.sectionCode,
            sectionName: s.sectionName,
            items: s.items,
          })),
        });
      }

      bills.sort((a, b) => a.billNumber - b.billNumber);

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

      let totalItems = 0;
      const progressPerBill = 60 / bills.length;

      for (let bi = 0; bi < bills.length; bi++) {
        const bill = bills[bi];
        setProgressText(`Importing Bill ${bill.billNumber}: ${bill.billName}...`);

        // Create bill
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

        let sectionContractTotal = 0;

        for (let si = 0; si < bill.sections.length; si++) {
          const section = bill.sections[si];
          
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

          // Insert items
          let sectionTotal = 0;
          const itemsToInsert = section.items.map((item, idx) => {
            const totalRate = item.supply_rate + item.install_rate;
            const contractAmount = item.quantity * totalRate;
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
              contract_amount: contractAmount,
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

          sectionContractTotal += sectionTotal;
          totalItems += itemsToInsert.length;
        }

        // Update bill totals
        await supabase
          .from("final_account_bills")
          .update({ 
            contract_total: sectionContractTotal, 
            final_total: 0,
            variation_total: -sectionContractTotal 
          })
          .eq("id", newBill.id);

        setProgress(30 + (bi + 1) * progressPerBill);
      }

      setProgress(95);
      setProgressText("Refreshing data...");

      await queryClient.invalidateQueries({ queryKey: ["final-account-bills", accountId] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-sections"] });
      await queryClient.invalidateQueries({ queryKey: ["final-account-items"] });

      setProgress(100);
      
      toast.success(`Imported ${totalItems} items across ${bills.length} bills and ${parsedSections.length} sections`);

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
              Each sheet becomes a section. Sheets like "1.2 Medium Voltage" go into Bill 1 (Main Summary). 
              Sheets like "4 Boxer" become their own bill.
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
