import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

interface Invoice {
  id: string;
  invoice_date: string;
  total_amount: number;
  client_name: string;
  status?: string;
}

interface YearlyTrend {
  month: string;
  total: number;
}

interface MonthlyChartsProps {
  invoices: Invoice[];
  yearlyTrend: YearlyTrend[];
  currentDate: Date;
  formatCurrency: (amount: number) => string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142, 76%, 36%)",
  "hsl(280, 65%, 60%)",
  "hsl(30, 80%, 55%)",
];

export function MonthlyCharts({ invoices, yearlyTrend, currentDate, formatCurrency }: MonthlyChartsProps) {
  // Client distribution for pie chart
  const clientDistribution = useMemo(() => {
    const clientTotals = new Map<string, number>();
    invoices?.forEach(inv => {
      const client = inv.client_name || "Unknown";
      clientTotals.set(client, (clientTotals.get(client) || 0) + inv.total_amount);
    });

    return Array.from(clientTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [invoices]);

  // Daily cumulative trend for sparkline
  const dailyTrend = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let cumulative = 0;
    return days.map(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayTotal = invoices
        ?.filter(inv => inv.invoice_date === dateKey)
        .reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      cumulative += dayTotal;
      return {
        date: format(day, "d"),
        daily: dayTotal,
        cumulative,
      };
    });
  }, [invoices, currentDate]);

  // Yearly trend sparkline data
  const yearlySparkline = useMemo(() => {
    return yearlyTrend?.map(item => ({
      month: format(parseISO(item.month + "-01"), "MMM"),
      total: item.total,
    })) || [];
  }, [yearlyTrend]);

  const totalAmount = clientDistribution.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-sm">
          <p className="font-medium">{payload[0].name || payload[0].payload.month || `Day ${payload[0].payload.date}`}</p>
          <p className="text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Client Distribution Pie Chart */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Revenue by Client</h4>
        {clientDistribution.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {clientDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {clientDistribution.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {((item.value / totalAmount) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            No invoices this month
          </div>
        )}
      </Card>

      {/* Daily Cumulative Sparkline */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Daily Cumulative Revenue</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorCumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Yearly Trend Sparkline */}
      <Card className="p-4 lg:col-span-2">
        <h4 className="text-sm font-semibold mb-3">
          Yearly Revenue Trend - {format(currentDate, "yyyy")}
        </h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlySparkline}>
              <defs>
                <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#colorYearly)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
