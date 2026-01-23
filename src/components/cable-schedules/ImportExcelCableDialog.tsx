import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportExcelCableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  onSuccess: () => void;
}

interface ParsedCableEntry {
  cable_tag: string;
  from_location: string;
  to_location: string;
  voltage: number | null;
  load_amps: number | null;
  cable_size: string | null;
  ohm_per_km: number | null;
  cable_number: number;
  extra_length: number | null;
  measured_length: number | null;
  total_length: number | null;
  volt_drop: number | null;
  notes: string | null;
  supply_cost: number | null;
  install_cost: number | null;
  total_cost: number | null;
}

// Parse numeric value from cell (handles currency strings like "R848.10")
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  
  const str = String(value).replace(/[R,\s]/g, "").trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Extract cable data from a row based on the Excel format
function parseCableRow(row: any[]): ParsedCableEntry | null {
  // The format from the Excel:
  // Col 0: CABLE TAG (e.g., "MINISUB 1-MAIN BOARD 1.1-240-1")
  // Col 1-2: Empty
  // Col 3: FROM location
  // Col 4: TO location
  // Col 5: VOLTAGE
  // Col 6: LOAD (amps)
  // Col 7: TYPE/SIZE (cable size in mm²)
  // Col 8: Ohm/km
  // Col 9: CABLE NO (parallel cable number)
  // Col 10: EXTRA length
  // Col 11: LENGTH (measured)
  // Col 12: VOLT DROP
  // Col 13: SITE AGREE (can be used for notes)
  // Col 14: NOTES
  // Later columns have cost data
  
  const cableTag = String(row[0] || "").trim();
  
  // Skip header rows, empty rows, or rows without a valid cable tag
  if (!cableTag || 
      cableTag.toUpperCase() === "CABLE TAG:" ||
      cableTag.toUpperCase().includes("CABLE SCHEDULE") ||
      cableTag.toUpperCase().includes("INSERT LOGO") ||
      cableTag.toUpperCase().includes("LAYOUT:") ||
      cableTag.toUpperCase().includes("NOTE:") ||
      cableTag.toUpperCase().includes("DATE:")) {
    return null;
  }
  
  // Extract from and to locations
  const fromLocation = String(row[3] || "").trim();
  const toLocation = String(row[4] || "").trim();
  
  // Must have valid locations
  if (!fromLocation || !toLocation) {
    return null;
  }
  
  const voltage = parseNumber(row[5]);
  const loadAmps = parseNumber(row[6]);
  const cableSize = row[7] ? String(row[7]).trim() : null;
  const ohmPerKm = parseNumber(row[8]);
  const cableNumber = parseNumber(row[9]) || 1;
  const extraLength = parseNumber(row[10]);
  const measuredLength = parseNumber(row[11]);
  const voltDrop = parseNumber(row[12]);
  
  // Notes from columns 13, 14
  const siteAgree = row[13] ? String(row[13]).trim() : "";
  const notesCol = row[14] ? String(row[14]).trim() : "";
  const notes = [siteAgree, notesCol].filter(Boolean).join(" | ") || null;
  
  // Cost data is typically in later columns (around 18-21 based on the format)
  // Columns 18-21: CABLES, SUPPLY*, INSTALL*, TOTAL
  const supplyCost = parseNumber(row[19]);
  const installCost = parseNumber(row[20]);
  const totalCost = parseNumber(row[21]);
  
  // Calculate total length
  const totalLength = measuredLength !== null 
    ? measuredLength + (extraLength || 0)
    : null;
  
  return {
    cable_tag: cableTag,
    from_location: fromLocation,
    to_location: toLocation,
    voltage,
    load_amps: loadAmps,
    cable_size: cableSize,
    ohm_per_km: ohmPerKm,
    cable_number: cableNumber as number,
    extra_length: extraLength,
    measured_length: measuredLength,
    total_length: totalLength,
    volt_drop: voltDrop,
    notes,
    supply_cost: supplyCost,
    install_cost: installCost,
    total_cost: totalCost,
  };
}

export function ImportExcelCableDialog({
  open,
  onOpenChange,
  scheduleId,
  onSuccess,
}: ImportExcelCableDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedEntries, setParsedEntries] = useState<ParsedCableEntry[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setImporting(false);
    setProgress(0);
    setParsedEntries([]);
    setParseError(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseExcelFile = useCallback(async (selectedFile: File) => {
    setParsing(true);
    setParseError(null);
    setParsedEntries([]);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      const entries: ParsedCableEntry[] = [];
      
      // Process the first sheet (or named "Cable Schedule" if exists)
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes("cable") || name.toLowerCase().includes("schedule")
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Parse each row
      for (const row of data) {
        const entry = parseCableRow(row);
        if (entry) {
          entries.push(entry);
        }
      }
      
      if (entries.length === 0) {
        setParseError("No valid cable entries found in the Excel file. Please ensure the file follows the expected format.");
      } else {
        setParsedEntries(entries);
      }
    } catch (error: any) {
      console.error("Parse error:", error);
      setParseError(`Failed to parse Excel file: ${error.message}`);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith(".xlsx") && 
        !selectedFile.name.endsWith(".xls")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }
    
    setFile(selectedFile);
    parseExcelFile(selectedFile);
  }, [parseExcelFile, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = async () => {
    if (parsedEntries.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < parsedEntries.length; i += batchSize) {
        const batch = parsedEntries.slice(i, i + batchSize);
        
        const insertData = batch.map((entry, idx) => ({
          schedule_id: scheduleId,
          cable_tag: entry.cable_tag,
          base_cable_tag: entry.cable_tag.replace(/-\d+$/, ""), // Remove trailing number for parallel grouping
          from_location: entry.from_location,
          to_location: entry.to_location,
          voltage: entry.voltage,
          load_amps: entry.load_amps,
          cable_size: entry.cable_size,
          cable_type: "Aluminium", // Default based on the note in Excel
          ohm_per_km: entry.ohm_per_km,
          cable_number: entry.cable_number,
          extra_length: entry.extra_length || 0,
          measured_length: entry.measured_length || 0,
          total_length: entry.total_length || 0,
          volt_drop: entry.volt_drop,
          notes: entry.notes,
          supply_cost: entry.supply_cost || 0,
          install_cost: entry.install_cost || 0,
          total_cost: entry.total_cost || 0,
          display_order: i + idx,
          installation_method: "air",
          quantity: 1,
        }));

        const { error } = await supabase
          .from("cable_entries")
          .insert(insertData);

        if (error) {
          throw error;
        }

        imported += batch.length;
        setProgress(Math.round((imported / parsedEntries.length) * 100));
      }

      toast({
        title: "Import Successful",
        description: `Imported ${parsedEntries.length} cable entries`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Cable Schedule from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file containing cable schedule data. The file should have columns for
            cable tag, from/to locations, voltage, load, cable size, length, and costs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your Excel file here, or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
                id="cable-excel-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="cable-excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Select Excel File
                </label>
              </Button>
            </div>
          )}

          {/* Parsing Status */}
          {parsing && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <span>Parsing Excel file...</span>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Summary */}
          {parsedEntries.length > 0 && !importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium">
                      Found {parsedEntries.length} cable entries ready to import
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>File: {file?.name}</p>
                      <p>
                        Sample entries:{" "}
                        {parsedEntries.slice(0, 3).map(e => e.cable_tag).join(", ")}
                        {parsedEntries.length > 3 && "..."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing cable entries...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedEntries.length === 0 || importing || parsing}
          >
            {importing ? "Importing..." : `Import ${parsedEntries.length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
