import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface LoadDistributionChartProps {
  zones: Array<{
    id: string;
    zone_name: string;
    loading: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function LoadDistributionChart({ zones }: LoadDistributionChartProps) {
  const data = zones.map(zone => ({
    name: zone.zone_name,
    value: Number(zone.loading.toFixed(2)),
    percentage: 0
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);
  data.forEach(item => {
    item.percentage = total > 0 ? (item.value / total) * 100 : 0;
  });

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load Distribution by Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(2)} kW`, 'Load']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => `${value}: ${entry.payload.value.toFixed(2)} kW`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
