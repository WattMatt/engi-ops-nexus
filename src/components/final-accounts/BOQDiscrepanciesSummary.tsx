import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

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

export function BOQDiscrepanciesSummary({ accountId }: BOQDiscrepanciesSummaryProps) {
  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ["boq-discrepancies", accountId],
    queryFn: async (): Promise<SectionWithDiscrepancy[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      
      const billsResult = await client.from("final_account_bills").select("*").eq("account_id", accountId);
      const bills = billsResult.data || [];
      
      if (!bills.length) return [];
      
      const billMap = new Map<string, string>(bills.map((b: any) => [b.id, b.bill_name]));
      const billIds = bills.map((b: any) => b.id);
      
      const sectionsResult = await client.from("final_account_sections").select("*");
      const sections = sectionsResult.data || [];
      
      const result: SectionWithDiscrepancy[] = [];
      
      for (const section of sections) {
        if (!billIds.includes(section.bill_id)) continue;
        
        const statedTotal = Number(section.boq_stated_total) || 0;
        const calculatedTotal = Number(section.contract_total) || 0;
        const difference = statedTotal - calculatedTotal;
        
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

  const totalDiscrepancy = discrepancies.reduce((sum, d) => sum + d.difference, 0);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading discrepancies...</div>;
  }

  return (
    <div className="space-y-6">
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