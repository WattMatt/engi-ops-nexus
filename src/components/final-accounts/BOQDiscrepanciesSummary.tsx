import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BOQDiscrepanciesSummaryProps {
  accountId: string;
}

interface SectionWithDiscrepancy {
  id: string;
  section_code: string;
  section_name: string;
  contract_total: number;
  boq_stated_total: number;
  difference: number;
  bill_name: string;
}

// Parse number from various formats
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  let str = String(value).trim();
  str = str.replace(/^R\s*/i, '').replace(/\s/g, '');
  if (/,\d{2}$/.test(str)) {
    str = str.replace(/,/g, '.');
  } else {
    str = str.replace(/,/g, '');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Extract stated total from a sheet
function extractStatedTotalFromSheet(worksheet: XLSX.WorkSheet): number | null {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const allRows: any[][] = [];
  
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: any[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      row.push(cell ? cell.v : null);
    }
    allRows.push(row);
  }
  
  const totalPatterns = [
    /^(sub)?total/i, /^section\s+total/i, /^bill\s+total/i,
    /total\s+for\s+section/i, /total\s+to\s+collection/i,
    /^total\s+carried/i, /carried\s+to\s+summary/i,
  ];
  
  // Find amount column (usually last column with numbers)
  let amountColIdx = -1;
  for (let c = range.e.c; c >= 0; c--) {
    let hasNumbers = false;
    for (let r = 0; r < Math.min(20, allRows.length); r++) {
      const val = allRows[r]?.[c];
      if (typeof val === 'number' && val > 100) {
        hasNumbers = true;
        break;
      }
    }
    if (hasNumbers) {
      amountColIdx = c;
      break;
    }
  }
  
  // Scan for total row
  for (let r = allRows.length - 1; r >= 0; r--) {
    const row = allRows[r];
    const rowText = row.map(v => String(v || '')).join(' ').toLowerCase();
    
    if (totalPatterns.some(p => p.test(rowText))) {
      // Find amount in this row
      const amount = amountColIdx >= 0 ? parseNumber(row[amountColIdx]) : 0;
      if (amount > 0) {
        return amount;
      }
      // Try to find any large number in this row
      for (let c = row.length - 1; c >= 0; c--) {
        const val = parseNumber(row[c]);
        if (val > 1000) return val;
      }
    }
  }
  
  return null;
}

export function BOQDiscrepanciesSummary({ accountId }: BOQDiscrepanciesSummaryProps) {
  const queryClient = useQueryClient();
  
  const { data: discrepancies = [], isLoading, refetch } = useQuery({
    queryKey: ["boq-discrepancies", accountId],
    queryFn: async (): Promise<SectionWithDiscrepancy[]> => {
      // Get bills for this final account
      const { data: bills, error: billsError } = await supabase
        .from("final_account_bills")
        .select("id, bill_name")
        .eq("final_account_id", accountId);
      
      if (billsError) {
        console.error("Error fetching bills:", billsError);
        return [];
      }
      
      if (!bills || bills.length === 0) return [];
      
      const billMap = new Map<string, string>(bills.map((b) => [b.id, b.bill_name]));
      const billIds = bills.map((b) => b.id);
      
      // Get sections for these bills
      const { data: sections, error: sectionsError } = await supabase
        .from("final_account_sections")
        .select("id, section_code, section_name, contract_total, boq_stated_total, bill_id")
        .in("bill_id", billIds);
      
      if (sectionsError) {
        console.error("Error fetching sections:", sectionsError);
        return [];
      }
      
      if (!sections) return [];
      
      const result: SectionWithDiscrepancy[] = [];
      
      for (const section of sections) {
        const statedTotal = Number(section.boq_stated_total) || 0;
        const calculatedTotal = Number(section.contract_total) || 0;
        const difference = statedTotal - calculatedTotal;
        
        // Only include if there's a stated total and a meaningful difference
        if (statedTotal > 0 && Math.abs(difference) > 0.01) {
          result.push({
            id: section.id,
            section_code: section.section_code,
            section_name: section.section_name,
            contract_total: calculatedTotal,
            boq_stated_total: statedTotal,
            difference,
            bill_name: billMap.get(section.bill_id) || "Unknown Bill",
          });
        }
      }
      
      return result.sort((a, b) => a.bill_name.localeCompare(b.bill_name) || a.section_code.localeCompare(b.section_code));
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Get the linked BOQ
      const { data: account } = await supabase
        .from("final_accounts")
        .select("source_boq_upload_id")
        .eq("id", accountId)
        .maybeSingle();
      
      if (!account?.source_boq_upload_id) {
        throw new Error("No linked BOQ found");
      }
      
      // Get BOQ file info
      const { data: boq } = await supabase
        .from("boq_uploads")
        .select("file_path")
        .eq("id", account.source_boq_upload_id)
        .maybeSingle();
      
      if (!boq?.file_path) {
        throw new Error("BOQ file not found");
      }
      
      // Download and parse the BOQ file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("boq-files")
        .download(boq.file_path);
      
      if (downloadError || !fileData) {
        throw new Error("Failed to download BOQ file");
      }
      
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      // Get all sections
      const { data: bills } = await supabase
        .from("final_account_bills")
        .select("id, bill_name")
        .eq("final_account_id", accountId);
      
      if (!bills) return;
      
      const { data: sections } = await supabase
        .from("final_account_sections")
        .select("id, section_code, section_name, bill_id")
        .in("bill_id", bills.map(b => b.id));
      
      if (!sections) return;
      
      let updatedCount = 0;
      
      // For each section, find matching sheet and extract stated total
      for (const section of sections) {
        const billName = bills.find(b => b.id === section.bill_id)?.bill_name || "";
        
        // Try to match sheet by section code or name
        const matchingSheet = workbook.SheetNames.find(name => {
          const normalized = name.toLowerCase().replace(/\s+/g, '');
          return normalized.includes(section.section_code.toLowerCase().replace(/\s+/g, '')) ||
                 normalized.includes(section.section_name.toLowerCase().replace(/\s+/g, '').substring(0, 10));
        });
        
        if (matchingSheet) {
          const worksheet = workbook.Sheets[matchingSheet];
          const statedTotal = extractStatedTotalFromSheet(worksheet);
          
          if (statedTotal !== null) {
            await supabase
              .from("final_account_sections")
              .update({ boq_stated_total: statedTotal })
              .eq("id", section.id);
            updatedCount++;
            console.log(`Updated ${section.section_code}: ${statedTotal}`);
          }
        }
      }
      
      return updatedCount;
    },
    onSuccess: (count) => {
      toast.success(`Refreshed stated totals for ${count} sections`);
      queryClient.invalidateQueries({ queryKey: ["boq-discrepancies", accountId] });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to refresh: ${error.message}`);
    },
  });

  const totalDiscrepancy = discrepancies.reduce((sum, d) => sum + d.difference, 0);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading discrepancies...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Stated Totals from BOQ
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Discrepancies</CardDescription>
            <CardTitle className="text-2xl">{discrepancies.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Difference</CardDescription>
            <CardTitle className={`text-2xl ${totalDiscrepancy > 0 ? 'text-red-600' : totalDiscrepancy < 0 ? 'text-green-600' : ''}`}>
              {formatCurrency(totalDiscrepancy)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overstatements</CardDescription>
            <CardTitle className="text-2xl text-green-600">{discrepancies.filter(d => d.difference < 0).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Understatements</CardDescription>
            <CardTitle className="text-2xl text-red-600">{discrepancies.filter(d => d.difference > 0).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            BOQ Calculation Discrepancies
          </CardTitle>
          <CardDescription>Differences between contractor's stated totals and calculated sums</CardDescription>
        </CardHeader>
        <CardContent>
          {discrepancies.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No Discrepancies Found</h3>
              <p className="text-muted-foreground">All BOQ section totals match their line item sums.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">BOQ Stated</TableHead>
                  <TableHead className="text-right">Calculated</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.bill_name}</TableCell>
                    <TableCell>{item.section_code} - {item.section_name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.boq_stated_total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.contract_total)}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.difference > 0 ? '+' : ''}{formatCurrency(item.difference)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.difference > 0 ? "destructive" : "default"} className="text-xs">
                        {item.difference > 0 ? "Understated" : "Overstated"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}