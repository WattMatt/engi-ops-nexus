import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

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
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch generator zones
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-pdf", projectId],
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

  // Fetch running recovery settings
  const { data: allSettings = [] } = useQuery({
    queryKey: ["running-recovery-settings-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("running_recovery_settings")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const generatePDF = async () => {
    if (!project || zones.length === 0) {
      toast.error("No data available to generate report");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Generator Recovery Analysis Report", 105, yPosition, { align: "center" });
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Project: ${project.name}`, 105, yPosition, { align: "center" });
      
      yPosition += 5;
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPosition, { align: "center" });
      
      yPosition += 15;

      // System Overview Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("System Overview", 14, yPosition);
      yPosition += 8;

      // Calculate metrics
      const metrics = calculateMetrics();
      
      if (metrics) {
        const overviewData = [
          ["Total Generators", `${metrics.totalGenerators} (${zones.length} zones)`],
          ["System Capacity", `${metrics.totalCapacity.toFixed(0)} kWh`],
          ["Monthly Energy Output", `${(metrics.totalMonthlyEnergy / 1000).toFixed(1)}k kWh`],
          ["Average Recovery Tariff", `R ${metrics.averageTariff.toFixed(4)}/kWh`],
          ["Monthly Operating Cost", `R ${metrics.totalMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
          ["Annual Operating Cost", `R ${metrics.annualCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: overviewData,
          theme: "grid",
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          margin: { left: 14 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Zone-by-Zone Details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Generator Zone Details", 14, yPosition);
      yPosition += 8;

      zones.forEach((zone, index) => {
        const settings = allSettings.find(s => s.generator_zone_id === zone.id);
        
        if (settings) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`Zone ${index + 1}: ${zone.zone_name}`, 14, yPosition);
          yPosition += 6;

          const zoneData = [
            ["Generator Size", zone.generator_size || "N/A"],
            ["Number of Units", String(zone.num_generators || 1)],
            ["Running Load", `${settings.running_load}%`],
            ["Net Energy per Unit", `${settings.net_energy_kva} kVA`],
            ["Fuel Consumption", `${settings.fuel_consumption_rate.toFixed(2)} L/h`],
            ["Diesel Price", `R ${settings.diesel_price_per_litre.toFixed(2)}/L`],
            ["Expected Hours/Month", String(settings.expected_hours_per_month)],
          ];

          autoTable(doc, {
            startY: yPosition,
            body: zoneData,
            theme: "plain",
            margin: { left: 20 },
            columnStyles: {
              0: { fontStyle: "bold", cellWidth: 60 },
              1: { cellWidth: "auto" },
            },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 10;

          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
        }
      });

      // Running Recovery Calculations
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Running Recovery Calculations", 14, yPosition);
      yPosition += 8;

      const expandedGenerators = zones.flatMap(zone => {
        const numGenerators = zone.num_generators || 1;
        return Array.from({ length: numGenerators }, (_, index) => ({
          zoneId: zone.id,
          zoneName: zone.zone_name,
          generatorIndex: index + 1,
        }));
      }).slice(0, 4);

      const calculationRows = expandedGenerators.map((gen) => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        const zone = zones.find(z => z.id === gen.zoneId);
        
        if (!settings || !zone) return [];

        const numGenerators = zone.num_generators || 1;
        const netEnergyKVA = Number(settings.net_energy_kva);
        const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
        const fuelConsumptionRate = Number(settings.fuel_consumption_rate);
        const dieselPricePerLitre = Number(settings.diesel_price_per_litre);
        const servicingCostPerYear = Number(settings.servicing_cost_per_year);
        const servicingCostPer250Hours = Number(settings.servicing_cost_per_250_hours);
        const expectedHoursPerMonth = Number(settings.expected_hours_per_month);

        const totalEnergy = netEnergyKVA * kvaToKwhConversion;
        const monthlyEnergy = totalEnergy * expectedHoursPerMonth;
        const dieselCostPerHour = fuelConsumptionRate * dieselPricePerLitre;
        const monthlyDieselCost = dieselCostPerHour * expectedHoursPerMonth;

        const servicingCostPerMonth = servicingCostPerYear / 12;
        const servicingCostPerMonthByHours = (servicingCostPer250Hours / 250) * expectedHoursPerMonth;
        const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);

        const monthlyDieselCostPerKWh = totalEnergy > 0 ? dieselCostPerHour / totalEnergy : 0;
        const totalServicesCostPerKWh = monthlyEnergy > 0 ? additionalServicingCost / monthlyEnergy : 0;
        const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
        const maintenanceContingency = totalTariffBeforeContingency * 0.1;
        const tariff = totalTariffBeforeContingency + maintenanceContingency;

        return [
          `${gen.zoneName} (Unit ${gen.generatorIndex})`,
          totalEnergy.toFixed(2),
          monthlyEnergy.toFixed(0),
          `R ${monthlyDieselCost.toFixed(2)}`,
          `R ${additionalServicingCost.toFixed(2)}`,
          `R ${tariff.toFixed(4)}`,
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [["Generator", "Energy (kWh)", "Monthly kWh", "Diesel Cost", "Servicing", "Tariff/kWh"]],
        body: calculationRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { left: 14 },
        styles: { fontSize: 8 },
      });

      // Save PDF to blob
      const pdfBlob = doc.output("blob");
      const timestamp = new Date().getTime();
      const fileName = `generator-report-${project.name.replace(/\s+/g, "-")}-${timestamp}.pdf`;
      const filePath = `${projectId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("tenant-tracker-reports")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("generator_reports")
        .insert({
          project_id: projectId,
          report_name: `Generator Report - ${new Date().toLocaleDateString()}`,
          file_path: filePath,
          file_size: pdfBlob.size,
          generated_by: user?.id,
        });

      if (dbError) throw dbError;

      toast.success("Generator report saved successfully!");
      onReportSaved?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateMetrics = () => {
    if (zones.length === 0) return null;

    let totalCapacity = 0;
    let totalMonthlyEnergy = 0;
    let totalDieselCost = 0;
    let totalServicingCost = 0;
    let totalGenerators = 0;
    const zoneTariffs: number[] = [];

    zones.forEach((zone) => {
      const settings = allSettings.find(s => s.generator_zone_id === zone.id);
      if (!settings) return;

      const numGenerators = zone.num_generators || 1;
      totalGenerators += numGenerators;

      const netEnergyKVA = Number(settings.net_energy_kva);
      const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
      const fuelConsumptionRate = Number(settings.fuel_consumption_rate);
      const dieselPricePerLitre = Number(settings.diesel_price_per_litre);
      const servicingCostPerYear = Number(settings.servicing_cost_per_year);
      const servicingCostPer250Hours = Number(settings.servicing_cost_per_250_hours);
      const expectedHoursPerMonth = Number(settings.expected_hours_per_month);

      const zoneCapacity = netEnergyKVA * kvaToKwhConversion * numGenerators;
      totalCapacity += zoneCapacity;

      const monthlyEnergy = zoneCapacity * expectedHoursPerMonth;
      totalMonthlyEnergy += monthlyEnergy;

      const dieselCostPerHour = fuelConsumptionRate * dieselPricePerLitre * numGenerators;
      const monthlyDieselCost = dieselCostPerHour * expectedHoursPerMonth;
      totalDieselCost += monthlyDieselCost;

      const servicingCostPerMonth = servicingCostPerYear / 12;
      const servicingCostPerMonthByHours = (servicingCostPer250Hours / 250) * expectedHoursPerMonth;
      const additionalServicingCost = Math.max(0, servicingCostPerMonthByHours - servicingCostPerMonth);
      totalServicingCost += additionalServicingCost;

      const monthlyDieselCostPerKWh = zoneCapacity > 0 ? dieselCostPerHour / zoneCapacity : 0;
      const totalServicesCostPerKWh = monthlyEnergy > 0 ? additionalServicingCost / monthlyEnergy : 0;
      const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
      const maintenanceContingency = totalTariffBeforeContingency * 0.1;
      const zoneTariff = totalTariffBeforeContingency + maintenanceContingency;
      
      zoneTariffs.push(zoneTariff);
    });

    const averageTariff = zoneTariffs.length > 0 
      ? zoneTariffs.reduce((sum, t) => sum + t, 0) / zoneTariffs.length 
      : 0;

    const totalMonthlyCost = totalDieselCost + totalServicingCost;
    const contingencyCost = totalMonthlyCost * 0.1;
    const totalWithContingency = totalMonthlyCost + contingencyCost;
    const annualCost = totalWithContingency * 12;

    return {
      averageTariff,
      totalCapacity,
      totalMonthlyEnergy,
      totalMonthlyCost,
      annualCost,
      totalGenerators,
    };
  };

  return (
    <Button
      onClick={generatePDF}
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
