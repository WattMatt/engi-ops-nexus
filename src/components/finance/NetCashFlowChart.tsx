import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, ComposedChart, Line } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, startOfMonth } from "date-fns";

interface Payment {
  id: string;
  payment_month: string;
  amount: number;
  invoice_id: string | null;
}

interface Expense {
  id: string;
  expense_month: string;
  budgeted_amount: number;
  actual_amount: number | null;
  expense_categories?: {
    name: string;
    code: string;
  };
}

interface NetCashFlowChartProps {
  payments: Payment[];
  expenses: Expense[];
}

export function NetCashFlowChart({ payments, expenses }: NetCashFlowChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = addMonths(startOfMonth(today), i);
      return format(month, "yyyy-MM");
    });

    return months.map((month) => {
      // Income from payments
      const monthPayments = payments.filter(
        (p) => p.payment_month.substring(0, 7) === month
      );
      const income = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      // Expenses - use actual if available for each expense, otherwise budgeted
      const monthExpenses = expenses.filter(
        (e) => e.expense_month.substring(0, 7) === month
      );
      const expenseTotal = monthExpenses.reduce(
        (sum, e) => sum + (e.actual_amount ?? e.budgeted_amount),
        0
      );

      const netCashFlow = income - expenseTotal;

      return {
        month,
        label: format(new Date(month + "-01"), "MMM yy"),
        income,
        expenses: expenseTotal,
        netCashFlow,
      };
    });
  }, [payments, expenses]);

  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return chartData.map((d) => {
      cumulative += d.netCashFlow;
      return {
        ...d,
        cumulative,
      };
    });
  }, [chartData]);

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

  // Calculate summary
  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const netTotal = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>12-Month Income</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>12-Month Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card className={netTotal >= 0 ? "border-green-500" : "border-destructive"}>
          <CardHeader className="pb-2">
            <CardDescription>Net Cash Flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netTotal >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(netTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenses Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses</CardTitle>
          <CardDescription>Monthly comparison with net cash flow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="hsl(142, 76%, 36%)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="netCashFlow"
                  name="Net Cash Flow"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Net Cash Flow</CardTitle>
          <CardDescription>Running total of income minus expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cumulativeData}
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
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative Net"
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
