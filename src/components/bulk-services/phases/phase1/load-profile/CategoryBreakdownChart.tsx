/**
 * Category Breakdown Chart - Pie/Donut chart showing load by category
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { LoadCategorySummary } from './useLoadProfile';

interface CategoryBreakdownChartProps {
  categories: LoadCategorySummary[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
];

export function CategoryBreakdownChart({ categories }: CategoryBreakdownChartProps) {
  const data = categories.map((cat, index) => ({
    name: cat.category_name,
    value: cat.max_demand_kva || cat.total_connected_load_kva,
    connected: cat.total_connected_load_kva,
    shops: cat.shop_count,
    color: cat.color_code || COLORS[index % COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Add percentage to each item
  const dataWithPercentage = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
  }));

  const renderCustomLabel = ({ name, percentage }: { name: string; percentage: string }) => {
    if (parseFloat(percentage) < 5) return '';
    return `${percentage}%`;
  };

  if (categories.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Load by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No category data available</p>
            <p className="text-sm">Add meter-shop linkages to see breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Load by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <defs>
              {dataWithPercentage.map((entry, index) => (
                <linearGradient 
                  key={`gradient-${index}`} 
                  id={`category-gradient-${index}`} 
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={dataWithPercentage}
              cx="50%"
              cy="50%"
              labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
              label={renderCustomLabel}
              outerRadius={120}
              innerRadius={50}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {dataWithPercentage.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#category-gradient-${index})`}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Max Demand: <span className="font-mono">{data.value.toFixed(2)} kVA</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Connected: <span className="font-mono">{data.connected.toFixed(2)} kVA</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Shops: <span className="font-mono">{data.shops}</span>
                    </p>
                    <p className="text-sm font-medium text-primary">
                      {data.percentage}% of total
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={60}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value}: <span className="font-semibold">{entry.payload.value.toFixed(1)} kVA</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total Summary */}
        <div className="mt-4 text-center p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">Total Max Demand</p>
          <p className="text-2xl font-bold text-primary">
            {(total / 1000).toFixed(2)} MVA
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
