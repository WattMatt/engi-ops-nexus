import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildGeneratorReportPdf, type GeneratorReportData, type TenantInfo, type GeneratorSettings } from "@/utils/svg-pdf/generatorReportPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface GeneratorReportExportPDFButtonProps {
  projectId: string;
  onReportSaved?: () => void;
}

export function GeneratorReportExportPDFButton({ projectId, onReportSaved }: GeneratorReportExportPDFButtonProps) {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("generator_zones").select("*").eq("project_id", projectId).order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

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

  const { data: generatorSettings } = useQuery({
    queryKey: ["generator-settings-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("generator_settings").select("*").eq("project_id", projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

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

      // Map settings with defaults
      const gs = generatorSettings;
      const settings: GeneratorSettings = {
        standardKwPerSqm: gs?.standard_kw_per_sqm || 0.03,
        fastFoodKwPerSqm: gs?.fast_food_kw_per_sqm || 0.045,
        restaurantKwPerSqm: gs?.restaurant_kw_per_sqm || 0.045,
        capitalRecoveryYears: gs?.capital_recovery_period_years || 10,
        capitalRecoveryRate: gs?.capital_recovery_rate_percent || 12,
        additionalCablingCost: gs?.additional_cabling_cost || 0,
        controlWiringCost: gs?.control_wiring_cost || 0,
        numMainBoards: gs?.num_main_boards || 0,
        ratePerMainBoard: gs?.rate_per_main_board || 0,
        ratePerTenantDb: gs?.rate_per_tenant_db || 0,
        dieselCostPerLitre: (gs as any)?.diesel_cost_per_litre || 23,
        runningHoursPerMonth: (gs as any)?.running_hours_per_month || 100,
        maintenanceCostAnnual: (gs as any)?.maintenance_cost_annual || 18800,
        powerFactor: (gs as any)?.power_factor || 0.95,
        runningLoadPercentage: (gs as any)?.running_load_percentage || 75,
        maintenanceContingencyPercent: (gs as any)?.maintenance_contingency_percent || 10,
      };

      // Map generators
      const generators = zoneGenerators.map(g => ({
        zoneId: g.zone_id,
        generatorNumber: g.generator_number,
        generatorSize: g.generator_size || '250 kVA',
        generatorCost: Number(g.generator_cost) || 0,
      }));

      // Map tenants with loading calculations
      const tenantInfos: TenantInfo[] = tenants.map(t => {
        const zone = zones.find(z => z.id === t.generator_zone_id);
        const isRestaurant = t.shop_category === 'restaurant' || t.shop_category === 'fast_food';
        let loadingKw = 0;
        if (!t.own_generator_provided) {
          if (t.manual_kw_override != null) {
            loadingKw = Number(t.manual_kw_override);
          } else {
            const rate = isRestaurant ? settings.restaurantKwPerSqm : settings.standardKwPerSqm;
            loadingKw = (t.area || 0) * rate;
          }
        }
        return {
          shopNumber: t.shop_number,
          shopName: t.shop_name,
          area: t.area || 0,
          ownGenerator: t.own_generator_provided || false,
          isRestaurant,
          zoneId: t.generator_zone_id || '',
          zoneName: zone?.zone_name || '',
          zoneNumber: zone?.zone_number || 0,
          loadingKw,
        };
      });

      // Map zones
      const zoneData = zones.map(z => ({
        id: z.id,
        name: z.zone_name,
        color: z.zone_color || '#3b82f6',
        zoneNumber: z.zone_number,
      }));

      const coverData: StandardCoverPageData = {
        reportTitle: "Standby System Implementation",
        reportSubtitle: "(Subject to Approval)",
        projectName: project.name || "Project",
        projectNumber: project.project_number || undefined,
        date: format(new Date(), "EEEE, d MMMM yyyy"),
        ...companyData,
      };

      const reportData: GeneratorReportData = {
        coverData,
        projectName: project.name || "Project",
        zones: zoneData,
        generators,
        tenants: tenantInfos,
        settings,
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
