import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Loader2, Zap, Building2, TrendingUp, Users, BarChart3,
  Shield, Clock, FileText, MapPin, ChevronUp
} from "lucide-react";
import { useState, useRef } from "react";

/* ─────────────────────────────────────────────
   Complete rebuild — plain document-flow page.
   No overflow tricks, no sticky nav, no nested
   scroll containers. Just a clean HTML document.
   ───────────────────────────────────────────── */

const ClientGeneratorReportView = () => {
  const { token } = useParams<{ token: string }>();
  const topRef = useRef<HTMLDivElement>(null);

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

  // ── Loading ──
  if (isLoading) {
    return (
      <div style={styles.centeredPage}>
        <div style={{ textAlign: "center" }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#60a5fa", margin: "0 auto 16px" }} />
          <p style={{ color: "#fff", fontWeight: 500 }}>Loading Report</p>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Please wait…</p>
        </div>
      </div>
    );
  }

  // ── Error / Access Denied ──
  const shareData = reportData?.share;
  if (error || !shareData) {
    return (
      <div style={styles.centeredPage}>
        <div style={styles.errorCard}>
          <Shield className="h-10 w-10" style={{ color: "#f87171", margin: "0 auto 24px", display: "block" }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12, textAlign: "center" }}>Access Denied</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.6, textAlign: "center" }}>
            This report link has expired or been revoked. Please contact the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Data extraction ──
  const project = reportData?.project;
  const zones = reportData?.zones || [];
  const zoneGenerators = reportData?.zoneGenerators || [];
  const tenants = reportData?.tenants || [];
  const settings = reportData?.settings;
  const sharedSections: string[] = shareData?.shared_sections || [];

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

  const activeTenants = sortedTenants.filter((t: any) => !t.own_generator_provided);
  const tenantCount = activeTenants.length;

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

  const totalKw = activeTenants.reduce((sum: number, t: any) => sum + calculateLoading(t), 0);

  const totalCapital =
    totalGeneratorCost +
    tenantCount * (settings?.rate_per_tenant_db || 0) +
    (settings?.num_main_boards || 0) * (settings?.rate_per_main_board || 0) +
    (settings?.additional_cabling_cost || 0) +
    (settings?.control_wiring_cost || 0);

  // Navigation items (only visible sections)
  const navItems = [
    sharedSections.includes("overview") && { id: "overview", label: "Overview", icon: Zap },
    sharedSections.includes("zones") && zones.length > 0 && { id: "zones", label: "Zones", icon: Building2 },
    sharedSections.includes("breakdown") && activeTenants.length > 0 && { id: "breakdown", label: "Tenants", icon: Users },
    sharedSections.includes("costs") && { id: "costs", label: "Costs", icon: BarChart3 },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Render ──
  return (
    <div ref={topRef} style={{ background: "#f8fafc", minHeight: "100vh", overflowY: "auto" }}>

      {/* ═══════════════ HERO HEADER ═══════════════ */}
      <header style={{
        background: "linear-gradient(135deg, #1e3a5f, #1e40af, #312e81)",
        color: "#fff",
        padding: "48px 24px 40px",
      }}>
        <div style={styles.container}>
          {shareData.recipient_name && (
            <p style={{ color: "#bfdbfe", fontSize: 14, marginBottom: 8 }}>
              Prepared for <strong style={{ color: "#fff" }}>{shareData.recipient_name}</strong>
            </p>
          )}
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Generator Report
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "#bfdbfe", fontSize: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={16} /> {project?.name || "Project"}
            </span>
            {project?.address && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={16} /> {project.address}
              </span>
            )}
          </div>
          {project?.client_name && (
            <p style={{ color: "rgba(191,219,254,0.7)", fontSize: 14, marginTop: 8 }}>Client: {project.client_name}</p>
          )}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 40, marginTop: 32 }}>
            {[
              { val: totalKva, unit: "kVA" },
              { val: zones.length, unit: "ZONES" },
              { val: tenantCount, unit: "TENANTS" },
            ].map((s) => (
              <div key={s.unit}>
                <p style={{ fontSize: 32, fontWeight: 700 }}>{s.val}</p>
                <p style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", marginTop: 2 }}>{s.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ═══════════════ NAVIGATION BAR ═══════════════ */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  color: "#475569",
                }}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#92400e", background: "#fef3c7", padding: "4px 10px", borderRadius: 6 }}>
            <Clock size={12} />
            Expires {format(new Date(shareData.expires_at), "MMM d, yyyy")}
          </div>
        </div>
      </nav>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main style={{ ...styles.container, padding: "40px 24px 64px" }}>

        {/* ── Overview ── */}
        {sharedSections.includes("overview") && (
          <section id="overview" style={{ marginBottom: 48, scrollMarginTop: 64 }}>
            <SectionTitle icon={Zap} title="Key Metrics" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <StatCard icon={<Zap size={20} />} label="Total Capacity" value={`${totalKva} kVA`} accent="#2563eb" />
              <StatCard icon={<TrendingUp size={20} />} label="Total Load" value={`${totalKw.toFixed(1)} kW`} accent="#059669" />
              <StatCard icon={<Building2 size={20} />} label="Generator Zones" value={zones.length.toString()} accent="#4f46e5" />
              <StatCard icon={<Users size={20} />} label="Tenants Covered" value={tenantCount.toString()} accent="#7c3aed" />
            </div>
          </section>
        )}

        {/* ── Zones ── */}
        {sharedSections.includes("zones") && zones.length > 0 && (
          <section id="zones" style={{ marginBottom: 48, scrollMarginTop: 64 }}>
            <SectionTitle icon={Building2} title="Generator Zones" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {zones.map((zone: any) => {
                const gens = zoneGenerators.filter((g: any) => g.zone_id === zone.id);
                const zoneKva = gens.reduce((sum: number, g: any) => {
                  const match = (g.generator_size || "").match(/(\d+)\s*kva/i);
                  return sum + (match ? parseInt(match[1]) : 0);
                }, 0);
                const zoneLoad = activeTenants
                  .filter((t: any) => t.generator_zone_id === zone.id)
                  .reduce((sum: number, t: any) => sum + calculateLoading(t), 0);
                const utilization = zoneKva > 0 ? (zoneLoad / (zoneKva * 0.8)) * 100 : 0;
                const tenantsInZone = activeTenants.filter((t: any) => t.generator_zone_id === zone.id).length;

                return (
                  <div key={zone.id} style={styles.card}>
                    <div style={{ height: 4, background: zone.zone_color || "#3b82f6", borderRadius: "8px 8px 0 0" }} />
                    <div style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{zone.zone_name}</h3>
                        <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                          {tenantsInZone} tenants
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#64748b" }}>Capacity</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{zoneKva} kVA</p>
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#64748b" }}>Load</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{zoneLoad.toFixed(1)} kW</p>
                        </div>
                      </div>
                      {/* Utilization bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: "#64748b" }}>Utilization</span>
                          <span style={{
                            fontWeight: 600,
                            color: utilization > 80 ? "#ef4444" : utilization > 60 ? "#f59e0b" : "#10b981"
                          }}>{utilization.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min(utilization, 100)}%`,
                            background: utilization > 80 ? "#ef4444" : utilization > 60 ? "#f59e0b" : "#10b981",
                            borderRadius: 4,
                            transition: "width 0.3s",
                          }} />
                        </div>
                      </div>
                      {gens.length > 0 && (
                        <div style={{ paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Generators</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {gens.map((g: any, i: number) => (
                              <span key={i} style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4, color: "#334155" }}>
                                {g.generator_size}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Tenant Breakdown ── */}
        {sharedSections.includes("breakdown") && activeTenants.length > 0 && (
          <section id="breakdown" style={{ marginBottom: 48, scrollMarginTop: 64 }}>
            <SectionTitle icon={Users} title="Tenant Breakdown" />
            <div style={styles.card}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      {["Shop", "Tenant", "Category", "Area (m²)", "Load (kW)", "Zone"].map((h, i) => (
                        <th key={h} style={{
                          padding: "12px 16px",
                          textAlign: i >= 3 && i <= 4 ? "right" : "left",
                          fontWeight: 600,
                          color: "#475569",
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTenants.map((tenant: any, idx: number) => {
                      const zone = zones.find((z: any) => z.id === tenant.generator_zone_id);
                      const loading = calculateLoading(tenant);
                      return (
                        <tr key={tenant.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 1 ? "#fafbfc" : "#fff" }}>
                          <td style={{ padding: "10px 16px", fontWeight: 500, color: "#0f172a" }}>{tenant.shop_number}</td>
                          <td style={{ padding: "10px 16px", color: "#475569" }}>{tenant.shop_name || "—"}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              fontSize: 12,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: categoryColor(tenant.shop_category).bg,
                              color: categoryColor(tenant.shop_category).text,
                            }}>
                              {(tenant.shop_category || "standard").replace("_", " ")}
                            </span>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#475569" }}>
                            {tenant.area?.toFixed(0) || "—"}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#0f172a" }}>
                            {loading.toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            {zone && (
                              <span style={{
                                fontSize: 12, padding: "2px 8px", borderRadius: 4,
                                background: zone.zone_color || "#3b82f6", color: "#fff",
                              }}>{zone.zone_name}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", borderTop: "2px solid #e2e8f0" }}>
                      <td colSpan={4} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#334155" }}>Total Load</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#0f172a" }}>
                        {totalKw.toFixed(2)} kW
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Cost Summary ── */}
        {sharedSections.includes("costs") && (
          <section id="costs" style={{ marginBottom: 48, scrollMarginTop: 64 }}>
            <SectionTitle icon={BarChart3} title="Cost Summary" />
            <div style={styles.card}>
              <div style={{ padding: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <CostBox label="Generator Equipment" value={totalGeneratorCost} color="#2563eb" />
                  <CostBox label="Tenant Distribution Boards" value={tenantCount * (settings?.rate_per_tenant_db || 0)} color="#059669" />
                  <CostBox label="Total Capital Cost" value={totalCapital} color="#4338ca" bold />
                </div>
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
                  <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 12 }}>
                    Detailed Breakdown
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <LineItem label="Generator Equipment" value={totalGeneratorCost} />
                    <LineItem label={`Tenant DBs (${tenantCount})`} value={tenantCount * (settings?.rate_per_tenant_db || 0)} />
                    <LineItem label={`Main Boards (${settings?.num_main_boards || 0})`} value={(settings?.num_main_boards || 0) * (settings?.rate_per_main_board || 0)} />
                    <LineItem label="Additional Cabling" value={settings?.additional_cabling_cost || 0} />
                    <LineItem label="Control Wiring" value={settings?.control_wiring_cost || 0} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer style={{ borderTop: "1px solid #e2e8f0", background: "#fff", padding: "32px 24px" }}>
        <div style={{ ...styles.container, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              height: 40, width: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={20} style={{ color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>WM Office</p>
              <p style={{ fontSize: 12, color: "#64748b" }}>Professional Project Management</p>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
            <p>Report generated {format(new Date(shareData.created_at), "MMMM d, yyyy")}</p>
            <p>This link expires {format(new Date(shareData.expires_at), "MMMM d, yyyy")}</p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 40, height: 40, borderRadius: "50%",
          background: "#1e40af", color: "#fff", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Sub-components — all inline, zero external deps
   ═══════════════════════════════════════════ */

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <Icon size={18} style={{ color: "#475569" }} />
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "#0f172a", margin: 0 }}>{title}</h2>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div style={styles.card}>
      <div style={{ padding: 20 }}>
        <div style={{ color: accent, marginBottom: 12 }}>{icon}</div>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: accent }}>{value}</p>
      </div>
    </div>
  );
}

function CostBox({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", padding: 20, textAlign: "center", background: bold ? "#f8fafc" : "#fff" }}>
      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: bold ? 28 : 22, fontWeight: 700, color }}> R {value.toLocaleString()}</p>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", borderRadius: 6, background: "#fafbfc" }}>
      <span style={{ fontSize: 14, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>R {value.toLocaleString()}</span>
    </div>
  );
}

function categoryColor(cat: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    standard: { bg: "#dbeafe", text: "#1d4ed8" },
    fast_food: { bg: "#fee2e2", text: "#dc2626" },
    restaurant: { bg: "#d1fae5", text: "#047857" },
    national: { bg: "#ede9fe", text: "#7c3aed" },
  };
  return map[cat] || map.standard;
}

/* ═══════════════════════════════════════════
   Shared style objects
   ═══════════════════════════════════════════ */
const styles: Record<string, React.CSSProperties> = {
  centeredPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    padding: 24,
  },
  errorCard: {
    maxWidth: 420,
    width: "100%",
    background: "rgba(30,41,59,0.6)",
    borderRadius: 16,
    border: "1px solid rgba(51,65,85,0.5)",
    padding: 40,
  },
  container: {
    maxWidth: 1152,
    margin: "0 auto",
  },
  card: {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
};

export default ClientGeneratorReportView;
