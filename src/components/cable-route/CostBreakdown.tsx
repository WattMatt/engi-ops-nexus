import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CableRoute } from './types';

interface CostBreakdownProps {
  route: CableRoute;
  laborRate?: number;
}

const COLORS = ['#ff6b00', '#4ade80', '#60a5fa', '#a78bfa'];

export function CostBreakdown({ route, laborRate = 45 }: CostBreakdownProps) {
  if (!route.metrics) return null;

  const { totalLength, supportCount } = route.metrics;

  // Calculate costs
  const materialCost = route.metrics.totalCost * 0.3; // 30% of total
  const laborCost = (totalLength * 0.5 * laborRate); // 0.5 hours per meter
  const supportsCost = (supportCount || 0) * 25; // £25 per support
  const installationCost = totalLength * 8; // £8 per meter installation

  const data = [
    { name: 'Cable Material', value: materialCost },
    { name: 'Labor', value: laborCost },
    { name: 'Supports & Fixings', value: supportsCost },
    { name: 'Installation', value: installationCost },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `£${value.toFixed(2)}`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="font-semibold">£{item.value.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-bold">Total Estimated Cost</span>
              <span className="font-bold text-xl text-primary">£{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
