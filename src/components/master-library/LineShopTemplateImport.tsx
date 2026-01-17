import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedTemplate {
  areaLabel: string;
  minArea: number;
  maxArea: number;
  dbSize: string;
  items: ParsedItem[];
}

interface ParsedItem {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  supplyRate: number;
  installRate: number;
  category: string;
}

const CATEGORY_PATTERNS: Record<string, RegExp> = {
  "Conduits & Fittings": /conduit|box|saddle|lid|coupler|adaptor|bend/i,
  "Conductors & Cables": /wire|cable|conductor|earth/i,
  "Appliances & Accessories": /socket|switch|isolator|plug|outlet|cover/i,
  "Lighting": /light|lamp|fitting|led|downlight|batten|emergency/i,
  "Distribution": /db|board|mcb|rcd|breaker|distribution/i,
  "Earthing": /earth|bond|ground/i,
};

function detectCategory(description: string): string {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(description)) {
      return category;
    }
  }
  return "Other";
}

function parseAreaRange(sheetName: string): { min: number; max: number; label: string } {
  // Try to extract area range from sheet name like "0-40m²" or "41-80" or "0m² - 40m²"
  const match = sheetName.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (match) {
    return {
      min: parseInt(match[1]),
      max: parseInt(match[2]),
      label: `${match[1]}m² - ${match[2]}m²`,
    };
  }
  // Default fallback
  return { min: 0, max: 100, label: sheetName };
}

export function LineShopTemplateImport({ open, onOpenChange, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTemplates, setParsedTemplates] = useState<ParsedTemplate[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);
    setParsedTemplates([]);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const templates: ParsedTemplate[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (data.length < 2) continue;

        const areaRange = parseAreaRange(sheetName);
        const items: ParsedItem[] = [];
        let dbSize = "";

        // Find header row and column indices
        let headerRowIndex = 0;
        const headerRow = data.find((row, idx) => {
          const hasDescription = row.some(
            (cell) =>
              typeof cell === "string" &&
              (cell.toLowerCase().includes("description") ||
                cell.toLowerCase().includes("item"))
          );
          if (hasDescription) {
            headerRowIndex = idx;
            return true;
          }
          return false;
        });

        if (!headerRow) continue;

        // Map column indices
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell, idx) => {
          const cellStr = String(cell || "").toLowerCase();
          if (cellStr.includes("code") || cellStr.includes("no")) colMap.code = idx;
          if (cellStr.includes("description") || cellStr.includes("item")) colMap.description = idx;
          if (cellStr.includes("unit")) colMap.unit = idx;
          if (cellStr.includes("qty") || cellStr.includes("quantity")) colMap.quantity = idx;
          if (cellStr.includes("supply") && cellStr.includes("rate")) colMap.supplyRate = idx;
          if (cellStr.includes("install") && cellStr.includes("rate")) colMap.installRate = idx;
        });

        // Parse data rows
        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const description = String(row[colMap.description] || "").trim();
          if (!description || description.length < 3) continue;

          // Check if this is a DB size row
          if (/\b(db|distribution|board)\b/i.test(description) && /\b\d+\s*a\b/i.test(description)) {
            const dbMatch = description.match(/(\d+)\s*a\s*(tp|sp)?/i);
            if (dbMatch) {
              dbSize = `${dbMatch[1]}A ${dbMatch[2]?.toUpperCase() || "TP"}`;
            }
          }

          items.push({
            itemCode: String(row[colMap.code] || "").trim(),
            description,
            unit: String(row[colMap.unit] || "No").trim(),
            quantity: parseFloat(row[colMap.quantity]) || 0,
            supplyRate: parseFloat(row[colMap.supplyRate]) || 0,
            installRate: parseFloat(row[colMap.installRate]) || 0,
            category: detectCategory(description),
          });
        }

        if (items.length > 0) {
          templates.push({
            areaLabel: areaRange.label,
            minArea: areaRange.min,
            maxArea: areaRange.max,
            dbSize,
            items,
          });
        }
      }

      if (templates.length === 0) {
        setParseError("No valid templates found in the file. Make sure sheets have header rows with Description, Unit, and Qty columns.");
      } else {
        setParsedTemplates(templates);
      }
    } catch (error: any) {
      setParseError(error.message || "Failed to parse Excel file");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const importMutation = useMutation({
    mutationFn: async () => {
      for (const template of parsedTemplates) {
        // Create template
        const { data: newTemplate, error: templateError } = await supabase
          .from("line_shop_material_templates")
          .insert({
            min_area: template.minArea,
            max_area: template.maxArea,
            area_label: template.areaLabel,
            db_size: template.dbSize || null,
            is_global: true,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Create items
        if (template.items.length > 0) {
          const { error: itemsError } = await supabase
            .from("line_shop_template_items")
            .insert(
              template.items.map((item, idx) => ({
                template_id: newTemplate.id,
                item_code: item.itemCode,
                description: item.description,
                unit: item.unit,
                quantity: item.quantity,
                supply_rate: item.supplyRate,
                install_rate: item.installRate,
                category: item.category,
                display_order: idx,
              }))
            );

          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      toast.success(`Imported ${parsedTemplates.length} template(s) successfully`);
      onImportComplete();
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    },
  });

  const handleClose = () => {
    setFile(null);
    setParsedTemplates([]);
    setParseError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Line Shop Templates</DialogTitle>
          <DialogDescription>
            Upload an Excel file with area-based material templates. Each sheet should represent a different area range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="excel-upload" className="cursor-pointer">
                <span className="text-primary font-medium">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Excel files (.xlsx, .xls)
                </p>
              </Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {isParsing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3">Parsing file...</span>
            </div>
          )}

          {parseError && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedTemplates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Found {parsedTemplates.length} template(s) to import</span>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-4">
                  {parsedTemplates.map((template, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{template.areaLabel}</span>
                        <div className="flex gap-2">
                          {template.dbSize && (
                            <Badge variant="outline">{template.dbSize}</Badge>
                          )}
                          <Badge>{template.items.length} items</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Categories:{" "}
                        {[...new Set(template.items.map((i) => i.category))].join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {parsedTemplates.length > 0 && (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending
                ? "Importing..."
                : `Import ${parsedTemplates.length} Template(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
