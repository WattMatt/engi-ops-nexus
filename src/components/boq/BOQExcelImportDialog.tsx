import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface BOQExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boqId: string;
  projectId: string;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseSheet = (worksheet: XLSX.WorkSheet, sheetName: string) => {
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
    
    console.log(`Parsing sheet: ${sheetName}, rows: ${data.length}`);
    console.log('First 5 rows:', data.slice(0, 5));
    
    // Find header row by looking for common BOQ header patterns
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
      { key: 'supply_cost', patterns: ['supply cost', 'supply amount', 'material cost'] },
      { key: 'install_cost', patterns: ['install cost', 'install amount', 'labour cost', 'labor cost'] },
      { key: 'total_amount', patterns: ['total', 'amount', 'total amount', 'value'] },
    ];

    // Search first 15 rows for headers
    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const rowCells = row.map(cell => String(cell || '').toLowerCase().trim());
      
      // Check if this row has enough header-like content
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
      
      // If we found at least description column, use this as header row
      if (tempMapping['description'] !== undefined || matchCount >= 2) {
        headerRowIndex = i;
        columnMapping = tempMapping;
        console.log(`Found header at row ${i}:`, columnMapping);
        break;
      }
    }

    // If no header found, try to parse assuming standard column order
    if (headerRowIndex === -1) {
      console.log('No header found, using default column order');
      // Default: A=code, B=description, C=unit, D=qty, E=supply, F=install, G=rate, H-J=costs
      headerRowIndex = 0;
      columnMapping = {
        item_code: 0,
        description: 1,
        unit: 2,
        quantity: 3,
        supply_rate: 4,
        install_rate: 5,
        total_rate: 6,
        supply_cost: 7,
        install_cost: 8,
        total_amount: 9,
      };
      
      // Check if first row looks like headers (contains text without numbers)
      const firstRow = data[0];
      if (firstRow) {
        const firstRowStr = firstRow.map(c => String(c || '').toLowerCase()).join(' ');
        if (firstRowStr.includes('description') || firstRowStr.includes('code') || firstRowStr.includes('unit')) {
          headerRowIndex = 0; // Skip the header row
        } else {
          headerRowIndex = -1; // No header, start from row 0
        }
      }
    }

    const getCol = (key: string): number => columnMapping[key] ?? -1;
    const parseNumeric = (value: any, fallback: number = 0): number => {
      if (value === null || value === undefined || value === '') return fallback;
      // Remove currency symbols, spaces, and commas
      const cleaned = String(value).replace(/[R$€£,\s]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? fallback : parsed;
    };

    const items: any[] = [];
    const startRow = headerRowIndex + 1;
    
    console.log(`Starting data parsing from row ${startRow}`);
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Get description from mapped column or fallback to column 1
      const descCol = getCol('description') >= 0 ? getCol('description') : 1;
      const description = String(row[descCol] || '').trim();
      
      // Skip empty rows, section totals, or footer rows
      if (!description) continue;
      const descLower = description.toLowerCase();
      if (descLower.includes('total') && !descLower.includes('sub')) continue;
      if (descLower === 'total' || descLower === 'grand total') continue;

      // Get item code
      const codeCol = getCol('item_code') >= 0 ? getCol('item_code') : 0;
      const itemCode = String(row[codeCol] || '').trim();

      // Get unit
      const unitCol = getCol('unit') >= 0 ? getCol('unit') : 2;
      const unit = String(row[unitCol] || '').trim();

      // Get numeric values with flexible column mapping
      const quantity = parseNumeric(row[getCol('quantity') >= 0 ? getCol('quantity') : 3]);
      const supplyRate = parseNumeric(row[getCol('supply_rate') >= 0 ? getCol('supply_rate') : 4]);
      const installRate = parseNumeric(row[getCol('install_rate') >= 0 ? getCol('install_rate') : 5]);
      
      // Calculate rates if not directly available
      let totalRate = parseNumeric(row[getCol('total_rate') >= 0 ? getCol('total_rate') : 6]);
      if (totalRate === 0 && (supplyRate > 0 || installRate > 0)) {
        totalRate = supplyRate + installRate;
      }

      // Get costs or calculate them
      let supplyCost = parseNumeric(row[getCol('supply_cost') >= 0 ? getCol('supply_cost') : 7]);
      let installCost = parseNumeric(row[getCol('install_cost') >= 0 ? getCol('install_cost') : 8]);
      let totalAmount = parseNumeric(row[getCol('total_amount') >= 0 ? getCol('total_amount') : 9]);

      // Calculate if needed
      if (supplyCost === 0 && supplyRate > 0 && quantity > 0) {
        supplyCost = quantity * supplyRate;
      }
      if (installCost === 0 && installRate > 0 && quantity > 0) {
        installCost = quantity * installRate;
      }
      if (totalAmount === 0) {
        totalAmount = supplyCost + installCost || quantity * totalRate;
      }

      items.push({
        item_code: itemCode,
        description,
        unit: unit || 'No.',
        quantity,
        supply_rate: supplyRate,
        install_rate: installRate,
        total_rate: totalRate,
        supply_cost: supplyCost,
        install_cost: installCost,
        total_amount: totalAmount,
      });
    }

    console.log(`Parsed ${items.length} items from sheet ${sheetName}`);
    return items;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

      // Get existing max bill number
      const { data: existingBills } = await supabase
        .from("boq_bills")
        .select("bill_number")
        .eq("project_boq_id", boqId)
        .order("bill_number", { ascending: false })
        .limit(1);

      let nextBillNumber = (existingBills?.[0]?.bill_number || 0) + 1;
      let totalImported = 0;
      let billsCreated = 0;

      // Process each sheet as a separate BILL (not section)
      for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
        const sheetName = workbook.SheetNames[sheetIdx];
        const worksheet = workbook.Sheets[sheetName];
        const items = parseSheet(worksheet, sheetName);

        if (items.length === 0) continue;

        // Parse bill info from sheet name
        // Patterns: "1 - Mall", "Bill 1 Mall", "1-Mall", "1.Mall", "Mall"
        let billNumber = nextBillNumber;
        let billName = sheetName.trim();
        
        // Try to extract bill number from sheet name
        const billNumberMatch = sheetName.match(/^(?:Bill\s*)?(\d+)[\s\-\.]+(.+)/i);
        if (billNumberMatch) {
          billNumber = parseInt(billNumberMatch[1], 10);
          billName = billNumberMatch[2].trim();
        } else {
          // Check if sheet name starts with a number
          const startsWithNumber = sheetName.match(/^(\d+)\s*(.*)$/);
          if (startsWithNumber) {
            billNumber = parseInt(startsWithNumber[1], 10);
            billName = startsWithNumber[2].trim() || `Bill ${billNumber}`;
          }
        }

        // Check if bill already exists
        const { data: existingBill } = await supabase
          .from("boq_bills")
          .select("id")
          .eq("project_boq_id", boqId)
          .eq("bill_number", billNumber)
          .maybeSingle();

        let billId: string;
        if (existingBill) {
          billId = existingBill.id;
          // Update bill name
          await supabase.from("boq_bills").update({ bill_name: billName }).eq("id", billId);
        } else {
          const { data: newBill, error: billError } = await supabase
            .from("boq_bills")
            .insert({
              project_boq_id: boqId,
              bill_number: billNumber,
              bill_name: billName || `Bill ${billNumber}`,
              display_order: sheetIdx,
            })
            .select()
            .single();
          if (billError) throw billError;
          billId = newBill.id;
          billsCreated++;
          if (billNumber >= nextBillNumber) {
            nextBillNumber = billNumber + 1;
          }
        }

        // Create a default section for items (or group by item codes if they indicate sections)
        // First, analyze items to see if there are section patterns in item codes
        const sectionGroups = new Map<string, typeof items>();
        
        for (const item of items) {
          // Try to extract section from item code (e.g., "1.2.1" -> section "1.2", "A1.2" -> section "A1")
          let sectionCode = "1"; // Default section
          const itemCode = item.item_code || "";
          
          // Pattern: Major.Minor.Item (e.g., 1.2.3)
          const numericMatch = itemCode.match(/^(\d+\.\d+)/);
          if (numericMatch) {
            sectionCode = numericMatch[1];
          } else {
            // Pattern: Letter + Number (e.g., A1, B2)
            const alphaMatch = itemCode.match(/^([A-Za-z]\d+)/);
            if (alphaMatch) {
              sectionCode = alphaMatch[1].toUpperCase();
            } else if (itemCode) {
              // Use first part before any dots/dashes
              const firstPart = itemCode.split(/[\.\-]/)[0];
              if (firstPart) sectionCode = firstPart.toUpperCase();
            }
          }
          
          if (!sectionGroups.has(sectionCode)) {
            sectionGroups.set(sectionCode, []);
          }
          sectionGroups.get(sectionCode)!.push(item);
        }

        // Create sections and insert items
        let sectionDisplayOrder = 0;
        for (const [sectionCode, sectionItems] of sectionGroups) {
          // Derive section name from first item or use section code
          const firstItem = sectionItems[0];
          const sectionName = firstItem?.description?.split(/[\-\:]/)[0]?.trim()?.substring(0, 50) || 
                             `Section ${sectionCode}`;

          // Get or create section
          const { data: existingSection } = await supabase
            .from("boq_project_sections")
            .select("id")
            .eq("bill_id", billId)
            .eq("section_code", sectionCode)
            .maybeSingle();

          let sectionId: string;
          if (existingSection) {
            sectionId = existingSection.id;
            // Clear existing items to replace
            await supabase.from("boq_items").delete().eq("section_id", sectionId);
          } else {
            const { data: newSection, error: sectionError } = await supabase
              .from("boq_project_sections")
              .insert({
                bill_id: billId,
                section_code: sectionCode,
                section_name: sectionName,
                display_order: sectionDisplayOrder++,
              })
              .select()
              .single();
            if (sectionError) throw sectionError;
            sectionId = newSection.id;
          }

          // Insert items
          const itemsToInsert = sectionItems.map((item, idx) => ({
            section_id: sectionId,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            display_order: idx + 1,
          }));

          const { error: itemsError } = await supabase
            .from("boq_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
          totalImported += sectionItems.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections"] });
      queryClient.invalidateQueries({ queryKey: ["boq-items"] });

      toast({
        title: "Success",
        description: `Imported ${totalImported} items across ${billsCreated} bills from Excel`,
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
            />
            <p className="text-sm text-muted-foreground">
              Select an Excel file with BOQ data. Each sheet should have columns: Item Code, Description, Unit, Quantity, Supply Rate, Install Rate, etc.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

