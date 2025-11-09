import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, CheckCircle2, RefreshCw, Map, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClimaticZoneMap } from "./ClimaticZoneMap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SANS204CalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyValues: (values: {
    project_area: number;
    va_per_sqm: number;
    total_connected_load: number;
    maximum_demand: number;
    climatic_zone: string;
  }) => void;
  initialValues?: {
    project_area?: number;
    climatic_zone?: string;
    diversity_factor?: number;
  };
}

// ADMD Diversity Table - Based on units per phase for three-phase distribution
const ADMD_DIVERSITY_TABLE = [
  { unitsPerPhase: 1, diversityFactor: 1.00 },
  { unitsPerPhase: 2, diversityFactor: 0.72 },
  { unitsPerPhase: 3, diversityFactor: 0.62 },
  { unitsPerPhase: 4, diversityFactor: 0.57 },
  { unitsPerPhase: 5, diversityFactor: 0.53 },
  { unitsPerPhase: 6, diversityFactor: 0.50 },
  { unitsPerPhase: 7, diversityFactor: 0.48 },
  { unitsPerPhase: 8, diversityFactor: 0.47 },
  { unitsPerPhase: 9, diversityFactor: 0.46 },
  { unitsPerPhase: 10, diversityFactor: 0.45 },
  { unitsPerPhase: 14, diversityFactor: 0.45 },
  { unitsPerPhase: 15, diversityFactor: 0.42 },
  { unitsPerPhase: 19, diversityFactor: 0.42 },
  { unitsPerPhase: 20, diversityFactor: 0.40 },
  { unitsPerPhase: 29, diversityFactor: 0.40 },
  { unitsPerPhase: 30, diversityFactor: 0.38 },
  { unitsPerPhase: 39, diversityFactor: 0.38 },
  { unitsPerPhase: 40, diversityFactor: 0.37 },
  { unitsPerPhase: 49, diversityFactor: 0.37 },
  { unitsPerPhase: 50, diversityFactor: 0.36 },
  { unitsPerPhase: 99, diversityFactor: 0.36 },
  { unitsPerPhase: 100, diversityFactor: 0.34 },
  { unitsPerPhase: 350, diversityFactor: 0.34 }, // Maximum in table
];

// Function to get diversity factor based on units per phase
const getADMDDiversityFactor = (unitsPerPhase: number): number => {
  if (unitsPerPhase <= 0) return 1.00;
  
  // Find the appropriate diversity factor
  for (let i = 0; i < ADMD_DIVERSITY_TABLE.length - 1; i++) {
    if (unitsPerPhase >= ADMD_DIVERSITY_TABLE[i].unitsPerPhase && 
        unitsPerPhase < ADMD_DIVERSITY_TABLE[i + 1].unitsPerPhase) {
      return ADMD_DIVERSITY_TABLE[i].diversityFactor;
    }
  }
  
  // If beyond table, use last value
  return ADMD_DIVERSITY_TABLE[ADMD_DIVERSITY_TABLE.length - 1].diversityFactor;
};

// SANS 204 Table 1 - Maximum energy demand (VA/m²)
const SANS_204_TABLE = {
  A1: { name: "Entertainment & Public Assembly", zones: [85, 80, 90, 80, 80, 85] },
  A2: { name: "Theatrical & Indoor Sport", zones: [85, 80, 90, 80, 80, 85] },
  A3: { name: "Places of Instruction", zones: [80, 75, 85, 75, 75, 80] },
  A4: { name: "Worship", zones: [80, 75, 85, 75, 75, 80] },
  F1: { name: "Large Shop (Retail)", zones: [90, 85, 95, 85, 85, 90] },
  G1: { name: "Offices", zones: [80, 75, 85, 75, 75, 80] },
  H1: { name: "Hotel", zones: [90, 85, 95, 85, 85, 90] },
};

const CLIMATIC_ZONES = [
  { value: "1", name: "Cold Interior", cities: "Johannesburg, Bloemfontein" },
  { value: "2", name: "Temperate Interior", cities: "Pretoria, Polokwane" },
  { value: "3", name: "Hot Interior", cities: "Makhado, Nelspruit" },
  { value: "4", name: "Temperate Coastal", cities: "Cape Town, Port Elizabeth" },
  { value: "5", name: "Sub-tropical Coastal", cities: "Durban, East London" },
  { value: "6", name: "Arid Interior", cities: "Kimberley, Upington" },
];

export const SANS204Calculator = ({
  open,
  onOpenChange,
  onApplyValues,
  initialValues,
}: SANS204CalculatorProps) => {
  const projectId = localStorage.getItem("selectedProjectId");
  
  const [projectArea, setProjectArea] = useState(initialValues?.project_area?.toString() || "");
  const [buildingClass, setBuildingClass] = useState<keyof typeof SANS_204_TABLE>("F1");
  const [climaticZone, setClimaticZone] = useState(initialValues?.climatic_zone || "1");
  const [diversityFactor, setDiversityFactor] = useState(
    initialValues?.diversity_factor?.toString() || "0.75"
  );
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [showPercentages, setShowPercentages] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({
    vaPerSqm: 90,
    totalConnectedLoad: 0,
    maximumDemand: 0,
  });

  // Residential calculator state - Default values from standard form
  const [numUnits, setNumUnits] = useState("6");
  const [areaPerUnit, setAreaPerUnit] = useState("28");
  const [fittingLoads, setFittingLoads] = useState({
    lamps: { qty: 5, load: 15, diversity: 0.5 },
    plugs: { qty: 1, load: 3000, diversity: 0.5 },
    geyser: { qty: 1, load: 2000, diversity: 1.0 },
    stove: { qty: 1, load: 2000, diversity: 0.5 },
    poolPump: { qty: 0, load: 1500, diversity: 1.0 },
  });
  const [generalDiversity, setGeneralDiversity] = useState("0.70");
  const [useADMD, setUseADMD] = useState(true); // Toggle between ADMD and simple diversity

  // Fetch project settings
  const { data: projectSettings } = useQuery({
    queryKey: ["project-settings", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("building_calculation_type")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && open,
  });

  const calculationType = projectSettings?.building_calculation_type || "commercial";
  const isResidential = calculationType === "residential";

  // Calculate min and max VA values for heat map
  const allVaValues = Object.values(SANS_204_TABLE).flatMap(bt => bt.zones);
  const minVa = Math.min(...allVaValues);
  const maxVa = Math.max(...allVaValues);

  // Generate heat map color based on VA value
  const getHeatMapColor = (va: number) => {
    if (!showHeatMap) return "";
    const normalized = (va - minVa) / (maxVa - minVa);
    
    // Color scale: green (low) -> yellow (mid) -> red (high)
    if (normalized < 0.33) {
      return "bg-green-100 dark:bg-green-950/30";
    } else if (normalized < 0.67) {
      return "bg-yellow-100 dark:bg-yellow-950/30";
    } else {
      return "bg-red-100 dark:bg-red-950/30";
    }
  };

  // Calculate percentage difference from minimum value for each building type
  const getPercentageDiff = (buildingType: keyof typeof SANS_204_TABLE, zoneIdx: number) => {
    const zones = SANS_204_TABLE[buildingType].zones;
    const minValue = Math.min(...zones);
    const currentValue = zones[zoneIdx];
    const diff = ((currentValue - minValue) / minValue) * 100;
    return diff;
  };

  // Calculate statistics
  const calculateStatistics = () => {
    // Overall statistics
    const avgVa = allVaValues.reduce((sum, val) => sum + val, 0) / allVaValues.length;
    
    // Per-zone statistics
    const zoneStats = Array.from({ length: 6 }, (_, zoneIdx) => {
      const zoneValues = Object.values(SANS_204_TABLE).map(bt => bt.zones[zoneIdx]);
      const avg = zoneValues.reduce((sum, val) => sum + val, 0) / zoneValues.length;
      const min = Math.min(...zoneValues);
      const max = Math.max(...zoneValues);
      return { avg, min, max };
    });

    return {
      overall: {
        avg: Math.round(avgVa * 10) / 10,
        min: minVa,
        max: maxVa,
      },
      zones: zoneStats,
    };
  };

  const stats = calculateStatistics();

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SANS 204 Load Calculator Analysis", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Subtitle
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Maximum Energy Demand Based on SANS 204 Standards", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Project Information Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Project Information", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Project Area: ${parseFloat(projectArea).toLocaleString()} m²`, 14, yPos);
    yPos += 6;
    doc.text(`Building Classification: ${buildingClass} - ${SANS_204_TABLE[buildingClass].name}`, 14, yPos);
    yPos += 6;
    doc.text(`Climatic Zone: Zone ${climaticZone} (${CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.name})`, 14, yPos);
    yPos += 6;
    doc.text(`Diversity Factor: ${diversityFactor}`, 14, yPos);
    yPos += 12;

    // Calculated Results Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Calculated Results", 14, yPos);
    yPos += 8;

    const resultsData = [
      ["Applied Load (SANS 204)", `${calculatedValues.vaPerSqm} VA/m²`],
      ["Project Area", `${parseFloat(projectArea).toLocaleString()} m²`],
      ["Total Connected Load", `${calculatedValues.totalConnectedLoad.toLocaleString()} kVA`],
      ["Maximum Demand (After Diversity)", `${calculatedValues.maximumDemand.toLocaleString()} kVA`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["Parameter", "Value"]],
      body: resultsData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary Statistics (VA/m²)", 14, yPos);
    yPos += 8;

    const statsData = [
      ["Overall Average", `${stats.overall.avg} VA/m²`],
      ["Overall Minimum", `${stats.overall.min} VA/m²`],
      ["Overall Maximum", `${stats.overall.max} VA/m²`],
      ["Range", `${stats.overall.max - stats.overall.min} VA/m² (${Math.round(((stats.overall.max - stats.overall.min) / stats.overall.min) * 100)}% variation)`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["Statistic", "Value"]],
      body: statsData,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Zone Comparison Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SANS 204 Table 1 - Zone Comparison", 14, yPos);
    yPos += 8;

    const comparisonTableHeaders = [
      "Class",
      "Building Type",
      "Zone 1",
      "Zone 2",
      "Zone 3",
      "Zone 4",
      "Zone 5",
      "Zone 6",
    ];

    const comparisonTableBody = Object.entries(SANS_204_TABLE).map(([key, value]) => {
      return [
        key,
        value.name,
        `${value.zones[0]} VA/m²`,
        `${value.zones[1]} VA/m²`,
        `${value.zones[2]} VA/m²`,
        `${value.zones[3]} VA/m²`,
        `${value.zones[4]} VA/m²`,
        `${value.zones[5]} VA/m²`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [comparisonTableHeaders],
      body: comparisonTableBody,
      theme: "grid",
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontStyle: "bold", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 18, halign: "center" },
        7: { cellWidth: 18, halign: "center" },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Highlight selected building and zone
        const rowIndex = data.row.index;
        const colIndex = data.column.index;
        const buildingKeys = Object.keys(SANS_204_TABLE);
        
        if (rowIndex < buildingKeys.length) {
          const currentBuildingKey = buildingKeys[rowIndex];
          const selectedZoneCol = parseInt(climaticZone) + 1; // +1 because columns 0,1 are class and name
          
          if (currentBuildingKey === buildingClass && colIndex === selectedZoneCol) {
            data.cell.styles.fillColor = [59, 130, 246];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Per-Zone Statistics
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Per-Zone Statistics", 14, yPos);
    yPos += 8;

    const zoneStatsBody = CLIMATIC_ZONES.map((zone, idx) => {
      const zoneData = stats.zones[idx];
      return [
        `Zone ${zone.value}`,
        zone.name,
        `${Math.round(zoneData.avg * 10) / 10} VA/m²`,
        `${zoneData.min} VA/m²`,
        `${zoneData.max} VA/m²`,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Zone", "Climate Type", "Average", "Minimum", "Maximum"]],
      body: zoneStatsBody,
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Calculation Breakdown
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Calculation Breakdown", 14, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`1. SANS 204 Applied Load: ${calculatedValues.vaPerSqm} VA/m² (${buildingClass} - Zone ${climaticZone})`, 14, yPos);
    yPos += 6;
    doc.text(`2. Total Connected Load: ${projectArea} m² × ${calculatedValues.vaPerSqm} VA/m² = ${(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA`, 14, yPos);
    yPos += 6;
    doc.text(`3. Convert to kVA: ${(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA ÷ 1000 = ${calculatedValues.totalConnectedLoad} kVA`, 14, yPos);
    yPos += 6;
    doc.text(`4. Apply Diversity Factor: ${calculatedValues.totalConnectedLoad} kVA × ${diversityFactor} = ${calculatedValues.maximumDemand} kVA`, 14, yPos);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save(`SANS204_Analysis_${buildingClass}_Zone${climaticZone}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF report exported successfully");
  };

  // Fetch total area from tenant tracker
  const { data: tenantData, refetch: refetchTenants } = useQuery({
    queryKey: ["tenant-total-area", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("area")
        .eq("project_id", projectId);

      if (error) throw error;

      const totalArea = data?.reduce((sum, tenant) => sum + (tenant.area || 0), 0) || 0;
      return {
        totalArea: Math.round(totalArea * 100) / 100,
        tenantCount: data?.length || 0,
      };
    },
    enabled: !!projectId && open,
  });

  const loadTenantArea = () => {
    if (tenantData?.totalArea) {
      setProjectArea(tenantData.totalArea.toString());
      toast.success(`Loaded ${tenantData.totalArea} m² from ${tenantData.tenantCount} tenants`);
    } else {
      toast.error("No tenant area data found");
    }
  };

  useEffect(() => {
    if (isResidential) {
      calculateResidentialLoads();
    } else {
      calculateLoads();
    }
  }, [projectArea, buildingClass, climaticZone, diversityFactor, numUnits, areaPerUnit, fittingLoads, generalDiversity, isResidential]);

  const calculateLoads = () => {
    const area = parseFloat(projectArea) || 0;
    const diversity = parseFloat(diversityFactor) || 0.75;
    const zoneIndex = parseInt(climaticZone) - 1;

    // Get VA/m² from SANS 204 table
    const vaPerSqm = SANS_204_TABLE[buildingClass].zones[zoneIndex] || 90;

    // Calculate total connected load (VA to kVA conversion)
    const totalConnectedLoad = (area * vaPerSqm) / 1000;

    // Calculate maximum demand with diversity factor
    const maximumDemand = totalConnectedLoad * diversity;

    setCalculatedValues({
      vaPerSqm,
      totalConnectedLoad: Math.round(totalConnectedLoad * 100) / 100,
      maximumDemand: Math.round(maximumDemand * 100) / 100,
    });
  };

  const calculateResidentialLoads = () => {
    const units = parseFloat(numUnits) || 1;
    const unitArea = parseFloat(areaPerUnit) || 0;
    const genDiv = parseFloat(generalDiversity) || 0.70;

    // Calculate per-unit load using fitting-based method
    const lampsLoad = fittingLoads.lamps.qty * fittingLoads.lamps.load * fittingLoads.lamps.diversity;
    const plugsLoad = fittingLoads.plugs.qty * fittingLoads.plugs.load * fittingLoads.plugs.diversity;
    const geyserLoad = fittingLoads.geyser.qty * fittingLoads.geyser.load * fittingLoads.geyser.diversity;
    const stoveLoad = fittingLoads.stove.qty * fittingLoads.stove.load * fittingLoads.stove.diversity;
    const poolPumpLoad = fittingLoads.poolPump.qty * fittingLoads.poolPump.load * fittingLoads.poolPump.diversity;

    const totalPerUnitWatts = lampsLoad + plugsLoad + geyserLoad + stoveLoad + poolPumpLoad;
    const totalPerUnitKva = totalPerUnitWatts / 1000 / 0.95; // Convert to kVA with PF=0.95

    // Calculate total connected load
    const totalConnectedLoad = totalPerUnitKva * units;

    // Calculate maximum demand using ADMD table or simple diversity
    let maximumDemand: number;
    let appliedDiversityFactor: number;
    
    if (useADMD) {
      // ADMD Method: Calculate units per phase (assuming balanced 3-phase distribution)
      const unitsPerPhase = Math.ceil(units / 3);
      appliedDiversityFactor = getADMDDiversityFactor(unitsPerPhase);
      
      // Calculate ADMD per phase, then multiply by 3 for total
      const admdPerPhase = totalPerUnitKva * unitsPerPhase * appliedDiversityFactor;
      maximumDemand = admdPerPhase * 3;
    } else {
      // Simple diversity method
      appliedDiversityFactor = genDiv;
      maximumDemand = totalConnectedLoad * genDiv;
    }

    // Calculate average VA/m² for display consistency
    const totalArea = unitArea * units;
    const vaPerSqm = totalArea > 0 ? (totalConnectedLoad * 1000) / totalArea : 0;

    setCalculatedValues({
      vaPerSqm: Math.round(vaPerSqm * 10) / 10,
      totalConnectedLoad: Math.round(totalConnectedLoad * 100) / 100,
      maximumDemand: Math.round(maximumDemand * 100) / 100,
    });

    // Store the applied diversity factor for display
    setGeneralDiversity(appliedDiversityFactor.toFixed(2));

    // Update project area to match calculation
    setProjectArea((totalArea).toString());
  };

  // Calculate SANS 10142 socket load for comparison
  const calculateSANS10142SocketLoad = () => {
    const units = parseFloat(numUnits) || 1;
    const unitArea = parseFloat(areaPerUnit) || 0;
    const genDiv = parseFloat(generalDiversity) || 0.70;

    // SANS 10142 socket load calculation: varies by area
    let socketLoadPerUnit = 0;
    if (unitArea <= 30) {
      socketLoadPerUnit = 3; // 3kW for units ≤30m²
    } else if (unitArea <= 60) {
      socketLoadPerUnit = 5; // 5kW for units 31-60m²
    } else if (unitArea <= 100) {
      socketLoadPerUnit = 7; // 7kW for units 61-100m²
    } else {
      socketLoadPerUnit = 7 + Math.ceil((unitArea - 100) / 50) * 2; // +2kW per 50m² above 100m²
    }

    const totalSocketLoad = socketLoadPerUnit * units;
    const socketLoadAfterDiversity = totalSocketLoad * genDiv;

    return {
      perUnit: socketLoadPerUnit,
      total: totalSocketLoad,
      afterDiversity: Math.round(socketLoadAfterDiversity * 100) / 100,
    };
  };

  const handleApply = () => {
    onApplyValues({
      project_area: parseFloat(projectArea),
      va_per_sqm: calculatedValues.vaPerSqm,
      total_connected_load: calculatedValues.totalConnectedLoad,
      maximum_demand: calculatedValues.maximumDemand,
      climatic_zone: `${climaticZone} (${CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.name})`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {isResidential ? "SANS 10142 Residential Load Calculator" : "SANS 204 Load Calculator"}
              </DialogTitle>
              <DialogDescription>
                {isResidential 
                  ? "Calculate residential electrical demand using SANS 10142 fitting-based methodology"
                  : "Calculate maximum electrical demand based on SANS 204 energy efficiency standards"}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={!projectArea || parseFloat(projectArea) <= 0}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isResidential ? (
            // Residential Calculator Interface
            <>
              {/* Residential Input Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Residential Unit Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Units</Label>
                      <Input
                        type="number"
                        min="1"
                        value={numUnits}
                        onChange={(e) => setNumUnits(e.target.value)}
                        placeholder="6"
                      />
                      {useADMD && (
                        <p className="text-xs text-muted-foreground">
                          {Math.ceil(parseFloat(numUnits || "0") / 3)} units per phase (3Ø balanced)
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Area per Unit (m²)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={areaPerUnit}
                        onChange={(e) => setAreaPerUnit(e.target.value)}
                        placeholder="52"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Diversity Method</Label>
                      <Select
                        value={useADMD ? "admd" : "simple"}
                        onValueChange={(value) => setUseADMD(value === "admd")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admd">ADMD Table (Recommended)</SelectItem>
                          <SelectItem value="simple">Simple Diversity</SelectItem>
                        </SelectContent>
                      </Select>
                      {!useADMD && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={generalDiversity}
                          onChange={(e) => setGeneralDiversity(e.target.value)}
                          placeholder="0.70"
                          className="mt-2"
                        />
                      )}
                      {useADMD && (
                        <p className="text-xs text-muted-foreground">
                          Applied: {generalDiversity} (from ADMD table)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fitting Loads Table */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">Fitting Loads per Unit</h4>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Fitting Type</th>
                            <th className="p-2 text-center">Quantity</th>
                            <th className="p-2 text-center">Load (W)</th>
                            <th className="p-2 text-center">Diversity</th>
                            <th className="p-2 text-center">Total (W)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Normal Lamps</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.lamps.qty}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  lamps: { ...prev.lamps, qty: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.lamps.load}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  lamps: { ...prev.lamps, load: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-24 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={fittingLoads.lamps.diversity}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  lamps: { ...prev.lamps, diversity: parseFloat(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2 text-center font-medium">
                              {(fittingLoads.lamps.qty * fittingLoads.lamps.load * fittingLoads.lamps.diversity).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Plugs</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.plugs.qty}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  plugs: { ...prev.plugs, qty: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.plugs.load}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  plugs: { ...prev.plugs, load: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-24 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={fittingLoads.plugs.diversity}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  plugs: { ...prev.plugs, diversity: parseFloat(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2 text-center font-medium">
                              {(fittingLoads.plugs.qty * fittingLoads.plugs.load * fittingLoads.plugs.diversity).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Geyser</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.geyser.qty}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  geyser: { ...prev.geyser, qty: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.geyser.load}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  geyser: { ...prev.geyser, load: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-24 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={fittingLoads.geyser.diversity}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  geyser: { ...prev.geyser, diversity: parseFloat(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2 text-center font-medium">
                              {(fittingLoads.geyser.qty * fittingLoads.geyser.load * fittingLoads.geyser.diversity).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Stove</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.stove.qty}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  stove: { ...prev.stove, qty: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.stove.load}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  stove: { ...prev.stove, load: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-24 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={fittingLoads.stove.diversity}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  stove: { ...prev.stove, diversity: parseFloat(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2 text-center font-medium">
                              {(fittingLoads.stove.qty * fittingLoads.stove.load * fittingLoads.stove.diversity).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Pool Pump</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.poolPump.qty}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  poolPump: { ...prev.poolPump, qty: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                value={fittingLoads.poolPump.load}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  poolPump: { ...prev.poolPump, load: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-24 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={fittingLoads.poolPump.diversity}
                                onChange={(e) => setFittingLoads(prev => ({
                                  ...prev,
                                  poolPump: { ...prev.poolPump, diversity: parseFloat(e.target.value) || 0 }
                                }))}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2 text-center font-medium">
                              {(fittingLoads.poolPump.qty * fittingLoads.poolPump.load * fittingLoads.poolPump.diversity).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SANS 10142 Socket Load Comparison */}
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    SANS 10142 Socket Load Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Comparison with SANS 10142 socket load method (for reference only)
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-muted-foreground mb-1">Socket Load per Unit</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {calculateSANS10142SocketLoad().perUnit} kW
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on {areaPerUnit || 0} m² unit
                        </p>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-muted-foreground mb-1">Total Socket Load</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {calculateSANS10142SocketLoad().total} kW
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {numUnits} units × {calculateSANS10142SocketLoad().perUnit}kW
                        </p>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-muted-foreground mb-1">After Diversity ({generalDiversity})</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {calculateSANS10142SocketLoad().afterDiversity} kW
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Socket load method
                        </p>
                      </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="rounded-md border mt-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Method</th>
                            <th className="p-2 text-center">Total Load</th>
                            <th className="p-2 text-center">After Diversity</th>
                            <th className="p-2 text-center">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t bg-primary/5">
                            <td className="p-2 font-medium">Fitting-Based (Used)</td>
                            <td className="p-2 text-center">{calculatedValues.totalConnectedLoad} kVA</td>
                            <td className="p-2 text-center font-bold text-primary">
                              {calculatedValues.maximumDemand} kVA
                            </td>
                            <td className="p-2 text-center">-</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2 font-medium">SANS 10142 Socket Load (Reference)</td>
                            <td className="p-2 text-center">{calculateSANS10142SocketLoad().total} kW</td>
                            <td className="p-2 text-center font-bold text-blue-600 dark:text-blue-400">
                              {calculateSANS10142SocketLoad().afterDiversity} kW
                            </td>
                            <td className="p-2 text-center">
                              {calculatedValues.maximumDemand > 0 ? (
                                <span className={
                                  calculatedValues.maximumDemand > calculateSANS10142SocketLoad().afterDiversity
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-green-600 dark:text-green-400"
                                }>
                                  {calculatedValues.maximumDemand > calculateSANS10142SocketLoad().afterDiversity ? "+" : ""}
                                  {Math.round((calculatedValues.maximumDemand - calculateSANS10142SocketLoad().afterDiversity) * 100) / 100} kW
                                </span>
                              ) : "-"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg text-xs">
                      <p className="font-semibold mb-1">SANS 10142 Socket Load Calculation:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Units ≤30m²: 3kW socket load</li>
                        <li>• Units 31-60m²: 5kW socket load</li>
                        <li>• Units 61-100m²: 7kW socket load</li>
                        <li>• Units &gt;100m²: 7kW + 2kW per additional 50m²</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Commercial Calculator Interface (existing SANS 204)
            <>
              {/* Input Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Project Area (m²)</Label>
                    {tenantData && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={loadTenantArea}
                        className="h-6 text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Load from Tenants
                      </Button>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={projectArea}
                    onChange={(e) => setProjectArea(e.target.value)}
                    placeholder="23814"
                  />
                  {tenantData && (
                    <p className="text-xs text-muted-foreground">
                      Tenant tracker total: {tenantData.totalArea.toLocaleString()} m² ({tenantData.tenantCount} tenants)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Building Classification (SANS 204)</Label>
                  <Select value={buildingClass} onValueChange={(value) => setBuildingClass(value as keyof typeof SANS_204_TABLE)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SANS_204_TABLE).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {key} - {value.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Climatic Zone</Label>
                  <Tabs defaultValue="dropdown" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="dropdown">Dropdown</TabsTrigger>
                      <TabsTrigger value="map">
                        <Map className="h-4 w-4 mr-2" />
                        Map
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dropdown" className="mt-2">
                      <Select value={climaticZone} onValueChange={setClimaticZone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIMATIC_ZONES.map((zone) => (
                            <SelectItem key={zone.value} value={zone.value}>
                              Zone {zone.value} - {zone.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {CLIMATIC_ZONES.find((z) => z.value === climaticZone)?.cities}
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="map" className="mt-2">
                      <ClimaticZoneMap
                        selectedZone={climaticZone}
                        onZoneSelect={setClimaticZone}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Diversity Factor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={diversityFactor}
                    onChange={(e) => setDiversityFactor(e.target.value)}
                    placeholder="0.75"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical: 0.65-0.85 for commercial
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SANS 204 Complete Comparison Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">SANS 204 Table 1 - Complete Zone Comparison (VA/m²)</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="percentage-toggle" className="text-xs cursor-pointer">% Difference</Label>
                  <input
                    id="percentage-toggle"
                    type="checkbox"
                    checked={showPercentages}
                    onChange={(e) => setShowPercentages(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="heatmap-toggle" className="text-xs cursor-pointer">Heat Map</Label>
                  <input
                    id="heatmap-toggle"
                    type="checkbox"
                    checked={showHeatMap}
                    onChange={(e) => setShowHeatMap(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto select-text">
                <table className="w-full text-sm select-text">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left sticky left-0 bg-muted z-10">Class</th>
                      <th className="p-2 text-left min-w-[200px]">Building Type</th>
                      <th className="p-2 text-center">Zone 1<br/><span className="text-xs font-normal">Cold Interior</span></th>
                      <th className="p-2 text-center">Zone 2<br/><span className="text-xs font-normal">Temp Interior</span></th>
                      <th className="p-2 text-center">Zone 3<br/><span className="text-xs font-normal">Hot Interior</span></th>
                      <th className="p-2 text-center">Zone 4<br/><span className="text-xs font-normal">Temp Coastal</span></th>
                      <th className="p-2 text-center">Zone 5<br/><span className="text-xs font-normal">Sub-tropical</span></th>
                      <th className="p-2 text-center">Zone 6<br/><span className="text-xs font-normal">Arid Interior</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SANS_204_TABLE).map(([key, value]) => (
                      <tr 
                        key={key}
                        className="hover:bg-muted/50"
                      >
                        <td className="p-2 font-medium sticky left-0 bg-background border-r z-10">
                          {key}
                        </td>
                        <td className="p-2">{value.name}</td>
                        {value.zones.map((va, zoneIdx) => {
                          const isSelected = parseInt(climaticZone) === zoneIdx + 1 && buildingClass === key;
                          const heatMapClass = isSelected ? "" : getHeatMapColor(va);
                          const percentDiff = getPercentageDiff(key as keyof typeof SANS_204_TABLE, zoneIdx);
                          const isMinValue = percentDiff === 0;
                          
                          return (
                            <td 
                              key={zoneIdx}
                              className={`p-2 text-center font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-inset"
                                  : heatMapClass
                              }`}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{va}</span>
                                {showPercentages && (
                                  <span className={`text-[10px] ${
                                    isSelected 
                                      ? "text-primary-foreground/80" 
                                      : isMinValue 
                                        ? "text-green-600 dark:text-green-400 font-semibold" 
                                        : "text-muted-foreground"
                                  }`}>
                                    {isMinValue ? "BASE" : `+${percentDiff.toFixed(1)}%`}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legends */}
              <div className="mt-4 space-y-2">
                {showHeatMap && (
                  <div className="flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/30 border"></div>
                      <span className="text-muted-foreground">Low ({minVa}-{minVa + Math.floor((maxVa - minVa) / 3)} VA/m²)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-950/30 border"></div>
                      <span className="text-muted-foreground">Medium ({minVa + Math.floor((maxVa - minVa) / 3) + 1}-{minVa + Math.floor((maxVa - minVa) * 2 / 3)} VA/m²)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/30 border"></div>
                      <span className="text-muted-foreground">High ({minVa + Math.floor((maxVa - minVa) * 2 / 3) + 1}-{maxVa} VA/m²)</span>
                    </div>
                  </div>
                )}
                
                {showPercentages && (
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    <p>
                      <span className="text-green-600 dark:text-green-400 font-semibold">BASE</span> = Lowest VA/m² for each building type | 
                      <span className="ml-2">Percentages show increase from base value</span>
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground">
                <p>Your selection: <span className="font-medium">{buildingClass} - {SANS_204_TABLE[buildingClass].name}</span> in <span className="font-medium">Zone {climaticZone}</span> = <span className="font-medium text-primary">{calculatedValues.vaPerSqm} VA/m²</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics Panel */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                SANS 204 Summary Statistics (VA/m²)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Statistics */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Overall Statistics (All Zones & Building Types)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                      <p className="text-xs text-muted-foreground mb-1">Average</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.overall.avg}</p>
                      <p className="text-xs text-muted-foreground mt-1">VA/m²</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="text-xs text-muted-foreground mb-1">Minimum</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.overall.min}</p>
                      <p className="text-xs text-muted-foreground mt-1">VA/m²</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                      <p className="text-xs text-muted-foreground mb-1">Maximum</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overall.max}</p>
                      <p className="text-xs text-muted-foreground mt-1">VA/m²</p>
                    </div>
                  </div>
                </div>

                {/* Per-Zone Statistics */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Statistics by Climatic Zone</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CLIMATIC_ZONES.map((zone, idx) => {
                      const zoneData = stats.zones[idx];
                      const isSelected = climaticZone === zone.value;
                      
                      return (
                        <div 
                          key={zone.value}
                          className={`p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? "bg-primary/10 border-primary ring-2 ring-primary/20" 
                              : "bg-muted/50 border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Zone {zone.value}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg:</span>
                              <span className="font-medium">{Math.round(zoneData.avg * 10) / 10}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Min:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">{zoneData.min}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Max:</span>
                              <span className="font-medium text-red-600 dark:text-red-400">{zoneData.max}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Insights */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="text-sm font-semibold mb-2">Key Insights</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• The range across all zones and building types is {stats.overall.max - stats.overall.min} VA/m² ({Math.round(((stats.overall.max - stats.overall.min) / stats.overall.min) * 100)}% variation)</li>
                    <li>• Zone {climaticZone} average: {Math.round(stats.zones[parseInt(climaticZone) - 1].avg * 10) / 10} VA/m² 
                      ({stats.zones[parseInt(climaticZone) - 1].avg > stats.overall.avg ? "above" : "below"} overall average)
                    </li>
                    <li>• Your selected configuration ({buildingClass}) requires {calculatedValues.vaPerSqm} VA/m² in Zone {climaticZone}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          )}

          {/* Calculated Results - Shows for both modes */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Calculated Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {isResidential ? "Average Load per m²" : "Applied Load (SANS 204)"}
                    </p>
                    <p className="text-2xl font-bold">{calculatedValues.vaPerSqm} VA/m²</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {isResidential ? "Total Area (All Units)" : "Project Area"}
                    </p>
                    <p className="text-2xl font-bold">
                      {parseFloat(projectArea).toLocaleString()} m²
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Connected Load</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatedValues.totalConnectedLoad.toLocaleString()} kVA
                    </p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Maximum Demand (After Diversity)
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {calculatedValues.maximumDemand.toLocaleString()} kVA
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {useADMD 
                        ? `ADMD: ${generalDiversity} (${Math.ceil(parseFloat(numUnits || "0") / 3)} units/phase)`
                        : `Simple diversity: ${generalDiversity}`}
                    </p>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold">Calculation Breakdown:</p>
                  {isResidential ? (
                    <>
                      <p>
                        1. Number of Units: <span className="font-medium">{numUnits} units × {areaPerUnit} m² = {projectArea} m² total</span>
                      </p>
                      <p>
                        2. Per-Unit Load: <span className="font-medium">
                          Lamps ({fittingLoads.lamps.qty * fittingLoads.lamps.load * fittingLoads.lamps.diversity}W) + 
                          Plugs ({fittingLoads.plugs.qty * fittingLoads.plugs.load * fittingLoads.plugs.diversity}W) + 
                          Geyser ({fittingLoads.geyser.qty * fittingLoads.geyser.load * fittingLoads.geyser.diversity}W) + 
                          Stove ({fittingLoads.stove.qty * fittingLoads.stove.load * fittingLoads.stove.diversity}W) + 
                          Pool ({fittingLoads.poolPump.qty * fittingLoads.poolPump.load * fittingLoads.poolPump.diversity}W)
                        </span>
                      </p>
                      <p>
                        3. Total Connected Load: <span className="font-medium">Per-unit load × {numUnits} units ÷ 1000 ÷ 0.95 PF = {calculatedValues.totalConnectedLoad} kVA</span>
                      </p>
                      <p>
                        4. Apply Diversity Factor: <span className="font-medium">
                          {useADMD 
                            ? `ADMD method: ${Math.ceil(parseFloat(numUnits || "0") / 3)} units/phase × ${generalDiversity} factor = ${calculatedValues.maximumDemand} kVA total (3Ø)`
                            : `${calculatedValues.totalConnectedLoad} kVA × ${generalDiversity} = ${calculatedValues.maximumDemand} kVA`}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1. SANS 204 Applied Load: <span className="font-medium">{calculatedValues.vaPerSqm} VA/m²</span> ({buildingClass} - Zone {climaticZone})
                      </p>
                      <p>
                        2. Total Connected Load: <span className="font-medium">{projectArea} m² × {calculatedValues.vaPerSqm} VA/m² = {(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA</span>
                      </p>
                      <p>
                        3. Convert to kVA: <span className="font-medium">{(parseFloat(projectArea) * calculatedValues.vaPerSqm).toLocaleString()} VA ÷ 1000 = {calculatedValues.totalConnectedLoad} kVA</span>
                      </p>
                      <p>
                        4. Apply Diversity Factor: <span className="font-medium">{calculatedValues.totalConnectedLoad} kVA × {diversityFactor} = {calculatedValues.maximumDemand} kVA</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!projectArea || parseFloat(projectArea) <= 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply to Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
