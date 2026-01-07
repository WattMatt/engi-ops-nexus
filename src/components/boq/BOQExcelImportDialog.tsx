import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  amount: number;
}

interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  billNumber: number;
  items: ParsedItem[];
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

  // Parse section code and name from sheet name - same logic as Final Account
  const parseSectionFromSheetName = (sheetName: string): { sectionCode: string; sectionName: string; billNumber: number } => {
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
        billNumber: parseInt(numericSpacePattern[1]) || 1,
      };
    }
    
    // Pattern: "P&G" or just a name -> code is the name
    return {
      sectionCode: trimmed,
      sectionName: trimmed,
      billNumber: 1,
    };
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse a single sheet - treat entire sheet as ONE section (same as Final Account)
  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedSection | null => {
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
    
    if (allRows.length === 0) return null;
    
    // Find columns by patterns
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

    // Find header row
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};
    
    for (let i = 0; i < Math.min(30, allRows.length); i++) {
      const row = allRows[i];
      const testMap = findColumnsInRow(row);
      if (testMap.description !== undefined) {
        headerRowIdx = i;
        colMap = testMap;
        console.log(`[BOQ Import] Found header row at index ${i} in sheet "${sheetName}":`, colMap);
        break;
      }
    }
    
    if (headerRowIdx === -1) {
      console.log(`[BOQ Import] No header row found in sheet "${sheetName}"`);
      return null;
    }
    
    const items: ParsedItem[] = [];
    
    // Process data rows after header
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      const description = colMap.description !== undefined ? String(row[colMap.description] || "").trim() : "";
      
      // Extract values
      let itemCode = colMap.itemCode !== undefined ? String(row[colMap.itemCode] || "").trim() : "";
      const unitRaw = colMap.unit !== undefined ? String(row[colMap.unit] || "").trim() : "";
      const quantity = colMap.quantity !== undefined ? parseNumber(row[colMap.quantity]) : 0;
      const supplyRate = colMap.supplyRate !== undefined ? parseNumber(row[colMap.supplyRate]) : 0;
      const installRate = colMap.installRate !== undefined ? parseNumber(row[colMap.installRate]) : 0;
      const totalRate = colMap.rate !== undefined ? parseNumber(row[colMap.rate]) : supplyRate + installRate;
      const parsedAmount = colMap.amount !== undefined ? parseNumber(row[colMap.amount]) : 0;
      const calculatedAmount = quantity * (totalRate || supplyRate + installRate);
      const amount = parsedAmount > 0 ? parsedAmount : calculatedAmount;
      
      // Skip empty rows
      if (!itemCode && !description) continue;
      
      // Skip total/subtotal rows
      const textToCheck = `${itemCode} ${description}`.toLowerCase();
      if (/total|carried|brought|summary|sub-total|subtotal/i.test(textToCheck)) continue;
      
      items.push({
        item_code: itemCode,
        description,
        unit: unitRaw || 'No.',
        quantity,
        supply_rate: supplyRate,
        install_rate: installRate,
        amount,
      });
    }
    
    if (items.length === 0) return null;
    
    console.log(`[BOQ Import] Sheet "${sheetName}" -> Section "${sectionCode}: ${sectionName}" with ${items.length} items`);
    
    return { sectionCode, sectionName, billNumber, items };
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

      // Parse all sheets - each sheet becomes ONE section
      const parsedSections: ParsedSection[] = [];

      for (const sheetName of workbook.SheetNames) {
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
      setProgressText(`Found ${parsedSections.length} sections, importing...`);

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

      // Group sections by bill number
      const billGroups = new Map<number, ParsedSection[]>();
      for (const section of parsedSections) {
        const billNum = section.billNumber;
        if (!billGroups.has(billNum)) {
          billGroups.set(billNum, []);
        }
        billGroups.get(billNum)!.push(section);
      }

      let totalItems = 0;
      const billNumbers = Array.from(billGroups.keys()).sort((a, b) => a - b);
      const progressPerBill = 60 / billNumbers.length;

      // Process each bill
      for (let bi = 0; bi < billNumbers.length; bi++) {
        const billNumber = billNumbers[bi];
        const sections = billGroups.get(billNumber)!;
        
        // Use first section's name as bill name, or derive from bill number
        const billName = sections[0]?.sectionName || `Bill ${billNumber}`;
        setProgressText(`Importing Bill ${billNumber}: ${billName}...`);

        // Create bill
        const { data: newBill, error: billError } = await supabase
          .from("boq_bills")
          .insert({
            project_boq_id: boqId,
            bill_number: billNumber,
            bill_name: billName,
            display_order: bi,
          })
          .select()
          .single();

        if (billError) throw billError;

        // Create sections and items for this bill
        for (let si = 0; si < sections.length; si++) {
          const section = sections[si];
          
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

          // Insert items in batches (total_rate, supply_cost, install_cost, total_amount are generated columns)
          const itemsToInsert = section.items.map((item, idx) => ({
            section_id: newSection.id,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            display_order: idx + 1,
          }));

          const chunkSize = 100;
          for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
            const chunk = itemsToInsert.slice(i, i + chunkSize);
            const { error: itemsError } = await supabase.from("boq_items").insert(chunk);
            if (itemsError) throw itemsError;
          }

          totalItems += itemsToInsert.length;
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
        description: `Imported ${totalItems} items across ${billNumbers.length} bills and ${parsedSections.length} sections`,
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
              Each sheet becomes a section. Sheet names like "1.2 Medium Voltage" are parsed into section codes.
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
