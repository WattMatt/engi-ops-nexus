import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lightbulb,
  Zap,
  Package,
  TrendingUp,
  Sun,
  Gauge,
  ShieldCheck,
  Activity,
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
    const totalScheduledQty = schedules.reduce((sum, s) => sum + (s.quantity || 0), 0);
    
    // Performance metrics
    const fittingsWithEfficacy = fittings.filter(f => f.wattage && f.lumen_output);
    const avgEfficacy = fittingsWithEfficacy.length > 0
      ? fittingsWithEfficacy.reduce((sum, f) => sum + (f.lumen_output! / f.wattage!), 0) / fittingsWithEfficacy.length
      : 0;
    
    const fittingsWithCri = fittings.filter(f => f.cri);
    const avgCri = fittingsWithCri.length > 0
      ? fittingsWithCri.reduce((sum, f) => sum + f.cri!, 0) / fittingsWithCri.length
      : 0;
    
    const ledCount = fittings.filter(f => 
      f.fitting_type === 'led_panel' || 
      f.fitting_type === 'led_downlight' || 
      f.fitting_type === 'led_strip' ||
      f.fitting_type === 'led_tube'
    ).length;
    const ledPercentage = totalFittings > 0 ? (ledCount / totalFittings) * 100 : 0;
    
    const fittingsWithLumens = fittings.filter(f => f.lumen_output);
    const totalLumens = fittingsWithLumens.reduce((sum, f) => sum + (f.lumen_output || 0), 0);
    const avgLumens = fittingsWithLumens.length > 0 ? totalLumens / fittingsWithLumens.length : 0;
    
    const fittingsWithWattage = fittings.filter(f => f.wattage);
    const avgWattage = fittingsWithWattage.length > 0
      ? fittingsWithWattage.reduce((sum, f) => sum + f.wattage!, 0) / fittingsWithWattage.length
      : 0;

    return {
      totalFittings,
      totalScheduledQty,
      avgEfficacy,
      avgCri,
      ledPercentage,
      avgLumens,
      avgWattage,
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

  const ipRatingDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    fittings.forEach((f) => {
      if (f.ip_rating) {
        counts[f.ip_rating] = (counts[f.ip_rating] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [fittings]);

  const recentFittings = useMemo(() => {
    return fittings.slice(0, 5);
  }, [fittings]);

  const getEfficacyRating = (efficacy: number) => {
    if (efficacy >= 130) return { label: 'Excellent', color: 'text-green-500' };
    if (efficacy >= 100) return { label: 'Good', color: 'text-blue-500' };
    if (efficacy >= 70) return { label: 'Average', color: 'text-yellow-500' };
    return { label: 'Below Average', color: 'text-orange-500' };
  };

  const efficacyRating = getEfficacyRating(stats.avgEfficacy);

  return (
    <div className="space-y-6">
      {/* Primary KPI Cards */}
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
            <CardTitle className="text-sm font-medium">Avg Efficacy</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEfficacy.toFixed(1)} <span className="text-sm font-normal">lm/W</span></div>
            <p className={`text-xs ${efficacyRating.color}`}>{efficacyRating.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CRI</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCri.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Color Rendering Index</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LED Adoption</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ledPercentage.toFixed(0)}%</div>
            <Progress value={stats.ledPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Light Output</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLumens.toFixed(0)} <span className="text-sm font-normal">lm</span></div>
            <p className="text-xs text-muted-foreground">Average lumens per fitting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Power</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWattage.toFixed(1)} <span className="text-sm font-normal">W</span></div>
            <p className="text-xs text-muted-foreground">Average wattage per fitting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Scheduled</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScheduledQty}</div>
            <p className="text-xs text-muted-foreground">Fittings in project schedules</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fitting Types</CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
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
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No fittings to display
              </div>
            )}
            {typeDistribution.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {typeDistribution.map((item, index) => (
                  <Badge key={item.name} variant="outline" className="text-xs">
                    <span 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {item.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Color Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            {colorTempDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={colorTempDistribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
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

        {/* IP Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">IP Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            {ipRatingDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ipRatingDistribution} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No IP rating data
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
                    <div className="text-right text-xs text-muted-foreground">
                      {fitting.wattage && <span>{fitting.wattage}W</span>}
                      {fitting.wattage && fitting.lumen_output && <span> • </span>}
                      {fitting.lumen_output && <span>{fitting.lumen_output}lm</span>}
                    </div>
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
