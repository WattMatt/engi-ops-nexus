import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DocumentTypeChartProps {
  data: Array<{
    type: string;
    count: number;
    total: number;
  }>;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  electrical_coc: "Electrical COC",
  as_built_drawing: "As Built Drawing",
  line_diagram: "Line Diagram",
  qc_inspection_report: "QC Inspection Report",
  lighting_guarantee: "Lighting Guarantee",
  db_guarantee: "DB Guarantee",
};

export const DocumentTypeChart = ({ data }: DocumentTypeChartProps) => {
  const chartData = data.map((item) => ({
    name: DOCUMENT_TYPE_LABELS[item.type] || item.type,
    value: item.count,
    percentage: item.total > 0 ? Math.round((item.count / item.total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Distribution by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} documents`, "Count"]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
