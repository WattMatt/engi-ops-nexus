import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

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

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-pdf", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    if (!project || zones.length === 0) {
      toast.error("No data available to generate report");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPos = 20;

      // Calculate total costs for executive summary
      const totalGeneratorCost = zones.reduce((sum, zone) => sum + (zone.generator_cost || 0), 0);
      const estimatedCabling = totalGeneratorCost * 0.10; // 10% of generator cost
      const estimatedBoardWork = totalGeneratorCost * 0.12; // 12% of generator cost
      const totalEstimatedCost = totalGeneratorCost + estimatedCabling + estimatedBoardWork;
      
      // Build generator description
      const generatorDescription = zones.map(zone => {
        const units = zone.num_generators || 1;
        const unitCost = (zone.generator_cost || 0) / units;
        return `${units}x ${zone.generator_size} @ ${formatCurrency(unitCost)} each`;
      }).join(", ");
      
      // Capital recovery calculation (10 years at 12%)
      const years = 10;
      const rate = 0.12;
      const monthlyCapitalRepayment = (totalEstimatedCost * rate / 12) / (1 - Math.pow(1 + rate / 12, -years * 12));

      // ========== COVER PAGE ==========
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Financial Evaluation", pageWidth / 2, 80, { align: "center" });
      
      yPos = 100;
      doc.setFontSize(20);
      doc.text(project.name || "Generator Report", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 15;
      doc.setFontSize(16);
      doc.text("Centre Standby Plant", pageWidth / 2, yPos, { align: "center" });
      
      // Company details
      yPos = 160;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PREPARED BY:", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
      doc.setFont("helvetica", "normal");
      doc.text("WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      doc.text("141 Witch Hazel Ave, Highveld Techno Park", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      doc.text("Building 1A", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      doc.text("Tel: (012) 665 3487", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      doc.text("Contact: Mr Arno Mattheus", pageWidth / 2, yPos, { align: "center" });
      
      yPos = 220;
      doc.setFont("helvetica", "bold");
      doc.text(`DATE: ${format(new Date(), "EEEE, dd MMMM yyyy")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
      doc.text("REVISION: Rev 1", pageWidth / 2, yPos, { align: "center" });

      // ========== PAGE 2: EXECUTIVE SUMMARY ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY:", 14, yPos);
      yPos += 12;
      
      doc.text("GENERATOR VARIABLES:", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - ${format(new Date(), "yyyy.MM.dd")}`, 14, yPos);
      yPos += 8;

      // Cost summary table
      const costData = [
        ["GENERATOR", generatorDescription, formatCurrency(totalGeneratorCost)],
        ["CABLING", "", formatCurrency(estimatedCabling)],
        ["WORK ON MAIN AND SHOP BOARDS", "", formatCurrency(estimatedBoardWork)],
        ["TOTAL ESTIMATED COST", "", formatCurrency(totalEstimatedCost)],
      ];

      autoTable(doc, {
        startY: yPos,
        body: costData,
        theme: "grid",
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 100 },
          1: { cellWidth: 40 },
          2: { fontStyle: "bold", halign: "right" },
        },
        margin: { left: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Key metrics
      const avgDieselPrice = allSettings.length > 0 
        ? allSettings.reduce((sum, s) => sum + s.diesel_price_per_litre, 0) / allSettings.length 
        : 0;
      const avgRunningHours = allSettings.length > 0 
        ? allSettings.reduce((sum, s) => sum + s.expected_hours_per_month, 0) / allSettings.length 
        : 0;

      // Calculate running cost per kWh
      const metrics = calculateMetrics();
      
      doc.setFont("helvetica", "bold");
      doc.text(`DIESEL COST: ${avgDieselPrice.toFixed(0)}`, 14, yPos);
      yPos += 8;
      doc.text(`ESTIMATED RUNNING HOURS: ${avgRunningHours.toFixed(0)}`, 14, yPos);
      yPos += 8;
      doc.text(`MONTHLY CAPITAL REPAYMENT: ${formatCurrency(monthlyCapitalRepayment)}`, 14, yPos);
      yPos += 8;
      doc.text(`RUNNING kWH COST: R${metrics?.averageTariff.toFixed(2) || "0.00"}`, 14, yPos);

      // ========== PAGE 3: SIZING AND ALLOWANCES ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SIZING AND ALLOWANCES:", 14, yPos);
      yPos += 10;

      // Tenant schedule with calculations
      const tenantRows = tenants
        .filter(t => t.generator_zone_id) // Only tenants assigned to generator zones
        .map(tenant => {
          const dbSize = tenant.db_size_allowance || "0A";
          const amperage = parseInt(dbSize.replace(/\D/g, "")) || 0;
          const actualLoad = (amperage * 0.4 * 3.3 * 0.8) / 1000; // kW calculation
          
          // Determine if fast food (higher load multiplier)
          const isFastFood = tenant.shop_category === "fast-food";
          const loadMultiplier = isFastFood ? 3 : 1;
          const adjustedLoad = actualLoad * loadMultiplier;
          
          const percentOfTotal = metrics && metrics.totalCapacity > 0 
            ? (adjustedLoad / metrics.totalCapacity) * 100 
            : 0;
          
          const monthlyRecovery = (percentOfTotal / 100) * monthlyCapitalRepayment;
          const costPerArea = tenant.area > 0 ? monthlyRecovery / tenant.area : 0;
          
          return [
            tenant.shop_number,
            tenant.shop_name,
            tenant.area?.toFixed(0) || "0",
            adjustedLoad.toFixed(2),
            `${percentOfTotal.toFixed(2)}%`,
            formatCurrency(monthlyRecovery),
            `R ${costPerArea.toFixed(2)}`,
          ];
        });

      // Add mall common area
      const commonAreaLoad = 15; // kW
      const commonAreaPercent = metrics && metrics.totalCapacity > 0 
        ? (commonAreaLoad / metrics.totalCapacity) * 100 
        : 0;
      const commonAreaRecovery = (commonAreaPercent / 100) * monthlyCapitalRepayment;
      
      tenantRows.push([
        "",
        "MALL AND COMMON AREA",
        "",
        commonAreaLoad.toFixed(2),
        `${commonAreaPercent.toFixed(2)}%`,
        formatCurrency(commonAreaRecovery),
        "",
      ]);

      // Calculate subtotal
      const totalLoad = tenantRows.reduce((sum, row) => sum + parseFloat(row[3] || "0"), 0);
      tenantRows.push([
        "SUB-TOTAL",
        "",
        "",
        totalLoad.toFixed(2),
        "100%",
        formatCurrency(monthlyCapitalRepayment),
        "",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[
          "SHOP NO",
          "TENANT",
          "SIZE",
          "Actual Load (kW)",
          "% of Total",
          "Monthly Rental (EXCL VAT)",
          "Cost per m²",
        ]],
        body: tenantRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 35 },
          2: { cellWidth: 15, halign: "right" },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 18, halign: "right" },
          5: { cellWidth: 38, halign: "right" },
          6: { cellWidth: 20, halign: "right" },
        },
        margin: { left: 14, right: 14 },
      });

      // ========== PAGE 4: SYSTEM RECOVERY (AMORTIZATION) ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SYSTEM RECOVERY:", 14, yPos);
      yPos += 12;
      
      doc.text("STANDBY SYSTEM - AMORT", 14, yPos);
      yPos += 10;

      // Amortization parameters
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`CAPITAL COST ${formatCurrency(totalEstimatedCost)}`, 14, yPos);
      yPos += 6;
      doc.text(`PERIOD/ YEARS ${years}`, 14, yPos);
      yPos += 6;
      doc.text(`RATE ${(rate * 100).toFixed(2)}%`, 14, yPos);
      yPos += 6;
      const annualPayment = monthlyCapitalRepayment * 12;
      doc.text(`REPAYMENT ${formatCurrency(annualPayment)} PER/MONTH ${formatCurrency(monthlyCapitalRepayment)}`, 14, yPos);
      yPos += 12;

      // Amortization schedule
      const amortRows = [];
      let balance = totalEstimatedCost;
      
      for (let year = 1; year <= years; year++) {
        const interest = balance * rate;
        const principal = annualPayment - interest;
        const endingBalance = year === years ? 0 : balance - principal;
        
        amortRows.push([
          year.toString(),
          formatCurrency(balance),
          formatCurrency(annualPayment),
          formatCurrency(interest),
          formatCurrency(principal),
          endingBalance > 0 ? formatCurrency(endingBalance) : "R -",
        ]);
        
        balance = endingBalance;
      }

      autoTable(doc, {
        startY: yPos,
        head: [["YEARS", "BEGINNING", "PMT", "INTEREST", "PRINCIPAL", "ENDING BALANCE"]],
        body: amortRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
        },
        margin: { left: 14, right: 14 },
      });

      // ========== PAGE 5: DIESEL/RUNNING RECOVERY ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DIESEL/ RUNNING RECOVERY:", 14, yPos);
      yPos += 12;

      // For each zone, show detailed running cost breakdown
      zones.forEach((zone, index) => {
        const settings = allSettings.find(s => s.generator_zone_id === zone.id);
        if (!settings) return;

        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. DIESEL CONSUMPTION COST - Zone ${zone.zone_name}`, 14, yPos);
        yPos += 8;

        const netEnergyKVA = Number(settings.net_energy_kva);
        const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
        const netEnergyKWh = netEnergyKVA * kvaToKwhConversion;
        const runningLoad = Number(settings.running_load);

        autoTable(doc, {
          startY: yPos,
          body: [
            ["Running Load (Correction already made in sizing)", `${runningLoad}%`],
            ["Net energy generated (usable kVA)", netEnergyKVA.toFixed(2)],
            ["Convert kVA to kWh", kvaToKwhConversion.toFixed(2)],
            ["Net total energy generated (usable kWh)", netEnergyKWh.toFixed(2)],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 120 },
            1: { halign: "right" },
          },
          margin: { left: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FUEL CONSUMPTION", 14, yPos);
        yPos += 6;

        const fuelRate = Number(settings.fuel_consumption_rate);
        const dieselPrice = Number(settings.diesel_price_per_litre);
        const costPerHour = fuelRate * dieselPrice;
        const expectedHours = Number(settings.expected_hours_per_month);
        const monthlyEnergy = netEnergyKWh * expectedHours;
        const dieselCostPerKWh = netEnergyKWh > 0 ? costPerHour / netEnergyKWh : 0;

        autoTable(doc, {
          startY: yPos,
          body: [
            ["Assumed running load on generators", `${runningLoad}%`],
            ["Fuel Consumption @ 100%", fuelRate.toFixed(2)],
            ["Cost of diesel per litre", formatCurrency(dieselPrice)],
            ["Total cost of diesel per hour", formatCurrency(costPerHour)],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 120 },
            1: { halign: "right" },
          },
          margin: { left: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Monthly diesel cost /kWh: R ${dieselCostPerKWh.toFixed(2)}`, 20, yPos);
        yPos += 10;

        // Maintenance costs
        doc.setFontSize(12);
        doc.text("MAINTENANCE COST", 14, yPos);
        yPos += 6;

        const servicingPerYear = Number(settings.servicing_cost_per_year);
        const servicingPer250Hours = Number(settings.servicing_cost_per_250_hours);
        const servicingPerMonth = servicingPerYear / 12;
        const servicingByHours = (servicingPer250Hours / 250) * expectedHours;
        const additionalServicing = Math.max(0, servicingByHours - servicingPerMonth);
        const servicingPerKWh = monthlyEnergy > 0 ? additionalServicing / monthlyEnergy : 0;

        autoTable(doc, {
          startY: yPos,
          body: [
            ["Cost of servicing units per year", formatCurrency(servicingPerYear)],
            ["Months", "12.00"],
            ["Cost of servicing units per month", formatCurrency(servicingPerMonth)],
            ["Cost of Servicing units per 250 hours", formatCurrency(servicingPer250Hours)],
            ["Expected hours per Month", expectedHours.toFixed(2)],
            ["Cost of servicing units per month", formatCurrency(servicingByHours)],
            ["Additional Cost of Servicing - above Annual Cost", formatCurrency(additionalServicing)],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 120 },
            1: { halign: "right" },
          },
          margin: { left: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Services cost per kWH (Excluding Annual Service): R ${servicingPerKWh.toFixed(2)}`, 20, yPos);
        yPos += 10;

        // Total cost summary
        doc.setFontSize(12);
        doc.text("Total Cost per kWH", 14, yPos);
        yPos += 6;

        const totalBeforeContingency = dieselCostPerKWh + servicingPerKWh;
        const contingency = totalBeforeContingency * 0.1;
        const totalTariff = totalBeforeContingency + contingency;

        autoTable(doc, {
          startY: yPos,
          body: [
            ["TOTAL FUEL COST", `R ${dieselCostPerKWh.toFixed(2)}`],
            ["TOTAL MAINTENANCE COST", `R ${servicingPerKWh.toFixed(2)}`],
            ["TOTAL TARIFF FOR USE KWH", `R ${totalBeforeContingency.toFixed(2)}`],
            ["MAINTENANCE CONTINGENCY", `R ${contingency.toFixed(2)}`],
            ["TOTAL TARIFF FOR USE KWH", `R ${totalTariff.toFixed(2)}`],
          ],
          theme: "plain",
          styles: { fontSize: 9 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 120 },
            1: { halign: "right", fontStyle: "bold" },
          },
          margin: { left: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
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
          report_name: `Generator Report - ${format(new Date(), "dd/MM/yyyy")}`,
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
