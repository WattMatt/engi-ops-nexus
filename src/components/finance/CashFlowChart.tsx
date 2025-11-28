import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, startOfMonth } from "date-fns";

interface Payment {
  id: string;
  payment_month: string;
  amount: number;
  invoice_id: string | null;
  invoice_projects?: {
    project_name: string;
    client_name: string;
  };
  invoices?: {
    status: string;
  } | null;
}

interface CashFlowChartProps {
  payments: Payment[];
}

export function CashFlowChart({ payments }: CashFlowChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = addMonths(startOfMonth(today), i);
      return format(month, "yyyy-MM");
    });

    return months.map(month => {
      const monthPayments = payments.filter(p => 
        p.payment_month.substring(0, 7) === month
      );
      
      const scheduled = monthPayments
        .filter(p => !p.invoice_id)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const invoiced = monthPayments
        .filter(p => p.invoice_id && p.invoices?.status !== 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const paid = monthPayments
        .filter(p => p.invoices?.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        month,
        label: format(new Date(month + "-01"), "MMM yy"),
        scheduled,
        invoiced,
        paid,
        total: scheduled + invoiced + paid,
      };
    });
  }, [payments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>12-Month Cash Flow Forecast</CardTitle>
          <CardDescription>Projected revenue by month and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="paid" name="Paid" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="invoiced" name="Invoiced" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumulative Cash Flow</CardTitle>
          <CardDescription>Running total of expected revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData.map((d, i, arr) => ({
                  ...d,
                  cumulative: arr.slice(0, i + 1).reduce((sum, item) => sum + item.total, 0)
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Cumulative Revenue"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
