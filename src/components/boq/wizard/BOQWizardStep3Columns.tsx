import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Columns, Wand2, Check, AlertCircle, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BOQWizardState, ColumnMapping } from "../BOQProcessingWizard";
import type { ParsedSheet } from "@/utils/excelParser";

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

interface DetectedColumn {
  field: string;
  label: string;
  columnIndex: number | null;
  headerName: string | null;
  confidence: number; // 0-100
  reason: string;
}

const COLUMN_FIELDS = [
  { key: "description", label: "Description", required: true },
  { key: "quantity", label: "Quantity", required: false },
  { key: "unit", label: "Unit", required: false },
  { key: "supplyRate", label: "Supply Rate", required: false },
  { key: "installRate", label: "Install Rate", required: false },
  { key: "totalRate", label: "Total Rate", required: false },
  { key: "amount", label: "Amount", required: false },
  { key: "itemCode", label: "Item Code", required: false },
];

export function BOQWizardStep3Columns({ state, updateState }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, DetectedColumn[]>>({});

  // Get only selected sheets
  const selectedSheets = useMemo(() => 
    state.parsedSheets.filter(s => state.selectedSheets.has(s.name)),
    [state.parsedSheets, state.selectedSheets]
  );

  // Auto-detect on mount
  useEffect(() => {
    if (selectedSheets.length > 0 && Object.keys(detectedColumns).length === 0) {
      detectAllSheets();
    }
  }, [selectedSheets.length]);

  const detectAllSheets = async () => {
    setDetecting(true);
    
    const allDetections: Record<string, DetectedColumn[]> = {};
    const allMappings: Record<string, ColumnMapping> = {};
    
    for (const sheet of selectedSheets) {
      const detected = analyzeSheetColumns(sheet);
      allDetections[sheet.name] = detected;
      
      // Convert to mapping format
      const mapping: ColumnMapping = {
        sheetName: sheet.name,
        itemCode: null,
        description: null,
        quantity: null,
        unit: null,
        supplyRate: null,
        installRate: null,
        totalRate: null,
        amount: null,
      };
      
      detected.forEach(d => {
        if (d.columnIndex !== null && d.confidence >= 50 && d.field !== 'sheetName') {
          (mapping as any)[d.field] = d.columnIndex;
        }
      });
      
      allMappings[sheet.name] = mapping;
    }
    
    setDetectedColumns(allDetections);
    updateState({ columnMappings: allMappings });
    setDetecting(false);
    
    // Check if we have high confidence for all required fields
    const allHighConfidence = selectedSheets.every(sheet => {
      const sheetDetections = allDetections[sheet.name] || [];
      const descDetection = sheetDetections.find(d => d.field === "description");
      return descDetection && descDetection.confidence >= 70;
    });
    
    if (allHighConfidence) {
      toast.success("Column mapping auto-detected with high confidence!");
    }
  };

  // Smart column detection using data patterns
  const analyzeSheetColumns = (sheet: ParsedSheet): DetectedColumn[] => {
    const { headers, rows } = sheet;
    const sampleRows = rows.slice(0, 20); // Analyze more rows
    
    const detections: DetectedColumn[] = [];
    
    // Analyze each column
    const columnAnalysis = headers.map((header, colIndex) => {
      const values = sampleRows.map(row => {
        const keys = Object.keys(row);
        return row[header] ?? row[keys[colIndex]] ?? null;
      }).filter(v => v !== null && v !== undefined && v !== "");
      
      return {
        index: colIndex,
        header: header || `Column ${colIndex + 1}`,
        values,
        stats: analyzeColumnValues(values),
      };
    });
    
    // Find best match for each field
    COLUMN_FIELDS.forEach(field => {
      const match = findBestColumnMatch(field.key, columnAnalysis);
      detections.push({
        field: field.key,
        label: field.label,
        columnIndex: match?.index ?? null,
        headerName: match?.header ?? null,
        confidence: match?.confidence ?? 0,
        reason: match?.reason ?? "No match found",
      });
    });
    
    return detections;
  };

  const analyzeColumnValues = (values: any[]) => {
    const nonEmpty = values.filter(v => v !== null && v !== "");
    const numbers = nonEmpty.filter(v => !isNaN(parseFloat(String(v).replace(/[,\s]/g, ""))));
    const avgLength = nonEmpty.reduce((sum, v) => sum + String(v).length, 0) / (nonEmpty.length || 1);
    
    return {
      totalCount: nonEmpty.length,
      numberCount: numbers.length,
      numberRatio: nonEmpty.length > 0 ? numbers.length / nonEmpty.length : 0,
      avgLength,
      hasDecimals: numbers.some(v => String(v).includes(".")),
      maxValue: numbers.length > 0 ? Math.max(...numbers.map(v => parseFloat(String(v).replace(/[,\s]/g, "")))) : 0,
    };
  };

  const findBestColumnMatch = (
    fieldKey: string, 
    columns: { index: number; header: string; values: any[]; stats: ReturnType<typeof analyzeColumnValues> }[]
  ): { index: number; header: string; confidence: number; reason: string } | null => {
    
    const headerPatterns: Record<string, RegExp[]> = {
      description: [/desc/i, /particular/i, /detail/i, /item\s*description/i, /specification/i, /work/i],
      quantity: [/qty/i, /quantity/i, /qnty/i, /^q$/i, /quant/i],
      unit: [/^unit[s]?$/i, /^uom$/i, /^u$/i, /measure/i],
      supplyRate: [/supply/i, /material/i, /mat.*rate/i, /supp.*rate/i],
      installRate: [/install/i, /labour/i, /labor/i, /lab.*rate/i],
      totalRate: [/^rate$/i, /unit.*rate/i, /combined/i, /rate.*unit/i],
      amount: [/amount/i, /^total$/i, /extended/i, /^sum$/i, /line.*total/i],
      itemCode: [/item.*no/i, /ref/i, /^no\.?$/i, /code/i, /^nr/i, /item.*code/i],
    };
    
    let bestMatch: { index: number; header: string; confidence: number; reason: string } | null = null;
    
    columns.forEach(col => {
      let confidence = 0;
      let reason = "";
      
      // Check header patterns
      const patterns = headerPatterns[fieldKey] || [];
      const headerMatch = patterns.some(p => p.test(col.header));
      if (headerMatch) {
        confidence += 50;
        reason = `Header matches "${col.header}"`;
      }
      
      // Check data patterns
      const stats = col.stats;
      
      switch (fieldKey) {
        case "description":
          // Descriptions are typically long text with low number ratio
          if (stats.avgLength > 20 && stats.numberRatio < 0.3) {
            confidence += 30;
            reason += (reason ? " + " : "") + "Long text values";
          }
          break;
          
        case "quantity":
          // Quantities are numbers, usually small-medium values
          if (stats.numberRatio > 0.8 && stats.maxValue < 10000) {
            confidence += 25;
            reason += (reason ? " + " : "") + "Numeric values";
          }
          break;
          
        case "unit":
          // Units are short text (m, m², kg, etc.)
          if (stats.avgLength < 10 && stats.numberRatio < 0.3) {
            confidence += 25;
            reason += (reason ? " + " : "") + "Short text values";
          }
          break;
          
        case "supplyRate":
        case "installRate":
        case "totalRate":
          // Rates are numbers, often with decimals
          if (stats.numberRatio > 0.7 && stats.hasDecimals) {
            confidence += 20;
            reason += (reason ? " + " : "") + "Decimal numbers";
          }
          break;
          
        case "amount":
          // Amounts are typically larger numbers
          if (stats.numberRatio > 0.7 && stats.maxValue > 100) {
            confidence += 20;
            reason += (reason ? " + " : "") + "Large numeric values";
          }
          break;
          
        case "itemCode":
          // Item codes are short, often alphanumeric
          if (stats.avgLength < 15 && stats.avgLength > 1) {
            confidence += 15;
            reason += (reason ? " + " : "") + "Short reference values";
          }
          break;
      }
      
      if (confidence > (bestMatch?.confidence || 0)) {
        bestMatch = { index: col.index, header: col.header, confidence: Math.min(confidence, 100), reason };
      }
    });
    
    return bestMatch;
  };

  // Get preview data for a sheet
  const getSheetPreview = (sheet: ParsedSheet) => {
    const mapping = state.columnMappings[sheet.name];
    if (!mapping) return [];
    
    return sheet.rows.slice(0, 10).map((row, idx) => {
      const keys = Object.keys(row);
      const preview: Record<string, any> = { _idx: idx + 1 };
      
      COLUMN_FIELDS.forEach(field => {
        const colIndex = mapping[field.key as keyof ColumnMapping];
        if (typeof colIndex === "number") {
          const header = sheet.headers[colIndex];
          preview[field.key] = row[header] ?? row[keys[colIndex]] ?? "";
        }
      });
      
      return preview;
    });
  };

  const hasRequiredMappings = useMemo(() => {
    return selectedSheets.every(sheet => {
      const mapping = state.columnMappings[sheet.name];
      return mapping?.description !== null;
    });
  }, [selectedSheets, state.columnMappings]);

  const overallConfidence = useMemo(() => {
    if (Object.keys(detectedColumns).length === 0) return 0;
    
    let totalConf = 0;
    let count = 0;
    
    Object.values(detectedColumns).forEach(sheetDetections => {
      sheetDetections.forEach(d => {
        if (d.columnIndex !== null) {
          totalConf += d.confidence;
          count++;
        }
      });
    });
    
    return count > 0 ? Math.round(totalConf / count) : 0;
  }, [detectedColumns]);

  if (detecting) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Analyzing column structure...</p>
        <p className="text-sm text-muted-foreground">Detecting data patterns in {selectedSheets.length} sheet(s)</p>
      </div>
    );
  }

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
              {hasRequiredMappings ? "Column mapping ready" : "Description column required"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedSheets.length} sheet(s) analyzed • {overallConfidence}% average confidence
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={detectAllSheets}>
          <Wand2 className="h-4 w-4 mr-2" />
          Re-analyze
        </Button>
      </div>

      {/* Detection results per sheet */}
      <ScrollArea className="h-[450px]">
        <div className="space-y-4 pr-4">
          {selectedSheets.map(sheet => {
            const sheetDetections = detectedColumns[sheet.name] || [];
            const preview = getSheetPreview(sheet);
            
            return (
              <Card key={sheet.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {sheet.name}
                      <Badge variant="outline" className="ml-2">
                        {sheet.rows.length} rows
                      </Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Detected mappings */}
                  <div className="flex flex-wrap gap-2">
                    {sheetDetections.filter(d => d.columnIndex !== null).map(d => (
                      <Badge 
                        key={d.field}
                        variant={d.confidence >= 70 ? "default" : d.confidence >= 50 ? "secondary" : "outline"}
                        className="gap-1"
                      >
                        <span className="font-medium">{d.label}:</span>
                        <span className="opacity-80">{d.headerName}</span>
                        <span className={`ml-1 text-xs ${
                          d.confidence >= 70 ? "text-green-200" : 
                          d.confidence >= 50 ? "text-foreground/70" : "text-amber-500"
                        }`}>
                          ({d.confidence}%)
                        </span>
                      </Badge>
                    ))}
                    {sheetDetections.filter(d => d.columnIndex === null).map(d => (
                      <Badge key={d.field} variant="outline" className="opacity-50">
                        {d.label}: Not found
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Data preview */}
                  {preview.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10 text-xs">#</TableHead>
                            {COLUMN_FIELDS.filter(f => {
                              const mapping = state.columnMappings[sheet.name];
                              return mapping && mapping[f.key as keyof ColumnMapping] !== null;
                            }).map(f => (
                              <TableHead key={f.key} className="text-xs min-w-[80px]">
                                {f.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.slice(0, 3).map((row, idx) => (
                            <TableRow key={idx} className="text-xs">
                              <TableCell className="text-muted-foreground">{row._idx}</TableCell>
                              {COLUMN_FIELDS.filter(f => {
                                const mapping = state.columnMappings[sheet.name];
                                return mapping && mapping[f.key as keyof ColumnMapping] !== null;
                              }).map(f => (
                                <TableCell key={f.key} className="max-w-[200px]">
                                  <div className="truncate" title={String(row[f.key] || "")}>
                                    {row[f.key] || <span className="text-muted-foreground/40">—</span>}
                                  </div>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
