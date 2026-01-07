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

      // Get or create a default bill
      const { data: existingBills } = await supabase
        .from("boq_bills")
        .select("id")
        .eq("project_boq_id", boqId)
        .limit(1);

      let billId = existingBills?.[0]?.id;
      if (!billId) {
        const { data: newBill, error: billError } = await supabase
          .from("boq_bills")
          .insert({
            project_boq_id: boqId,
            bill_number: 1,
            bill_name: "Imported Bill",
            display_order: 0,
          })
          .select()
          .single();
        if (billError) throw billError;
        billId = newBill.id;
      }

      let totalImported = 0;

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const items = parseSheet(worksheet, sheetName);

        if (items.length === 0) continue;

        // Extract section code from sheet name
        // Try multiple patterns to match various section code formats:
        // - Single letter: A, B, C
        // - Letter with numbers: A1, B2.1, C3.2.1
        // - Numbers with dots: 1.1, 1.2.3
        // - Alphanumeric: AA1, AB-1, etc.
        // - Patterns like "B1-A", "Section-A", etc.
        let sectionCodeMatch = sheetName.match(/^([A-Za-z]\d*\.?\d*)/); // Letter followed by optional numbers/dots
        if (!sectionCodeMatch) {
          sectionCodeMatch = sheetName.match(/^(\d+\.?\d*)/); // Number(s) with optional dots
        }
        if (!sectionCodeMatch) {
          sectionCodeMatch = sheetName.match(/([A-Za-z]+-?\d*\.?\d*)/); // Alphanumeric with optional dash
        }
        if (!sectionCodeMatch) {
          // Try to extract from patterns like "B1-A", "Section-A", etc.
          sectionCodeMatch = sheetName.match(/([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)/);
        }
        
        // Normalize to uppercase and use first 20 chars as fallback
        const sectionCode = sectionCodeMatch 
          ? sectionCodeMatch[1].toUpperCase().trim() 
          : sheetName.substring(0, 20).toUpperCase().trim().replace(/[^A-Za-z0-9.]/g, '');
        
        // Extract section name by removing the code prefix
        const sectionName = sheetName
          .replace(/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\s*-?\s*/i, '') // Remove code prefix
          .substring(0, 50)
          .trim() || sheetName.substring(0, 50);

        // Get or create section
        const { data: existingSection, error: sectionCheckError } = await supabase
          .from("boq_project_sections")
          .select("id")
          .eq("bill_id", billId)
          .eq("section_code", sectionCode)
          .maybeSingle();
        
        if (sectionCheckError) throw sectionCheckError;

        let sectionId = existingSection?.id;
        if (!sectionId) {
          // Get current max display_order for this bill to append new section at the end
          const { data: existingSections } = await supabase
            .from("boq_project_sections")
            .select("display_order")
            .eq("bill_id", billId)
            .order("display_order", { ascending: false })
            .limit(1);

          const displayOrder = existingSections && existingSections.length > 0
            ? (existingSections[0].display_order || 0) + 1
            : 0;

          const { data: newSection, error: sectionError } = await supabase
            .from("boq_project_sections")
            .insert({
              bill_id: billId,
              section_code: sectionCode,
              section_name: sectionName,
              display_order: displayOrder,
            })
            .select()
            .single();
          if (sectionError) throw sectionError;
          sectionId = newSection.id;
        }

        // Get max display order
        const { data: existingItems } = await supabase
          .from("boq_items")
          .select("display_order")
          .eq("section_id", sectionId)
          .order("display_order", { ascending: false })
          .limit(1);

        let displayOrder = existingItems?.[0]?.display_order || 0;

        // Insert items - exclude computed columns (total_rate, supply_cost, install_cost, total_amount)
        const itemsToInsert = items.map((item) => ({
          section_id: sectionId,
          item_code: item.item_code,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          supply_rate: item.supply_rate,
          install_rate: item.install_rate,
          display_order: ++displayOrder,
        }));

        const { error: itemsError } = await supabase
          .from("boq_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
        totalImported += items.length;
      }

      queryClient.invalidateQueries({ queryKey: ["boq-bills", boqId] });
      queryClient.invalidateQueries({ queryKey: ["boq-project-sections"] });
      queryClient.invalidateQueries({ queryKey: ["boq-items"] });

      toast({
        title: "Success",
        description: `Imported ${totalImported} items from Excel`,
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

