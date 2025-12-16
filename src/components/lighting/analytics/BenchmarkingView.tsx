import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectBenchmark {
  projectId: string;
  projectName: string;
  fittingCount: number;
  totalCost: number;
  avgWattage: number;
  avgEfficacy: number;
  isOutlier: boolean;
}

const INDUSTRY_BENCHMARKS = {
  office: { costPerM2: 150, wattsPerM2: 10, minEfficacy: 100 },
  retail: { costPerM2: 200, wattsPerM2: 15, minEfficacy: 90 },
  warehouse: { costPerM2: 80, wattsPerM2: 8, minEfficacy: 120 },
  residential: { costPerM2: 100, wattsPerM2: 6, minEfficacy: 80 }
};

export const BenchmarkingView: React.FC = () => {
  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['project-benchmarks'],
    queryFn: async (): Promise<ProjectBenchmark[]> => {
      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name');
      
      if (projectsError) throw projectsError;

      // Fetch schedules with fittings
      const { data: schedules, error: schedulesError } = await supabase
        .from('project_lighting_schedules')
        .select(`
          project_id,
          quantity,
          fitting_id,
          lighting_fittings (
            wattage,
            lumen_output,
            supply_cost,
            install_cost
          )
        `);
      
      if (schedulesError) throw schedulesError;

      // Group by project
      const projectData: Record<string, {
        fittings: any[];
        totalQty: number;
      }> = {};

      schedules?.forEach(s => {
        if (!projectData[s.project_id]) {
          projectData[s.project_id] = { fittings: [], totalQty: 0 };
        }
        if (s.lighting_fittings) {
          projectData[s.project_id].fittings.push({
            ...s.lighting_fittings,
            quantity: s.quantity || 1
          });
          projectData[s.project_id].totalQty += s.quantity || 1;
        }
      });

      // Calculate benchmarks per project
      const results: ProjectBenchmark[] = projects?.map(p => {
        const pd = projectData[p.id] || { fittings: [], totalQty: 0 };
        
        const totalCost = pd.fittings.reduce((sum, f) => 
          sum + ((f.supply_cost || 0) + (f.install_cost || 0)) * (f.quantity || 1), 0);
        
        const avgWattage = pd.fittings.length
          ? pd.fittings.reduce((sum, f) => sum + (f.wattage || 0), 0) / pd.fittings.length
          : 0;
        
        const efficacyFittings = pd.fittings.filter(f => f.wattage && f.lumen_output);
        const avgEfficacy = efficacyFittings.length
          ? efficacyFittings.reduce((sum, f) => sum + (f.lumen_output / f.wattage), 0) / efficacyFittings.length
          : 0;

        return {
          projectId: p.id,
          projectName: p.name || 'Unnamed Project',
          fittingCount: pd.totalQty,
          totalCost,
          avgWattage: Math.round(avgWattage * 10) / 10,
          avgEfficacy: Math.round(avgEfficacy * 10) / 10,
          isOutlier: false
        };
      }) || [];

      // Identify outliers (projects significantly above/below average)
      if (results.length > 2) {
        const avgCost = results.reduce((s, r) => s + r.totalCost, 0) / results.length;
        const stdDev = Math.sqrt(
          results.reduce((s, r) => s + Math.pow(r.totalCost - avgCost, 2), 0) / results.length
        );
        results.forEach(r => {
          r.isOutlier = Math.abs(r.totalCost - avgCost) > 2 * stdDev;
        });
      }

      return results.filter(r => r.fittingCount > 0);
    }
  });

  const chartConfig = {
    cost: { label: 'Total Cost', color: 'hsl(var(--primary))' },
    efficacy: { label: 'Efficacy', color: 'hsl(var(--chart-2))' }
  };

  const costChartData = useMemo(() => 
    benchmarks?.map(b => ({
      name: b.projectName.length > 15 ? b.projectName.slice(0, 15) + '...' : b.projectName,
      cost: b.totalCost,
      isOutlier: b.isOutlier
    })) || [], [benchmarks]);

  const scatterData = useMemo(() =>
    benchmarks?.map(b => ({
      x: b.avgWattage,
      y: b.avgEfficacy,
      z: b.fittingCount,
      name: b.projectName
    })) || [], [benchmarks]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const outliers = benchmarks?.filter(b => b.isOutlier) || [];

  return (
    <div className="space-y-6">
      {/* Outlier Alerts */}
      {outliers.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Outlier Projects Detected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {outliers.map(o => (
                <Badge key={o.projectId} variant="outline" className="border-yellow-500">
                  {o.projectName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Project Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {costChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                    className="fill-muted-foreground"
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cost" name="Total Cost" radius={[4, 4, 0, 0]}>
                    {costChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isOutlier ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No project data available</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Efficiency Scatter Plot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wattage vs Efficacy</CardTitle>
          </CardHeader>
          <CardContent>
            {scatterData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="x" 
                      name="Avg Wattage" 
                      unit="W"
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      dataKey="y" 
                      name="Avg Efficacy" 
                      unit="lm/W"
                      className="fill-muted-foreground"
                    />
                    <ZAxis dataKey="z" range={[50, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Industry Benchmarks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Industry Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(INDUSTRY_BENCHMARKS).map(([type, bench]) => (
                <div key={type} className="border-b pb-3 last:border-0">
                  <p className="font-medium capitalize mb-2">{type}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cost/m²</p>
                      <p className="font-medium">R{bench.costPerM2}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">W/m²</p>
                      <p className="font-medium">{bench.wattsPerM2}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Efficacy</p>
                      <p className="font-medium">{bench.minEfficacy} lm/W</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
