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
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPos = 20;

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
      
      // Capital recovery calculation (10 years at 12%)
      const years = 10;
      const rate = 0.12;
      const monthlyCapitalRepayment = (totalCapitalCost * rate / 12) / (1 - Math.pow(1 + rate / 12, -years * 12));

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

      // Generator Equipment Costing table
      const equipmentCostingData = [
        ["Item", "Description", "Quantity", "Rate (R)", "Cost (excl. VAT)"],
        ...zones.map((zone, index) => {
          const numGens = zone.num_generators || 1;
          const costPerGen = zone.generator_cost || 0;
          const totalCost = costPerGen * numGens;
          const description = zone.num_generators > 1 
            ? `${zone.zone_name} - ${zone.generator_size} (${zone.num_generators} Synchronized)`
            : `${zone.zone_name} - ${zone.generator_size}`;
          return [
            (index + 1).toString(),
            description,
            numGens.toString(),
            formatCurrency(costPerGen),
            formatCurrency(totalCost)
          ];
        }),
        [
          (zones.length + 1).toString(),
          "Number of Tenant DBs",
          numTenantDBs.toString(),
          formatCurrency(ratePerTenantDB),
          formatCurrency(tenantDBsCost)
        ],
        [
          (zones.length + 2).toString(),
          "Number of Main Boards",
          numMainBoards.toString(),
          formatCurrency(ratePerMainBoard),
          formatCurrency(mainBoardsCost)
        ],
        [
          (zones.length + 3).toString(),
          "Additional Cabling",
          "1",
          formatCurrency(additionalCablingCost),
          formatCurrency(additionalCablingCost)
        ],
        [
          (zones.length + 4).toString(),
          "Control Wiring",
          "1",
          formatCurrency(controlWiringCost),
          formatCurrency(controlWiringCost)
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [equipmentCostingData[0]],
        body: equipmentCostingData.slice(1),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { halign: "center", cellWidth: 22 },
          3: { halign: "right", cellWidth: 30 },
          4: { halign: "right", cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
      });
      
      // Add total row
      const finalY = (doc as any).lastAutoTable.finalY;
      autoTable(doc, {
        startY: finalY,
        body: [["", "TOTAL CAPITAL COST", "", "", formatCurrency(totalCapitalCost)]],
        theme: "grid",
        styles: { fontSize: 9, fontStyle: "bold", fillColor: [240, 240, 240] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { halign: "center", cellWidth: 22 },
          3: { halign: "right", cellWidth: 30 },
          4: { halign: "right", cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Summary Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SUMMARY", 14, yPos);
      yPos += 8;

      const summaryData = [
        ["Annual Repayment", formatCurrency(monthlyCapitalRepayment * 12)],
        ["Monthly Capital Repayment", formatCurrency(monthlyCapitalRepayment)],
      ];

      autoTable(doc, {
        startY: yPos,
        body: summaryData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 80, fillColor: [240, 248, 255] },
          1: { halign: "right", fontStyle: "bold", fontSize: 11, cellWidth: 87, fillColor: [240, 248, 255] },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Calculate metrics for use in subsequent pages
      const metrics = calculateMetrics();

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

      // Tenant schedule with calculations (matching on-screen display)
      // First, calculate all tenant loads to get the total
      const tenantLoads = tenants
        .filter(t => t.generator_zone_id)
        .map(tenant => {
          const kwPerSqm = {
            standard: generatorSettings?.standard_kw_per_sqm || 0.03,
            'fast-food': generatorSettings?.fast_food_kw_per_sqm || 0.045,
            fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
            restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
            national: generatorSettings?.national_kw_per_sqm || 0.03,
          };
          const categoryKw = kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03;
          return tenant.own_generator_provided ? 0 : (tenant.area || 0) * categoryKw;
        });
      
      const totalTenantLoad = tenantLoads.reduce((sum, load) => sum + load, 0);

      const tenantRowsData = tenants
        .filter(t => t.generator_zone_id)
        .map((tenant, index) => {
          const adjustedLoad = tenantLoads[index];
          
          const isFastFood = tenant.shop_category === "fast-food" || tenant.shop_category === "fast_food";
          const isRestaurant = tenant.shop_category === "restaurant";
          
          // Calculate percentage based on total tenant load (matching on-screen display)
          const percentOfTotal = totalTenantLoad > 0 
            ? (adjustedLoad / totalTenantLoad) * 100 
            : 0;
          
          const monthlyRecovery = (percentOfTotal / 100) * monthlyCapitalRepayment;
          const costPerArea = tenant.area && tenant.area > 0 ? monthlyRecovery / tenant.area : 0;
          
          return {
            row: [
              tenant.shop_number,
              tenant.shop_name,
              tenant.area?.toFixed(0) || "0",
              adjustedLoad.toFixed(2),
              `${percentOfTotal.toFixed(2)}%`,
              formatCurrency(monthlyRecovery),
              `R ${costPerArea.toFixed(2)}`,
            ],
            hasOwnGenerator: tenant.own_generator_provided,
            isFastFood,
            isRestaurant,
          };
        });

      const tenantRows = tenantRowsData.map(t => t.row);

      // Add mall common area
      const commonAreaLoad = 15; // kW
      const commonAreaPercent = totalTenantLoad > 0 
        ? (commonAreaLoad / totalTenantLoad) * 100 
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
          "Load (kW)",
          "% Total",
          "Monthly Rental",
          "Cost/m²",
        ]],
        body: tenantRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 7 },
        styles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 32 },
          2: { cellWidth: 14, halign: "right" },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 16, halign: "right" },
          5: { cellWidth: 34, halign: "right" },
          6: { cellWidth: 18, halign: "right" },
        },
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
          // Apply color coding to tenant rows
          if (data.section === 'body' && data.row.index < tenantRowsData.length) {
            const tenantData = tenantRowsData[data.row.index];
            
            // Red background for tenants with own generator
            if (tenantData.hasOwnGenerator) {
              data.cell.styles.fillColor = [255, 200, 200]; // Light red
              data.cell.styles.textColor = [139, 0, 0]; // Dark red text
            }
            // Green background for fast food and restaurants
            else if (tenantData.isFastFood || tenantData.isRestaurant) {
              data.cell.styles.fillColor = [200, 255, 200]; // Light green
              data.cell.styles.textColor = [0, 100, 0]; // Dark green text
            }
          }
        },
      });

      // ========== PAGE 4: CAPITAL RECOVERY CALCULATOR ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CAPITAL COST RECOVERY", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Amortization schedule for capital investment recovery", 14, yPos);
      yPos += 15;

      // Input Parameters Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("INPUT PARAMETERS", 14, yPos);
      yPos += 8;

      const inputParams = [
        ["Capital Cost (R)", formatCurrency(totalCapitalCost), "From Equipment Costing"],
        ["Period (years)", years.toString(), "Amortization period"],
        ["Rate (%)", (rate * 100).toFixed(2) + "%", "Annual interest rate"],
      ];

      autoTable(doc, {
        startY: yPos,
        body: inputParams,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, fillColor: [245, 245, 245] },
          1: { halign: "right", cellWidth: 45, fontStyle: "bold" },
          2: { cellWidth: 77, fontSize: 8, textColor: [100, 100, 100] },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Summary Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("SUMMARY", 14, yPos);
      yPos += 8;

      const annualPayment = monthlyCapitalRepayment * 12;
      const summaryParams = [
        ["Annual Repayment", formatCurrency(annualPayment)],
        ["Monthly Repayment", formatCurrency(monthlyCapitalRepayment)],
      ];

      autoTable(doc, {
        startY: yPos,
        body: summaryParams,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 80, fillColor: [240, 248, 255] },
          1: { halign: "right", fontStyle: "bold", fontSize: 11, cellWidth: 87 },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Amortization Schedule Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("AMORTIZATION SCHEDULE", 14, yPos);
      yPos += 8;

      // Amortization schedule
      const amortRows = [];
      let balance = totalCapitalCost;
      
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
        head: [["YEARS", "BEGINNING", "PAYMENT", "INTEREST", "PRINCIPAL", "ENDING"]],
        body: amortRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { halign: "right", cellWidth: 28 },
          2: { halign: "right", cellWidth: 28 },
          3: { halign: "right", cellWidth: 28 },
          4: { halign: "right", cellWidth: 28 },
          5: { halign: "right", cellWidth: 32 },
        },
        margin: { left: 14, right: 14 },
      });

      // ========== PAGE 5: RUNNING RECOVERY CALCULATOR ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RUNNING RECOVERY CALCULATOR", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Operational cost analysis per generator zone", 14, yPos);
      yPos += 15;

      // For each zone, show detailed running cost breakdown
      zones.forEach((zone, index) => {
        const settings = allSettings.find(s => s.generator_zone_id === zone.id);
        if (!settings) return;

        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${zone.zone_name} - ${zone.generator_size}`, 14, yPos);
        if (zone.num_generators > 1) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`(${zone.num_generators} Synchronized Units)`, 70, yPos);
        }
        yPos += 10;

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
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", cellWidth: 50 },
          },
          margin: { left: 20, right: 14 },
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
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", cellWidth: 50 },
          },
          margin: { left: 20, right: 14 },
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
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", cellWidth: 50 },
          },
          margin: { left: 20, right: 14 },
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
            0: { fontStyle: "bold", cellWidth: 100 },
            1: { halign: "right", fontStyle: "bold", cellWidth: 50 },
          },
          margin: { left: 20, right: 14 },
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
