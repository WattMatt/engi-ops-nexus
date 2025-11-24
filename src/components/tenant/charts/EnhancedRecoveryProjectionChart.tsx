import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";

interface RecoveryProjectionChartProps {
  monthlyCapitalRecovery: number;
  monthlyRunningRecovery: number;
  years?: number;
}

export function RecoveryProjectionChart({ 
  monthlyCapitalRecovery, 
  monthlyRunningRecovery,
  years = 10 
}: RecoveryProjectionChartProps) {
  const data = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const capitalAnnual = monthlyCapitalRecovery * 12;
    const runningAnnual = monthlyRunningRecovery * 12;
    const totalAnnual = capitalAnnual + runningAnnual;
    const cumulativeCapital = capitalAnnual * year;
    const cumulativeRunning = runningAnnual * year;
    
    return {
      year: `Y${year}`,
      yearNum: year,
      capitalRecovery: Number((capitalAnnual / 1000).toFixed(2)),
      runningRecovery: Number((runningAnnual / 1000).toFixed(2)),
      totalRecovery: Number((totalAnnual / 1000).toFixed(2)),
      cumulativeCapital: Number((cumulativeCapital / 1000).toFixed(2)),
      cumulativeRunning: Number((cumulativeRunning / 1000).toFixed(2)),
    };
  });

  const formatCurrency = (value: number) => {
    return `R ${(value * 1000).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className="overflow-hidden border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-chart-3/5 to-chart-3/10 pb-4">
        <CardTitle className="text-lg font-semibold">10-Year Recovery Projection</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Stacked Bar Chart */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">Annual Recovery Breakdown</p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <defs>
                <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="runningGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis 
                dataKey="year" 
                angle={0}
                textAnchor="middle"
                height={40}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                label={{ 
                  value: 'Amount (R thousands)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))' }
                }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar 
                dataKey="capitalRecovery" 
                fill="url(#capitalGradient)"
                name="Capital Recovery"
                stackId="a"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="runningRecovery" 
                fill="url(#runningGradient)"
                name="Running Recovery"
                stackId="a"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative Line Chart */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">Cumulative Recovery Over Time</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="cumulativeCapitalArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="cumulativeRunningArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="year"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                label={{ 
                  value: 'Cumulative (R thousands)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))' }
                }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cumulativeCapital" 
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cumulativeCapitalArea)"
                name="Cumulative Capital"
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeRunning" 
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cumulativeRunningArea)"
                name="Cumulative Running"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-chart-1/10 to-chart-1/5 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Monthly Capital</p>
            <p className="text-lg font-bold text-chart-1">{formatCurrency(monthlyCapitalRecovery / 1000)}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-chart-2/10 to-chart-2/5 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Monthly Running</p>
            <p className="text-lg font-bold text-chart-2">{formatCurrency(monthlyRunningRecovery / 1000)}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-chart-3/10 to-chart-3/5 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Monthly Total</p>
            <p className="text-lg font-bold text-chart-3">{formatCurrency((monthlyCapitalRecovery + monthlyRunningRecovery) / 1000)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
