import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, addMonths } from "date-fns";

export function CashFlowProjection() {
  const { data: payments = [] } = useQuery({
    queryKey: ["all-monthly-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_payments")
        .select(`
          *,
          invoice_projects (
            project_name,
            client_name
          )
        `)
        .order("payment_month", { ascending: true });
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

  // Group payments by month
  const paymentsByMonth = payments.reduce((acc: any, payment: any) => {
    const month = payment.payment_month.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = {
        month,
        payments: [],
        total: 0,
      };
    }
    acc[month].payments.push(payment);
    acc[month].total += payment.amount;
    return acc;
  }, {});

  const monthsData = Object.values(paymentsByMonth).sort((a: any, b: any) => 
    a.month.localeCompare(b.month)
  );

  // Calculate next 12 months
  const today = new Date();
  const next12Months = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(startOfMonth(today), i);
    return format(month, "yyyy-MM");
  });

  const projectedMonths = next12Months.map(month => {
    const data = paymentsByMonth[month];
    return {
      month,
      total: data?.total || 0,
      count: data?.payments.length || 0,
    };
  });

  const totalProjected = projectedMonths.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Projected (12 Months)</CardTitle>
            <CardDescription>Expected cash inflow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalProjected)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Month</CardTitle>
            <CardDescription>{format(addMonths(today, 1), "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(projectedMonths[1]?.total || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Month</CardTitle>
            <CardDescription>{format(today, "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(projectedMonths[0]?.total || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>12-Month Cash Flow Projection</CardTitle>
          <CardDescription>Scheduled monthly payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectedMonths.map((monthData) => (
                <TableRow key={monthData.month}>
                  <TableCell className="font-medium">
                    {format(new Date(monthData.month + "-01"), "MMMM yyyy")}
                  </TableCell>
                  <TableCell>{monthData.count} payment{monthData.count !== 1 ? 's' : ''}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(monthData.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-bold">
                <TableCell>Total</TableCell>
                <TableCell>{projectedMonths.reduce((sum, m) => sum + m.count, 0)} payments</TableCell>
                <TableCell className="text-right">{formatCurrency(totalProjected)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Scheduled Payments</CardTitle>
          <CardDescription>Detailed payment schedule by project</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No payment schedules yet. Add monthly payments to projects to see cash flow projections.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_month), "MMM yyyy")}
                    </TableCell>
                    <TableCell>{payment.invoice_projects?.project_name}</TableCell>
                    <TableCell>{payment.invoice_projects?.client_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
