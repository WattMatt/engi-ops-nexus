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
    
    // Find header row (look for "Item Code" or similar)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      if (rowStr.includes('item code') || (rowStr.includes('code') && rowStr.includes('description'))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) return [];

    const items: any[] = [];
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const itemCode = String(row[0] || '').trim();
      const description = String(row[1] || '').trim();
      
      // Skip empty rows or totals
      if (!description || description.toLowerCase().includes('total')) continue;

      const unit = String(row[2] || '').trim();
      const parseNumeric = (value: any, fallback: number = 0): number => {
        const parsed = parseFloat(String(value || '0'));
        return isNaN(parsed) ? fallback : parsed;
      };
      const quantity = parseNumeric(row[3]);
      const supplyRate = parseNumeric(row[4]);
      const installRate = parseNumeric(row[5]);
      const totalRate = parseNumeric(row[6], supplyRate + installRate);
      const supplyCost = parseNumeric(row[7], quantity * supplyRate);
      const installCost = parseNumeric(row[8], quantity * installRate);
      const totalAmount = parseNumeric(row[9], supplyCost + installCost);

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

        // Insert items
        const itemsToInsert = items.map((item) => ({
          section_id: sectionId,
          ...item,
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

