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
import { Loader2, FileSpreadsheet, Check, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { parseExcelFile, ParsedSheet, ColumnDetectionResult, getColumnDetectionSummary } from "@/utils/excelParser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SheetSelection {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
  selected: boolean;
  selectedRows: Set<number>;
  rowCount: number;
  columnDetection: ColumnDetectionResult;
}

interface BOQPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (selectedContent: string, selectedSheets: string[]) => void;
}

const MAX_PREVIEW_ROWS = 10;

export const BOQPreviewDialog = ({
  open,
  onOpenChange,
  file,
  onConfirm,
}: BOQPreviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    
    try {
      const parsed = await parseExcelFile(file);
      
      if (parsed.sheets.length === 0) {
        setError("No data found in file. The file appears to be empty.");
        setSheets([]);
        return;
      }
      
      const sheetData: SheetSelection[] = parsed.sheets.map((sheet: ParsedSheet) => {
        // Skip sheets that are likely not BOQ data
        const isLikelyBOQ = !sheet.name.toLowerCase().includes("notes") &&
                           !sheet.name.toLowerCase().includes("qualification") &&
                           !sheet.name.toLowerCase().includes("summary only") &&
                           sheet.rows.length > 0;
        
        return {
          name: sheet.name,
          headers: sheet.headers,
          rows: sheet.rows,
          selected: isLikelyBOQ,
          selectedRows: new Set<number>(isLikelyBOQ ? sheet.rows.map((_, i) => i) : []),
          rowCount: sheet.rowCount,
          columnDetection: parsed.columnDetection[sheet.name] || {},
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
    } catch (err) {
      console.error("Error parsing file:", err);
      setError(err instanceof Error ? err.message : "Failed to parse file");
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

  // Get column detection info for current sheet
  const currentDetection = currentSheet ? currentSheet.columnDetection : {};
  const detectionSummary = currentSheet 
    ? getColumnDetectionSummary(currentDetection, currentSheet.headers)
    : { detected: [], missing: [], mappings: [] };

  // Check if column is a detected BOQ column
  const getColumnType = (index: number): string | null => {
    for (const [key, idx] of Object.entries(currentDetection)) {
      if (idx === index) {
        return key;
      }
    }
    return null;
  };

  const getColumnBadgeColor = (columnType: string | null): string => {
    switch (columnType) {
      case 'description': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'quantity': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'unit': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'totalRate':
      case 'supplyRate':
      case 'installRate': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'amount': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'itemCode': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      default: return '';
    }
  };

  const getColumnLabel = (columnType: string | null): string => {
    switch (columnType) {
      case 'description': return 'DESC';
      case 'quantity': return 'QTY';
      case 'unit': return 'UNIT';
      case 'totalRate': return 'RATE';
      case 'supplyRate': return 'SUPPLY';
      case 'installRate': return 'INSTALL';
      case 'amount': return 'AMOUNT';
      case 'itemCode': return 'CODE';
      default: return '';
    }
  };

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
        ) : error ? (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Parsing File</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : sheets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            No data found in file
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Sheet tabs with selection and row counts */}
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
                      onClick={() => {
                        setActiveSheet(sheet.name);
                        // Auto-select sheet when clicking its tab to view
                        if (!sheet.selected) {
                          toggleSheetSelection(sheet.name);
                        }
                      }}
                      className="h-7"
                    >
                      {sheet.name}
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        {sheet.rowCount} rows
                      </Badge>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column Detection Summary */}
            {currentSheet && currentSheet.selected && (
              <div className="mb-4 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Auto-Detected Columns</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <strong>Detected:</strong>{" "}
                      {detectionSummary.detected.length > 0 
                        ? detectionSummary.detected.join(", ") 
                        : "None"}
                    </span>
                  </div>
                  {detectionSummary.missing.length > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">
                        <strong>Not detected:</strong> {detectionSummary.missing.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                {detectionSummary.mappings.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detectionSummary.mappings.map(m => (
                      <Badge key={m.field} variant="outline" className={getColumnBadgeColor(Object.keys(currentDetection).find(k => currentDetection[k as keyof ColumnDetectionResult] === m.index) || null)}>
                        {m.field} → "{m.column}"
                      </Badge>
                    ))}
                  </div>
                )}
                {detectionSummary.detected.length < 3 && (
                  <Alert className="mt-2" variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Few columns detected. Consider using manual column mapping if auto-detection doesn't match your BOQ structure.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Current sheet content - only show if sheet is selected */}
            {currentSheet && currentSheet.selected ? (
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Showing first {Math.min(MAX_PREVIEW_ROWS, currentSheet.rows.length)} of {currentSheet.rows.length} rows
                    </Badge>
                    <Badge variant="secondary">
                      {currentSheet.selectedRows.size} selected
                    </Badge>
                  </div>
                </div>
                
                <ScrollArea className="h-[350px]">
                  <TooltipProvider>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 sticky left-0 bg-background"></TableHead>
                          {currentSheet.headers.map((header, idx) => {
                            const columnType = getColumnType(idx);
                            return (
                              <TableHead 
                                key={idx} 
                                className={`min-w-[100px] max-w-[300px] ${columnType ? getColumnBadgeColor(columnType) : ''}`}
                              >
                                <div className="flex flex-col gap-1">
                                  <span className="truncate">{header || `Column ${idx + 1}`}</span>
                                  {columnType && (
                                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 w-fit ${getColumnBadgeColor(columnType)}`}>
                                      {getColumnLabel(columnType)}
                                    </Badge>
                                  )}
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentSheet.rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIdx) => (
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
                              const columnType = getColumnType(cellIdx);
                              return (
                                <Tooltip key={cellIdx}>
                                  <TooltipTrigger asChild>
                                    <TableCell 
                                      className={`max-w-[300px] truncate ${columnType ? 'font-medium' : ''}`}
                                    >
                                      {cellValue}
                                    </TableCell>
                                  </TooltipTrigger>
                                  {cellValue.length > 30 && (
                                    <TooltipContent side="bottom" className="max-w-md">
                                      <p className="break-words">{cellValue}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </TableRow>
                        ))}
                        {currentSheet.rows.length > MAX_PREVIEW_ROWS && (
                          <TableRow>
                            <TableCell 
                              colSpan={currentSheet.headers.length + 1} 
                              className="text-center text-muted-foreground py-4"
                            >
                              ... and {currentSheet.rows.length - MAX_PREVIEW_ROWS} more rows (all will be extracted)
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TooltipProvider>
                </ScrollArea>
              </div>
            ) : currentSheet && !currentSheet.selected ? (
              <div className="flex-1 min-h-0 border rounded-lg flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">This sheet is not selected for extraction.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => toggleSheetSelection(currentSheet.name)}
                  >
                    Select "{currentSheet.name}" sheet
                  </Button>
                </div>
              </div>
            ) : null}
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
