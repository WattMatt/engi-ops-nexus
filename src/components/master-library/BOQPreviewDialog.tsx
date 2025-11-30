import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSpreadsheet, Check } from "lucide-react";
import { parseExcelFile, ParsedSheet } from "@/utils/excelParser";

interface SheetSelection {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
  selected: boolean;
  selectedRows: Set<number>;
}

interface BOQPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (selectedContent: string, selectedSheets: string[]) => void;
}

export const BOQPreviewDialog = ({
  open,
  onOpenChange,
  file,
  onConfirm,
}: BOQPreviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<SheetSelection[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [selectAllRows, setSelectAllRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && file) {
      loadFile();
    }
  }, [open, file]);

  const loadFile = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const parsed = await parseExcelFile(file);
      
      const sheetData: SheetSelection[] = parsed.sheets.map((sheet: ParsedSheet) => {
        // Skip sheets that are likely not BOQ data
        const isLikelyBOQ = !sheet.name.toLowerCase().includes("notes") &&
                           !sheet.name.toLowerCase().includes("qualification") &&
                           !sheet.name.toLowerCase().includes("summary") &&
                           sheet.rows.length > 0;
        
        return {
          name: sheet.name,
          headers: sheet.headers,
          rows: sheet.rows,
          selected: isLikelyBOQ,
          selectedRows: new Set<number>(isLikelyBOQ ? sheet.rows.map((_, i) => i) : []),
        };
      });
      
      setSheets(sheetData);
      if (sheetData.length > 0) {
        setActiveSheet(sheetData[0].name);
        // Initialize selectAll state
        const selectAllState: Record<string, boolean> = {};
        sheetData.forEach(s => {
          selectAllState[s.name] = s.selected;
        });
        setSelectAllRows(selectAllState);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSheetSelection = (sheetName: string) => {
    setSheets(prev => prev.map(sheet => {
      if (sheet.name === sheetName) {
        const newSelected = !sheet.selected;
        return {
          ...sheet,
          selected: newSelected,
          selectedRows: newSelected ? new Set(sheet.rows.map((_, i) => i)) : new Set(),
        };
      }
      return sheet;
    }));
    setSelectAllRows(prev => ({ ...prev, [sheetName]: !prev[sheetName] }));
  };

  const toggleRowSelection = (sheetName: string, rowIndex: number) => {
    setSheets(prev => prev.map(sheet => {
      if (sheet.name === sheetName) {
        const newSelectedRows = new Set(sheet.selectedRows);
        if (newSelectedRows.has(rowIndex)) {
          newSelectedRows.delete(rowIndex);
        } else {
          newSelectedRows.add(rowIndex);
        }
        return {
          ...sheet,
          selected: newSelectedRows.size > 0,
          selectedRows: newSelectedRows,
        };
      }
      return sheet;
    }));
  };

  const toggleAllRowsInSheet = (sheetName: string) => {
    const currentState = selectAllRows[sheetName];
    setSheets(prev => prev.map(sheet => {
      if (sheet.name === sheetName) {
        return {
          ...sheet,
          selected: !currentState,
          selectedRows: !currentState ? new Set(sheet.rows.map((_, i) => i)) : new Set(),
        };
      }
      return sheet;
    }));
    setSelectAllRows(prev => ({ ...prev, [sheetName]: !currentState }));
  };

  const handleConfirm = () => {
    // Build content string from selected sheets and rows
    const selectedSheets: string[] = [];
    let contentParts: string[] = [];

    sheets.forEach(sheet => {
      if (sheet.selected && sheet.selectedRows.size > 0) {
        selectedSheets.push(sheet.name);
        
        // Build sheet content
        let sheetContent = `=== SHEET: ${sheet.name} ===\n\n`;
        
        // Add headers
        if (sheet.headers.length > 0) {
          sheetContent += sheet.headers.join("\t") + "\n";
        }
        
        // Add selected rows
        sheet.rows.forEach((row, idx) => {
          if (sheet.selectedRows.has(idx)) {
            const values = sheet.headers.map(h => String(row[h] ?? ""));
            sheetContent += values.join("\t") + "\n";
          }
        });
        
        contentParts.push(sheetContent);
      }
    });

    const combinedContent = contentParts.join("\n");
    onConfirm(combinedContent, selectedSheets);
  };

  const currentSheet = sheets.find(s => s.name === activeSheet);
  const selectedSheetCount = sheets.filter(s => s.selected).length;
  const totalSelectedRows = sheets.reduce((acc, s) => acc + s.selectedRows.size, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Preview & Select Data to Extract
          </DialogTitle>
          <DialogDescription>
            Review the spreadsheet content and select which sheets and rows to extract with AI.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Parsing spreadsheet...</span>
          </div>
        ) : sheets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            No data found in file
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Sheet tabs with selection */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Sheets:</span>
              <div className="flex flex-wrap gap-2">
                {sheets.map(sheet => (
                  <div key={sheet.name} className="flex items-center gap-1">
                    <Checkbox
                      checked={sheet.selected}
                      onCheckedChange={() => toggleSheetSelection(sheet.name)}
                      id={`sheet-${sheet.name}`}
                    />
                    <Button
                      variant={activeSheet === sheet.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveSheet(sheet.name)}
                      className="h-7"
                    >
                      {sheet.name}
                      {sheet.selected && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                          {sheet.selectedRows.size}
                        </Badge>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Current sheet content */}
            {currentSheet && (
              <div className="flex-1 min-h-0 border rounded-lg">
                <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectAllRows[currentSheet.name] || false}
                      onCheckedChange={() => toggleAllRowsInSheet(currentSheet.name)}
                      id="select-all-rows"
                    />
                    <label htmlFor="select-all-rows" className="text-sm cursor-pointer">
                      Select all rows ({currentSheet.rows.length})
                    </label>
                  </div>
                  <Badge variant="outline">
                    {currentSheet.selectedRows.size} of {currentSheet.rows.length} rows selected
                  </Badge>
                </div>
                
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 sticky left-0 bg-background"></TableHead>
                        {currentSheet.headers.map((header, idx) => (
                          <TableHead key={idx} className="min-w-[100px] max-w-[300px] truncate">
                            {header || `Column ${idx + 1}`}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentSheet.rows.map((row, rowIdx) => (
                        <TableRow 
                          key={rowIdx}
                          className={currentSheet.selectedRows.has(rowIdx) ? "bg-primary/5" : ""}
                        >
                          <TableCell className="sticky left-0 bg-background">
                            <Checkbox
                              checked={currentSheet.selectedRows.has(rowIdx)}
                              onCheckedChange={() => toggleRowSelection(currentSheet.name, rowIdx)}
                            />
                          </TableCell>
                          {currentSheet.headers.map((header, cellIdx) => {
                            const cellValue = String(row[header] ?? "");
                            return (
                              <TableCell 
                                key={cellIdx} 
                                className="max-w-[300px] truncate"
                                title={cellValue}
                              >
                                {cellValue}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedSheetCount} sheet(s), {totalSelectedRows} row(s) selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={totalSelectedRows === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              Extract Selected Data
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
