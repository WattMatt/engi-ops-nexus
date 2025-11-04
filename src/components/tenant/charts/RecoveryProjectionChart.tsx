import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

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
  // Generate data for each year
  const data = Array.from({ length: years }, (_, i) => {
    const year = i + 1;
    const capitalAnnual = monthlyCapitalRecovery * 12;
    const runningAnnual = monthlyRunningRecovery * 12;
    const totalAnnual = capitalAnnual + runningAnnual;
    
    return {
      year: `Year ${year}`,
      yearNum: year,
      capitalRecovery: Number((capitalAnnual / 1000).toFixed(2)),
      runningRecovery: Number((runningAnnual / 1000).toFixed(2)),
      totalRecovery: Number((totalAnnual / 1000).toFixed(2)),
    };
  });

  const formatCurrency = (value: number) => {
    return `R ${(value * 1000).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>10-Year Recovery Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="year" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: 'Amount (R thousands)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))' 
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Bar 
              dataKey="capitalRecovery" 
              fill="#3b82f6" 
              name="Capital Recovery"
              stackId="a"
            />
            <Bar 
              dataKey="runningRecovery" 
              fill="#10b981" 
              name="Running Recovery"
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground">Monthly Capital</p>
            <p className="font-bold">{formatCurrency(monthlyCapitalRecovery / 1000)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Running</p>
            <p className="font-bold">{formatCurrency(monthlyRunningRecovery / 1000)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly Total</p>
            <p className="font-bold">{formatCurrency((monthlyCapitalRecovery + monthlyRunningRecovery) / 1000)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
