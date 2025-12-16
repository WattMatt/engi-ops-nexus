import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, DollarSign, Zap, Building2, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PortfolioMetrics {
  totalProjects: number;
  totalFittings: number;
  totalCost: number;
  avgCostPerM2: number;
  avgWattage: number;
  avgEfficacy: number;
  topManufacturers: { manufacturer: string; count: number }[];
  topFittings: { model_name: string; manufacturer: string; count: number }[];
}

export const PortfolioAnalytics: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['portfolio-analytics'],
    queryFn: async (): Promise<PortfolioMetrics> => {
      // Fetch all fittings
      const { data: fittings, error: fittingsError } = await supabase
        .from('lighting_fittings')
        .select('*');
      
      if (fittingsError) throw fittingsError;

      // Fetch schedules for project count
      const { data: schedules, error: schedulesError } = await supabase
        .from('project_lighting_schedules')
        .select('project_id, fitting_id, quantity');
      
      if (schedulesError) throw schedulesError;

      const uniqueProjects = new Set(schedules?.map(s => s.project_id) || []);
      
      // Calculate totals
      const totalFittings = fittings?.length || 0;
      const totalCost = fittings?.reduce((sum, f) => 
        sum + (f.supply_cost || 0) + (f.install_cost || 0), 0) || 0;
      
      const avgWattage = fittings?.length 
        ? fittings.reduce((sum, f) => sum + (f.wattage || 0), 0) / fittings.length 
        : 0;
      
      const fittingsWithEfficacy = fittings?.filter(f => f.wattage && f.lumen_output) || [];
      const avgEfficacy = fittingsWithEfficacy.length
        ? fittingsWithEfficacy.reduce((sum, f) => sum + (f.lumen_output! / f.wattage!), 0) / fittingsWithEfficacy.length
        : 0;

      // Top manufacturers
      const manufacturerCounts: Record<string, number> = {};
      fittings?.forEach(f => {
        if (f.manufacturer) {
          manufacturerCounts[f.manufacturer] = (manufacturerCounts[f.manufacturer] || 0) + 1;
        }
      });
      const topManufacturers = Object.entries(manufacturerCounts)
        .map(([manufacturer, count]) => ({ manufacturer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top fittings by usage in schedules
      const fittingUsage: Record<string, number> = {};
      schedules?.forEach(s => {
        if (s.fitting_id) {
          fittingUsage[s.fitting_id] = (fittingUsage[s.fitting_id] || 0) + (s.quantity || 1);
        }
      });
      
      const topFittings = Object.entries(fittingUsage)
        .map(([fittingId, count]) => {
          const fitting = fittings?.find(f => f.id === fittingId);
          return {
            model_name: fitting?.model_name || 'Unknown',
            manufacturer: fitting?.manufacturer || 'Unknown',
            count
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalProjects: uniqueProjects.size,
        totalFittings,
        totalCost,
        avgCostPerM2: 0, // Would need area data
        avgWattage: Math.round(avgWattage * 10) / 10,
        avgEfficacy: Math.round(avgEfficacy * 10) / 10,
        topManufacturers,
        topFittings
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Projects',
      value: metrics?.totalProjects || 0,
      icon: Building2,
      color: 'text-blue-500'
    },
    {
      title: 'Total Fittings',
      value: metrics?.totalFittings || 0,
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
    {
      title: 'Portfolio Value',
      value: `R ${(metrics?.totalCost || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      title: 'Avg Efficacy',
      value: `${metrics?.avgEfficacy || 0} lm/W`,
      icon: Zap,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Manufacturers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Manufacturers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.topManufacturers.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="font-medium">{m.manufacturer}</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 bg-primary rounded-full" 
                      style={{ 
                        width: `${(m.count / (metrics?.totalFittings || 1)) * 200}px` 
                      }} 
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {m.count}
                    </span>
                  </div>
                </div>
              ))}
              {(!metrics?.topManufacturers || metrics.topManufacturers.length === 0) && (
                <p className="text-sm text-muted-foreground">No manufacturer data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Most Used Fittings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Most Used Fittings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.topFittings.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{f.model_name}</p>
                    <p className="text-xs text-muted-foreground">{f.manufacturer}</p>
                  </div>
                  <span className="text-sm font-medium">{f.count} units</span>
                </div>
              ))}
              {(!metrics?.topFittings || metrics.topFittings.length === 0) && (
                <p className="text-sm text-muted-foreground">No fitting usage data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
