import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Loader2 } from "lucide-react";
import type { BOQWizardState, ColumnMapping } from "../BOQProcessingWizard";
import type { ParsedSheet } from "@/utils/excelParser";

interface Props {
  state: BOQWizardState;
  updateState: (updates: Partial<BOQWizardState>) => void;
}

export function BOQWizardStep3Columns({ state, updateState }: Props) {
  const [detecting, setDetecting] = useState(true);

  const selectedSheets = useMemo(() => 
    state.parsedSheets.filter(s => state.selectedSheets.has(s.name)),
    [state.parsedSheets, state.selectedSheets]
  );

  // Auto-detect on mount
  useEffect(() => {
    if (selectedSheets.length > 0) {
      const mappings: Record<string, ColumnMapping> = {};
      
      selectedSheets.forEach(sheet => {
        mappings[sheet.name] = autoDetectColumns(sheet);
      });
      
      updateState({ columnMappings: mappings });
      setDetecting(false);
    }
  }, [selectedSheets.length]);

  const autoDetectColumns = (sheet: ParsedSheet): ColumnMapping => {
    const { headers } = sheet;
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
    
    const patterns: Record<string, RegExp[]> = {
      description: [/desc/i, /particular/i, /detail/i, /specification/i, /^item$/i, /work/i],
      quantity: [/qty/i, /quantity/i, /qnty/i],
      unit: [/^unit[s]?$/i, /^uom$/i],
      supplyRate: [/supply/i, /material.*rate/i],
      installRate: [/install/i, /labour/i, /labor/i],
      totalRate: [/^rate$/i, /unit.*rate/i],
      amount: [/amount/i, /^total$/i, /extended/i],
      itemCode: [/item.*no/i, /ref/i, /^no\.?$/i, /code/i],
    };
    
    const usedIndices = new Set<number>();
    
    Object.entries(patterns).forEach(([field, fieldPatterns]) => {
      headers.forEach((header, idx) => {
        if (usedIndices.has(idx)) return;
        if (fieldPatterns.some(p => p.test(header))) {
          (mapping as any)[field] = idx;
          usedIndices.add(idx);
        }
      });
    });
    
    // If no description found, use the longest text column
    if (mapping.description === null) {
      const sampleRows = sheet.rows.slice(0, 10);
      let bestIdx = -1;
      let bestLength = 0;
      
      headers.forEach((_, idx) => {
        if (usedIndices.has(idx)) return;
        const avgLen = sampleRows.reduce((sum, row) => {
          const val = row[headers[idx]] || row[Object.keys(row)[idx]] || "";
          return sum + String(val).length;
        }, 0) / sampleRows.length;
        
        if (avgLen > bestLength) {
          bestLength = avgLen;
          bestIdx = idx;
        }
      });
      
      if (bestIdx >= 0 && bestLength > 10) {
        mapping.description = bestIdx;
      }
    }
    
    return mapping;
  };

  if (detecting) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Analyzing sheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
        <Check className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium">Columns auto-detected</p>
          <p className="text-sm text-muted-foreground">
            {selectedSheets.length} sheet(s) ready for processing
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {selectedSheets.map(sheet => (
          <div key={sheet.name} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
              <span className="font-medium">{sheet.name}</span>
              <Badge variant="outline">{sheet.rows.length} rows</Badge>
            </div>
            <div className="overflow-auto max-h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sticky left-0 bg-muted z-10">#</TableHead>
                    {sheet.headers.slice(0, 8).map((h, i) => (
                      <TableHead key={i} className="text-xs whitespace-nowrap">
                        {h || `Col ${i + 1}`}
                      </TableHead>
                    ))}
                    {sheet.headers.length > 8 && (
                      <TableHead className="text-xs text-muted-foreground">
                        +{sheet.headers.length - 8} more
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.slice(0, 5).map((row, ri) => (
                    <TableRow key={ri} className="text-xs">
                      <TableCell className="sticky left-0 bg-background z-10">{ri + 1}</TableCell>
                      {sheet.headers.slice(0, 8).map((h, ci) => {
                        const val = row[h] ?? row[Object.keys(row)[ci]] ?? "";
                        return (
                          <TableCell key={ci} className="max-w-[150px]">
                            <span className="truncate block">{String(val) || "—"}</span>
                          </TableCell>
                        );
                      })}
                      {sheet.headers.length > 8 && <TableCell>...</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
