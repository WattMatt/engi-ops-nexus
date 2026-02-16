import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildGeneratorReportPdf, type GeneratorReportData as SvgGeneratorReportData } from "@/utils/svg-pdf/generatorReportPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

/**
 * Get fuel consumption rate from sizing table based on generator size and load percentage.
 */
function getFuelConsumption(generatorSize: string, loadPercentage: number): number {
  const sizingData = GENERATOR_SIZING_TABLE.find(g => g.rating === generatorSize);
  if (!sizingData) return 0;

  if (loadPercentage <= 25) return sizingData.load25;
  if (loadPercentage <= 50) {
    const ratio = (loadPercentage - 25) / 25;
    return sizingData.load25 + ratio * (sizingData.load50 - sizingData.load25);
  }
  if (loadPercentage <= 75) {
    const ratio = (loadPercentage - 50) / 25;
    return sizingData.load50 + ratio * (sizingData.load75 - sizingData.load50);
  }
  if (loadPercentage <= 100) {
    const ratio = (loadPercentage - 75) / 25;
    return sizingData.load75 + ratio * (sizingData.load100 - sizingData.load75);
  }
  return sizingData.load100;
}

interface GeneratorReportExportPDFButtonProps {
  projectId: string;
  onReportSaved?: () => void;
}

export function GeneratorReportExportPDFButton({ projectId, onReportSaved }: GeneratorReportExportPDFButtonProps) {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch generator zones
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("generator_zones").select("*").eq("project_id", projectId).order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch zone generators
  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["zone-generators-pdf", projectId],
    queryFn: async () => {
      if (!zones.length) return [];
      const zoneIds = zones.map(z => z.id);
      const { data, error } = await supabase.from("zone_generators").select("*").in("zone_id", zoneIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zones.length > 0,
  });

  // Fetch generator settings
  const { data: generatorSettings } = useQuery({
    queryKey: ["generator-settings-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("generator_settings").select("*").eq("project_id", projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-pdf", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase.from("tenants").select("*").eq("project_id", projectId);
      if (error) throw error;
      return (data || []).sort((a, b) => {
        const matchA = a.shop_number.match(/\d+/);
        const matchB = b.shop_number.match(/\d+/);
        const numA = matchA ? parseInt(matchA[0]) : 0;
        const numB = matchB ? parseInt(matchB[0]) : 0;
        return numA !== numB ? numA - numB : a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
      });
    },
    enabled: !!projectId,
  });

  const handleExport = async () => {
    if (!project || zones.length === 0) {
      toast.error("No data available to generate report");
      return;
    }

    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      // Calculate financials
      const totalGeneratorCost = zoneGenerators.reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
      const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
      const ratePerTenantDB = generatorSettings?.rate_per_tenant_db || 0;
      const tenantDBsCost = numTenantDBs * ratePerTenantDB;
      const numMainBoards = generatorSettings?.num_main_boards || 0;
      const ratePerMainBoard = generatorSettings?.rate_per_main_board || 0;
      const mainBoardsCost = numMainBoards * ratePerMainBoard;
      const additionalCablingCost = generatorSettings?.additional_cabling_cost || 0;
      const controlWiringCost = generatorSettings?.control_wiring_cost || 0;
      const totalCapitalCost = totalGeneratorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;

      const years = generatorSettings?.capital_recovery_period_years || 10;

      // Calculate total connected load
      const totalLoading = tenants.reduce((sum, t) => {
        if (t.own_generator_provided) return sum;
        if (t.manual_kw_override != null) return sum + Number(t.manual_kw_override);
        const kwPerSqm = {
          standard: generatorSettings?.standard_kw_per_sqm || 0.03,
          fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
          restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
          national: generatorSettings?.national_kw_per_sqm || 0.03,
        };
        return sum + ((t.area || 0) * (kwPerSqm[t.shop_category as keyof typeof kwPerSqm] || 0.03));
      }, 0);

      // Build zone data for SVG builder
      const svgZones = zones.map(z => {
        const zoneGens = zoneGenerators.filter(g => g.zone_id === z.id);
        const zoneTenants = tenants.filter(t => t.generator_zone_id === z.id && !t.own_generator_provided);
        const loads = zoneTenants.map(t => {
          let kw = 0;
          if (t.manual_kw_override != null) kw = Number(t.manual_kw_override);
          else {
            const kwPerSqm = {
              standard: generatorSettings?.standard_kw_per_sqm || 0.03,
              fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
              restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
              national: generatorSettings?.national_kw_per_sqm || 0.03,
            };
            kw = (t.area || 0) * (kwPerSqm[t.shop_category as keyof typeof kwPerSqm] || 0.03);
          }
          return { description: `${t.shop_number} - ${t.shop_name}`, kw, priority: t.shop_category || 'standard' };
        });
        return {
          name: z.zone_name,
          color: z.zone_color || '#3b82f6',
          loads,
          totalKw: loads.reduce((s, l) => s + l.kw, 0),
        };
      });

      const totalDemand = totalLoading * 0.7; // diversity factor

      const coverData: StandardCoverPageData = {
        reportTitle: "Generator Report",
        reportSubtitle: `Capital & Running Cost Analysis`,
        projectName: project.name || "Project",
        projectNumber: project.project_number || undefined,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const reportData: SvgGeneratorReportData = {
        coverData,
        projectName: project.name || "Project",
        generatorSize: zoneGenerators[0]?.generator_size || undefined,
        fuelType: 'Diesel',
        zones: svgZones,
        loadSummary: {
          totalConnected: Math.round(totalLoading),
          totalDemand: Math.round(totalDemand),
          diversityFactor: 0.7,
        },
        financials: totalCapitalCost > 0 ? {
          capitalCost: totalCapitalCost,
          monthlyFuel: 0,
          maintenanceAnnual: 0,
          amortizationYears: years,
        } : undefined,
      };

      return buildGeneratorReportPdf(reportData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "tenant-tracker-reports",
      dbTable: "generator_reports",
      foreignKeyColumn: "project_id",
      foreignKeyValue: projectId,
      reportName: `Generator_Report_${project.name?.replace(/\s+/g, "_") || "project"}`,
    }, () => {
      onReportSaved?.();
    });
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating || !project || zones.length === 0}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export & Save Report
        </>
      )}
    </Button>
  );
}
