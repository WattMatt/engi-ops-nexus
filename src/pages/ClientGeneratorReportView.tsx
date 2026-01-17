import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Zap, Building2, TrendingUp, Users, BarChart3, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

const ClientGeneratorReportView = () => {
  const { token } = useParams<{ token: string }>();

  // Fetch share data
  const { data: shareData, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: ["generator-share", token],
    queryFn: async () => {
      if (!token) throw new Error("Invalid access token");

      const { data, error } = await supabase
        .from("generator_report_shares")
        .select(`
          *,
          project:projects(id, name, address, client_name)
        `)
        .eq("token", token)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error) throw error;
      if (!data) throw new Error("Report not found or expired");

      return data;
    },
    enabled: !!token,
  });

  // Update view count
  const updateViewMutation = useMutation({
    mutationFn: async () => {
      if (!shareData) return;
      await supabase
        .from("generator_report_shares")
        .update({
          viewed_at: new Date().toISOString(),
          view_count: (shareData.view_count || 0) + 1,
        })
        .eq("id", shareData.id);
    },
  });

  useEffect(() => {
    if (shareData && !shareData.viewed_at) {
      updateViewMutation.mutate();
    }
  }, [shareData]);

  // Fetch generator data
  const projectId = shareData?.project_id;
  const sharedSections = shareData?.shared_sections || [];

  const { data: zones = [] } = useQuery({
    queryKey: ["client-generator-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const zoneIds = zones.map((z) => z.id);

  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["client-zone-generators", projectId, zoneIds],
    queryFn: async () => {
      if (!zoneIds.length) return [];
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zoneIds.length > 0,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["client-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || []).sort((a, b) => {
        const numA = parseInt(a.shop_number.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.shop_number.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });
    },
    enabled: !!projectId && sharedSections.includes("breakdown"),
  });

  const { data: settings } = useQuery({
    queryKey: ["client-generator-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Calculate metrics
  const totalKva = zoneGenerators.reduce((sum, gen) => {
    const sizeStr = gen.generator_size || "";
    const match = sizeStr.match(/(\d+)\s*kva/i);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const totalGeneratorCost = zoneGenerators.reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
  const tenantCount = tenants.filter((t) => !t.own_generator_provided).length;

  const calculateLoading = (tenant: any): number => {
    if (!tenant.area || tenant.own_generator_provided) return 0;
    const kwPerSqm: Record<string, number> = {
      standard: settings?.standard_kw_per_sqm || 0.03,
      fast_food: settings?.fast_food_kw_per_sqm || 0.045,
      restaurant: settings?.restaurant_kw_per_sqm || 0.045,
      national: settings?.national_kw_per_sqm || 0.03,
    };
    return tenant.area * (kwPerSqm[tenant.shop_category] || 0.03);
  };

  const totalKw = tenants.reduce((sum, t) => sum + calculateLoading(t), 0);

  if (shareLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white/80">Loading report...</p>
        </div>
      </div>
    );
  }

  if (shareError || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/50 to-slate-900">
        <Card className="max-w-md mx-4 bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-white/70">
              This report link has expired or been revoked. Please contact the sender for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const project = shareData.project as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-900/20 dark:to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Clock className="h-3 w-3 mr-1" />
              Expires {format(new Date(shareData.expires_at), "MMM d, yyyy")}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Generator Report</h1>
          <p className="text-blue-100 text-lg">{project?.name || "Project"}</p>
          {project?.client_name && (
            <p className="text-blue-200/80 text-sm mt-1">Client: {project.client_name}</p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics */}
        {sharedSections.includes("overview") && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Key Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<Zap className="h-6 w-6" />}
                label="Total Capacity"
                value={`${totalKva} kVA`}
                gradient="from-yellow-500 to-orange-500"
              />
              <MetricCard
                icon={<TrendingUp className="h-6 w-6" />}
                label="Total Load"
                value={`${totalKw.toFixed(1)} kW`}
                gradient="from-green-500 to-emerald-500"
              />
              <MetricCard
                icon={<Building2 className="h-6 w-6" />}
                label="Generator Zones"
                value={zones.length.toString()}
                gradient="from-blue-500 to-indigo-500"
              />
              <MetricCard
                icon={<Users className="h-6 w-6" />}
                label="Tenants Covered"
                value={tenantCount.toString()}
                gradient="from-purple-500 to-pink-500"
              />
            </div>
          </section>
        )}

        {/* Generator Zones */}
        {sharedSections.includes("zones") && zones.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Generator Zones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => {
                const gens = zoneGenerators.filter((g) => g.zone_id === zone.id);
                const zoneKva = gens.reduce((sum, g) => {
                  const match = (g.generator_size || "").match(/(\d+)\s*kva/i);
                  return sum + (match ? parseInt(match[1]) : 0);
                }, 0);
                const zoneLoad = tenants
                  .filter((t) => t.generator_zone_id === zone.id && !t.own_generator_provided)
                  .reduce((sum, t) => sum + calculateLoading(t), 0);
                const utilization = zoneKva > 0 ? (zoneLoad / (zoneKva * 0.8)) * 100 : 0;

                return (
                  <Card key={zone.id} className="overflow-hidden shadow-lg">
                    <div
                      className="h-2"
                      style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                    />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{zone.zone_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capacity</span>
                        <span className="font-semibold">{zoneKva} kVA</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Load</span>
                        <span className="font-semibold">{zoneLoad.toFixed(1)} kW</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Utilization</span>
                          <span className={utilization > 80 ? "text-red-500" : "text-green-500"}>
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(utilization, 100)}
                          className="h-2"
                        />
                      </div>
                      {gens.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Generators:</p>
                          <div className="flex flex-wrap gap-1">
                            {gens.map((g, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {g.generator_size}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Tenant Breakdown */}
        {sharedSections.includes("breakdown") && tenants.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Tenant Breakdown
            </h2>
            <Card className="shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Shop</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tenant</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Area (m²)</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Load (kW)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Zone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tenants
                      .filter((t) => !t.own_generator_provided)
                      .map((tenant) => {
                        const zone = zones.find((z) => z.id === tenant.generator_zone_id);
                        const loading = calculateLoading(tenant);
                        return (
                          <tr key={tenant.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm font-medium">{tenant.shop_number}</td>
                            <td className="px-4 py-3 text-sm">{tenant.shop_name || "-"}</td>
                            <td className="px-4 py-3">
                              <CategoryBadge category={tenant.shop_category} />
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{tenant.area?.toFixed(0) || "-"}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{loading.toFixed(2)}</td>
                            <td className="px-4 py-3">
                              {zone && (
                                <Badge
                                  style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                                  className="text-white border-0"
                                >
                                  {zone.zone_name}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right">
                        Total Load:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right">{totalKw.toFixed(2)} kW</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* Cost Summary */}
        {sharedSections.includes("costs") && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Cost Summary
            </h2>
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                    <p className="text-sm text-muted-foreground mb-1">Generator Equipment</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R {totalGeneratorCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                    <p className="text-sm text-muted-foreground mb-1">Tenant DBs</p>
                    <p className="text-2xl font-bold text-green-600">
                      R {(tenantCount * (settings?.rate_per_tenant_db || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                    <p className="text-sm text-muted-foreground mb-1">Total Capital</p>
                    <p className="text-2xl font-bold text-purple-600">
                      R {(
                        totalGeneratorCost +
                        tenantCount * (settings?.rate_per_tenant_db || 0) +
                        (settings?.num_main_boards || 0) * (settings?.rate_per_main_board || 0) +
                        (settings?.additional_cabling_cost || 0) +
                        (settings?.control_wiring_cost || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-slate-400 mb-2">
            Report generated on {format(new Date(shareData.created_at), "MMMM d, yyyy")}
          </p>
          <p className="text-lg font-semibold">
            Powered by <span className="text-blue-400">WM Office</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Professional Project Management Solutions</p>
        </div>
      </footer>
    </div>
  );
};

// Helper Components
function MetricCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <Card className="overflow-hidden shadow-lg">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
            <div>
              <p className="text-sm text-white/80">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    standard: "bg-blue-500",
    fast_food: "bg-red-500",
    restaurant: "bg-emerald-500",
    national: "bg-purple-600",
  };
  return (
    <Badge className={`${colors[category] || "bg-gray-500"} text-white border-0 text-xs`}>
      {category?.replace("_", " ") || "Standard"}
    </Badge>
  );
}

export default ClientGeneratorReportView;
