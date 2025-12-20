import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, AlertCircle, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { BOQWizardState, ColumnMapping } from "../BOQProcessingWizard";
import type { ParsedSheet } from "@/utils/excelParser";

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

const COLUMN_FIELDS = [
  { key: "description", label: "Description", required: true, color: "bg-blue-500" },
  { key: "quantity", label: "Qty", required: false, color: "bg-green-500" },
  { key: "unit", label: "Unit", required: false, color: "bg-purple-500" },
  { key: "supplyRate", label: "Supply Rate", required: false, color: "bg-orange-500" },
  { key: "installRate", label: "Install Rate", required: false, color: "bg-pink-500" },
  { key: "totalRate", label: "Rate", required: false, color: "bg-cyan-500" },
  { key: "amount", label: "Amount", required: false, color: "bg-amber-500" },
  { key: "itemCode", label: "Item Code", required: false, color: "bg-slate-500" },
];

export function BOQWizardStep3Columns({ state, updateState }: Props) {
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  // Get only selected sheets
  const selectedSheets = useMemo(() => 
    state.parsedSheets.filter(s => state.selectedSheets.has(s.name)),
    [state.parsedSheets, state.selectedSheets]
  );

  // Auto-expand first sheet
  useEffect(() => {
    if (selectedSheets.length > 0 && expandedSheets.size === 0) {
      setExpandedSheets(new Set([selectedSheets[0].name]));
    }
  }, [selectedSheets]);

  // Initialize mappings if not present
  useEffect(() => {
    const newMappings = { ...state.columnMappings };
    let changed = false;
    
    selectedSheets.forEach(sheet => {
      if (!newMappings[sheet.name]) {
        newMappings[sheet.name] = createEmptyMapping(sheet.name);
        changed = true;
      }
    });
    
    if (changed) {
      updateState({ columnMappings: newMappings });
    }
  }, [selectedSheets]);

  const createEmptyMapping = (sheetName: string): ColumnMapping => ({
    sheetName,
    itemCode: null,
    description: null,
    quantity: null,
    unit: null,
    supplyRate: null,
    installRate: null,
    totalRate: null,
    amount: null,
  });

  const autoDetectColumns = (sheet: ParsedSheet) => {
    const { headers } = sheet;
    const mapping = createEmptyMapping(sheet.name);
    
    const headerPatterns: Record<string, RegExp[]> = {
      description: [/desc/i, /particular/i, /detail/i, /specification/i, /^item$/i],
      quantity: [/qty/i, /quantity/i, /qnty/i, /^q$/i],
      unit: [/^unit[s]?$/i, /^uom$/i, /measure/i],
      supplyRate: [/supply/i, /material.*rate/i, /mat.*rate/i],
      installRate: [/install/i, /labour/i, /labor/i, /lab.*rate/i],
      totalRate: [/^rate$/i, /unit.*rate/i, /rate.*unit/i],
      amount: [/amount/i, /^total$/i, /extended/i, /^sum$/i],
      itemCode: [/item.*no/i, /ref/i, /^no\.?$/i, /code/i, /^nr/i],
    };
    
    const usedIndices = new Set<number>();
    
    // First pass: exact header matches
    Object.entries(headerPatterns).forEach(([field, patterns]) => {
      headers.forEach((header, idx) => {
        if (usedIndices.has(idx)) return;
        if (patterns.some(p => p.test(header))) {
          (mapping as any)[field] = idx;
          usedIndices.add(idx);
        }
      });
    });
    
    return mapping;
  };

  const handleAutoDetect = () => {
    const newMappings = { ...state.columnMappings };
    
    selectedSheets.forEach(sheet => {
      newMappings[sheet.name] = autoDetectColumns(sheet);
    });
    
    updateState({ columnMappings: newMappings });
    toast.success("Auto-detection complete - please review the mappings");
  };

  const updateColumnMapping = (sheetName: string, field: string, columnIndex: number | null) => {
    const newMappings = { ...state.columnMappings };
    if (!newMappings[sheetName]) {
      newMappings[sheetName] = createEmptyMapping(sheetName);
    }
    (newMappings[sheetName] as any)[field] = columnIndex;
    updateState({ columnMappings: newMappings });
  };

  const getColumnMapping = (sheetName: string, field: string): number | null => {
    return state.columnMappings[sheetName]?.[field as keyof ColumnMapping] as number | null;
  };

  const toggleSheet = (sheetName: string) => {
    const newExpanded = new Set(expandedSheets);
    if (newExpanded.has(sheetName)) {
      newExpanded.delete(sheetName);
    } else {
      newExpanded.add(sheetName);
    }
    setExpandedSheets(newExpanded);
  };

  const hasRequiredMappings = useMemo(() => {
    return selectedSheets.every(sheet => {
      const mapping = state.columnMappings[sheet.name];
      return mapping?.description !== null;
    });
  }, [selectedSheets, state.columnMappings]);

  const getMappedFieldsCount = (sheetName: string): number => {
    const mapping = state.columnMappings[sheetName];
    if (!mapping) return 0;
    return COLUMN_FIELDS.filter(f => mapping[f.key as keyof ColumnMapping] !== null).length;
  };

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${hasRequiredMappings ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
            {hasRequiredMappings ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {hasRequiredMappings ? "Ready to proceed" : "Map the Description column for each sheet"}
            </p>
            <p className="text-sm text-muted-foreground">
              Select which columns contain each type of data
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleAutoDetect}>
          <Wand2 className="h-4 w-4 mr-2" />
          Auto-detect
        </Button>
      </div>

      {/* Sheet mapping sections */}
      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
        {selectedSheets.map(sheet => {
          const isExpanded = expandedSheets.has(sheet.name);
          const mappedCount = getMappedFieldsCount(sheet.name);
          
          return (
            <Card key={sheet.name} className="overflow-hidden">
              <CardHeader 
                className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSheet(sheet.name)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {sheet.name}
                    <Badge variant="outline" className="font-normal">
                      {sheet.rows.length} rows
                    </Badge>
                    <Badge variant="secondary" className="font-normal">
                      {mappedCount}/{COLUMN_FIELDS.length} mapped
                    </Badge>
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  {/* Column mapping selectors */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {COLUMN_FIELDS.map(field => {
                      const currentValue = getColumnMapping(sheet.name, field.key);
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-medium flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${field.color}`} />
                            {field.label}
                            {field.required && <span className="text-destructive">*</span>}
                          </label>
                          <Select
                            value={currentValue !== null ? String(currentValue) : "none"}
                            onValueChange={(val) => updateColumnMapping(
                              sheet.name, 
                              field.key, 
                              val === "none" ? null : parseInt(val)
                            )}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Not mapped —</SelectItem>
                              {sheet.headers.map((header, idx) => (
                                <SelectItem key={idx} value={String(idx)}>
                                  {header || `Column ${idx + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Data preview with ALL columns */}
                  <div className="border rounded-md overflow-auto max-h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10 text-xs sticky left-0 bg-muted z-10 border-r">#</TableHead>
                          {sheet.headers.map((header, idx) => {
                            // Find if this column is mapped
                            const mappedField = COLUMN_FIELDS.find(f => 
                              getColumnMapping(sheet.name, f.key) === idx
                            );
                            return (
                              <TableHead 
                                key={idx} 
                                className={`text-xs whitespace-nowrap min-w-[100px] ${
                                  mappedField ? 'font-bold' : ''
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  {mappedField && (
                                    <div className={`w-2 h-2 rounded-full ${mappedField.color}`} />
                                  )}
                                  <span className="truncate max-w-[150px]" title={header || `Column ${idx + 1}`}>
                                    {header || `Column ${idx + 1}`}
                                  </span>
                                </div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.rows.slice(0, 8).map((row, rowIdx) => {
                          const rowKeys = Object.keys(row);
                          return (
                            <TableRow key={rowIdx} className="text-xs">
                              <TableCell className="sticky left-0 bg-background z-10 border-r font-mono text-muted-foreground">
                                {rowIdx + 1}
                              </TableCell>
                              {sheet.headers.map((header, cellIdx) => {
                                let value = row[header];
                                if (value === undefined && rowKeys[cellIdx]) {
                                  value = row[rowKeys[cellIdx]];
                                }
                                const displayValue = value !== null && value !== undefined ? String(value) : "";
                                const mappedField = COLUMN_FIELDS.find(f => 
                                  getColumnMapping(sheet.name, f.key) === cellIdx
                                );
                                return (
                                  <TableCell 
                                    key={cellIdx} 
                                    className={`whitespace-nowrap ${mappedField ? 'bg-muted/30' : ''}`}
                                  >
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing first 8 rows • Mapped columns are highlighted
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
