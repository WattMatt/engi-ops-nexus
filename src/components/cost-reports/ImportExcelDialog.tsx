import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExcelImportGuide } from "./ExcelImportGuide";
import * as XLSX from "xlsx";

interface ImportExcelDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const ImportExcelDialog = ({
  reportId,
  onSuccess,
}: ImportExcelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseExcelData = async (file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData as any[]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
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
      const excelData = await parseExcelData(file);

      // Find the data start - look for first row with single letter code (like A, B, C)
      let dataStartIndex = -1;
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        if (row && row.length > 1) {
          const code = row[0]?.toString().trim();
          const description = row[1]?.toString().trim();
          // Look for category-like pattern: single letter code with a description
          if (code && code.match(/^[A-Z]$/) && description && description.length > 3) {
            dataStartIndex = i;
            break;
          }
        }
      }

      if (dataStartIndex === -1) {
        throw new Error("Could not find cost data in the Excel file. Please ensure it contains categories with codes like A, B, C.");
      }

      // Parse the Excel structure
      const categories: any[] = [];
      const lineItems: any[] = [];
      let displayOrder = 0;

      for (let i = dataStartIndex; i < excelData.length; i++) {
        const row = excelData[i];
        if (!row || row.length === 0) continue;

        const code = row[0]?.toString().trim();
        const description = row[1]?.toString().trim();

        if (!code || !description) continue;
        
        // Skip summary rows or rows with "OVERALL" in description
        if (description.toUpperCase().includes("OVERALL") || 
            description.toUpperCase().includes("SUMMARY")) {
          continue;
        }

        // Parse numeric values, handling possible formatting
        const parseAmount = (val: any): number => {
          if (!val) return 0;
          const str = val.toString().replace(/[,\s]/g, '');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        // Check if it's a category (single letter code like A, B, C)
        if (code.match(/^[A-Z]$/)) {
          const category = {
            code,
            description,
            original_budget: parseAmount(row[2]),
            previous_report: parseAmount(row[3]),
            anticipated_final: parseAmount(row[4]),
            display_order: displayOrder++,
          };
          categories.push(category);
        }
        // Check if it's a line item (code like A1, B2, etc.)
        else if (code.match(/^[A-Z]\d+$/)) {
          const categoryCode = code.charAt(0);
          const lineItem = {
            category_code: categoryCode,
            code,
            description,
            original_budget: parseAmount(row[2]),
            previous_report: parseAmount(row[3]),
            anticipated_final: parseAmount(row[4]),
            display_order: displayOrder++,
          };
          lineItems.push(lineItem);
        }
      }

      // Insert categories
      const { data: insertedCategories, error: categoriesError } = await supabase
        .from("cost_categories")
        .insert(
          categories.map((cat) => ({
            ...cat,
            cost_report_id: reportId,
          }))
        )
        .select();

      if (categoriesError) throw categoriesError;

      // Create a map of category codes to IDs
      const categoryMap = new Map();
      insertedCategories?.forEach((cat) => {
        categoryMap.set(cat.code, cat.id);
      });

      // Insert line items with correct category IDs
      const lineItemsToInsert = lineItems
        .filter((item) => categoryMap.has(item.category_code))
        .map((item) => ({
          category_id: categoryMap.get(item.category_code),
          code: item.code,
          description: item.description,
          original_budget: item.original_budget,
          previous_report: item.previous_report,
          anticipated_final: item.anticipated_final,
          display_order: item.display_order,
        }));

      if (lineItemsToInsert.length > 0) {
        const { error: lineItemsError } = await supabase
          .from("cost_line_items")
          .insert(lineItemsToInsert);

        if (lineItemsError) throw lineItemsError;
      }

      toast({
        title: "Success",
        description: `Imported ${categories.length} categories and ${lineItems.length} line items`,
      });

      setOpen(false);
      setFile(null);
      onSuccess();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Import Cost Data from Excel</DialogTitle>
            <ExcelImportGuide />
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload your Excel file with cost categories and line items
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Expected columns: CODE | DESCRIPTION | ORIGINAL BUDGET | PREVIOUS REPORT |
              ANTICIPATED FINAL
            </p>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </div>
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file && (
              <p className="text-sm mt-4 text-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? "Importing..." : "Import Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
