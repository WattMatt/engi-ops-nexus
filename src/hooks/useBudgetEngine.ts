import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── DB Auto-Sizing ──
export const autoSizeDb = (areaM2: number): string => {
  if (areaM2 <= 80) return "80A TP";
  if (areaM2 <= 150) return "100A TP";
  if (areaM2 <= 250) return "120A TP";
  if (areaM2 <= 400) return "150A TP";
  if (areaM2 <= 650) return "200A TP";
  return "Special";
};

// ── Rate Resolution ──
export const resolveRate = (
  areaM2: number,
  baseRateM2: number,
  overrideTiRate: number | null,
  masterTiRate: number
) => {
  const tiRate = overrideTiRate ?? masterTiRate;
  const baseTotal = areaM2 * baseRateM2;
  const tiTotal = areaM2 * tiRate;
  return { baseTotal, tiTotal, lineTotal: baseTotal + tiTotal, tiRate };
};

// ── Generator Sizing ──
export const calculateGeneratorSize = (
  centreGenTenants: { area_m2: number }[],
  loadFactorVaM2: number,
  powerFactor: number
) => {
  const totalArea = centreGenTenants.reduce((s, t) => s + Number(t.area_m2), 0);
  const totalVA = totalArea * loadFactorVaM2;
  const totalKW = (totalVA * powerFactor) / 1000;
  const requiredKVA = totalVA / 1000;
  return { totalArea, totalVA, totalKW, requiredKVA };
};

// ── Transformer Zoning ──
export const calculateZoneLoad = (
  tenants: { area_m2: number }[],
  loadFactorKvaM2 = 0.085
) => {
  const totalArea = tenants.reduce((s, t) => s + Number(t.area_m2), 0);
  const demandKVA = totalArea * loadFactorKvaM2;
  return { totalArea, demandKVA };
};

// ── Data Hooks ──

export const useProjectBudget = (budgetId: string | undefined) =>
  useQuery({
    queryKey: ["project-budget", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("id", budgetId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

export const useProjectTenants = (budgetId: string | undefined) =>
  useQuery({
    queryKey: ["project-tenants", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tenants")
        .select("*, master_tenant_profiles(*)")
        .eq("budget_id", budgetId!)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

export const useProjectScope = (budgetId: string | undefined) =>
  useQuery({
    queryKey: ["project-scope", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_scope")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

export const useMasterTenantProfiles = () =>
  useQuery({
    queryKey: ["master-tenant-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_tenant_profiles")
        .select("*")
        .order("tenant_name");
      if (error) throw error;
      return data || [];
    },
  });

export const useMasterDbRates = () =>
  useQuery({
    queryKey: ["master-db-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_db_rates")
        .select("*")
        .order("db_size");
      if (error) throw error;
      return data || [];
    },
  });

export const useMasterTransformerSizes = () =>
  useQuery({
    queryKey: ["master-transformer-sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_transformer_sizes")
        .select("*")
        .order("size_kva");
      if (error) throw error;
      return data || [];
    },
  });

export const useMasterGeneratorRates = () =>
  useQuery({
    queryKey: ["master-generator-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_generator_rates")
        .select("*")
        .order("size_kva");
      if (error) throw error;
      return data || [];
    },
  });

export const useStandbyConfig = (budgetId: string | undefined) =>
  useQuery({
    queryKey: ["standby-config", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_standby_config")
        .select("*")
        .eq("budget_id", budgetId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

export const useProjectZoning = (budgetId: string | undefined) =>
  useQuery({
    queryKey: ["project-zoning", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_zoning")
        .select("*, master_transformer_sizes(*)")
        .eq("budget_id", budgetId!)
        .order("zone_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

// ── Scope Items (16 standard) ──
export const STANDARD_SCOPE_ITEMS = [
  "Bulk Electrical Supply",
  "Medium Voltage Equipment",
  "LV Distribution & Boards",
  "Retail Section",
  "Centre Management",
  "Ablutions",
  "Mall Lighting",
  "Front Walkway Lighting",
  "Feature Lighting",
  "Security Lighting",
  "Yards",
  "Supplies for External Signage",
  "Parking Area Lighting",
  "Standby Power",
  "Telkom Infrastructure",
  "Earthing & Lightning Protection",
];
