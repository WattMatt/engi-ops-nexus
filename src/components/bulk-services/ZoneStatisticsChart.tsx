import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface ZoneStatisticsChartProps {
  zoneStats: Array<{
    avg: number;
    min: number;
    max: number;
  }>;
  climaticZone: string;
  className?: string;
}

const ZONE_NAMES = [
  "Zone 1 (Cold)",
  "Zone 2 (Temp Int)",
  "Zone 3 (Hot Int)",
  "Zone 4 (Temp Coast)",
  "Zone 5 (Sub-trop)",
  "Zone 6 (Arid)",
];

export const ZoneStatisticsChart = ({ zoneStats, climaticZone, className }: ZoneStatisticsChartProps) => {
  const chartData = zoneStats.map((stats, idx) => ({
    zone: ZONE_NAMES[idx],
    zoneNumber: idx + 1,
    average: Math.round(stats.avg * 10) / 10,
    minimum: stats.min,
    maximum: stats.max,
    isSelected: climaticZone === (idx + 1).toString(),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-sm mb-2">{data.zone}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Average:</span>
              <span className="font-medium text-blue-600">{data.average} VA/m²</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Minimum:</span>
              <span className="font-medium text-green-600">{data.minimum} VA/m²</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Maximum:</span>
              <span className="font-medium text-red-600">{data.maximum} VA/m²</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className} id="zone-statistics-chart">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Zone Load Comparison Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="zone"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              label={{ value: "VA/m²", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
              iconType="circle"
            />
            <Bar
              dataKey="average"
              fill="hsl(217, 91%, 60%)"
              name="Average"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="minimum"
              fill="hsl(142, 71%, 45%)"
              name="Minimum"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="maximum"
              fill="hsl(0, 84%, 60%)"
              name="Maximum"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-xs text-center text-muted-foreground">
          {climaticZone && (
            <p>
              Selected Zone: <span className="font-semibold text-primary">
                {ZONE_NAMES[parseInt(climaticZone) - 1]}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
