import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, addMonths, differenceInDays } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { CashFlowChart } from "./CashFlowChart";

export function CashFlowDashboard() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["cashflow-dashboard-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_payments")
        .select(`
          *,
          invoice_projects (
            project_name,
            client_name,
            agreed_fee
          )
        `)
        .order("payment_month", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["cashflow-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // Calculate metrics
  const today = new Date();
  const currentMonth = format(today, "yyyy-MM");
  const nextMonth = format(addMonths(today, 1), "yyyy-MM");

  // Future 12 months
  const next12Months = Array.from({ length: 12 }, (_, i) => 
    format(addMonths(startOfMonth(today), i), "yyyy-MM")
  );

  const totalScheduled = payments
    .filter(p => next12Months.includes(p.payment_month.substring(0, 7)))
    .reduce((sum, p) => sum + p.amount, 0);

  const thisMonthScheduled = payments
    .filter(p => p.payment_month.substring(0, 7) === currentMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const nextMonthScheduled = payments
    .filter(p => p.payment_month.substring(0, 7) === nextMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const overduePayments = payments.filter(p => {
    const paymentDate = new Date(p.payment_month);
    return paymentDate < today && !p.invoice_id;
  });

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const invoicedNotPaid = payments.filter(p => p.invoice_id);
  const totalInvoicedPending = invoicedNotPaid.reduce((sum, p) => sum + p.amount, 0);

  // Total portfolio value
  const totalAgreedFees = projects.reduce((sum, p) => sum + (p.agreed_fee || 0), 0);
  const totalInvoiced = projects.reduce((sum, p) => sum + (p.total_invoiced || 0), 0);

  // Month-over-month change
  const lastMonth = format(addMonths(today, -1), "yyyy-MM");
  const lastMonthTotal = payments
    .filter(p => p.payment_month.substring(0, 7) === lastMonth)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const monthChange = lastMonthTotal > 0 
    ? ((thisMonthScheduled - lastMonthTotal) / lastMonthTotal) * 100 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>This Month</CardDescription>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyCompact(thisMonthScheduled)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {monthChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={monthChange >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(monthChange).toFixed(1)}%
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Next Month</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyCompact(nextMonthScheduled)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(addMonths(today, 1), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card className={totalOverdue > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Overdue</CardDescription>
            <AlertTriangle className={`h-4 w-4 ${totalOverdue > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOverdue > 0 ? "text-destructive" : ""}`}>
              {formatCurrencyCompact(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overduePayments.length} payment{overduePayments.length !== 1 ? "s" : ""} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>12-Month Forecast</CardDescription>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyCompact(totalScheduled)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Portfolio Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totalAgreedFees)}</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${totalAgreedFees > 0 ? (totalInvoiced / totalAgreedFees) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalInvoiced)} invoiced ({totalAgreedFees > 0 ? ((totalInvoiced / totalAgreedFees) * 100).toFixed(1) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting Payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(totalInvoicedPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoicedNotPaid.length} invoice{invoicedNotPaid.length !== 1 ? "s" : ""} sent, not yet paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{projects.filter(p => p.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {projects.length} total projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <CashFlowChart payments={payments as any} />

      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payments (Next 60 Days)</CardTitle>
          <CardDescription>Scheduled payments requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments
              .filter(p => {
                const paymentDate = new Date(p.payment_month);
                const daysUntil = differenceInDays(paymentDate, today);
                return daysUntil >= 0 && daysUntil <= 60 && !p.invoice_id;
              })
              .slice(0, 10)
              .map(payment => {
                const daysUntil = differenceInDays(new Date(payment.payment_month), today);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{payment.invoice_projects?.project_name}</p>
                      <p className="text-sm text-muted-foreground">{payment.invoice_projects?.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(payment.amount)}</p>
                      <Badge variant={daysUntil <= 7 ? "destructive" : daysUntil <= 14 ? "secondary" : "outline"}>
                        {daysUntil === 0 ? "Today" : `${daysUntil} days`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            {payments.filter(p => {
              const paymentDate = new Date(p.payment_month);
              const daysUntil = differenceInDays(paymentDate, today);
              return daysUntil >= 0 && daysUntil <= 60 && !p.invoice_id;
            }).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No upcoming payments in the next 60 days
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
