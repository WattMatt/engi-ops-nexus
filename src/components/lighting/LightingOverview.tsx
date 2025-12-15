import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  DollarSign,
  Zap,
  Package,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { LightingFitting, FITTING_TYPES } from './lightingTypes';

interface LightingOverviewProps {
  projectId?: string | null;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#f97316',
  '#06b6d4',
];

export const LightingOverview = ({ projectId }: LightingOverviewProps) => {
  const { data: fittings = [] } = useQuery({
    queryKey: ['lighting-fittings', projectId],
    queryFn: async () => {
      let query = supabase
        .from('lighting_fittings')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LightingFitting[];
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['lighting-schedules', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_lighting_schedules')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const stats = useMemo(() => {
    const totalFittings = fittings.length;
    const totalCost = fittings.reduce(
      (sum, f) => sum + (f.supply_cost || 0) + (f.install_cost || 0),
      0
    );
    const avgCost = totalFittings > 0 ? totalCost / totalFittings : 0;
    const totalScheduledQty = schedules.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalWattage = fittings.reduce((sum, f) => sum + (f.wattage || 0), 0);

    return {
      totalFittings,
      avgCost,
      totalScheduledQty,
      totalWattage,
    };
  }, [fittings, schedules]);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    fittings.forEach((f) => {
      counts[f.fitting_type] = (counts[f.fitting_type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: FITTING_TYPES.find((t) => t.value === type)?.label || type,
      value: count,
    }));
  }, [fittings]);

  const colorTempDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    fittings.forEach((f) => {
      if (f.color_temperature) {
        const label = `${f.color_temperature}K`;
        counts[label] = (counts[label] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [fittings]);

  const recentFittings = useMemo(() => {
    return fittings.slice(0, 5);
  }, [fittings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fittings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFittings}</div>
            <p className="text-xs text-muted-foreground">In library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgCost)}</div>
            <p className="text-xs text-muted-foreground">Per fitting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Qty</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScheduledQty}</div>
            <p className="text-xs text-muted-foreground">Project fittings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wattage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWattage}W</div>
            <p className="text-xs text-muted-foreground">Library sum</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fitting Distribution by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {typeDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No fittings to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Color Temperature Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {colorTempDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={colorTempDistribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No color temperature data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recently Added Fittings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFittings.length > 0 ? (
            <div className="space-y-3">
              {recentFittings.map((fitting) => (
                <div
                  key={fitting.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{fitting.model_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fitting.fitting_code} • {fitting.manufacturer || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {FITTING_TYPES.find((t) => t.value === fitting.fitting_type)?.label}
                    </Badge>
                    {fitting.wattage && (
                      <span className="text-sm text-muted-foreground">
                        {fitting.wattage}W
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No fittings added yet. Start building your library!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
