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
}

interface ParsedSheet {
  sheetName: string;
  billNumber: number;
  billName: string;
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

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string): ParsedItem[] => {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
    
    console.log(`Parsing sheet: ${sheetName}, rows: ${data.length}`);
    
    // Find header row
    let headerRowIndex = -1;
    let columnMapping: { [key: string]: number } = {};
    
    const headerPatterns = [
      { key: 'item_code', patterns: ['item code', 'code', 'item', 'ref', 'no.', 'item no'] },
      { key: 'description', patterns: ['description', 'desc', 'particulars', 'item description'] },
      { key: 'unit', patterns: ['unit', 'uom', 'u/m'] },
      { key: 'quantity', patterns: ['quantity', 'qty', 'qnty'] },
      { key: 'supply_rate', patterns: ['supply rate', 'supply', 'material rate', 'rate supply'] },
      { key: 'install_rate', patterns: ['install rate', 'install', 'labour rate', 'rate install', 'labor'] },
      { key: 'total_rate', patterns: ['total rate', 'rate', 'unit rate'] },
      { key: 'total_amount', patterns: ['total', 'amount', 'total amount', 'value'] },
    ];

    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const rowCells = row.map(cell => String(cell || '').toLowerCase().trim());
      let matchCount = 0;
      const tempMapping: { [key: string]: number } = {};
      
      for (let colIdx = 0; colIdx < rowCells.length; colIdx++) {
        const cellValue = rowCells[colIdx];
        if (!cellValue) continue;
        
        for (const hp of headerPatterns) {
          if (hp.patterns.some(p => cellValue.includes(p))) {
            if (!tempMapping[hp.key]) {
              tempMapping[hp.key] = colIdx;
              matchCount++;
            }
            break;
          }
        }
      }
      
      if (tempMapping['description'] !== undefined || matchCount >= 2) {
        headerRowIndex = i;
        columnMapping = tempMapping;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
      columnMapping = { item_code: 0, description: 1, unit: 2, quantity: 3, supply_rate: 4, install_rate: 5 };
    }

    const getCol = (key: string): number => columnMapping[key] ?? -1;
    const parseNumeric = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const items: ParsedItem[] = [];
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const descCol = getCol('description') >= 0 ? getCol('description') : 1;
      const description = String(row[descCol] || '').trim();
      
      if (!description) continue;
      const descLower = description.toLowerCase();
      if (descLower === 'total' || descLower === 'grand total') continue;
      if (descLower.startsWith('total') && descLower.length < 20) continue;

      const codeCol = getCol('item_code') >= 0 ? getCol('item_code') : 0;
      const unitCol = getCol('unit') >= 0 ? getCol('unit') : 2;

      items.push({
        item_code: String(row[codeCol] || '').trim(),
        description,
        unit: String(row[unitCol] || '').trim() || 'No.',
        quantity: parseNumeric(row[getCol('quantity') >= 0 ? getCol('quantity') : 3]),
        supply_rate: parseNumeric(row[getCol('supply_rate') >= 0 ? getCol('supply_rate') : 4]),
        install_rate: parseNumeric(row[getCol('install_rate') >= 0 ? getCol('install_rate') : 5]),
      });
    }

    return items;
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

      // Parse all sheets first
      const parsedSheets: ParsedSheet[] = [];
      let baseNumber = 1;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const items = parseSheet(worksheet, sheetName);
        if (items.length === 0) continue;

        // Parse bill info from sheet name
        let billNumber = baseNumber;
        let billName = sheetName.trim();
        
        const match = sheetName.match(/^(?:Bill\s*)?(\d+(?:\.\d+)?)\s*[\-\.:\s]+(.+)/i);
        if (match) {
          billNumber = parseFloat(match[1]);
          billName = match[2].trim();
        } else {
          const numMatch = sheetName.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
          if (numMatch) {
            billNumber = parseFloat(numMatch[1]);
            billName = numMatch[2].trim() || sheetName;
          }
        }

        parsedSheets.push({ sheetName, billNumber, billName, items });
        baseNumber++;
      }

      if (parsedSheets.length === 0) {
        throw new Error("No valid data found in Excel file");
      }

      setProgress(20);
      setProgressText(`Found ${parsedSheets.length} bills, importing...`);

      // Delete existing bills/sections/items for this BOQ
      const { data: existingBills } = await supabase
        .from("boq_bills")
        .select("id")
        .eq("project_boq_id", boqId);

      if (existingBills && existingBills.length > 0) {
        const billIds = existingBills.map(b => b.id);
        
        // Get sections
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

      let totalItems = 0;
      const progressPerSheet = 60 / parsedSheets.length;

      // Process each sheet
      for (let si = 0; si < parsedSheets.length; si++) {
        const sheet = parsedSheets[si];
        setProgressText(`Importing ${sheet.billName}...`);

        // Create bill
        const { data: newBill, error: billError } = await supabase
          .from("boq_bills")
          .insert({
            project_boq_id: boqId,
            bill_number: si + 1,
            bill_name: sheet.billName || `Bill ${si + 1}`,
            display_order: si,
          })
          .select()
          .single();

        if (billError) throw billError;

        // Group items by section code
        const sectionGroups = new Map<string, ParsedItem[]>();
        
        for (const item of sheet.items) {
          let sectionCode = "1";
          const itemCode = item.item_code || "";
          
          const numericMatch = itemCode.match(/^(\d+\.\d+)/);
          const alphaMatch = itemCode.match(/^([A-Za-z]+\d*)/);
          
          if (numericMatch) {
            sectionCode = numericMatch[1];
          } else if (alphaMatch) {
            sectionCode = alphaMatch[1].toUpperCase();
          }
          
          if (!sectionGroups.has(sectionCode)) {
            sectionGroups.set(sectionCode, []);
          }
          sectionGroups.get(sectionCode)!.push(item);
        }

        // Batch insert sections
        const sectionsToCreate = Array.from(sectionGroups.keys()).map((code, idx) => ({
          bill_id: newBill.id,
          section_code: code,
          section_name: `Section ${code}`,
          display_order: idx,
        }));

        const { data: newSections, error: sectionsError } = await supabase
          .from("boq_project_sections")
          .insert(sectionsToCreate)
          .select();

        if (sectionsError) throw sectionsError;

        // Map section codes to IDs
        const sectionIdMap = new Map<string, string>();
        newSections?.forEach(s => sectionIdMap.set(s.section_code, s.id));

        // Batch insert all items for this bill
        const allItemsToInsert: any[] = [];
        
        for (const [sectionCode, items] of sectionGroups) {
          const sectionId = sectionIdMap.get(sectionCode);
          if (!sectionId) continue;

          items.forEach((item, idx) => {
            allItemsToInsert.push({
              section_id: sectionId,
              item_code: item.item_code,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              supply_rate: item.supply_rate,
              install_rate: item.install_rate,
              display_order: idx + 1,
            });
          });
        }

        // Insert in chunks of 100
        const chunkSize = 100;
        for (let i = 0; i < allItemsToInsert.length; i += chunkSize) {
          const chunk = allItemsToInsert.slice(i, i + chunkSize);
          const { error: itemsError } = await supabase.from("boq_items").insert(chunk);
          if (itemsError) throw itemsError;
        }

        totalItems += allItemsToInsert.length;
        setProgress(30 + (si + 1) * progressPerSheet);
      }

      setProgress(95);
      setProgressText("Refreshing data...");

      await queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      await queryClient.invalidateQueries({ queryKey: ["boq-project-sections"] });
      await queryClient.invalidateQueries({ queryKey: ["boq-items"] });

      setProgress(100);
      
      toast({
        title: "Success",
        description: `Imported ${totalItems} items across ${parsedSheets.length} bills`,
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
              Each sheet becomes a separate bill. Columns: Item Code, Description, Unit, Quantity, Supply Rate, Install Rate.
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
