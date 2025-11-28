import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyKPICardsProps {
  invoiceCount: number;
  monthAmount: number;
  monthVat: number;
  monthTotal: number;
  trend: number;
  prevMonthTotal: number;
  avgInvoiceValue: number;
  targetAmount?: number;
  formatCurrency: (amount: number) => string;
}

export function MonthlyKPICards({
  invoiceCount,
  monthAmount,
  monthVat,
  monthTotal,
  trend,
  prevMonthTotal,
  avgInvoiceValue,
  targetAmount = 500000,
  formatCurrency,
}: MonthlyKPICardsProps) {
  const progressToTarget = Math.min((monthTotal / targetAmount) * 100, 100);
  const isPositiveTrend = trend >= 0;

  const kpis = [
    {
      title: "Invoices",
      value: invoiceCount.toString(),
      subtitle: "This month",
      icon: Receipt,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Revenue",
      value: formatCurrency(monthAmount),
      subtitle: "Excl. VAT",
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "VAT Collected",
      value: formatCurrency(monthVat),
      subtitle: "15%",
      icon: Receipt,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      title: "Total Billed",
      value: formatCurrency(monthTotal),
      subtitle: prevMonthTotal > 0 ? (
        <span className={cn(
          "flex items-center gap-0.5",
          isPositiveTrend ? "text-emerald-500" : "text-red-500"
        )}>
          {isPositiveTrend ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs last month
        </span>
      ) : "Incl. VAT",
      icon: isPositiveTrend ? TrendingUp : TrendingDown,
      iconBg: isPositiveTrend ? "bg-emerald-500/10" : "bg-red-500/10",
      iconColor: isPositiveTrend ? "text-emerald-500" : "text-red-500",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="p-4 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                <div className="text-xs text-muted-foreground">
                  {typeof kpi.subtitle === 'string' ? kpi.subtitle : kpi.subtitle}
                </div>
              </div>
              <div className={cn("p-2 rounded-lg", kpi.iconBg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.iconColor)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Progress to Target Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Monthly Target Progress</p>
              <p className="text-xs text-muted-foreground">Target: {formatCurrency(targetAmount)}</p>
            </div>
          </div>
          <span className="text-lg font-bold">{progressToTarget.toFixed(0)}%</span>
        </div>
        <Progress value={progressToTarget} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Current: {formatCurrency(monthTotal)}</span>
          <span>Remaining: {formatCurrency(Math.max(targetAmount - monthTotal, 0))}</span>
        </div>
      </Card>

      {/* Average Invoice Value */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Calendar className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-sm font-medium">Avg Invoice Value</p>
          </div>
          <p className="text-xl font-bold">{formatCurrency(avgInvoiceValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Per invoice this month</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-sm font-medium">Previous Month</p>
          </div>
          <p className="text-xl font-bold">{formatCurrency(prevMonthTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total billed</p>
        </Card>
      </div>
    </div>
  );
}
