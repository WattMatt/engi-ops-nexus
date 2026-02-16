import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { captureChartAsCanvas, waitForElementRender } from "@/utils/pdfQualitySettings";
import { generatePDF } from "@/utils/pdfmake/engine";
import type { GeneratorReportData, GeneratorZone } from "@/utils/pdfmake/engine/registrations/generatorReport";
import { LoadDistributionChart } from "./charts/LoadDistributionChart";
import { CostBreakdownChart } from "./charts/CostBreakdownChart";
import { RecoveryProjectionChart } from "./charts/RecoveryProjectionChart";
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
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Fetch running recovery settings
  const { data: allSettings = [] } = useQuery({
    queryKey: ["running-recovery-settings-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("running_recovery_settings").select("*").eq("project_id", projectId);
      if (error) throw error;
      return data || [];
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

  const handleExport = async () => {
    if (!project || zones.length === 0) {
      toast.error("No data available to generate report");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Prepare Data
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
      const rate = (generatorSettings?.capital_recovery_rate_percent || 12) / 100;
      
      const numerator = rate * Math.pow(1 + rate, years);
      const denominator = Math.pow(1 + rate, years) - 1;
      const annualRepayment = totalCapitalCost * (numerator / denominator);
      const monthlyCapitalRepayment = annualRepayment / 12;

      // Amortization Schedule
      const schedule = [];
      let balance = totalCapitalCost;
      for (let year = 1; year <= years; year++) {
        const interest = balance * rate;
        const principal = annualRepayment - interest;
        const endingBalance = year === years ? 0 : balance - principal;
        schedule.push({ year, beginning: balance, payment: annualRepayment, interest, principal, ending: endingBalance });
        balance = endingBalance;
      }

      // Running Recovery Data
      const runningGenerators = zones.flatMap(zone => {
        const zoneGens = zoneGenerators.filter(g => g.zone_id === zone.id).sort((a: any, b: any) => a.generator_number - b.generator_number);
        // Show at least one entry even if no generators configured
        const gensToDisplay = zoneGens.length > 0 ? zoneGens : [{ generator_size: zone.generator_size || "Not configured" }];
        
        return gensToDisplay.map((gen: any, idx: number) => {
          const settings = allSettings.find(s => s.generator_zone_id === zone.id);
          if (!settings) return null;

          const runningLoad = Number(settings.running_load);
          const netEnergyKVA = Number(settings.net_energy_kva);
          const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
          const expectedHours = Number(settings.expected_hours_per_month);
          
          const totalEnergy = netEnergyKVA * kvaToKwhConversion * (runningLoad / 100);
          const monthlyEnergy = totalEnergy * expectedHours;
          
          let fuelRate = getFuelConsumption(gen.generator_size || "", runningLoad);
          if (fuelRate === 0) {
            const storedFuelRate = Number(settings.fuel_consumption_rate);
            fuelRate = storedFuelRate > 0 ? storedFuelRate : netEnergyKVA * 0.15;
          }
          
          const dieselPrice = Number(settings.diesel_price_per_litre);
          const dieselCostPerHour = fuelRate * dieselPrice;
          const monthlyDieselCost = dieselCostPerHour * expectedHours;
          
          const servicingPerYear = Number(settings.servicing_cost_per_year);
          const servicingPer250Hours = Number(settings.servicing_cost_per_250_hours);
          const servicingByHours = (servicingPer250Hours / 250) * expectedHours;
          const additionalServicing = Math.max(0, servicingByHours - (servicingPerYear / 12));
          
          const monthlyDieselCostPerKWh = totalEnergy > 0 ? dieselCostPerHour / totalEnergy : 0;
          const totalServicesCostPerKWh = monthlyEnergy > 0 ? additionalServicing / monthlyEnergy : 0;
          const tariff = (monthlyDieselCostPerKWh + totalServicesCostPerKWh) * 1.1; // +10% contingency

          return {
            zoneName: `${zone.zone_name} (Unit ${idx + 1})`,
            generatorSize: gen.generator_size || "Unknown",
            isSync: zoneGens.length > 1,
            runningLoad,
            netEnergy: netEnergyKVA,
            fuelRate,
            dieselPrice,
            servicingYear: servicingPerYear,
            totalEnergy,
            monthlyDiesel: monthlyDieselCost,
            monthlyServicing: additionalServicing,
            tariff
          };
        });
      }).filter(Boolean) as any[];

      const avgTariff = runningGenerators.length > 0 
        ? runningGenerators.reduce((sum, g) => sum + g.tariff, 0) / runningGenerators.length 
        : 0;

      // Tenant Schedule
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

      const tenantRows = tenants.map(t => {
        let load = 0;
        if (!t.own_generator_provided) {
          if (t.manual_kw_override != null) load = Number(t.manual_kw_override);
          else {
            const kwPerSqm = {
              standard: generatorSettings?.standard_kw_per_sqm || 0.03,
              fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
              restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
              national: generatorSettings?.national_kw_per_sqm || 0.03,
            };
            load = (t.area || 0) * (kwPerSqm[t.shop_category as keyof typeof kwPerSqm] || 0.03);
          }
        }

        const portion = totalLoading > 0 ? (load / totalLoading) * 100 : 0;
        const monthlyRental = (portion / 100) * monthlyCapitalRepayment;
        
        return {
          shopNo: t.shop_number,
          name: t.shop_name,
          size: t.area || 0,
          isOwnGen: !!t.own_generator_provided,
          zoneName: t.generator_zone_id ? zones.find(z => z.id === t.generator_zone_id)?.zone_name || "-" : "-",
          zoneLoad: load,
          portion,
          monthlyRental: t.own_generator_provided ? 0 : monthlyRental,
          ratePerSqm: (t.area && t.area > 0 && !t.own_generator_provided) ? monthlyRental / t.area : 0,
          tags: [
            t.own_generator_provided ? 'own_gen' : null,
            (t.shop_category === 'fast_food' || t.shop_category === 'fast-food') ? 'fast_food' : null,
            t.shop_category === 'restaurant' ? 'restaurant' : null
          ].filter(Boolean) as any[]
        };
      });

      // Prepare Report Data
      const reportData: GeneratorReportData = {
        projectName: project.name || "Generator Report",
        reportDate: format(new Date(), "yyyy.MM.dd"),
        summary: {
          totalCapitalCost,
          monthlyRepayment: monthlyCapitalRepayment,
          avgTariff,
          numTenantDBs,
          tenantDBsCost,
          numMainBoards,
          mainBoardsCost,
          additionalCablingCost,
          controlWiringCost
        },
        zones: zones.map(z => ({
          id: z.id,
          name: z.zone_name,
          color: z.zone_color || '#3b82f6',
          generators: zoneGenerators.filter(g => g.zone_id === z.id).map(g => ({
            size: g.generator_size || "Unknown",
            cost: Number(g.generator_cost) || 0
          })),
          cost: zoneGenerators.filter(g => g.zone_id === z.id).reduce((sum, g) => sum + (Number(g.generator_cost) || 0), 0)
        })),
        amortization: {
          periodYears: years,
          ratePercent: rate,
          annualRepayment,
          schedule
        },
        runningRecovery: {
          generators: runningGenerators
        },
        tenants: tenantRows,
        totals: {
          area: tenants.reduce((sum, t) => sum + (t.area || 0), 0),
          loading: totalLoading,
          monthlyRental: tenantRows.reduce((sum, t) => sum + t.monthlyRental, 0)
        }
      };

      // 2. Capture Charts
      const chartContainer = document.createElement("div");
      chartContainer.style.position = "absolute";
      chartContainer.style.left = "-9999px";
      chartContainer.style.width = "1200px";
      chartContainer.style.padding = "20px";
      chartContainer.style.backgroundColor = "#ffffff";
      document.body.appendChild(chartContainer);

      const charts = [];

      try {
        // Load Distribution
        const loadChartDiv = document.createElement("div");
        loadChartDiv.style.width = "1200px";
        loadChartDiv.style.height = "500px";
        chartContainer.appendChild(loadChartDiv);
        const root1 = createRoot(loadChartDiv);
        
        const zoneLoadingData = zones.map(zone => ({
          id: zone.id,
          zone_name: zone.zone_name,
          loading: tenantRows.filter(t => t.zoneName === zone.zone_name).reduce((sum, t) => sum + t.zoneLoad, 0)
        }));
        
        root1.render(React.createElement(LoadDistributionChart, { zones: zoneLoadingData }));
        await waitForElementRender(1500);
        const loadCanvas = await captureChartAsCanvas(loadChartDiv);
        charts.push({ elementId: 'load-distribution-chart', image: loadCanvas.toDataURL('image/jpeg', 0.9) });
        root1.unmount();
        loadChartDiv.remove();

        // Cost Breakdown
        const costChartDiv = document.createElement("div");
        costChartDiv.style.width = "1200px";
        costChartDiv.style.height = "500px";
        chartContainer.appendChild(costChartDiv);
        const root2 = createRoot(costChartDiv);
        
        root2.render(React.createElement(CostBreakdownChart, { costs: {
          generatorCost: totalGeneratorCost,
          tenantDBsCost,
          mainBoardsCost,
          additionalCablingCost,
          controlWiringCost
        }}));
        await waitForElementRender(1500);
        const costCanvas = await captureChartAsCanvas(costChartDiv);
        charts.push({ elementId: 'cost-breakdown-chart', image: costCanvas.toDataURL('image/jpeg', 0.9) });
        root2.unmount();
        costChartDiv.remove();

        // Recovery
        const recoveryChartDiv = document.createElement("div");
        recoveryChartDiv.style.width = "1200px";
        recoveryChartDiv.style.height = "500px";
        chartContainer.appendChild(recoveryChartDiv);
        const root3 = createRoot(recoveryChartDiv);
        
        // Calculate monthly running costs for chart
        const totalRunningCost = runningGenerators.reduce((sum, g) => sum + g.monthlyDiesel + g.monthlyServicing, 0);
        const monthlyRunningRecovery = totalRunningCost * 1.1; // +10% contingency

        root3.render(React.createElement(RecoveryProjectionChart, { 
          monthlyCapitalRecovery: monthlyCapitalRepayment,
          monthlyRunningRecovery
        }));
        await waitForElementRender(1500);
        const recoveryCanvas = await captureChartAsCanvas(recoveryChartDiv);
        charts.push({ elementId: 'recovery-projection-chart', image: recoveryCanvas.toDataURL('image/jpeg', 0.9) });
        root3.unmount();
        recoveryChartDiv.remove();

      } catch (err) {
        console.error('Error capturing charts:', err);
      } finally {
        if (document.body.contains(chartContainer)) {
          document.body.removeChild(chartContainer);
        }
      }

      // 3. Generate PDF
      const result = await generatePDF('generator-report', {
        data: reportData,
        charts
      }, {
        projectName: project.name || "Project",
        projectNumber: project.project_number
      });

      if (result.success && result.blob) {
        // Upload & Save Record
        const timestamp = new Date().getTime();
        const fileName = `generator-report-${project.name?.replace(/\s+/g, "-") || "project"}-${timestamp}.pdf`;
        const filePath = `${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("tenant-tracker-reports")
          .upload(filePath, result.blob, { contentType: "application/pdf", upsert: false });

        if (uploadError) throw uploadError;

        // Save DB record
        const { data: latestReport } = await supabase.from("generator_reports").select("revision").eq("project_id", projectId).order("generated_at", { ascending: false }).limit(1).single();
        let nextRevision = "Rev.0";
        if (latestReport?.revision) {
          const currentRevNum = parseInt(latestReport.revision.replace("Rev.", ""));
          nextRevision = `Rev.${currentRevNum + 1}`;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from("generator_reports").insert({
          project_id: projectId,
          report_name: `Generator Report - ${format(new Date(), "dd/MM/yyyy")} - ${nextRevision}`,
          file_path: filePath,
          file_size: result.blob.size,
          generated_by: user?.id,
          revision: nextRevision,
        });

        toast.success("Generator report saved successfully!");
        onReportSaved?.();

        // Trigger Download
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error(result.error || "PDF Generation failed");
      }

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(`PDF Generation Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
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
