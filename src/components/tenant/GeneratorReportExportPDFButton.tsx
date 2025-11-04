import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { LoadDistributionChart } from "./charts/LoadDistributionChart";
import { CostBreakdownChart } from "./charts/CostBreakdownChart";
import { RecoveryProjectionChart } from "./charts/RecoveryProjectionChart";

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
      
      // Capital recovery calculation (10 years at 12%) - matching on-screen calculation
      const years = 10;
      const rate = 0.12;
      
      // Calculate annual repayment using annuity formula (same as CapitalRecoveryCalculator)
      const numerator = rate * Math.pow(1 + rate, years);
      const denominator = Math.pow(1 + rate, years) - 1;
      const annualRepayment = totalCapitalCost * (numerator / denominator);
      const monthlyCapitalRepayment = annualRepayment / 12;

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

      // Generator Equipment Costing table (without Rate column)
      const equipmentCostingData = [
        ["Item", "Description", "Quantity", "Cost (excl. VAT)"],
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
            formatCurrency(totalCost)
          ];
        }),
        [
          (zones.length + 1).toString(),
          "Number of Tenant DBs",
          numTenantDBs.toString(),
          formatCurrency(tenantDBsCost)
        ],
        [
          (zones.length + 2).toString(),
          "Number of Main Boards",
          numMainBoards.toString(),
          formatCurrency(mainBoardsCost)
        ],
        [
          (zones.length + 3).toString(),
          "Additional Cabling",
          "1",
          formatCurrency(additionalCablingCost)
        ],
        [
          (zones.length + 4).toString(),
          "Control Wiring",
          "1",
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
          1: { cellWidth: 92 },
          2: { halign: "center", cellWidth: 22 },
          3: { halign: "right", cellWidth: 38 },
        },
        margin: { left: 14, right: 14 },
      });
      
      // Add total row
      const finalY = (doc as any).lastAutoTable.finalY;
      autoTable(doc, {
        startY: finalY,
        body: [["", "TOTAL CAPITAL COST", "", formatCurrency(totalCapitalCost)]],
        theme: "grid",
        styles: { fontSize: 9, fontStyle: "bold", fillColor: [240, 240, 240] },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 92 },
          2: { halign: "center", cellWidth: 22 },
          3: { halign: "right", cellWidth: 38 },
        },
        margin: { left: 14, right: 14 },
      });


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

      // Tenant schedule with calculations (matching on-screen display 100%)
      // Calculate loading for each tenant
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
      
      // Calculate total loading
      const totalLoading = tenants.reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
      
      // Get zone loading for a specific zone
      const getZoneLoading = (zoneId: string) => {
        return tenants
          .filter(t => t.generator_zone_id === zoneId && !t.own_generator_provided)
          .reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
      };
      
      // Build table data for each tenant
      const tenantRowsData = tenants.map(tenant => {
        const loading = calculateLoading(tenant);
        const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
        const monthlyRental = (portionOfLoad / 100) * monthlyCapitalRepayment;
        const rentalPerSqm = tenant.area && tenant.area > 0 ? monthlyRental / tenant.area : 0;
        
        const isOwnGenerator = tenant.own_generator_provided || false;
        const isFastFood = tenant.shop_category === "fast-food" || tenant.shop_category === "fast_food";
        const isRestaurant = tenant.shop_category === "restaurant";
        
        // Build row: Shop No, Tenant, Size, Own Generator, Zone, [Zone columns], Portion of Load, Monthly Rental, Rental per m²
        const row = [
          tenant.shop_number,
          tenant.shop_name,
          tenant.area?.toLocaleString() || "-",
          isOwnGenerator ? "YES" : "NO",
          tenant.generator_zone_id ? zones.find(z => z.id === tenant.generator_zone_id)?.zone_name || "-" : "-",
        ];
        
        // Add zone columns
        zones.forEach(zone => {
          if (!isOwnGenerator && tenant.generator_zone_id === zone.id) {
            row.push(loading.toFixed(2));
          } else {
            row.push("-");
          }
        });
        
        // Add metrics columns
        row.push(
          isOwnGenerator ? "0.00%" : `${portionOfLoad.toFixed(2)}%`,
          isOwnGenerator ? formatCurrency(0) : formatCurrency(monthlyRental),
          isOwnGenerator ? formatCurrency(0) : formatCurrency(rentalPerSqm)
        );
        
        return {
          row,
          hasOwnGenerator: isOwnGenerator,
          isFastFood,
          isRestaurant,
        };
      });

      const tenantRows = tenantRowsData.map(t => t.row);

      // Calculate totals
      const totals = {
        area: tenants.reduce((sum, t) => sum + (t.area || 0), 0),
        loading: totalLoading,
        portionOfLoad: tenants.reduce((sum, t) => {
          const loading = calculateLoading(t);
          return sum + (totalLoading > 0 ? (loading / totalLoading) * 100 : 0);
        }, 0),
        monthlyRental: tenants.reduce((sum, t) => {
          const loading = calculateLoading(t);
          const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
          return sum + ((portionOfLoad / 100) * monthlyCapitalRepayment);
        }, 0),
      };
      
      // Add OVERALL TOTALS row
      const totalsRow = [
        "",
        "OVERALL TOTALS",
        totals.area.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        "",
        "",
      ];
      zones.forEach(zone => {
        totalsRow.push(getZoneLoading(zone.id).toFixed(2));
      });
      totalsRow.push(
        `${totals.portionOfLoad.toFixed(2)}%`,
        formatCurrency(totals.monthlyRental),
        ""
      );
      tenantRows.push(totalsRow);
      
      // Add AVERAGE row
      const averageRentalPerSqm = totals.area > 0 ? totals.monthlyRental / totals.area : 0;
      const averageRow = [
        "",
        "AVERAGE",
        ...Array(3 + zones.length).fill(""),
        "",
        "",
        formatCurrency(averageRentalPerSqm)
      ];
      tenantRows.push(averageRow);

      // Build header with zone columns
      const tableHeader = [
        "Shop No.",
        "Tenant",
        "Size (m²)",
        "Own Generator",
        "Zone",
      ];
      zones.forEach(zone => {
        tableHeader.push(`${zone.zone_name} (kW)`);
      });
      tableHeader.push(
        "Portion of Load (%)",
        "Monthly Rental (excl. VAT)",
        "Rental per m² (excl. VAT)"
      );

      // Build column styles dynamically
      const columnStyles: any = {
        0: { cellWidth: 14 },  // Shop No
        1: { cellWidth: 28 },  // Tenant
        2: { cellWidth: 14, halign: "right" },  // Size
        3: { cellWidth: 16 },  // Own Generator
        4: { cellWidth: 16 },  // Zone
      };
      
      // Zone columns
      zones.forEach((_, index) => {
        columnStyles[5 + index] = { cellWidth: 16, halign: "right" };
      });
      
      // Metrics columns
      const metricsStartCol = 5 + zones.length;
      columnStyles[metricsStartCol] = { cellWidth: 18, halign: "right" };      // Portion of Load
      columnStyles[metricsStartCol + 1] = { cellWidth: 28, halign: "right" };  // Monthly Rental
      columnStyles[metricsStartCol + 2] = { cellWidth: 28, halign: "right" };  // Rental per m²

      // Calculate table width and center it
      let tableWidth = 0;
      for (let col = 0; col < (8 + zones.length); col++) {
        tableWidth += columnStyles[col]?.cellWidth || 20;
      }
      const centerMargin = (pageWidth - tableWidth) / 2;

      autoTable(doc, {
        startY: yPos,
        head: [tableHeader],
        body: tenantRows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 6 },
        styles: { fontSize: 6 },
        columnStyles,
        margin: { left: centerMargin, right: centerMargin },
        willDrawCell: (data) => {
          // Apply color coding to tenant rows (not totals/average)
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
          
          // Bold styling for totals and average rows
          if (data.section === 'body' && data.row.index >= tenantRowsData.length) {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === tenantRowsData.length) {
              // OVERALL TOTALS row
              data.cell.styles.fillColor = [240, 240, 255];
            } else {
              // AVERAGE row
              data.cell.styles.fillColor = [245, 245, 245];
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
      doc.text("Comparative operational cost analysis", 14, yPos);
      yPos += 15;

      // Expand zones into individual generators for display
      const expandedGenerators = zones.flatMap(zone => {
        const numGenerators = zone.num_generators || 1;
        return Array.from({ length: numGenerators }, (_, index) => ({
          zoneId: zone.id,
          zoneName: zone.zone_name,
          generatorSize: zone.generator_size,
          generatorIndex: index + 1,
          totalInZone: numGenerators,
        }));
      }).slice(0, 4); // Limit to 4 generators to fit on page

      // Build table header
      const runningTableHeader = ["Parameter"];
      expandedGenerators.forEach((gen, idx) => {
        runningTableHeader.push(`Generator ${idx + 1}`);
      });

      // Build table body with color-coded sections
      const runningTableBody: any[] = [];

      // ZONE INFORMATION SECTION (Gray background)
      runningTableBody.push([
        "Zone Name",
        ...expandedGenerators.map(gen => `${gen.zoneName} (Unit ${gen.generatorIndex})`)
      ]);
      runningTableBody.push([
        "Generator Size",
        ...expandedGenerators.map(gen => gen.generatorSize)
      ]);
      runningTableBody.push([
        "Synchronized Pair",
        ...expandedGenerators.map(gen => gen.totalInZone > 1 ? `Yes (${gen.totalInZone} units)` : 'No')
      ]);

      // INPUT PARAMETERS HEADER
      runningTableBody.push([{ 
        content: "INPUT PARAMETERS", 
        colSpan: expandedGenerators.length + 1,
        styles: { halign: "center", fontStyle: "bold", fillColor: [235, 245, 255], textColor: [41, 128, 185] }
      }]);

      // For each unique zone, add input parameter rows
      const uniqueZones = Array.from(new Set(expandedGenerators.map(g => g.zoneId)));
      
      // Running Load
      const runningLoadRow = ["Running Load (%)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        runningLoadRow.push(settings ? Number(settings.running_load).toFixed(0) : "-");
      });
      runningTableBody.push(runningLoadRow);

      // Net Energy
      const netEnergyRow = ["Net Energy (kVA)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        netEnergyRow.push(settings ? Number(settings.net_energy_kva).toFixed(0) : "-");
      });
      runningTableBody.push(netEnergyRow);

      // kVA to kWh Factor
      const conversionRow = ["kVA to kWh Factor"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        conversionRow.push(settings ? Number(settings.kva_to_kwh_conversion).toFixed(2) : "-");
      });
      runningTableBody.push(conversionRow);

      // Fuel Rate
      const fuelRateRow = ["Fuel Rate (L/h per unit)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        fuelRateRow.push(settings ? Number(settings.fuel_consumption_rate).toFixed(2) : "-");
      });
      runningTableBody.push(fuelRateRow);

      // Diesel Price
      const dieselPriceRow = ["Diesel Price (R/L)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        dieselPriceRow.push(settings ? formatCurrency(Number(settings.diesel_price_per_litre)) : "-");
      });
      runningTableBody.push(dieselPriceRow);

      // Servicing Cost/Year
      const servicingYearRow = ["Servicing Cost/Year (R)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        servicingYearRow.push(settings ? formatCurrency(Number(settings.servicing_cost_per_year)) : "-");
      });
      runningTableBody.push(servicingYearRow);

      // Servicing Cost/250h
      const servicing250Row = ["Servicing Cost/250h (R)"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        servicing250Row.push(settings ? formatCurrency(Number(settings.servicing_cost_per_250_hours)) : "-");
      });
      runningTableBody.push(servicing250Row);

      // Expected Hours/Month
      const expectedHoursRow = ["Expected Hours/Month"];
      expandedGenerators.forEach(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        expectedHoursRow.push(settings ? Number(settings.expected_hours_per_month).toFixed(0) : "-");
      });
      runningTableBody.push(expectedHoursRow);

      // CALCULATED VALUES HEADER
      runningTableBody.push([{ 
        content: "CALCULATED VALUES", 
        colSpan: expandedGenerators.length + 1,
        styles: { halign: "center", fontStyle: "bold", fillColor: [235, 245, 255], textColor: [41, 128, 185] }
      }]);

      // Calculate values for each generator
      const calculatedValues = expandedGenerators.map(gen => {
        const settings = allSettings.find(s => s.generator_zone_id === gen.zoneId);
        const zone = zones.find(z => z.id === gen.zoneId);
        
        if (!settings || !zone) return null;

        const numGenerators = zone.num_generators || 1;
        const netEnergyKVA = Number(settings.net_energy_kva);
        const kvaToKwhConversion = Number(settings.kva_to_kwh_conversion);
        const netTotalEnergyKWh = netEnergyKVA * kvaToKwhConversion * (Number(settings.running_load) / 100) * numGenerators;
        const expectedHours = Number(settings.expected_hours_per_month);
        const monthlyEnergyKWh = netTotalEnergyKWh * expectedHours;
        
        const fuelRate = Number(settings.fuel_consumption_rate);
        const dieselPrice = Number(settings.diesel_price_per_litre);
        const totalDieselCostPerHour = fuelRate * dieselPrice * numGenerators;
        const monthlyDieselCost = totalDieselCostPerHour * expectedHours;
        
        const servicingPerYear = Number(settings.servicing_cost_per_year);
        const servicingPer250Hours = Number(settings.servicing_cost_per_250_hours);
        const servicingPerMonth = servicingPerYear / 12;
        const servicingByHours = (servicingPer250Hours / 250) * expectedHours;
        const additionalServicing = Math.max(0, servicingByHours - servicingPerMonth);
        
        const monthlyDieselCostPerKWh = netTotalEnergyKWh > 0 ? totalDieselCostPerHour / netTotalEnergyKWh : 0;
        const totalServicesCostPerKWh = monthlyEnergyKWh > 0 ? additionalServicing / monthlyEnergyKWh : 0;
        const totalTariffBeforeContingency = monthlyDieselCostPerKWh + totalServicesCostPerKWh;
        const maintenanceContingency = totalTariffBeforeContingency * 0.1;
        const totalTariff = totalTariffBeforeContingency + maintenanceContingency;

        return {
          totalEnergy: netTotalEnergyKWh,
          monthlyEnergy: monthlyEnergyKWh,
          dieselCostPerHour: totalDieselCostPerHour,
          monthlyDieselCost: monthlyDieselCost,
          monthlyServicingCost: additionalServicing,
          tariff: totalTariff
        };
      });

      // Total Energy (kWh)
      const totalEnergyRow = ["Total Energy (kWh)"];
      calculatedValues.forEach(val => {
        totalEnergyRow.push(val ? val.totalEnergy.toFixed(2) : "-");
      });
      runningTableBody.push(totalEnergyRow);

      // Monthly Energy (kWh)
      const monthlyEnergyRow = ["Monthly Energy (kWh)"];
      calculatedValues.forEach(val => {
        monthlyEnergyRow.push(val ? val.monthlyEnergy.toFixed(2) : "-");
      });
      runningTableBody.push(monthlyEnergyRow);

      // Diesel Cost/Hour (R)
      const dieselCostHourRow = ["Diesel Cost/Hour (R)"];
      calculatedValues.forEach(val => {
        dieselCostHourRow.push(val ? formatCurrency(val.dieselCostPerHour) : "-");
      });
      runningTableBody.push(dieselCostHourRow);

      // Monthly Diesel Cost (R)
      const monthlyDieselRow = ["Monthly Diesel Cost (R)"];
      calculatedValues.forEach(val => {
        monthlyDieselRow.push(val ? formatCurrency(val.monthlyDieselCost) : "-");
      });
      runningTableBody.push(monthlyDieselRow);

      // Monthly Servicing Cost (R)
      const monthlyServicingRow = ["Monthly Servicing Cost (R)"];
      calculatedValues.forEach(val => {
        monthlyServicingRow.push(val ? formatCurrency(val.monthlyServicingCost) : "-");
      });
      runningTableBody.push(monthlyServicingRow);

      // TARIFF PER kWh (R) - Highlighted row
      const tariffRow = ["TARIFF PER kWh (R)"];
      calculatedValues.forEach(val => {
        tariffRow.push(val ? `R ${val.tariff.toFixed(4)}` : "-");
      });
      runningTableBody.push(tariffRow);

      // Calculate dynamic column widths
      const paramColWidth = 55;
      const generatorColWidth = (pageWidth - 28 - paramColWidth) / expandedGenerators.length;
      
      const runningColumnStyles: any = {
        0: { cellWidth: paramColWidth },
      };
      
      for (let i = 0; i < expandedGenerators.length; i++) {
        runningColumnStyles[i + 1] = { cellWidth: generatorColWidth, halign: "center" };
      }

      autoTable(doc, {
        startY: yPos,
        head: [runningTableHeader],
        body: runningTableBody,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: runningColumnStyles,
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
          // Zone Information rows (gray background)
          if (data.section === 'body' && data.row.index >= 0 && data.row.index <= 2) {
            data.cell.styles.fillColor = [248, 248, 248];
            if (data.column.index === 0) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Make parameter labels bold (first column)
          if (data.section === 'body' && data.column.index === 0 && data.row.index > 3 && data.row.index !== 4 && data.row.index !== 13) {
            data.cell.styles.fontStyle = 'bold';
          }
          // Tariff row (accent background and larger font)
          if (data.section === 'body' && data.row.index === runningTableBody.length - 1) {
            data.cell.styles.fillColor = [255, 250, 240];
            data.cell.styles.textColor = [41, 128, 185];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Summary Card - Average Recovery Tariff
      const avgTariff = calculatedValues.filter(v => v !== null).reduce((sum, v) => sum + v!.tariff, 0) / calculatedValues.filter(v => v !== null).length;
      const totalSyncPairs = uniqueZones.length;

      // Create a bordered summary box
      doc.setDrawColor(41, 128, 185); // Primary blue border
      doc.setLineWidth(1);
      doc.rect(14, yPos, pageWidth - 28, 35);

      yPos += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Average Recovery Tariff", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Average tariff across ${expandedGenerators.length} generators (${totalSyncPairs} synchronized pairs)`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 8;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185); // Primary blue
      doc.text(`R ${avgTariff.toFixed(4)}`, pageWidth / 2, yPos, { align: "center" });
      
      yPos += 6;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("per kWh (including 10% contingency)", pageWidth / 2, yPos, { align: "center" });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Calculate metrics needed for charts
      const metricsForCharts = calculateMetrics();
      const monthlyRunningRecovery = metricsForCharts ? 
        (metricsForCharts.totalDieselCost + metricsForCharts.totalServicingCost) * 1.1 : 0;

      // ========== PAGE 6: CHARTS & ANALYSIS ==========
      // Create a hidden container for rendering charts
      const chartContainer = document.createElement("div");
      chartContainer.style.position = "absolute";
      chartContainer.style.left = "-9999px";
      chartContainer.style.top = "-9999px";
      chartContainer.style.width = "800px";
      chartContainer.style.backgroundColor = "white";
      chartContainer.style.padding = "20px";
      document.body.appendChild(chartContainer);

      // Calculate zone loading data for LoadDistributionChart
      const calculateTenantLoading = (tenant: any) => {
        if (!tenant.area || tenant.own_generator_provided) return 0;
        const kwPerSqm = {
          standard: generatorSettings?.standard_kw_per_sqm || 0.03,
          fast_food: generatorSettings?.fast_food_kw_per_sqm || 0.045,
          restaurant: generatorSettings?.restaurant_kw_per_sqm || 0.045,
          national: generatorSettings?.national_kw_per_sqm || 0.03,
        };
        return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
      };

      const zoneLoadingData = zones.map(zone => ({
        id: zone.id,
        zone_name: zone.zone_name,
        loading: tenants
          .filter(t => t.generator_zone_id === zone.id && !t.own_generator_provided)
          .reduce((sum, tenant) => sum + calculateTenantLoading(tenant), 0)
      }));

      // Calculate cost breakdown data
      const costBreakdownData = {
        generatorCost: totalGeneratorCost,
        tenantDBsCost: tenantDBsCost,
        mainBoardsCost: mainBoardsCost,
        additionalCablingCost: additionalCablingCost,
        controlWiringCost: controlWiringCost,
      };

      try {
        doc.addPage();
        yPos = 20;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
        yPos += 10;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("CHARTS & ANALYSIS", 14, yPos);
        yPos += 15;

        // Render Load Distribution Chart
        const loadChartDiv = document.createElement("div");
        loadChartDiv.style.width = "800px";
        loadChartDiv.style.height = "400px";
        chartContainer.appendChild(loadChartDiv);
        
        // We need to use React.createElement to render the component
        const React = await import("react");
        const { createRoot } = await import("react-dom/client");
        const root1 = createRoot(loadChartDiv);
        root1.render(
          React.createElement(LoadDistributionChart, { zones: zoneLoadingData })
        );

        // Wait for chart to render
        await new Promise(resolve => setTimeout(resolve, 1500));

        const loadCanvas = await html2canvas(loadChartDiv, { 
          backgroundColor: "#ffffff",
          scale: 2 
        });
        const loadImgData = loadCanvas.toDataURL("image/png");
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Load Distribution by Zone", 14, yPos);
        yPos += 8;
        
        const loadImgWidth = pageWidth - 28;
        const loadImgHeight = (loadCanvas.height * loadImgWidth) / loadCanvas.width;
        doc.addImage(loadImgData, "PNG", 14, yPos, loadImgWidth, Math.min(loadImgHeight, 80));
        yPos += Math.min(loadImgHeight, 80) + 15;

        // Render Cost Breakdown Chart
        root1.unmount();
        loadChartDiv.remove();
        
        const costChartDiv = document.createElement("div");
        costChartDiv.style.width = "800px";
        costChartDiv.style.height = "400px";
        chartContainer.appendChild(costChartDiv);
        
        const root2 = createRoot(costChartDiv);
        root2.render(
          React.createElement(CostBreakdownChart, { costs: costBreakdownData })
        );

        await new Promise(resolve => setTimeout(resolve, 1500));

        const costCanvas = await html2canvas(costChartDiv, { 
          backgroundColor: "#ffffff",
          scale: 2 
        });
        const costImgData = costCanvas.toDataURL("image/png");
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Capital Cost Breakdown", 14, yPos);
        yPos += 8;
        
        const costImgWidth = pageWidth - 28;
        const costImgHeight = (costCanvas.height * costImgWidth) / costCanvas.width;
        doc.addImage(costImgData, "PNG", 14, yPos, costImgWidth, Math.min(costImgHeight, 80));
        yPos += Math.min(costImgHeight, 80) + 15;

        // Check if we need a new page for the recovery chart
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = 20;
          
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text(`${project.name?.toUpperCase() || "PROJECT"} - STANDBY SYSTEM`, 14, yPos);
          yPos += 10;
          
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("CHARTS & ANALYSIS (continued)", 14, yPos);
          yPos += 15;
        }

        // Render Recovery Projection Chart
        root2.unmount();
        costChartDiv.remove();
        
        const recoveryChartDiv = document.createElement("div");
        recoveryChartDiv.style.width = "800px";
        recoveryChartDiv.style.height = "400px";
        chartContainer.appendChild(recoveryChartDiv);
        
        const root3 = createRoot(recoveryChartDiv);
        root3.render(
          React.createElement(RecoveryProjectionChart, { 
            monthlyCapitalRecovery: monthlyCapitalRepayment,
            monthlyRunningRecovery: monthlyRunningRecovery
          })
        );

        await new Promise(resolve => setTimeout(resolve, 1500));

        const recoveryCanvas = await html2canvas(recoveryChartDiv, { 
          backgroundColor: "#ffffff",
          scale: 2 
        });
        const recoveryImgData = recoveryCanvas.toDataURL("image/png");
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("10-Year Recovery Projection", 14, yPos);
        yPos += 8;
        
        const recoveryImgWidth = pageWidth - 28;
        const recoveryImgHeight = (recoveryCanvas.height * recoveryImgWidth) / recoveryCanvas.width;
        doc.addImage(recoveryImgData, "PNG", 14, yPos, recoveryImgWidth, Math.min(recoveryImgHeight, 80));

        // Cleanup
        root3.unmount();
        recoveryChartDiv.remove();
        document.body.removeChild(chartContainer);
      } catch (error) {
        console.error("Error rendering charts:", error);
        // Clean up on error
        if (document.body.contains(chartContainer)) {
          document.body.removeChild(chartContainer);
        }
      }

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
      totalDieselCost,
      totalServicingCost,
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
