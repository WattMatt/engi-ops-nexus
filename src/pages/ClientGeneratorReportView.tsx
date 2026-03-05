import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Loader2, Zap, Building2, TrendingUp, Users, BarChart3,
  Shield, Clock, FileText, MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useCallback } from "react";

const ClientGeneratorReportView = () => {
  const { token } = useParams<{ token: string }>();
  const [activeSection, setActiveSection] = useState("overview");

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
    if (tenant.own_generator_provided) return 0;
    if (tenant.manual_kw_override != null) return Number(tenant.manual_kw_override);
    if (!tenant.area) return 0;
    const kwPerSqm: Record<string, number> = {
      standard: settings?.standard_kw_per_sqm || 0.03,
      fast_food: settings?.fast_food_kw_per_sqm || 0.045,
      restaurant: settings?.restaurant_kw_per_sqm || 0.045,
      national: settings?.national_kw_per_sqm || 0.03,
    };
    return tenant.area * (kwPerSqm[tenant.shop_category] || 0.03);
  };

  const totalKw = sortedTenants.reduce((sum: number, t: any) => sum + calculateLoading(t), 0);

  const navItems = [
    sharedSections.includes("overview") && { id: "overview", label: "Overview", icon: Zap },
    sharedSections.includes("zones") && zones.length > 0 && { id: "zones", label: "Zones", icon: Building2 },
    sharedSections.includes("breakdown") && sortedTenants.length > 0 && { id: "breakdown", label: "Tenants", icon: Users },
    sharedSections.includes("costs") && { id: "costs", label: "Costs", icon: BarChart3 },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ height: 64, width: 64, borderRadius: 16, background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#60a5fa" }} />
          </div>
          <p style={{ color: "#fff", fontWeight: 500 }}>Loading Report</p>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Please wait...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: 16 }}>
        <div style={{ maxWidth: 420, width: "100%", background: "rgba(30,41,59,0.5)", borderRadius: 16, border: "1px solid rgba(51,65,85,0.5)", padding: 40, textAlign: "center" }}>
          <div style={{ height: 80, width: 80, borderRadius: 16, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Shield className="h-10 w-10" style={{ color: "#f87171" }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Access Denied</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.6 }}>
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
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Sticky Navigation */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                height: 32, width: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Zap className="h-4 w-4" style={{ color: "#fff" }} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                {project?.name || "Generator Report"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: activeSection === item.id ? "#dbeafe" : "transparent",
                    color: activeSection === item.id ? "#1d4ed8" : "#64748b",
                    transition: "all 0.2s",
                  }}
                >
                  <item.icon style={{ height: 14, width: 14 }} />
                  {item.label}
                </button>
              ))}
            </div>

            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Expires {format(new Date(shareData.expires_at), "MMM d, yyyy")}
            </Badge>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #1e3a5f, #1e40af, #312e81)",
      }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "48px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
            <div>
              {shareData.recipient_name && (
                <p style={{ color: "#bfdbfe", fontSize: 14, marginBottom: 8 }}>
                  Prepared for <span style={{ fontWeight: 500, color: "#fff" }}>{shareData.recipient_name}</span>
                </p>
              )}
              <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 12 }}>
                Generator Report
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, color: "#bfdbfe" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText className="h-4 w-4" />
                  {project?.name || "Project"}
                </span>
                {project?.address && (
                  <>
                    <span style={{ color: "rgba(147,197,253,0.4)" }}>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin className="h-4 w-4" />
                      {project.address}
                    </span>
                  </>
                )}
              </div>
              {project?.client_name && (
                <p style={{ color: "rgba(191,219,254,0.7)", fontSize: 14, marginTop: 8 }}>Client: {project.client_name}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              {[
                { val: totalKva, label: "KVA" },
                { val: zones.length, label: "ZONES" },
                { val: tenantCount, label: "TENANTS" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, color: "#fff" }}>{s.val}</p>
                  <p style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1152, margin: "0 auto", padding: "32px 16px 48px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

          {/* Overview Section */}
          {sharedSections.includes("overview") && (
            <section id="section-overview" style={{ scrollMarginTop: 72 }}>
              <SectionHeading icon={Zap} title="Key Metrics" iconColor="#f59e0b" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard icon={<Zap className="h-5 w-5" />} label="Total Capacity" value={`${totalKva} kVA`} color="blue" />
                <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Total Load" value={`${totalKw.toFixed(1)} kW`} color="emerald" />
                <MetricCard icon={<Building2 className="h-5 w-5" />} label="Generator Zones" value={zones.length.toString()} color="indigo" />
                <MetricCard icon={<Users className="h-5 w-5" />} label="Tenants Covered" value={tenantCount.toString()} color="violet" />
              </div>
            </section>
          )}

          {/* Generator Zones */}
          {sharedSections.includes("zones") && zones.length > 0 && (
            <section id="section-zones" style={{ scrollMarginTop: 72 }}>
              <SectionHeading icon={Building2} title="Generator Zones" iconColor="#3b82f6" />
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
                    <Card key={zone.id} className="overflow-hidden border-slate-200 shadow-sm">
                      <div className="h-1.5" style={{ backgroundColor: zone.zone_color || "#3b82f6" }} />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">{zone.zone_name}</CardTitle>
                          <Badge variant="outline" className="text-xs">{tenantCountInZone} tenants</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center" }}>
                            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Capacity</p>
                            <p style={{ fontSize: 18, fontWeight: 700 }}>{zoneKva} kVA</p>
                          </div>
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center" }}>
                            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Load</p>
                            <p style={{ fontSize: 18, fontWeight: 700 }}>{zoneLoad.toFixed(1)} kW</p>
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: "#64748b" }}>Utilization</span>
                            <span style={{
                              fontWeight: 600,
                              color: utilization > 80 ? "#ef4444" : utilization > 60 ? "#f59e0b" : "#10b981"
                            }}>
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={Math.min(utilization, 100)} className="h-2" />
                        </div>
                        {gens.length > 0 && (
                          <div style={{ paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Generators</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {gens.map((g: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs font-medium">{g.generator_size}</Badge>
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
            <section id="section-breakdown" style={{ scrollMarginTop: 72 }}>
              <SectionHeading icon={Users} title="Tenant Breakdown" iconColor="#8b5cf6" />
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Shop</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Tenant</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Category</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#475569" }}>Area (m²)</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#475569" }}>Load (kW)</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Zone</th>
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
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                background: idx % 2 === 1 ? "#fafbfc" : "transparent",
                              }}
                            >
                              <td style={{ padding: "12px 16px", fontWeight: 500, color: "#0f172a" }}>{tenant.shop_number}</td>
                              <td style={{ padding: "12px 16px", color: "#475569" }}>{tenant.shop_name || "—"}</td>
                              <td style={{ padding: "12px 16px" }}>
                                <CategoryBadge category={tenant.shop_category} />
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#475569" }}>
                                {tenant.area?.toFixed(0) || "—"}
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500, color: "#0f172a" }}>
                                {loading.toFixed(2)}
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                {zone && (
                                  <Badge style={{ backgroundColor: zone.zone_color || "#3b82f6" }} className="text-white border-0 text-xs">
                                    {zone.zone_name}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f1f5f9" }}>
                        <td colSpan={4} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#334155" }}>
                          Total Load
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#0f172a" }}>
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
            <section id="section-costs" style={{ scrollMarginTop: 72 }}>
              <SectionHeading icon={BarChart3} title="Cost Summary" iconColor="#10b981" />
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <CostCard label="Generator Equipment" value={totalGeneratorCost} color="blue" />
                    <CostCard label="Tenant Distribution Boards" value={tenantCount * (settings?.rate_per_tenant_db || 0)} color="emerald" />
                    <CostCard label="Total Capital Cost" value={totalCapital} color="indigo" isTotal />
                  </div>
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #e2e8f0" }}>
                    <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 12 }}>Breakdown</p>
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
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "32px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                height: 40, width: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Zap className="h-5 w-5" style={{ color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>WM Office</p>
                <p style={{ fontSize: 12, color: "#64748b" }}>Professional Project Management</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 12, color: "#64748b" }}>
                Report generated {format(new Date(shareData.created_at), "MMMM d, yyyy")}
              </p>
              <p style={{ fontSize: 12, color: "#64748b" }}>
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

function SectionHeading({ icon: Icon, title, iconColor }: { icon: any; title: string; iconColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ height: 32, width: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ height: 16, width: 16, color: iconColor }} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{title}</h2>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "rgba(59,130,246,0.1)", text: "#2563eb" },
    emerald: { bg: "rgba(16,185,129,0.1)", text: "#059669" },
    indigo: { bg: "rgba(99,102,241,0.1)", text: "#4f46e5" },
    violet: { bg: "rgba(139,92,246,0.1)", text: "#7c3aed" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div style={{ height: 36, width: 36, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: c.text }}>
          {icon}
        </div>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 700, color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CostCard({ label, value, color, isTotal = false }: { label: string; value: number; color: string; isTotal?: boolean }) {
  const bgMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: "#eff6ff", border: "#dbeafe", text: "#1d4ed8" },
    emerald: { bg: "#ecfdf5", border: "#d1fae5", text: "#047857" },
    indigo: { bg: "#eef2ff", border: "#e0e7ff", text: "#4338ca" },
  };
  const c = bgMap[color] || bgMap.blue;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: isTotal ? 28 : 24, fontWeight: 700, color: c.text }}>R {value.toLocaleString()}</p>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderRadius: 8 }}>
      <span style={{ fontSize: 14, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>R {value.toLocaleString()}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    standard: { bg: "#dbeafe", color: "#1d4ed8" },
    fast_food: { bg: "#fee2e2", color: "#dc2626" },
    restaurant: { bg: "#d1fae5", color: "#047857" },
    national: { bg: "#ede9fe", color: "#7c3aed" },
  };
  const s = styles[category] || styles.standard;
  return (
    <Badge style={{ backgroundColor: s.bg, color: s.color, border: "none" }} className="text-xs font-medium">
      {category?.replace("_", " ") || "Standard"}
    </Badge>
  );
}

export default ClientGeneratorReportView;
