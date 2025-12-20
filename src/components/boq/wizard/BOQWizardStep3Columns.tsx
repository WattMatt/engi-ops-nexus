import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Columns, Wand2, Check, AlertCircle } from "lucide-react";
import { detectBOQColumns } from "@/utils/excelParser";
import type { BOQWizardState, ColumnMapping } from "../BOQProcessingWizard";

const COLUMN_FIELDS = [
  { key: "itemCode", label: "Item Code", description: "Reference number" },
  { key: "description", label: "Description", description: "Item description (required)" },
  { key: "quantity", label: "Quantity", description: "Qty or Count" },
  { key: "unit", label: "Unit", description: "Unit of measure" },
  { key: "supplyRate", label: "Supply Rate", description: "Material cost" },
  { key: "installRate", label: "Install Rate", description: "Labour cost" },
  { key: "totalRate", label: "Total Rate", description: "Combined rate" },
  { key: "amount", label: "Amount", description: "Line total" },
] as const;

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep3Columns({ state, updateState }: Props) {
  const [activeSheet, setActiveSheet] = useState<string>("");

  // Get only selected sheets
  const selectedSheets = useMemo(() => 
    state.parsedSheets.filter(s => state.selectedSheets.has(s.name)),
    [state.parsedSheets, state.selectedSheets]
  );

  // Set initial active sheet and auto-detect on mount
  useEffect(() => {
    if (selectedSheets.length === 0) return;
    
    // Set active sheet if not set
    if (!activeSheet) {
      setActiveSheet(selectedSheets[0].name);
    }
    
    // Auto-detect columns for sheets that haven't been mapped yet
    const newMappings = { ...state.columnMappings };
    let changed = false;

    selectedSheets.forEach(sheet => {
      if (!newMappings[sheet.name]) {
        console.log("Step3: Auto-detecting columns for sheet:", sheet.name, "Headers:", sheet.headers);
        const detected = detectBOQColumns(sheet.headers);
        console.log("Step3: Detected columns:", detected);
        newMappings[sheet.name] = {
          sheetName: sheet.name,
          itemCode: detected.itemCode ?? null,
          description: detected.description ?? null,
          quantity: detected.quantity ?? null,
          unit: detected.unit ?? null,
          supplyRate: detected.supplyRate ?? null,
          installRate: detected.installRate ?? null,
          totalRate: detected.totalRate ?? null,
          amount: detected.amount ?? null,
        };
        changed = true;
      }
    });

    if (changed) {
      console.log("Step3: Updating mappings:", newMappings);
      updateState({ columnMappings: newMappings });
    }
  }, [selectedSheets]); // Run when selected sheets change

  const currentSheet = selectedSheets.find(s => s.name === activeSheet);
  const currentMapping = state.columnMappings[activeSheet];

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    if (!activeSheet) return;
    
    const numValue = value === "none" ? null : parseInt(value, 10);
    
    updateState({
      columnMappings: {
        ...state.columnMappings,
        [activeSheet]: {
          ...state.columnMappings[activeSheet],
          [field]: numValue,
        },
      },
    });
  };

  const autoDetect = () => {
    if (!currentSheet) return;
    
    const detected = detectBOQColumns(currentSheet.headers);
    updateState({
      columnMappings: {
        ...state.columnMappings,
        [activeSheet]: {
          sheetName: activeSheet,
          itemCode: detected.itemCode ?? null,
          description: detected.description ?? null,
          quantity: detected.quantity ?? null,
          unit: detected.unit ?? null,
          supplyRate: detected.supplyRate ?? null,
          installRate: detected.installRate ?? null,
          totalRate: detected.totalRate ?? null,
          amount: detected.amount ?? null,
        },
      },
    });
  };

  const getMappedCount = (mapping: ColumnMapping | undefined) => {
    if (!mapping) return 0;
    return Object.entries(mapping)
      .filter(([key, val]) => key !== 'sheetName' && val !== null)
      .length;
  };

  // Get preview of mapped data
  const getMappedPreview = () => {
    if (!currentSheet || !currentMapping) return [];
    
    return currentSheet.rows.slice(0, 5).map((row, idx) => {
      const mappedRow: Record<string, string> = { _row: String(idx + 1) };
      
      // Get all row keys in order (they correspond to header order)
      const rowKeys = Object.keys(row);
      
      COLUMN_FIELDS.forEach(field => {
        const colIndex = currentMapping[field.key as keyof ColumnMapping];
        if (colIndex !== null && typeof colIndex === 'number') {
          // Get the header at this index
          const header = currentSheet.headers[colIndex];
          // Try to get value by header name first, then by key at same index position
          let value = row[header];
          if (value === undefined && rowKeys[colIndex]) {
            value = row[rowKeys[colIndex]];
          }
          mappedRow[field.key] = value !== null && value !== undefined ? String(value) : "";
        } else {
          mappedRow[field.key] = "-";
        }
      });
      
      return mappedRow;
    });
  };

  const previewData = getMappedPreview();
  const hasDescription = currentMapping?.description !== null;

  return (
    <div className="grid grid-cols-3 gap-4 h-[500px]">
      {/* Sheet tabs + column mapping */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Column Mapping
          </CardTitle>
          <CardDescription>
            Map spreadsheet columns to BOQ fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sheet selector */}
          <div className="space-y-2">
            <Label>Sheet</Label>
            <Select value={activeSheet} onValueChange={setActiveSheet}>
              <SelectTrigger>
                <SelectValue placeholder="Select sheet..." />
              </SelectTrigger>
              <SelectContent>
                {selectedSheets.map(sheet => (
                  <SelectItem key={sheet.name} value={sheet.name}>
                    <div className="flex items-center gap-2">
                      <span>{sheet.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getMappedCount(state.columnMappings[sheet.name])}/8
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={autoDetect}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Detect Columns
          </Button>

          <ScrollArea className="h-[300px]">
            <div className="space-y-3 pr-3">
              {COLUMN_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {field.label}
                    {field.key === "description" && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Select
                    value={currentMapping?.[field.key as keyof ColumnMapping]?.toString() ?? "none"}
                    onValueChange={(v) => updateMapping(field.key as keyof ColumnMapping, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Not mapped</span>
                      </SelectItem>
                      {currentSheet?.headers.map((header, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          <span className="font-mono text-xs mr-2">[{idx}]</span>
                          {header || `Column ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Preview of mapped data */}
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Mapping Preview</CardTitle>
              <CardDescription>
                Preview how your data will be extracted
              </CardDescription>
            </div>
            {!hasDescription && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Description required
              </Badge>
            )}
            {hasDescription && (
              <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-900/20">
                <Check className="h-3 w-3 text-green-600" />
                Ready
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {COLUMN_FIELDS.map(field => (
                    <TableHead key={field.key} className="min-w-[100px]">
                      <div className="text-xs">
                        {field.label}
                        {field.key === "description" && <span className="text-destructive ml-0.5">*</span>}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.length > 0 ? (
                  previewData.map((row, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">{row._row}</TableCell>
                      {COLUMN_FIELDS.map(field => (
                        <TableCell key={field.key} className="max-w-[150px]">
                          <div className="truncate" title={row[field.key]}>
                            {row[field.key] === "-" ? (
                              <span className="text-muted-foreground/50">-</span>
                            ) : (
                              row[field.key]
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No data to preview. Select a sheet and map columns.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
