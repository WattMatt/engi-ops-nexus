import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import type { BOQWizardState } from "../BOQProcessingWizard";

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep2Sheets({ state, updateState }: Props) {
  const [previewSheet, setPreviewSheet] = useState<string | null>(
    state.parsedSheets[0]?.name || null
  );

  const toggleSheet = (sheetName: string) => {
    const newSelected = new Set(state.selectedSheets);
    if (newSelected.has(sheetName)) {
      newSelected.delete(sheetName);
    } else {
      newSelected.add(sheetName);
    }
    updateState({ selectedSheets: newSelected });
  };

  const selectAll = () => {
    updateState({
      selectedSheets: new Set(state.parsedSheets.map(s => s.name)),
    });
  };

  const deselectAll = () => {
    updateState({ selectedSheets: new Set() });
  };

  const currentPreviewSheet = state.parsedSheets.find(s => s.name === previewSheet);
  const totalSelectedRows = state.parsedSheets
    .filter(s => state.selectedSheets.has(s.name))
    .reduce((acc, s) => acc + s.rows.length, 0);

  return (
    <div className="grid grid-cols-3 gap-4 h-[500px]">
      {/* Sheet list */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Sheets
          </CardTitle>
          <CardDescription>
            Select which sheets contain BOQ data
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              <Square className="h-3 w-3 mr-1" />
              None
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[380px]">
            <div className="space-y-1 p-3">
              {state.parsedSheets.map((sheet) => {
                const isSelected = state.selectedSheets.has(sheet.name);
                const isPreviewing = previewSheet === sheet.name;
                
                return (
                  <div
                    key={sheet.name}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                      ${isPreviewing ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}
                      ${isSelected ? "" : "opacity-60"}
                    `}
                    onClick={() => setPreviewSheet(sheet.name)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSheet(sheet.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{sheet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.rows.length} rows · {sheet.headers.length} columns
                      </p>
                    </div>
                    {isPreviewing ? (
                      <Eye className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sheet preview */}
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {currentPreviewSheet?.name || "Select a sheet"}
              </CardTitle>
              <CardDescription>
                {currentPreviewSheet 
                  ? `Preview of first 20 rows · ${currentPreviewSheet.rows.length} total rows`
                  : "Click on a sheet to preview its contents"
                }
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              {state.selectedSheets.size} sheets · {totalSelectedRows} rows selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {currentPreviewSheet ? (
            <div className="h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 sticky left-0 bg-background z-10 border-r">#</TableHead>
                    {currentPreviewSheet.headers.map((header, idx) => (
                      <TableHead key={idx} className="min-w-[120px] whitespace-nowrap">
                        <div className="truncate max-w-[200px]" title={header || `Column_${idx + 1}`}>
                          {header || `Column_${idx + 1}`}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPreviewSheet.rows.slice(0, 20).map((row, rowIdx) => {
                    const rowKeys = Object.keys(row);
                    return (
                      <TableRow key={rowIdx} className="text-xs">
                        <TableCell className="sticky left-0 bg-background z-10 border-r font-mono text-muted-foreground">
                          {rowIdx + 1}
                        </TableCell>
                        {currentPreviewSheet.headers.map((header, cellIdx) => {
                          // Try to get value by header name first, then by key at same index
                          let value = row[header];
                          if (value === undefined && rowKeys[cellIdx]) {
                            value = row[rowKeys[cellIdx]];
                          }
                          const displayValue = value !== null && value !== undefined ? String(value) : "";
                          return (
                            <TableCell key={cellIdx} className="whitespace-nowrap">
                              <div className="truncate max-w-[200px]" title={displayValue}>
                                {displayValue || <span className="text-muted-foreground/30">—</span>}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {currentPreviewSheet.rows.length > 20 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t sticky bottom-0 bg-background">
                  Showing 20 of {currentPreviewSheet.rows.length} rows
                </div>
              )}
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a sheet to preview</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
