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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Cost Breakdown</CardTitle>
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
              formatter={(value: number) => [formatCurrency(value), 'Cost']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={60}
              formatter={(value, entry: any) => `${value}: ${formatCurrency(entry.payload.value)}`}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Total Capital Cost: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
