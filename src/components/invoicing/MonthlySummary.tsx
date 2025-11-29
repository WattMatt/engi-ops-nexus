import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, LayoutGrid, Table as TableIcon, FileText, Loader2, CheckCircle2, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyHeatmapCalendar } from "@/components/finance/MonthlyHeatmapCalendar";
import { MonthlyKPICards } from "@/components/finance/MonthlyKPICards";
import { MonthlyCharts } from "@/components/finance/MonthlyCharts";
import { toast } from "sonner";

interface MonthlyData {
  month: string;
  invoice_count: number;
  total_amount: number;
  total_vat: number;
  total_with_vat: number;
}

export function MonthlySummary() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"infographic" | "table">("infographic");
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch issued invoices for the month
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

  // Fetch scheduled payments for the month
  const { data: scheduledPayments, isLoading: isLoadingScheduled } = useQuery({
    queryKey: ["scheduled-payments-month", format(currentDate, "yyyy-MM")],
    queryFn: async () => {
      const monthKey = format(currentDate, "yyyy-MM");

      const { data, error } = await supabase
        .from('monthly_payments')
        .select(`
          *,
          invoice_projects (
            id,
            project_name,
            client_name
          )
        `)
        .gte('payment_month', `${monthKey}-01`)
        .lte('payment_month', `${monthKey}-31`)
        .order('payment_month', { ascending: true });

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

  const handleGenerateInvoice = async (payment: any) => {
    setGeneratingInvoice(payment.id);
    try {
      // Get the next invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 5000;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/\d+/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      const invoiceNumber = String(nextNumber);
      const amount = payment.amount;
      const vatAmount = amount * 0.15;
      const totalAmount = amount + vatAmount;

      // Create the invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split("T")[0],
          client_name: payment.invoice_projects?.client_name || "Unknown Client",
          description: `${payment.invoice_projects?.project_name || "Project"} - ${format(new Date(payment.payment_month), "MMMM yyyy")}`,
          amount: amount,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          status: "sent",
          project_reference: payment.invoice_projects?.project_name,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Link the invoice to the payment
      const { error: updateError } = await supabase
        .from("monthly_payments")
        .update({ invoice_id: newInvoice.id })
        .eq("id", payment.id);

      if (updateError) throw updateError;

      // Also record in invoice_history
      await supabase.from("invoice_history").insert({
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split("T")[0],
        invoice_month: payment.payment_month.substring(0, 7),
        job_name: payment.invoice_projects?.project_name || "Unknown Project",
        client_details: payment.invoice_projects?.client_name || "Unknown Client",
        amount_excl_vat: amount,
        vat_amount: vatAmount,
        amount_incl_vat: totalAmount,
        project_id: payment.project_id,
      });

      toast.success(`Invoice #${invoiceNumber} generated successfully`);
      queryClient.invalidateQueries({ queryKey: ["monthly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-payments-month"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
    } catch (error: any) {
      toast.error("Failed to generate invoice: " + error.message);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const monthTotal = monthlyData?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const monthVat = monthlyData?.reduce((sum, inv) => sum + inv.vat_amount, 0) || 0;
  const monthAmount = monthlyData?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
  const invoiceCount = monthlyData?.length || 0;
  const avgInvoiceValue = invoiceCount > 0 ? monthTotal / invoiceCount : 0;

  // Calculate scheduled totals
  const pendingScheduled = scheduledPayments?.filter(p => !p.invoice_id) || [];
  const invoicedScheduled = scheduledPayments?.filter(p => p.invoice_id) || [];
  const scheduledTotal = scheduledPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingTotal = pendingScheduled.reduce((sum, p) => sum + p.amount, 0);

  const prevMonth = subMonths(currentDate, 1);
  const prevMonthKey = format(prevMonth, 'yyyy-MM');
  const currentMonthKey = format(currentDate, 'yyyy-MM');
  
  const prevMonthTotal = yearlyTrend?.find(m => m.month === prevMonthKey)?.total || 0;
  const currentMonthTotal = yearlyTrend?.find(m => m.month === currentMonthKey)?.total || 0;
  const trend = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{format(currentDate, "MMMM yyyy")}</h3>
            <p className="text-sm text-muted-foreground">Monthly Invoice Summary</p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "infographic" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("infographic")}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Infographic
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-3"
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>

            {/* Month Navigation */}
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
        </div>
      </Card>

      {/* Scheduled Payments Summary */}
      {scheduledPayments && scheduledPayments.length > 0 && (
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduled Invoices for {format(currentDate, "MMMM")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {pendingScheduled.length} pending • {invoicedScheduled.length} invoiced
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Expected Total</p>
                <p className="text-xl font-bold">{formatCurrency(scheduledTotal)}</p>
              </div>
              {pendingScheduled.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Pending to Invoice</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(pendingTotal)}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {viewMode === "infographic" ? (
        <div className="space-y-6">
          {/* KPI Cards with Progress */}
          <MonthlyKPICards
            invoiceCount={invoiceCount}
            monthAmount={monthAmount}
            monthVat={monthVat}
            monthTotal={monthTotal}
            trend={trend}
            prevMonthTotal={prevMonthTotal}
            avgInvoiceValue={avgInvoiceValue}
            formatCurrency={formatCurrency}
          />

          {/* Pending Scheduled Payments */}
          {pendingScheduled.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Pending Invoices to Generate
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingScheduled.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.invoice_projects?.project_name || "Unknown"}
                      </TableCell>
                      <TableCell>{payment.invoice_projects?.client_name || "Unknown"}</TableCell>
                      <TableCell>{format(new Date(payment.payment_month), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvoice(payment)}
                          disabled={generatingInvoice === payment.id}
                        >
                          {generatingInvoice === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          Generate Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Heatmap Calendar and Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <MonthlyHeatmapCalendar
                currentDate={currentDate}
                invoices={monthlyData || []}
                formatCurrency={formatCurrency}
              />
            </div>
            <div className="lg:col-span-2">
              <MonthlyCharts
                invoices={monthlyData || []}
                yearlyTrend={yearlyTrend || []}
                currentDate={currentDate}
                formatCurrency={formatCurrency}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="space-y-6">
          {/* Pending Scheduled Payments Table */}
          {pendingScheduled.length > 0 && (
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Scheduled - Pending Invoice Generation ({pendingScheduled.length})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead className="text-right">Amount (excl VAT)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingScheduled.map((payment) => (
                    <TableRow key={payment.id} className="bg-orange-50/50">
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.invoice_projects?.project_name || "Unknown"}
                      </TableCell>
                      <TableCell>{payment.invoice_projects?.client_name || "Unknown"}</TableCell>
                      <TableCell>{format(new Date(payment.payment_month), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateInvoice(payment)}
                          disabled={generatingInvoice === payment.id}
                        >
                          {generatingInvoice === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          Generate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Issued Invoices Table */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Issued Invoices ({invoiceCount})
            </h4>
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
                      No invoices issued this month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
