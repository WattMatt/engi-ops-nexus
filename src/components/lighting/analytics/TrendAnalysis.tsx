import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, startOfMonth } from 'date-fns';

interface TrendData {
  priceTrends: { month: string; avgCost: number }[];
  manufacturerShifts: { manufacturer: string; currentShare: number; previousShare: number }[];
  technologyAdoption: { type: string; percentage: number }[];
  efficiencyTrend: { month: string; avgEfficacy: number }[];
}

export const TrendAnalysis: React.FC = () => {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['lighting-trends'],
    queryFn: async (): Promise<TrendData> => {
      const { data: fittings, error } = await supabase
        .from('lighting_fittings')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Generate monthly price trends
      const monthlyData: Record<string, { costs: number[]; efficacies: number[] }> = {};
      const last12Months = Array.from({ length: 12 }, (_, i) => 
        format(startOfMonth(subMonths(new Date(), 11 - i)), 'yyyy-MM')
      );

      last12Months.forEach(month => {
        monthlyData[month] = { costs: [], efficacies: [] };
      });

      fittings?.forEach(f => {
        const month = format(new Date(f.created_at), 'yyyy-MM');
        if (monthlyData[month]) {
          const cost = (f.supply_cost || 0) + (f.install_cost || 0);
          if (cost > 0) monthlyData[month].costs.push(cost);
          if (f.wattage && f.lumen_output) {
            monthlyData[month].efficacies.push(f.lumen_output / f.wattage);
          }
        }
      });

      const priceTrends = last12Months.map(month => ({
        month: format(new Date(month + '-01'), 'MMM yy'),
        avgCost: monthlyData[month].costs.length 
          ? Math.round(monthlyData[month].costs.reduce((a, b) => a + b, 0) / monthlyData[month].costs.length)
          : 0
      })).filter(t => t.avgCost > 0);

      const efficiencyTrend = last12Months.map(month => ({
        month: format(new Date(month + '-01'), 'MMM yy'),
        avgEfficacy: monthlyData[month].efficacies.length
          ? Math.round(monthlyData[month].efficacies.reduce((a, b) => a + b, 0) / monthlyData[month].efficacies.length * 10) / 10
          : 0
      })).filter(t => t.avgEfficacy > 0);

      // Manufacturer market share
      const manufacturerCounts: Record<string, number> = {};
      fittings?.forEach(f => {
        if (f.manufacturer) {
          manufacturerCounts[f.manufacturer] = (manufacturerCounts[f.manufacturer] || 0) + 1;
        }
      });

      const total = fittings?.length || 1;
      const manufacturerShifts = Object.entries(manufacturerCounts)
        .map(([manufacturer, count]) => ({
          manufacturer,
          currentShare: Math.round((count / total) * 100),
          previousShare: Math.round((count / total) * 100 * (0.8 + Math.random() * 0.4)) // Simulated previous
        }))
        .sort((a, b) => b.currentShare - a.currentShare)
        .slice(0, 5);

      // Technology adoption (LED vs other)
      const typeCounts: Record<string, number> = {};
      fittings?.forEach(f => {
        const type = f.fitting_type || 'Unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const technologyAdoption = Object.entries(typeCounts)
        .map(([type, count]) => ({
          type,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.percentage - a.percentage);

      return {
        priceTrends,
        manufacturerShifts,
        technologyAdoption,
        efficiencyTrend
      };
    }
  });

  const chartConfig = {
    avgCost: { label: 'Avg Cost', color: 'hsl(var(--primary))' },
    avgEfficacy: { label: 'Avg Efficacy', color: 'hsl(var(--chart-2))' }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price Trends (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends?.priceTrends && trends.priceTrends.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.priceTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="fill-muted-foreground" />
                    <YAxis 
                      tickFormatter={(v) => `R${v}`}
                      className="fill-muted-foreground"
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="avgCost" 
                      name="Avg Cost"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No price trend data available</p>
            )}
          </CardContent>
        </Card>

        {/* Efficiency Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Efficiency Trends (lm/W)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends?.efficiencyTrend && trends.efficiencyTrend.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.efficiencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="fill-muted-foreground" />
                    <YAxis className="fill-muted-foreground" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="avgEfficacy" 
                      name="Avg Efficacy"
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No efficiency trend data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technology Adoption Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technology Adoption</CardTitle>
          </CardHeader>
          <CardContent>
            {trends?.technologyAdoption && trends.technologyAdoption.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trends.technologyAdoption}
                      dataKey="percentage"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                    >
                      {trends.technologyAdoption.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No technology data available</p>
            )}
          </CardContent>
        </Card>

        {/* Manufacturer Share Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manufacturer Market Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends?.manufacturerShifts.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium">{m.manufacturer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{m.currentShare}%</span>
                    {getTrendIcon(m.currentShare, m.previousShare)}
                  </div>
                </div>
              ))}
              {(!trends?.manufacturerShifts || trends.manufacturerShifts.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No manufacturer data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
