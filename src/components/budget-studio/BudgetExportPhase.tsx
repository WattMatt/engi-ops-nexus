import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { resolveRate } from "@/hooks/useBudgetEngine";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Props {
  budgetId: string;
  budget: any;
  tenants: any[];
}

export const BudgetExportPhase = ({ budgetId, budget, tenants }: Props) => {
  const baseRate = Number(budget.base_rate_m2);
  const formatR = (v: number) => `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  const rows = useMemo(() => {
    return tenants.map((t: any) => {
      const profile = t.master_tenant_profiles;
      const tiRate = t.override_ti_rate != null ? Number(t.override_ti_rate) : (profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0);
      const area = Number(t.area_m2);
      const { baseTotal, tiTotal, lineTotal } = resolveRate(
        area,
        baseRate,
        t.override_ti_rate ? Number(t.override_ti_rate) : null,
        profile?.default_ti_rate ? Number(profile.default_ti_rate) : 0
      );
      return { ...t, area, tiRate, baseTotal, tiTotal, lineTotal, category: profile?.category || "Line Shop" };
    });
  }, [tenants, baseRate]);

  const grandTotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  const totalArea = rows.reduce((s, r) => s + r.area, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review & Export</h1>
          <p className="text-muted-foreground text-sm">Preview the budget output before downloading.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Summary — Rev {budget.revision}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Area (m²)</TableHead>
                <TableHead className="text-right">DB Size</TableHead>
                <TableHead className="text-right">Base (R)</TableHead>
                <TableHead className="text-right">TI (R)</TableHead>
                <TableHead className="text-right">Total (R)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.shop_no}</TableCell>
                  <TableCell>{r.shop_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                  <TableCell className="text-right">{r.area.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs">{r.db_size}</TableCell>
                  <TableCell className="text-right">{formatR(r.baseTotal)}</TableCell>
                  <TableCell className="text-right">{formatR(r.tiTotal)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatR(r.lineTotal)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>Grand Total</TableCell>
                <TableCell className="text-right">{totalArea.toLocaleString()}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">{formatR(grandTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
