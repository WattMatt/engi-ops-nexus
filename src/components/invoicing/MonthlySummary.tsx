import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyData {
  month: string;
  invoice_count: number;
  total_amount: number;
  total_vat: number;
  total_with_vat: number;
}

export function MonthlySummary() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ["monthly-summary", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .gte('invoice_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('invoice_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('invoice_date', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: yearlyTrend } = useQuery({
    queryKey: ["yearly-trend", format(currentDate, "yyyy")],
    queryFn: async () => {
      const yearStart = `${format(currentDate, 'yyyy')}-01-01`;
      const yearEnd = `${format(currentDate, 'yyyy')}-12-31`;

      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_date, total_amount')
        .gte('invoice_date', yearStart)
        .lte('invoice_date', yearEnd);

      if (error) throw error;

      // Group by month
      const monthlyTotals = new Map<string, number>();
      data?.forEach(invoice => {
        const month = format(new Date(invoice.invoice_date), 'yyyy-MM');
        monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + invoice.total_amount);
      });

      return Array.from(monthlyTotals.entries())
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const monthTotal = monthlyData?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const monthVat = monthlyData?.reduce((sum, inv) => sum + inv.vat_amount, 0) || 0;
  const monthAmount = monthlyData?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

  const prevMonth = subMonths(currentDate, 1);
  const prevMonthKey = format(prevMonth, 'yyyy-MM');
  const currentMonthKey = format(currentDate, 'yyyy-MM');
  
  const prevMonthTotal = yearlyTrend?.find(m => m.month === prevMonthKey)?.total || 0;
  const currentMonthTotal = yearlyTrend?.find(m => m.month === currentMonthKey)?.total || 0;
  const trend = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold">{format(currentDate, "MMMM yyyy")}</h3>
            <p className="text-sm text-muted-foreground">Monthly Invoice Summary</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Invoice Count</p>
            <p className="text-2xl font-bold">{monthlyData?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total (excl. VAT)</p>
            <p className="text-2xl font-bold">{formatCurrency(monthAmount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">VAT</p>
            <p className="text-2xl font-bold">{formatCurrency(monthVat)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total (incl. VAT)</p>
            <p className="text-2xl font-bold">{formatCurrency(monthTotal)}</p>
            {prevMonthTotal > 0 && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(trend).toFixed(1)}% vs last month</span>
              </div>
            )}
          </Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : monthlyData && monthlyData.length > 0 ? (
              monthlyData.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{invoice.description || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.vat_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No invoices for this month
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {yearlyTrend && yearlyTrend.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Yearly Trend - {format(currentDate, "yyyy")}</h4>
          <div className="grid grid-cols-6 gap-3">
            {yearlyTrend.map(({ month, total }) => (
              <Card key={month} className="p-3">
                <p className="text-xs text-muted-foreground mb-1">{format(new Date(month + '-01'), 'MMM')}</p>
                <p className="text-sm font-semibold">{formatCurrency(total)}</p>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
