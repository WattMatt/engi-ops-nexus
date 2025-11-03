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
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      
      // Sort shop numbers numerically (same as on-screen display)
      return (data || []).sort((a, b) => {
        const matchA = a.shop_number.match(/\d+/);
        const matchB = b.shop_number.match(/\d+/);
        
        const numA = matchA ? parseInt(matchA[0]) : 0;
        const numB = matchB ? parseInt(matchB[0]) : 0;
        
        if (numA !== numB) {
          return numA - numB;
        }
        
        return a.shop_number.localeCompare(b.shop_number, undefined, { numeric: true });
      });
    },
    enabled: !!projectId,
  });

  // Fetch generator settings
  const { data: generatorSettings } = useQuery({
    queryKey: ["generator-settings-pdf", projectId],
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
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPos = 15;

      // Calculate total costs for executive summary
      const totalGeneratorCost = zones.reduce((sum, zone) => {
        const numGens = zone.num_generators || 1;
        const costPerGen = zone.generator_cost || 0;
        return sum + (costPerGen * numGens);
      }, 0);
      
      // Build generator description
      const generatorDescription = zones.map(zone => {
        const units = zone.num_generators || 1;
        const unitCost = (zone.generator_cost || 0) / units;
        return `${units}x ${zone.generator_size} @ ${formatCurrency(unitCost)} each`;
      }).join(", ");
      
      // Get number of tenants without own generators and calculate all costs
      const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
      const ratePerTenantDB = generatorSettings?.rate_per_tenant_db || 0;
      const tenantDBsCost = numTenantDBs * ratePerTenantDB;
      
      const numMainBoards = generatorSettings?.num_main_boards || 0;
      const ratePerMainBoard = generatorSettings?.rate_per_main_board || 0;
      const mainBoardsCost = numMainBoards * ratePerMainBoard;
      
      const additionalCablingCost = generatorSettings?.additional_cabling_cost || 0;
      const controlWiringCost = generatorSettings?.control_wiring_cost || 0;
      
      const totalCapitalCost = totalGeneratorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;
      
      // Capital recovery calculation (10 years at 12%) - matching on-screen calculation
      const years = 10;
      const rate = 0.12;
      
      // Calculate annual repayment using annuity formula (same as CapitalRecoveryCalculator)
      const numerator = rate * Math.pow(1 + rate, years);
      const denominator = Math.pow(1 + rate, years) - 1;
      const annualRepayment = totalCapitalCost * (numerator / denominator);
      const monthlyCapitalRepayment = annualRepayment / 12;

      // ========== SINGLE PAGE COMPREHENSIVE REPORT ==========
      
      // Header with gradient background
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(project.name?.toUpperCase() || "GENERATOR REPORT", pageWidth / 2, 12, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Centre Standby Plant - Financial Evaluation", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(9);
      doc.text(`Generated: ${format(new Date(), "dd MMMM yyyy")}`, pageWidth / 2, 28, { align: "center" });
      
      yPos = 42;
      doc.setTextColor(0, 0, 0);
      
      // Two-column layout
      const leftCol = 15;
      const rightCol = pageWidth / 2 + 5;
      const colWidth = pageWidth / 2 - 20;
      
      // LEFT COLUMN - Generator Equipment Overview
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 248, 255);
      doc.rect(leftCol, yPos, colWidth, 8, 'F');
      doc.text("GENERATOR EQUIPMENT", leftCol + 2, yPos + 5.5);
      
      yPos += 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      
      const equipmentData = zones.map((zone, idx) => {
        const numGens = zone.num_generators || 1;
        const costPerGen = zone.generator_cost || 0;
        const totalCost = costPerGen * numGens;
        return [
          zone.zone_name,
          `${numGens}x ${zone.generator_size}`,
          formatCurrency(totalCost)
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [["Zone", "Equipment", "Cost"]],
        body: equipmentData,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: colWidth - 60, halign: "right" },
        },
        margin: { left: leftCol, right: pageWidth - leftCol - colWidth },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 5;
      
      // Financial Summary Box
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 248, 255);
      doc.rect(leftCol, yPos, colWidth, 8, 'F');
      doc.text("FINANCIAL SUMMARY", leftCol + 2, yPos + 5.5);
      
      yPos += 10;
      
      const financialData = [
        ["Total Equipment Cost", formatCurrency(totalGeneratorCost)],
        ["Tenant DBs", `${numTenantDBs} x ${formatCurrency(ratePerTenantDB)} = ${formatCurrency(tenantDBsCost)}`],
        ["Main Boards", `${numMainBoards} x ${formatCurrency(ratePerMainBoard)} = ${formatCurrency(mainBoardsCost)}`],
        ["Additional Cabling", formatCurrency(additionalCablingCost)],
        ["Control Wiring", formatCurrency(controlWiringCost)],
      ];
      
      autoTable(doc, {
        startY: yPos,
        body: financialData,
        theme: "plain",
        styles: { fontSize: 7, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: colWidth * 0.6, fontStyle: 'bold' },
          1: { cellWidth: colWidth * 0.4, halign: "right" },
        },
        margin: { left: leftCol, right: pageWidth - leftCol - colWidth },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 3;
      
      // Total Capital Cost - Highlighted
      doc.setFillColor(41, 128, 185);
      doc.rect(leftCol, yPos, colWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL CAPITAL COST", leftCol + 2, yPos + 5.5);
      doc.text(formatCurrency(totalCapitalCost), leftCol + colWidth - 2, yPos + 5.5, { align: "right" });
      
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      
      // Capital Recovery
      const recoveryData = [
        ["Recovery Period", `${years} years @ ${(rate * 100).toFixed(0)}%`],
        ["Monthly Repayment", formatCurrency(monthlyCapitalRepayment)],
      ];
      
      autoTable(doc, {
        startY: yPos,
        body: recoveryData,
        theme: "plain",
        styles: { fontSize: 7, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: colWidth * 0.6, fontStyle: 'bold' },
          1: { cellWidth: colWidth * 0.4, halign: "right" },
        },
        margin: { left: leftCol, right: pageWidth - leftCol - colWidth },
      });
      
      // RIGHT COLUMN - Tenant Schedule (starting from top)
      let rightYPos = 42;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 248, 255);
      doc.rect(rightCol, rightYPos, pageWidth - rightCol - 15, 8, 'F');
      doc.text("TENANT SCHEDULE & COST ALLOCATION", rightCol + 2, rightYPos + 5.5);
      
      rightYPos += 10;
      
      // Tenant schedule calculations (matching on-screen)
      const calculateLoading = (tenant: any) => {
        if (!tenant.area || tenant.own_generator_provided) return 0;
        
        const kwPerSqm = {
          standard: generatorSettings?.standard_kw_per_sqm || 0.03,
          fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
          restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
          national: generatorSettings?.national_kw_per_sqm || 0.03,
        };
        
        return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
      };
      
      const totalLoading = tenants.reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
      
      // Compact tenant table - show top 10 tenants only for single page
      const displayTenants = tenants.slice(0, 10);
      
      const tenantTableData = displayTenants.map(tenant => {
        const loading = calculateLoading(tenant);
        const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
        const monthlyRental = (portionOfLoad / 100) * monthlyCapitalRepayment;
        const rentalPerSqm = tenant.area && tenant.area > 0 ? monthlyRental / tenant.area : 0;
        
        const isOwnGenerator = tenant.own_generator_provided || false;
        const zoneName = tenant.generator_zone_id ? zones.find(z => z.id === tenant.generator_zone_id)?.zone_name || "-" : "-";
        
        return {
          row: [
            tenant.shop_number,
            tenant.shop_name.substring(0, 15) + (tenant.shop_name.length > 15 ? "..." : ""),
            tenant.area?.toFixed(0) || "-",
            loading.toFixed(1),
            `${portionOfLoad.toFixed(1)}%`,
            formatCurrency(rentalPerSqm)
          ],
          hasOwnGenerator: isOwnGenerator,
          isFastFood: tenant.shop_category === "fast-food" || tenant.shop_category === "fast_food",
          isRestaurant: tenant.shop_category === "restaurant",
        };
      });
      
      const tenantRows = tenantTableData.map(t => t.row);
      
      // Add totals row
      const totals = {
        area: tenants.reduce((sum, t) => sum + (t.area || 0), 0),
        loading: totalLoading,
        monthlyRental: tenants.reduce((sum, t) => {
          const loading = calculateLoading(t);
          const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
          return sum + ((portionOfLoad / 100) * monthlyCapitalRepayment);
        }, 0),
      };
      
      const averageRentalPerSqm = totals.area > 0 ? totals.monthlyRental / totals.area : 0;
      
      tenantRows.push([
        "",
        `TOTALS (${tenants.length} tenants)`,
        totals.area.toFixed(0),
        totals.loading.toFixed(1),
        "100%",
        formatCurrency(averageRentalPerSqm)
      ]);
      
      const rightColWidth = pageWidth - rightCol - 15;
      
      autoTable(doc, {
        startY: rightYPos,
        head: [["Shop", "Tenant", "Area", "Load", "% Load", "R/m²"]],
        body: tenantRows,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 30 },
          2: { cellWidth: 12, halign: "right" },
          3: { cellWidth: 15, halign: "right" },
          4: { cellWidth: 15, halign: "right" },
          5: { cellWidth: 18, halign: "right" },
        },
        margin: { left: rightCol, right: 15 },
        willDrawCell: (data) => {
          if (data.section === 'body' && data.row.index < tenantTableData.length) {
            const tenantData = tenantTableData[data.row.index];
            
            if (tenantData.hasOwnGenerator) {
              data.cell.styles.fillColor = [255, 220, 220];
              data.cell.styles.textColor = [139, 0, 0];
            }
            else if (tenantData.isFastFood || tenantData.isRestaurant) {
              data.cell.styles.fillColor = [220, 255, 220];
              data.cell.styles.textColor = [0, 100, 0];
            }
          }
          
          if (data.section === 'body' && data.row.index === tenantTableData.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 248, 255];
          }
        },
      });
      
      // Legend at bottom
      const legendY = pageHeight - 20;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Legend:", leftCol, legendY);
      doc.setFillColor(255, 220, 220);
      doc.rect(leftCol + 15, legendY - 3, 4, 3, 'F');
      doc.text("Own Generator", leftCol + 20, legendY);
      doc.setFillColor(220, 255, 220);
      doc.rect(leftCol + 45, legendY - 3, 4, 3, 'F');
      doc.text("Fast Food/Restaurant", leftCol + 50, legendY);
      
      // Footer
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text("Watson Mattheus Consulting Electrical Engineers (PTY) LTD", pageWidth / 2, pageHeight - 8, { align: "center" });
      doc.text("Tel: (012) 665 3487 | Contact: Mr Arno Mattheus", pageWidth / 2, pageHeight - 4, { align: "center" });

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
