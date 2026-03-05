import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Loader2, Zap, Building2, TrendingUp, Users, BarChart3,
  Shield, Clock, ChevronDown, FileText, MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useRef, useState, useEffect } from "react";

const ClientGeneratorReportView = () => {
  const { token } = useParams<{ token: string }>();
  const [activeSection, setActiveSection] = useState("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["shared-generator-report", token],
    queryFn: async () => {
      if (!token) throw new Error("Invalid access token");
      const { data, error } = await supabase.functions.invoke("get-shared-generator-report", {
        body: { token },
      });
      if (error) throw new Error("Failed to load report");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !!token,
  });

  const shareData = reportData?.share;
  const project = reportData?.project;
  const zones = reportData?.zones || [];
  const zoneGenerators = reportData?.zoneGenerators || [];
  const tenants = reportData?.tenants || [];
  const settings = reportData?.settings;
  const sharedSections = shareData?.shared_sections || [];

  const totalKva = zoneGenerators.reduce((sum: number, gen: any) => {
    const match = (gen.generator_size || "").match(/(\d+)\s*kva/i);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const totalGeneratorCost = zoneGenerators.reduce(
    (sum: number, gen: any) => sum + (Number(gen.generator_cost) || 0), 0
  );

  const sortedTenants = [...tenants].sort((a: any, b: any) => {
    const numA = parseInt(a.shop_number?.match(/\d+/)?.[0] || "0");
    const numB = parseInt(b.shop_number?.match(/\d+/)?.[0] || "0");
    return numA - numB;
  });

  const tenantCount = sortedTenants.filter((t: any) => !t.own_generator_provided).length;

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

  const totalKw = sortedTenants.reduce((sum: number, t: any) => sum + calculateLoading(t), 0);

  // Build nav items from shared sections
  const navItems = [
    sharedSections.includes("overview") && { id: "overview", label: "Overview", icon: Zap },
    sharedSections.includes("zones") && zones.length > 0 && { id: "zones", label: "Zones", icon: Building2 },
    sharedSections.includes("breakdown") && sortedTenants.length > 0 && { id: "breakdown", label: "Tenants", icon: Users },
    sharedSections.includes("costs") && { id: "costs", label: "Costs", icon: BarChart3 },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reportData]);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-white font-medium">Loading Report</p>
            <p className="text-slate-400 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-10 text-center">
          <div className="h-20 w-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-slate-400 leading-relaxed">
            This report link has expired or been revoked. Please contact the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  const totalCapital =
    totalGeneratorCost +
    tenantCount * (settings?.rate_per_tenant_db || 0) +
    (settings?.num_main_boards || 0) * (settings?.rate_per_main_board || 0) +
    (settings?.additional_cabling_cost || 0) +
    (settings?.control_wiring_cost || 0);

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-50 dark:bg-[#0f172a]">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white hidden sm:block">
                {project?.name || "Generator Report"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeSection === item.id
                      ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 inline mr-1.5" />
                  {item.label}
                </button>
              ))}
            </div>

            <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Expires {format(new Date(shareData.expires_at), "MMM d, yyyy")}
            </Badge>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#1e40af] to-[#312e81]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkgy')] opacity-30" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {shareData.recipient_name && (
                <p className="text-blue-200 text-sm mb-2">
                  Prepared for <span className="font-medium text-white">{shareData.recipient_name}</span>
                </p>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
                Generator Report
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-blue-100">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {project?.name || "Project"}
                </span>
                {project?.address && (
                  <>
                    <span className="text-blue-300/40">•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {project.address}
                    </span>
                  </>
                )}
              </div>
              {project?.client_name && (
                <p className="text-blue-200/70 text-sm mt-2">Client: {project.client_name}</p>
              )}
            </div>

            {/* Quick stats in header */}
            <div className="flex gap-6 md:gap-8">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{totalKva}</p>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mt-1">kVA</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{zones.length}</p>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mt-1">Zones</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white">{tenantCount}</p>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mt-1">Tenants</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
        {/* Overview Section */}
        {sharedSections.includes("overview") && (
          <section
            id="overview"
            ref={(el) => { sectionRefs.current["overview"] = el; }}
          >
            <SectionHeading icon={Zap} title="Key Metrics" iconColor="text-amber-500" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <MetricCard
                icon={<Zap className="h-5 w-5" />}
                label="Total Capacity"
                value={`${totalKva} kVA`}
                color="blue"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Total Load"
                value={`${totalKw.toFixed(1)} kW`}
                color="emerald"
              />
              <MetricCard
                icon={<Building2 className="h-5 w-5" />}
                label="Generator Zones"
                value={zones.length.toString()}
                color="indigo"
              />
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                label="Tenants Covered"
                value={tenantCount.toString()}
                color="violet"
              />
            </div>
          </section>
        )}

        {/* Generator Zones */}
        {sharedSections.includes("zones") && zones.length > 0 && (
          <section
            id="zones"
            ref={(el) => { sectionRefs.current["zones"] = el; }}
          >
            <SectionHeading icon={Building2} title="Generator Zones" iconColor="text-blue-500" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone: any) => {
                const gens = zoneGenerators.filter((g: any) => g.zone_id === zone.id);
                const zoneKva = gens.reduce((sum: number, g: any) => {
                  const match = (g.generator_size || "").match(/(\d+)\s*kva/i);
                  return sum + (match ? parseInt(match[1]) : 0);
                }, 0);
                const zoneLoad = sortedTenants
                  .filter((t: any) => t.generator_zone_id === zone.id && !t.own_generator_provided)
                  .reduce((sum: number, t: any) => sum + calculateLoading(t), 0);
                const utilization = zoneKva > 0 ? (zoneLoad / (zoneKva * 0.8)) * 100 : 0;
                const tenantCountInZone = sortedTenants.filter(
                  (t: any) => t.generator_zone_id === zone.id && !t.own_generator_provided
                ).length;

                return (
                  <Card
                    key={zone.id}
                    className="overflow-hidden border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="h-1.5"
                      style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">{zone.zone_name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {tenantCountInZone} tenants
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Capacity</p>
                          <p className="text-lg font-bold">{zoneKva} kVA</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-0.5">Load</p>
                          <p className="text-lg font-bold">{zoneLoad.toFixed(1)} kW</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Utilization</span>
                          <span
                            className={`font-semibold ${
                              utilization > 80
                                ? "text-red-500"
                                : utilization > 60
                                  ? "text-amber-500"
                                  : "text-emerald-500"
                            }`}
                          >
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={Math.min(utilization, 100)} className="h-2" />
                      </div>

                      {gens.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
                          <p className="text-xs text-muted-foreground mb-2">Generators</p>
                          <div className="flex flex-wrap gap-1.5">
                            {gens.map((g: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs font-medium">
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
        {sharedSections.includes("breakdown") && sortedTenants.length > 0 && (
          <section
            id="breakdown"
            ref={(el) => { sectionRefs.current["breakdown"] = el; }}
          >
            <SectionHeading icon={Users} title="Tenant Breakdown" iconColor="text-violet-500" />
            <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Shop</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Tenant</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Category</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Area (m²)</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Load (kW)</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Zone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTenants
                      .filter((t: any) => !t.own_generator_provided)
                      .map((tenant: any, idx: number) => {
                        const zone = zones.find((z: any) => z.id === tenant.generator_zone_id);
                        const loading = calculateLoading(tenant);
                        return (
                          <tr
                            key={tenant.id}
                            className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                              idx % 2 === 0 ? "" : "bg-slate-25 dark:bg-slate-800/10"
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {tenant.shop_number}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {tenant.shop_name || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <CategoryBadge category={tenant.shop_category} />
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                              {tenant.area?.toFixed(0) || "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                              {loading.toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              {zone && (
                                <Badge
                                  style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                                  className="text-white border-0 text-xs"
                                >
                                  {zone.zone_name}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800/60">
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                        Total Load
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        {totalKw.toFixed(2)} kW
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </section>
        )}

        {/* Cost Summary */}
        {sharedSections.includes("costs") && (
          <section
            id="costs"
            ref={(el) => { sectionRefs.current["costs"] = el; }}
          >
            <SectionHeading icon={BarChart3} title="Cost Summary" iconColor="text-emerald-500" />
            <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <CostCard
                    label="Generator Equipment"
                    value={totalGeneratorCost}
                    color="blue"
                  />
                  <CostCard
                    label="Tenant Distribution Boards"
                    value={tenantCount * (settings?.rate_per_tenant_db || 0)}
                    color="emerald"
                  />
                  <CostCard
                    label="Total Capital Cost"
                    value={totalCapital}
                    color="indigo"
                    isTotal
                  />
                </div>

                {/* Breakdown details */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Breakdown</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <BreakdownRow label="Generator Equipment" value={totalGeneratorCost} />
                    <BreakdownRow label={`Tenant DBs (${tenantCount})`} value={tenantCount * (settings?.rate_per_tenant_db || 0)} />
                    <BreakdownRow label={`Main Boards (${settings?.num_main_boards || 0})`} value={(settings?.num_main_boards || 0) * (settings?.rate_per_main_board || 0)} />
                    <BreakdownRow label="Additional Cabling" value={settings?.additional_cabling_cost || 0} />
                    <BreakdownRow label="Control Wiring" value={settings?.control_wiring_cost || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">WM Office</p>
                <p className="text-xs text-muted-foreground">Professional Project Management</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-muted-foreground">
                Report generated {format(new Date(shareData.created_at), "MMMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                This link expires {format(new Date(shareData.expires_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Helper Components ---

function SectionHeading({
  icon: Icon,
  title,
  iconColor,
}: {
  icon: any;
  title: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400",
  };
  const iconBgMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
    violet: "bg-violet-500/10 text-violet-500",
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className={`h-9 w-9 rounded-lg ${iconBgMap[color]} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl md:text-2xl font-bold ${colorMap[color]?.split(" ").slice(2).join(" ")}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function CostCard({
  label,
  value,
  color,
  isTotal = false,
}: {
  label: string;
  value: number;
  color: string;
  isTotal?: boolean;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    indigo: "text-indigo-700 dark:text-indigo-300",
  };

  return (
    <div className={`rounded-xl border p-5 text-center ${bgMap[color]}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`${isTotal ? "text-3xl" : "text-2xl"} font-bold ${textMap[color]}`}>
        R {value.toLocaleString()}
      </p>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">R {value.toLocaleString()}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    standard: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    fast_food: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    restaurant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    national: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  };
  return (
    <Badge className={`${styles[category] || "bg-slate-100 text-slate-700"} border-0 text-xs font-medium`}>
      {category?.replace("_", " ") || "Standard"}
    </Badge>
  );
}

export default ClientGeneratorReportView;
