import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CostBreakdownChartProps {
  costs: {
    generatorCost: number;
    tenantDBsCost: number;
    mainBoardsCost: number;
    additionalCablingCost: number;
    controlWiringCost: number;
  };
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function CostBreakdownChart({ costs }: CostBreakdownChartProps) {
  const data = [
    { name: 'Generator Equipment', value: costs.generatorCost },
    { name: 'Tenant Distribution Boards', value: costs.tenantDBsCost },
    { name: 'Main Boards', value: costs.mainBoardsCost },
    { name: 'Additional Cabling', value: costs.additionalCablingCost },
    { name: 'Control Wiring', value: costs.controlWiringCost },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const renderCustomLabel = (entry: any) => {
    const percentage = total > 0 ? (entry.value / total) * 100 : 0;
    if (percentage < 5) return ''; // Hide label for small slices
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <Card className="overflow-hidden border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
        <CardTitle className="text-lg font-semibold">Capital Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.75} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={{
                stroke: 'hsl(var(--muted-foreground))',
                strokeWidth: 1,
              }}
              label={renderCustomLabel}
              outerRadius={140}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-${index})`}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={80}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value}: <span className="font-semibold">{formatCurrency(entry.payload.value)}</span>
                </span>
              )}
              wrapperStyle={{ 
                fontSize: '12px',
                paddingTop: '10px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-6 text-center p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">Total Capital Cost</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {formatCurrency(total)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
