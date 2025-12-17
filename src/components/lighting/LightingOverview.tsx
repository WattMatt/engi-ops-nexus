import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Lightbulb,
  Zap,
  Package,
  TrendingUp,
  Sun,
  Gauge,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
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

interface ScheduleItem {
  id: string;
  fitting_id: string | null;
  quantity: number | null;
  zone_id: string | null;
  zone_name: string | null;
  tenant_id: string | null;
  total_wattage: number | null;
  total_lumens: number | null;
  approval_status: string | null;
  fitting?: LightingFitting | null;
}

interface Zone {
  id: string;
  zone_name: string;
  zone_type: string;
  min_lux: number | null;
  max_wattage_per_m2: number | null;
  area_m2: number | null;
}

interface Tenant {
  id: string;
  shop_name: string;
  area: number | null;
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
  // Fetch project schedule with fittings
  const { data: schedules = [] } = useQuery({
    queryKey: ['project-lighting-schedules', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_lighting_schedules')
        .select(`
          *,
          fitting:lighting_fittings(*)
        `)
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as ScheduleItem[];
    },
    enabled: !!projectId,
  });

  // Fetch project zones
  const { data: zones = [] } = useQuery({
    queryKey: ['lighting-zones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('lighting_zones')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');
      if (error) throw error;
      return data as Zone[];
    },
    enabled: !!projectId,
  });

  // Fetch project tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['project-tenants', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_name, area')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: !!projectId,
  });

  const stats = useMemo(() => {
    // Calculate unique fittings and total quantities
    const uniqueFittings = new Set(schedules.filter(s => s.fitting_id).map(s => s.fitting_id));
    const totalQuantity = schedules.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalWattage = schedules.reduce((sum, s) => sum + (s.total_wattage || 0), 0);
    const totalLumens = schedules.reduce((sum, s) => sum + (s.total_lumens || 0), 0);
    
    // Zone coverage
    const zonesWithFittings = new Set(schedules.filter(s => s.zone_id).map(s => s.zone_id));
    const zoneCoverage = zones.length > 0 ? (zonesWithFittings.size / zones.length) * 100 : 0;
    
    // Tenant coverage
    const tenantsWithFittings = new Set(schedules.filter(s => s.tenant_id).map(s => s.tenant_id));
    const tenantCoverage = tenants.length > 0 ? (tenantsWithFittings.size / tenants.length) * 100 : 0;
    
    // Approval status
    const approved = schedules.filter(s => s.approval_status === 'approved').length;
    const pending = schedules.filter(s => s.approval_status === 'pending' || !s.approval_status).length;
    
    // Average efficacy from scheduled fittings
    const fittingsWithEfficacy = schedules.filter(s => s.fitting?.wattage && s.fitting?.lumen_output);
    const avgEfficacy = fittingsWithEfficacy.length > 0
      ? fittingsWithEfficacy.reduce((sum, s) => {
          const efficacy = s.fitting!.lumen_output! / s.fitting!.wattage!;
          return sum + efficacy * (s.quantity || 1);
        }, 0) / fittingsWithEfficacy.reduce((sum, s) => sum + (s.quantity || 1), 0)
      : 0;

    return {
      uniqueFittingTypes: uniqueFittings.size,
      totalQuantity,
      totalWattage,
      totalLumens,
      zoneCoverage,
      tenantCoverage,
      zonesWithFittings: zonesWithFittings.size,
      totalZones: zones.length,
      tenantsWithFittings: tenantsWithFittings.size,
      totalTenants: tenants.length,
      approved,
      pending,
      avgEfficacy,
    };
  }, [schedules, zones, tenants]);

  // Distribution by zone
  const zoneDistribution = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; wattage: number }> = {};
    schedules.forEach((s) => {
      const zoneName = s.zone_name || 'Unassigned';
      if (!counts[zoneName]) {
        counts[zoneName] = { name: zoneName, quantity: 0, wattage: 0 };
      }
      counts[zoneName].quantity += s.quantity || 0;
      counts[zoneName].wattage += s.total_wattage || 0;
    });
    return Object.values(counts).filter(z => z.quantity > 0);
  }, [schedules]);

  // Distribution by fitting type
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    schedules.forEach((s) => {
      if (s.fitting) {
        const type = s.fitting.fitting_type;
        counts[type] = (counts[type] || 0) + (s.quantity || 1);
      }
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: FITTING_TYPES.find((t) => t.value === type)?.label || type,
      value: count,
    }));
  }, [schedules]);

  // Recent schedule entries
  const recentEntries = useMemo(() => {
    return schedules
      .filter(s => s.fitting)
      .slice(0, 5);
  }, [schedules]);

  if (!projectId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a project to view the lighting schedule overview.
        </AlertDescription>
      </Alert>
    );
  }

  if (schedules.length === 0 && zones.length === 0) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No lighting schedule data for this project yet. Start by defining zones in the Schedule tab and assigning fittings.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fittings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Scheduled in project</p>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Zones Defined</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Create zones to start</p>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">In project</p>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Power</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 <span className="text-sm font-normal">kW</span></div>
              <p className="text-xs text-muted-foreground">Connected load</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{stats.totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              {stats.uniqueFittingTypes} unique types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Power</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalWattage / 1000).toFixed(2)} <span className="text-sm font-normal">kW</span>
            </div>
            <p className="text-xs text-muted-foreground">Connected load</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lumens</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalLumens / 1000).toFixed(1)} <span className="text-sm font-normal">klm</span>
            </div>
            <p className="text-xs text-muted-foreground">Light output</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficacy</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgEfficacy.toFixed(1)} <span className="text-sm font-normal">lm/W</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.avgEfficacy >= 100 ? 'Good efficiency' : 'Could improve'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zone Coverage</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.zoneCoverage.toFixed(0)}%</span>
              <span className="text-sm text-muted-foreground">
                {stats.zonesWithFittings} / {stats.totalZones} zones
              </span>
            </div>
            <Progress value={stats.zoneCoverage} className="h-2" />
            {stats.zoneCoverage < 100 && (
              <p className="text-xs text-amber-600">
                {stats.totalZones - stats.zonesWithFittings} zones need fittings assigned
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Coverage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.tenantCoverage.toFixed(0)}%</span>
              <span className="text-sm text-muted-foreground">
                {stats.tenantsWithFittings} / {stats.totalTenants} tenants
              </span>
            </div>
            <Progress value={stats.tenantCoverage} className="h-2" />
            {stats.tenantCoverage < 100 && stats.totalTenants > 0 && (
              <p className="text-xs text-amber-600">
                {stats.totalTenants - stats.tenantsWithFittings} tenants need lighting assigned
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fittings by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {zoneDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={zoneDistribution} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'quantity' ? `${value} fittings` : `${value}W`,
                      name === 'quantity' ? 'Quantity' : 'Wattage'
                    ]}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No zone data to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fitting Types</CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
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
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {typeDistribution.map((item, index) => (
                    <Badge key={item.name} variant="outline" className="text-xs">
                      <span 
                        className="w-2 h-2 rounded-full mr-1" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      {item.name} ({item.value})
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No fittings assigned yet
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
            Recently Scheduled Fittings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.fitting?.model_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.zone_name || 'No zone'} • Qty: {entry.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.approval_status === 'approved' ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    <div className="text-right text-xs text-muted-foreground">
                      {entry.total_wattage && <span>{entry.total_wattage}W</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No fittings scheduled yet. Go to the Schedule tab to assign fittings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
