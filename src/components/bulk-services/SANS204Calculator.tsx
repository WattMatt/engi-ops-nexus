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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

interface SANS204CalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyValues: (values: {
    project_area: number;
    va_per_sqm: number;
    total_connected_load: number;
    maximum_demand: number;
    connection_size: string;
    climatic_zone: string;
  }) => void;
  initialValues?: {
    project_area?: number;
    climatic_zone?: string;
    diversity_factor?: number;
  };
  documentId?: string; // Optional document ID to fetch calculation type
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

// Cable sizing table based on current capacity (SANS 10142-1)
// Assuming: Copper conductors, 75°C thermoplastic insulation, ambient temp 30°C, underground/conduit
const getCableSize = (current: number): string => {
  if (current <= 20) return "2.5 mm²";
  if (current <= 26) return "4 mm²";
  if (current <= 34) return "6 mm²";
  if (current <= 46) return "10 mm²";
  if (current <= 63) return "16 mm²";
  if (current <= 85) return "25 mm²";
  if (current <= 112) return "35 mm²";
  if (current <= 138) return "50 mm²";
  if (current <= 168) return "70 mm²";
  if (current <= 207) return "95 mm²";
  if (current <= 239) return "120 mm²";
  if (current <= 275) return "150 mm²";
  if (current <= 312) return "185 mm²";
  if (current <= 358) return "240 mm²";
  if (current <= 412) return "300 mm²";
  return ">300 mm² (consult engineer)";
};

// Circuit breaker sizing based on IEC 60898/61009 standards
// Returns recommended breaker rating considering 1.25x factor for continuous loads
const getCircuitBreakerSize = (current: number): { rating: number; type: string; tripCurve: string } => {
  // Calculate required breaker size (125% of design current for continuous loads)
  const requiredRating = current * 1.25;
  
  // Standard MCB ratings (IEC 60898)
  const standardRatings = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630, 800, 1000, 1250, 1600];
  
  // Find next standard rating above required
  const rating = standardRatings.find(r => r >= requiredRating) || standardRatings[standardRatings.length - 1];
  
  // Determine breaker type and trip curve based on rating
  let type = "MCB";
  let tripCurve = "C";
  
  if (rating <= 125) {
    type = "MCB";
    tripCurve = "C"; // C-curve for general distribution (5-10× In)
  } else if (rating <= 630) {
    type = "MCCB";
    tripCurve = "Thermal-Magnetic"; // MCCB with adjustable trip
  } else {
    type = "ACB";
    tripCurve = "Electronic"; // Air circuit breaker with electronic protection
  }
  
  return { rating, type, tripCurve };
};

// Calculate discrimination ratio for upstream/downstream protection
const calculateDiscrimination = (downstreamRating: number, upstreamRating: number): {
  ratio: number;
  isAdequate: boolean;
  recommendation: string;
} => {
  const ratio = upstreamRating / downstreamRating;
  
  // IEC 60947-2 recommendation: upstream should be at least 1.6× downstream for full discrimination
  const isAdequate = ratio >= 1.6;
  
  let recommendation = "";
  if (ratio >= 2.5) {
    recommendation = "Excellent discrimination - Full selectivity ensured";
  } else if (ratio >= 1.6) {
    recommendation = "Good discrimination - Adequate selectivity";
  } else if (ratio >= 1.3) {
    recommendation = "Partial discrimination - Consider coordination study";
  } else {
    recommendation = "Poor discrimination - Upstream may trip first. Increase ratio.";
  }
  
  return { ratio, isAdequate, recommendation };
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

// SANS 10142-1 Table 11 - Socket outlet loads (VA/m²) by building type
const SANS_10142_SOCKET_LOADS = {
  residential: {
    name: "Residential (Dwellings, Flats, Hotels)",
    loads: {
      "0-20": 70,
      "20-40": 55,
      "40-60": 45,
      "60-80": 40,
      "80-120": 35,
      "120-200": 30,
      ">200": 25,
    },
    description: "Socket outlet load per m² floor area"
  },
  office: {
    name: "Offices & Banks",
    loads: {
      "0-100": 45,
      "100-300": 40,
      "300-500": 35,
      "500-1000": 30,
      ">1000": 25,
    },
    description: "General office spaces with typical equipment"
  },
  retail: {
    name: "Shops & Showrooms",
    loads: {
      "0-100": 35,
      "100-400": 30,
      "400-1000": 25,
      ">1000": 20,
    },
    description: "Retail spaces excluding heavy equipment"
  },
  industrial: {
    name: "Industrial & Workshop",
    loads: {
      "0-500": 25,
      "500-2000": 20,
      ">2000": 15,
    },
    description: "Light industrial and workshop areas"
  },
  education: {
    name: "Schools & Educational",
    loads: {
      "0-200": 30,
      "200-1000": 25,
      ">1000": 20,
    },
    description: "Classrooms and educational facilities"
  },
};

// SANS 10142-1 Lighting loads (VA/m²)
const SANS_10142_LIGHTING_LOADS = {
  residential: { min: 15, typical: 20, max: 25, name: "Residential" },
  office: { min: 20, typical: 25, max: 30, name: "Offices" },
  retail: { min: 25, typical: 35, max: 50, name: "Retail/Shops" },
  industrial: { min: 10, typical: 15, max: 20, name: "Industrial" },
  education: { min: 15, typical: 20, max: 25, name: "Schools" },
  hospitality: { min: 20, typical: 30, max: 40, name: "Hotels/Restaurants" },
};

export const SANS204Calculator = ({
  open,
  onOpenChange,
  onApplyValues,
  initialValues,
  documentId,
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

  // SANS 10142 calculator state
  const [sans10142BuildingType, setSans10142BuildingType] = useState<keyof typeof SANS_10142_SOCKET_LOADS>("residential");
  const [sans10142Area, setSans10142Area] = useState("");
  const [sans10142LightingType, setSans10142LightingType] = useState<keyof typeof SANS_10142_LIGHTING_LOADS>("residential");
  const [sans10142LightingLoad, setSans10142LightingLoad] = useState(SANS_10142_LIGHTING_LOADS.residential.typical.toString());
  const [sans10142FixedAppliances, setSans10142FixedAppliances] = useState("0");
  const [sans10142Diversity, setSans10142Diversity] = useState("0.75");

  // Fetch document settings if documentId is provided (overrides project settings)
  const { data: documentSettings } = useQuery({
    queryKey: ["bulk-services-document-settings", documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("building_calculation_type")
        .eq("id", documentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId && open,
  });

  // Fetch project settings as fallback
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

  const calculationType = documentSettings?.building_calculation_type || projectSettings?.building_calculation_type || "commercial";
  const isResidential = calculationType === "residential";
  const isSans10142 = calculationType === "sans10142" || calculationType === "electrical_standard";

  // Helper function to get SANS 10142 socket load based on area
  const getSans10142SocketLoad = (buildingType: keyof typeof SANS_10142_SOCKET_LOADS, area: number): number => {
    const loads = SANS_10142_SOCKET_LOADS[buildingType].loads;
    const ranges = Object.keys(loads);
    
    for (const range of ranges) {
      if (range.startsWith(">")) {
        const minArea = parseInt(range.substring(1));
        if (area > minArea) return loads[range];
      } else {
        const [min, max] = range.split("-").map(Number);
        if (area >= min && area <= max) return loads[range];
      }
    }
    
    // Default to the last (highest area) value
    return loads[ranges[ranges.length - 1]];
  };

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
      connection_size: `${calculatedValues.maximumDemand} kVA`,
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
                {isSans10142 
                  ? "SANS 10142-1 Load Calculator"
                  : isResidential 
                    ? "SANS 10142 Residential Load Calculator" 
                    : "SANS 204 Load Calculator"}
              </DialogTitle>
              <DialogDescription>
                {isSans10142
                  ? "Calculate electrical loads using SANS 10142-1 socket outlet and lighting load tables"
                  : isResidential 
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
          {isSans10142 ? (
            // SANS 10142 Calculator Interface
            <>
              {/* SANS 10142 Input Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SANS 10142-1 Load Calculation Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Building Floor Area (m²)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={sans10142Area}
                        onChange={(e) => setSans10142Area(e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Building Type</Label>
                      <Select 
                        value={sans10142BuildingType} 
                        onValueChange={(value) => setSans10142BuildingType(value as keyof typeof SANS_10142_SOCKET_LOADS)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SANS_10142_SOCKET_LOADS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {SANS_10142_SOCKET_LOADS[sans10142BuildingType].description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Lighting Load (VA/m²)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={sans10142LightingLoad}
                        onChange={(e) => setSans10142LightingLoad(e.target.value)}
                        placeholder="20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Typical: {SANS_10142_LIGHTING_LOADS[sans10142LightingType].typical} VA/m²
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Fixed Appliances (kVA)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={sans10142FixedAppliances}
                        onChange={(e) => setSans10142FixedAppliances(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        HVAC, lifts, pumps, etc.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Diversity Factor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={sans10142Diversity}
                        onChange={(e) => setSans10142Diversity(e.target.value)}
                        placeholder="0.75"
                      />
                      <p className="text-xs text-muted-foreground">
                        Typical: 0.65-0.85
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SANS 10142 Socket Load Table */}
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    SANS 10142-1 Table 11 - Socket Outlet Loads by Building Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Building Type</th>
                          {Object.keys(SANS_10142_SOCKET_LOADS.residential.loads).map((range) => (
                            <th key={range} className="p-2 text-center">{range} m²</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(SANS_10142_SOCKET_LOADS).map(([key, value]) => {
                          const isSelected = key === sans10142BuildingType;
                          return (
                            <tr 
                              key={key} 
                              className={`border-t hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
                            >
                              <td className="p-2 font-medium">{value.name}</td>
                              {Object.entries(value.loads).map(([range, load]) => {
                                const areaValue = parseFloat(sans10142Area);
                                const rangeMatch = range.startsWith(">") 
                                  ? areaValue > parseInt(range.substring(1))
                                  : (() => {
                                      const [min, max] = range.split("-").map(Number);
                                      return areaValue >= min && areaValue <= max;
                                    })();
                                const isCurrentRange = isSelected && rangeMatch;
                                
                                return (
                                  <td 
                                    key={range} 
                                    className={`p-2 text-center font-medium ${
                                      isCurrentRange 
                                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-inset" 
                                        : ""
                                    }`}
                                  >
                                    {load}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold">Selected: </span>
                      {SANS_10142_SOCKET_LOADS[sans10142BuildingType].name} - 
                      {parseFloat(sans10142Area) > 0 
                        ? ` ${getSans10142SocketLoad(sans10142BuildingType, parseFloat(sans10142Area))} VA/m²`
                        : " Enter area to see socket load"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* SANS 10142 Lighting Load Reference */}
              <Card className="border-green-200 dark:border-green-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Lighting Load Reference (VA/m²)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Building Type</th>
                          <th className="p-2 text-center">Minimum</th>
                          <th className="p-2 text-center">Typical</th>
                          <th className="p-2 text-center">Maximum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(SANS_10142_LIGHTING_LOADS).map(([key, value]) => (
                          <tr key={key} className="border-t hover:bg-muted/50">
                            <td className="p-2">{value.name}</td>
                            <td className="p-2 text-center">{value.min}</td>
                            <td className="p-2 text-center font-semibold text-green-600 dark:text-green-400">
                              {value.typical}
                            </td>
                            <td className="p-2 text-center">{value.max}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs">
                    <p className="font-semibold mb-1">Notes:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Use typical values for general design</li>
                      <li>• Minimum values for energy-efficient LED installations</li>
                      <li>• Maximum values for high-illumination requirements</li>
                      <li>• Consider task lighting separately from general lighting</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* SANS 10142 Calculated Results */}
              {parseFloat(sans10142Area) > 0 && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Calculated Results - SANS 10142-1 Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const area = parseFloat(sans10142Area);
                      const socketLoadPerSqm = getSans10142SocketLoad(sans10142BuildingType, area);
                      const lightingLoadPerSqm = parseFloat(sans10142LightingLoad);
                      const fixedAppliances = parseFloat(sans10142FixedAppliances);
                      const diversity = parseFloat(sans10142Diversity);
                      
                      const socketLoad = (area * socketLoadPerSqm) / 1000; // kVA
                      const lightingLoad = (area * lightingLoadPerSqm) / 1000; // kVA
                      const totalConnected = socketLoad + lightingLoad + fixedAppliances;
                      const maximumDemand = totalConnected * diversity;
                      
                      return (
                        <>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                                <p className="text-sm text-muted-foreground">Socket Loads</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {socketLoad.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  kVA ({socketLoadPerSqm} VA/m²)
                                </p>
                              </div>
                              
                              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                                <p className="text-sm text-muted-foreground">Lighting Loads</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {lightingLoad.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  kVA ({lightingLoadPerSqm} VA/m²)
                                </p>
                              </div>
                              
                              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                                <p className="text-sm text-muted-foreground">Fixed Appliances</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                  {fixedAppliances.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  kVA
                                </p>
                              </div>
                              
                              <div className="p-4 bg-muted rounded-lg border">
                                <p className="text-sm text-muted-foreground">Total Connected</p>
                                <p className="text-2xl font-bold text-foreground">
                                  {totalConnected.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  kVA
                                </p>
                              </div>
                            </div>
                            
                            <div className="p-6 bg-primary/10 rounded-lg border-2 border-primary">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">Maximum Demand (After Diversity)</p>
                                <p className="text-4xl font-bold text-primary mb-2">
                                  {maximumDemand.toFixed(2)} kVA
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Diversity Factor: {diversity} | Design Current: {(maximumDemand * 1000 / (Math.sqrt(3) * 400)).toFixed(1)}A @ 400V 3Ø
                                </p>
                              </div>
                            </div>
                            
                            {/* Calculation Breakdown */}
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                              <p className="font-semibold">Calculation Breakdown:</p>
                              <p>
                                1. Socket Loads: <span className="font-medium">{area} m² × {socketLoadPerSqm} VA/m² = {(area * socketLoadPerSqm).toFixed(0)} VA = {socketLoad.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                2. Lighting Loads: <span className="font-medium">{area} m² × {lightingLoadPerSqm} VA/m² = {(area * lightingLoadPerSqm).toFixed(0)} VA = {lightingLoad.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                3. Fixed Appliances: <span className="font-medium">{fixedAppliances.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                4. Total Connected Load: <span className="font-medium">{socketLoad.toFixed(2)} + {lightingLoad.toFixed(2)} + {fixedAppliances.toFixed(2)} = {totalConnected.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                5. Apply Diversity: <span className="font-medium">{totalConnected.toFixed(2)} kVA × {diversity} = {maximumDemand.toFixed(2)} kVA</span>
                              </p>
                            </div>
                            
                            {/* Apply Button */}
                            <Button 
                              onClick={() => {
                                onApplyValues({
                                  project_area: area,
                                  va_per_sqm: (socketLoadPerSqm + lightingLoadPerSqm),
                                  total_connected_load: totalConnected,
                                  maximum_demand: maximumDemand,
                                  connection_size: `${maximumDemand} kVA`,
                                  climatic_zone: "N/A",
                                });
                                onOpenChange(false);
                                toast.success("SANS 10142 values applied successfully");
                              }}
                              className="w-full"
                              size="lg"
                            >
                              Apply SANS 10142 Values to Document
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
              
              {/* Important Notes */}
              <Card className="border-yellow-200 dark:border-yellow-900">
                <CardHeader>
                  <CardTitle className="text-base text-yellow-800 dark:text-yellow-400">
                    ⚠️ Important SANS 10142-1 Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• <strong>Socket loads vary with floor area:</strong> Larger buildings have lower VA/m² due to diversity</li>
                    <li>• <strong>Lighting loads:</strong> Based on typical illumination requirements per building type</li>
                    <li>• <strong>Fixed appliances:</strong> Include HVAC, lifts, pumps, kitchen equipment at nameplate ratings</li>
                    <li>• <strong>Diversity factor:</strong> Accounts for non-simultaneous use (0.65-0.85 typical)</li>
                    <li>• <strong>Special loads:</strong> Large motors, welding equipment require separate consideration</li>
                    <li>• <strong>Future expansion:</strong> Consider 20-30% spare capacity for growth</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : isResidential ? (
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

              {/* ADMD Curve Visualization */}
              {useADMD && (
                <Card className="border-purple-200 dark:border-purple-900">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      ADMD Diversity Curve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        After Diversity Maximum Demand (ADMD) factor decreases with more units per phase
                      </p>

                      {/* Chart */}
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={ADMD_DIVERSITY_TABLE.map(item => ({
                              units: item.unitsPerPhase,
                              diversity: item.diversityFactor * 100,
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="diversityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="units" 
                              label={{ value: 'Units per Phase', position: 'insideBottom', offset: -5 }}
                              className="text-xs"
                            />
                            <YAxis 
                              label={{ value: 'Diversity Factor (%)', angle: -90, position: 'insideLeft' }}
                              className="text-xs"
                              domain={[30, 105]}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background border rounded-lg p-2 shadow-lg">
                                      <p className="text-xs font-semibold">
                                        {payload[0].payload.units} units/phase
                                      </p>
                                      <p className="text-xs text-primary">
                                        Diversity: {payload[0].value}%
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="diversity" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fill="url(#diversityGradient)"
                            />
                            {/* Current project marker */}
                            {parseFloat(numUnits || "0") > 0 && (
                              <ReferenceLine
                                x={Math.ceil(parseFloat(numUnits || "0") / 3)}
                                stroke="hsl(var(--destructive))"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                label={{
                                  value: 'Your Project',
                                  position: 'top',
                                  className: 'text-xs font-semibold fill-destructive',
                                }}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Key Points Table */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        <div className="p-2 bg-muted rounded text-center">
                          <p className="text-xs text-muted-foreground">1-2 units/phase</p>
                          <p className="font-bold text-sm">72-100%</p>
                        </div>
                        <div className="p-2 bg-muted rounded text-center">
                          <p className="text-xs text-muted-foreground">3-14 units/phase</p>
                          <p className="font-bold text-sm">45-62%</p>
                        </div>
                        <div className="p-2 bg-muted rounded text-center">
                          <p className="text-xs text-muted-foreground">15-49 units/phase</p>
                          <p className="font-bold text-sm">37-42%</p>
                        </div>
                        <div className="p-2 bg-muted rounded text-center">
                          <p className="text-xs text-muted-foreground">50+ units/phase</p>
                          <p className="font-bold text-sm">34-36%</p>
                        </div>
                      </div>

                      {/* Current Project Indicator */}
                      {parseFloat(numUnits || "0") > 0 && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">Your Project</p>
                              <p className="text-xs text-muted-foreground">
                                {numUnits} total units = {Math.ceil(parseFloat(numUnits || "0") / 3)} units per phase
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{(parseFloat(generalDiversity) * 100).toFixed(0)}%</p>
                              <p className="text-xs text-muted-foreground">ADMD Factor</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-muted/50 rounded-lg text-xs">
                        <p className="font-semibold mb-1">Why ADMD Varies:</p>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Small developments (1-5 units): High diversity needed, units more likely to peak together</li>
                          <li>• Medium developments (6-30 units): Diversity improves as usage patterns vary</li>
                          <li>• Large developments (30+ units): Statistical diversity means only ~34-38% peak simultaneously</li>
                          <li>• Your {generalDiversity} factor accounts for {numUnits} units balanced across 3 phases</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Per-Phase Load Analysis */}
              {useADMD && parseFloat(numUnits || "0") > 0 && (
                <Card className="border-orange-200 dark:border-orange-900">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-orange-600" />
                      Per-Phase Load Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Individual phase calculations for balanced 3-phase distribution
                      </p>

                      {/* Calculation Parameters */}
                      <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">System Voltage</p>
                          <p className="font-semibold">400V 3Ø</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Units per Phase</p>
                          <p className="font-semibold">{Math.ceil(parseFloat(numUnits || "0") / 3)} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Power Factor</p>
                          <p className="font-semibold">0.95</p>
                        </div>
                      </div>

                      {/* Per-Phase Results */}
                      {(() => {
                        const units = parseFloat(numUnits) || 0;
                        const totalPerUnitWatts = 
                          fittingLoads.lamps.qty * fittingLoads.lamps.load * fittingLoads.lamps.diversity +
                          fittingLoads.plugs.qty * fittingLoads.plugs.load * fittingLoads.plugs.diversity +
                          fittingLoads.geyser.qty * fittingLoads.geyser.load * fittingLoads.geyser.diversity +
                          fittingLoads.stove.qty * fittingLoads.stove.load * fittingLoads.stove.diversity +
                          fittingLoads.poolPump.qty * fittingLoads.poolPump.load * fittingLoads.poolPump.diversity;
                        
                        const totalPerUnitKva = totalPerUnitWatts / 1000 / 0.95;
                        const unitsPerPhase = Math.ceil(units / 3);
                        const diversityFactor = parseFloat(generalDiversity);
                        
                        // ADMD per phase
                        const admdPerPhase = totalPerUnitKva * unitsPerPhase * diversityFactor;
                        
                        // Current per phase (I = S / V for single phase to neutral)
                        // For 3-phase 400V system, phase voltage is 230V
                        const currentPerPhase = (admdPerPhase * 1000) / 230;
                        
                        // Total 3-phase current (same as per-phase for balanced load)
                        const total3PhCurrent = currentPerPhase;
                        
                        // Recommended cable size
                        const recommendedCable = getCableSize(currentPerPhase);

                        return (
                          <>
                            <div className="rounded-md border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="p-2 text-left">Phase</th>
                                    <th className="p-2 text-center">Units</th>
                                    <th className="p-2 text-center">Load (kVA)</th>
                                    <th className="p-2 text-center">Current (A)</th>
                                    <th className="p-2 text-center">Cable Size</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t">
                                    <td className="p-2 font-medium">L1 (Red)</td>
                                    <td className="p-2 text-center">{unitsPerPhase}</td>
                                    <td className="p-2 text-center">{admdPerPhase.toFixed(2)}</td>
                                    <td className="p-2 text-center font-semibold text-orange-600 dark:text-orange-400">
                                      {currentPerPhase.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-center">{recommendedCable}</td>
                                  </tr>
                                  <tr className="border-t">
                                    <td className="p-2 font-medium">L2 (White/Yellow)</td>
                                    <td className="p-2 text-center">{unitsPerPhase}</td>
                                    <td className="p-2 text-center">{admdPerPhase.toFixed(2)}</td>
                                    <td className="p-2 text-center font-semibold text-orange-600 dark:text-orange-400">
                                      {currentPerPhase.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-center">{recommendedCable}</td>
                                  </tr>
                                  <tr className="border-t">
                                    <td className="p-2 font-medium">L3 (Blue)</td>
                                    <td className="p-2 text-center">{unitsPerPhase}</td>
                                    <td className="p-2 text-center">{admdPerPhase.toFixed(2)}</td>
                                    <td className="p-2 text-center font-semibold text-orange-600 dark:text-orange-400">
                                      {currentPerPhase.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-center">{recommendedCable}</td>
                                  </tr>
                                  <tr className="border-t bg-primary/5 font-semibold">
                                    <td className="p-2">Total (3Ø Balanced)</td>
                                    <td className="p-2 text-center">{units}</td>
                                    <td className="p-2 text-center">{(admdPerPhase * 3).toFixed(2)}</td>
                                    <td className="p-2 text-center text-primary">
                                      {total3PhCurrent.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-center">-</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Summary Boxes */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                                <p className="text-xs text-muted-foreground mb-1">Per-Phase Load</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                  {admdPerPhase.toFixed(2)} kVA
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {unitsPerPhase} units × {diversityFactor}
                                </p>
                              </div>

                              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                                <p className="text-xs text-muted-foreground mb-1">Phase Current</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                  {currentPerPhase.toFixed(1)} A
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  At 230V phase voltage
                                </p>
                              </div>

                              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                                <p className="text-xs text-muted-foreground mb-1">Recommended Cable</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                  {recommendedCable}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cu, PVC, 75°C
                                </p>
                              </div>
                            </div>

                            {/* Calculation Breakdown */}
                            <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                              <p className="font-semibold">Per-Phase Calculation:</p>
                              <p>
                                1. Per-unit load: <span className="font-medium">{totalPerUnitKva.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                2. Units per phase: <span className="font-medium">{units} units ÷ 3 phases = {unitsPerPhase} units/phase</span>
                              </p>
                              <p>
                                3. ADMD per phase: <span className="font-medium">{totalPerUnitKva.toFixed(2)} kVA × {unitsPerPhase} units × {diversityFactor} = {admdPerPhase.toFixed(2)} kVA</span>
                              </p>
                              <p>
                                4. Current per phase: <span className="font-medium">{admdPerPhase.toFixed(2)} kVA × 1000 ÷ 230V = {currentPerPhase.toFixed(1)} A</span>
                              </p>
                              <p>
                                5. Cable sizing: <span className="font-medium">Based on {currentPerPhase.toFixed(1)}A with derating factors</span>
                              </p>
                            </div>

                            {/* Important Notes */}
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900 text-xs">
                              <p className="font-semibold mb-1 text-yellow-800 dark:text-yellow-400">⚠️ Important Notes:</p>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• Cable sizes based on SANS 10142-1 for copper conductors in conduit</li>
                                <li>• Apply derating factors for: grouping, ambient temperature, installation method</li>
                                <li>• Neutral conductor: Same size as phase for balanced loads</li>
                                <li>• Earth conductor: Per SANS 10142-1 Table 7.1 (typically 16-50% of phase)</li>
                                <li>• Verify voltage drop over cable length (&lt;5% for final circuits, &lt;2.5% for distribution)</li>
                                <li>• Consider fault level protection and discrimination</li>
                              </ul>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Circuit Breaker & Protection Device Recommendations */}
              {useADMD && parseFloat(numUnits || "0") > 0 && (
                <Card className="border-purple-200 dark:border-purple-900">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      Circuit Breaker & Protection Device Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const units = parseFloat(numUnits) || 0;
                      const totalPerUnitWatts = 
                        fittingLoads.lamps.qty * fittingLoads.lamps.load * fittingLoads.lamps.diversity +
                        fittingLoads.plugs.qty * fittingLoads.plugs.load * fittingLoads.plugs.diversity +
                        fittingLoads.geyser.qty * fittingLoads.geyser.load * fittingLoads.geyser.diversity +
                        fittingLoads.stove.qty * fittingLoads.stove.load * fittingLoads.stove.diversity +
                        fittingLoads.poolPump.qty * fittingLoads.poolPump.load * fittingLoads.poolPump.diversity;
                      
                      const totalPerUnitKva = totalPerUnitWatts / 1000 / 0.95;
                      const unitsPerPhase = Math.ceil(units / 3);
                      const diversityFactor = parseFloat(generalDiversity);
                      const admdPerPhase = totalPerUnitKva * unitsPerPhase * diversityFactor;
                      const currentPerPhase = (admdPerPhase * 1000) / 230;
                      
                      // Calculate unit breaker (per dwelling)
                      const unitCurrent = (totalPerUnitKva * 1000) / 230;
                      const unitBreaker = getCircuitBreakerSize(unitCurrent);
                      
                      // Calculate sub-distribution breaker (per phase)
                      const subDistBreaker = getCircuitBreakerSize(currentPerPhase);
                      
                      // Calculate main incomer (3-phase)
                      const total3PhaseKva = admdPerPhase * 3;
                      const mainIncomerCurrent = (total3PhaseKva * 1000) / (Math.sqrt(3) * 400);
                      const mainBreaker = getCircuitBreakerSize(mainIncomerCurrent);
                      
                      // Calculate discrimination ratios
                      const subToMainDiscrimination = calculateDiscrimination(subDistBreaker.rating, mainBreaker.rating);
                      const unitToSubDiscrimination = calculateDiscrimination(unitBreaker.rating, subDistBreaker.rating);
                      
                      // Prepare data for discrimination curve
                      const discriminationCurveData = [
                        { 
                          current: unitBreaker.rating * 0.5, 
                          unit: 0.01, 
                          subDist: 0, 
                          main: 0,
                          label: `${(unitBreaker.rating * 0.5).toFixed(0)}A`
                        },
                        { 
                          current: unitBreaker.rating, 
                          unit: 0.05, 
                          subDist: 0, 
                          main: 0,
                          label: `${unitBreaker.rating}A`
                        },
                        { 
                          current: unitBreaker.rating * 3, 
                          unit: 0.3, 
                          subDist: 0.01, 
                          main: 0,
                          label: `${(unitBreaker.rating * 3).toFixed(0)}A`
                        },
                        { 
                          current: unitBreaker.rating * 10, 
                          unit: 2, 
                          subDist: 0.02, 
                          main: 0,
                          label: `${(unitBreaker.rating * 10).toFixed(0)}A`
                        },
                        { 
                          current: subDistBreaker.rating, 
                          unit: null, 
                          subDist: 0.05, 
                          main: 0,
                          label: `${subDistBreaker.rating}A`
                        },
                        { 
                          current: subDistBreaker.rating * 3, 
                          unit: null, 
                          subDist: 0.5, 
                          main: 0.01,
                          label: `${(subDistBreaker.rating * 3).toFixed(0)}A`
                        },
                        { 
                          current: subDistBreaker.rating * 10, 
                          unit: null, 
                          subDist: 3, 
                          main: 0.03,
                          label: `${(subDistBreaker.rating * 10).toFixed(0)}A`
                        },
                        { 
                          current: mainBreaker.rating, 
                          unit: null, 
                          subDist: null, 
                          main: 0.08,
                          label: `${mainBreaker.rating}A`
                        },
                        { 
                          current: mainBreaker.rating * 3, 
                          unit: null, 
                          subDist: null, 
                          main: 0.8,
                          label: `${(mainBreaker.rating * 3).toFixed(0)}A`
                        },
                        { 
                          current: mainBreaker.rating * 10, 
                          unit: null, 
                          subDist: null, 
                          main: 5,
                          label: `${(mainBreaker.rating * 10).toFixed(0)}A`
                        },
                      ];

                      return (
                        <div className="space-y-6">
                          {/* Protection Device Sizing */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Protection Device Sizing</h4>
                            <div className="rounded-md border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="p-2 text-left">Level</th>
                                    <th className="p-2 text-center">Design Current</th>
                                    <th className="p-2 text-center">Breaker Rating</th>
                                    <th className="p-2 text-center">Type</th>
                                    <th className="p-2 text-center">Trip Curve</th>
                                    <th className="p-2 text-center">Poles</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-t">
                                    <td className="p-2 font-medium">Unit Breaker (per dwelling)</td>
                                    <td className="p-2 text-center">{unitCurrent.toFixed(1)} A</td>
                                    <td className="p-2 text-center font-semibold text-purple-600 dark:text-purple-400">
                                      {unitBreaker.rating} A
                                    </td>
                                    <td className="p-2 text-center">{unitBreaker.type}</td>
                                    <td className="p-2 text-center">{unitBreaker.tripCurve}</td>
                                    <td className="p-2 text-center">1P+N</td>
                                  </tr>
                                  <tr className="border-t">
                                    <td className="p-2 font-medium">Sub-Distribution (per phase)</td>
                                    <td className="p-2 text-center">{currentPerPhase.toFixed(1)} A</td>
                                    <td className="p-2 text-center font-semibold text-purple-600 dark:text-purple-400">
                                      {subDistBreaker.rating} A
                                    </td>
                                    <td className="p-2 text-center">{subDistBreaker.type}</td>
                                    <td className="p-2 text-center">{subDistBreaker.tripCurve}</td>
                                    <td className="p-2 text-center">3P</td>
                                  </tr>
                                  <tr className="border-t bg-primary/5">
                                    <td className="p-2 font-medium">Main Incomer (3Ø)</td>
                                    <td className="p-2 text-center">{mainIncomerCurrent.toFixed(1)} A</td>
                                    <td className="p-2 text-center font-semibold text-primary">
                                      {mainBreaker.rating} A
                                    </td>
                                    <td className="p-2 text-center">{mainBreaker.type}</td>
                                    <td className="p-2 text-center">{mainBreaker.tripCurve}</td>
                                    <td className="p-2 text-center">3P+N</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Discrimination Analysis */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Discrimination & Coordination Analysis</h4>
                            <div className="space-y-3">
                              {/* Unit to Sub-Distribution */}
                              <div className={`p-3 rounded-lg border ${
                                unitToSubDiscrimination.isAdequate 
                                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                                  : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900"
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold">Unit → Sub-Distribution</p>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    unitToSubDiscrimination.isAdequate 
                                      ? "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200"
                                      : "bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                                  }`}>
                                    Ratio: {unitToSubDiscrimination.ratio.toFixed(2)}:1
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {unitBreaker.rating}A → {subDistBreaker.rating}A
                                </p>
                                <p className="text-xs mt-1">
                                  {unitToSubDiscrimination.recommendation}
                                </p>
                              </div>

                              {/* Sub-Distribution to Main */}
                              <div className={`p-3 rounded-lg border ${
                                subToMainDiscrimination.isAdequate 
                                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                                  : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900"
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold">Sub-Distribution → Main Incomer</p>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    subToMainDiscrimination.isAdequate 
                                      ? "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200"
                                      : "bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                                  }`}>
                                    Ratio: {subToMainDiscrimination.ratio.toFixed(2)}:1
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {subDistBreaker.rating}A → {mainBreaker.rating}A
                                </p>
                                <p className="text-xs mt-1">
                                  {subToMainDiscrimination.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Discrimination Curve */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Time-Current Discrimination Curve</h4>
                            <div className="h-[400px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart 
                                  data={discriminationCurveData}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis 
                                    dataKey="current" 
                                    scale="log"
                                    domain={[unitBreaker.rating * 0.5, mainBreaker.rating * 10]}
                                    label={{ value: 'Current (A)', position: 'insideBottom', offset: -10 }}
                                    tickFormatter={(value) => value.toFixed(0)}
                                  />
                                  <YAxis 
                                    scale="log"
                                    domain={[0.01, 10]}
                                    label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }}
                                    tickFormatter={(value) => value >= 1 ? value.toFixed(0) : value.toFixed(2)}
                                  />
                                  <Tooltip 
                                    formatter={(value: any) => {
                                      if (value === null) return ['N/A', ''];
                                      return [value >= 1 ? `${value.toFixed(2)}s` : `${(value * 1000).toFixed(0)}ms`, ''];
                                    }}
                                    labelFormatter={(label) => `Current: ${label}A`}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="unit" 
                                    stroke="hsl(var(--purple-600))" 
                                    strokeWidth={2}
                                    dot={{ fill: "hsl(var(--purple-600))", r: 4 }}
                                    name={`Unit Breaker (${unitBreaker.rating}A)`}
                                    connectNulls={false}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="subDist" 
                                    stroke="hsl(var(--orange-600))" 
                                    strokeWidth={2}
                                    dot={{ fill: "hsl(var(--orange-600))", r: 4 }}
                                    name={`Sub-Dist (${subDistBreaker.rating}A)`}
                                    connectNulls={false}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="main" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={2}
                                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                                    name={`Main (${mainBreaker.rating}A)`}
                                    connectNulls={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-purple-600"></div>
                                <span>Unit Breaker ({unitBreaker.rating}A)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-orange-600"></div>
                                <span>Sub-Distribution ({subDistBreaker.rating}A)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-primary"></div>
                                <span>Main Incomer ({mainBreaker.rating}A)</span>
                              </div>
                            </div>
                          </div>

                          {/* Single-Line Diagram */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3">Single-Line Diagram (SLD) - Protection Scheme</h4>
                            <div className="p-6 bg-background rounded-lg border-2 border-border">
                              <svg width="100%" height="700" viewBox="0 0 800 700" className="mx-auto">
                                <defs>
                                  {/* Breaker symbol definition */}
                                  <g id="breaker">
                                    <rect x="-15" y="-25" width="30" height="50" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <line x1="-15" y1="-10" x2="15" y2="10" stroke="currentColor" strokeWidth="2" />
                                    <line x1="-15" y1="10" x2="15" y2="-10" stroke="currentColor" strokeWidth="2" />
                                  </g>
                                  
                                  {/* Cable symbol */}
                                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                    <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
                                  </marker>
                                </defs>

                                {/* Title */}
                                <text x="400" y="30" textAnchor="middle" className="fill-foreground font-bold text-lg">
                                  Residential Distribution Protection Scheme
                                </text>
                                <text x="400" y="50" textAnchor="middle" className="fill-muted-foreground text-sm">
                                  {units} Units ({unitsPerPhase} per phase) - 400V 3Ø + N System
                                </text>

                                {/* Utility Supply */}
                                <g>
                                  <circle cx="400" cy="90" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="stroke-primary" />
                                  <text x="400" y="95" textAnchor="middle" className="fill-primary font-bold">U</text>
                                  <text x="400" y="130" textAnchor="middle" className="fill-foreground text-sm font-semibold">
                                    Utility Supply
                                  </text>
                                  <text x="400" y="145" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    400V 3Ø 50Hz
                                  </text>
                                </g>

                                {/* Line to Main Incomer */}
                                <line x1="400" y1="110" x2="400" y2="180" stroke="currentColor" strokeWidth="3" className="stroke-foreground" />
                                <text x="420" y="150" className="fill-muted-foreground text-xs">
                                  L1, L2, L3, N
                                </text>

                                {/* Main Incomer Breaker */}
                                <g transform="translate(400, 205)">
                                  <use href="#breaker" className="stroke-primary" />
                                  <rect x="-80" y="-45" width="160" height="90" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth="2" rx="4" />
                                  <text x="0" y="-55" textAnchor="middle" className="fill-primary font-bold text-sm">
                                    MAIN INCOMER
                                  </text>
                                  <text x="0" y="50" textAnchor="middle" className="fill-foreground font-bold">
                                    {mainBreaker.rating}A {mainBreaker.type}
                                  </text>
                                  <text x="0" y="65" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    {mainBreaker.tripCurve} | 3P+N | {mainIncomerCurrent.toFixed(0)}A design
                                  </text>
                                  <text x="0" y="78" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    Total: {total3PhaseKva.toFixed(1)} kVA
                                  </text>
                                </g>

                                {/* Cables from Main to Sub-Dist */}
                                <line x1="400" y1="280" x2="400" y2="320" stroke="currentColor" strokeWidth="3" className="stroke-foreground" />
                                <rect x="350" y="295" width="100" height="30" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" rx="2" />
                                <text x="400" y="310" textAnchor="middle" className="fill-foreground text-xs font-semibold">
                                  {getCableSize(currentPerPhase)}
                                </text>
                                <text x="400" y="322" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                                  Cu, PVC, 4C
                                </text>

                                {/* Sub-Distribution Boards (3 phases) */}
                                <g transform="translate(150, 390)">
                                  <rect x="-70" y="-40" width="140" height="110" fill="hsl(var(--orange) / 0.1)" stroke="hsl(var(--orange))" strokeWidth="2" rx="4" className="fill-orange-50 dark:fill-orange-950/30 stroke-orange-600" />
                                  <use href="#breaker" className="stroke-orange-600" />
                                  <text x="0" y="-50" textAnchor="middle" className="fill-orange-600 dark:fill-orange-400 font-bold text-sm">
                                    SUB-DIST L1
                                  </text>
                                  <text x="0" y="45" textAnchor="middle" className="fill-foreground font-bold text-sm">
                                    {subDistBreaker.rating}A {subDistBreaker.type}
                                  </text>
                                  <text x="0" y="58" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    {subDistBreaker.tripCurve} | 3P
                                  </text>
                                  <text x="0" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                                    {currentPerPhase.toFixed(0)}A | {admdPerPhase.toFixed(1)} kVA
                                  </text>
                                </g>

                                <g transform="translate(400, 390)">
                                  <rect x="-70" y="-40" width="140" height="110" fill="hsl(var(--orange) / 0.1)" stroke="hsl(var(--orange))" strokeWidth="2" rx="4" className="fill-orange-50 dark:fill-orange-950/30 stroke-orange-600" />
                                  <use href="#breaker" className="stroke-orange-600" />
                                  <text x="0" y="-50" textAnchor="middle" className="fill-orange-600 dark:fill-orange-400 font-bold text-sm">
                                    SUB-DIST L2
                                  </text>
                                  <text x="0" y="45" textAnchor="middle" className="fill-foreground font-bold text-sm">
                                    {subDistBreaker.rating}A {subDistBreaker.type}
                                  </text>
                                  <text x="0" y="58" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    {subDistBreaker.tripCurve} | 3P
                                  </text>
                                  <text x="0" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                                    {currentPerPhase.toFixed(0)}A | {admdPerPhase.toFixed(1)} kVA
                                  </text>
                                </g>

                                <g transform="translate(650, 390)">
                                  <rect x="-70" y="-40" width="140" height="110" fill="hsl(var(--orange) / 0.1)" stroke="hsl(var(--orange))" strokeWidth="2" rx="4" className="fill-orange-50 dark:fill-orange-950/30 stroke-orange-600" />
                                  <use href="#breaker" className="stroke-orange-600" />
                                  <text x="0" y="-50" textAnchor="middle" className="fill-orange-600 dark:fill-orange-400 font-bold text-sm">
                                    SUB-DIST L3
                                  </text>
                                  <text x="0" y="45" textAnchor="middle" className="fill-foreground font-bold text-sm">
                                    {subDistBreaker.rating}A {subDistBreaker.type}
                                  </text>
                                  <text x="0" y="58" textAnchor="middle" className="fill-muted-foreground text-xs">
                                    {subDistBreaker.tripCurve} | 3P
                                  </text>
                                  <text x="0" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                                    {currentPerPhase.toFixed(0)}A | {admdPerPhase.toFixed(1)} kVA
                                  </text>
                                </g>

                                {/* Lines from Main to Sub-Dist */}
                                <line x1="400" y1="320" x2="150" y2="350" stroke="currentColor" strokeWidth="2.5" className="stroke-foreground" />
                                <line x1="400" y1="320" x2="400" y2="350" stroke="currentColor" strokeWidth="2.5" className="stroke-foreground" />
                                <line x1="400" y1="320" x2="650" y2="350" stroke="currentColor" strokeWidth="2.5" className="stroke-foreground" />
                                
                                <text x="250" y="340" className="fill-red-600 dark:fill-red-400 text-xs font-semibold">L1</text>
                                <text x="400" y="340" className="fill-yellow-600 dark:fill-yellow-400 text-xs font-semibold">L2</text>
                                <text x="550" y="340" className="fill-blue-600 dark:fill-blue-400 text-xs font-semibold">L3</text>

                                {/* Unit Breakers Level */}
                                {/* L1 Units */}
                                <g transform="translate(70, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit 1
                                  </text>
                                </g>
                                <g transform="translate(150, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit 2
                                  </text>
                                </g>
                                <g transform="translate(230, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>

                                {/* L2 Units */}
                                <g transform="translate(320, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>
                                <g transform="translate(400, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>
                                <g transform="translate(480, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>

                                {/* L3 Units */}
                                <g transform="translate(570, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>
                                <g transform="translate(650, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit ...
                                  </text>
                                </g>
                                <g transform="translate(730, 540)">
                                  <use href="#breaker" className="stroke-purple-600" />
                                  <rect x="-25" y="-35" width="50" height="70" fill="hsl(var(--purple) / 0.1)" stroke="hsl(var(--purple))" strokeWidth="1.5" rx="2" className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-600" />
                                  <text x="0" y="50" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 font-bold text-xs">
                                    {unitBreaker.rating}A
                                  </text>
                                  <text x="0" y="62" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                    Unit {units}
                                  </text>
                                </g>

                                {/* Lines from Sub-Dist to Units */}
                                <line x1="150" y1="460" x2="70" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="150" y1="460" x2="150" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="150" y1="460" x2="230" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />

                                <line x1="400" y1="460" x2="320" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="400" y1="460" x2="400" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="400" y1="460" x2="480" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />

                                <line x1="650" y1="460" x2="570" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="650" y1="460" x2="650" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                <line x1="650" y1="460" x2="730" y2="505" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />

                                {/* Cable labels to units */}
                                <text x="150" y="485" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                  {getCableSize(unitCurrent)}
                                </text>
                                <text x="400" y="485" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                  {getCableSize(unitCurrent)}
                                </text>
                                <text x="650" y="485" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                                  {getCableSize(unitCurrent)}
                                </text>

                                {/* Load endpoints */}
                                {[70, 150, 230, 320, 400, 480, 570, 650, 730].map((x) => (
                                  <g key={x}>
                                    <line x1={x} y1="605" x2={x} y2="640" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                    <circle cx={x} cy="650" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                    <line x1={x-6} y1="650" x2={x+6} y2="650" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                    <line x1={x-4} y1="656" x2={x+4} y2="656" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                    <line x1={x-2} y1="662" x2={x+2} y2="662" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                  </g>
                                ))}

                                <text x="400" y="685" textAnchor="middle" className="fill-muted-foreground text-sm font-semibold">
                                  Dwelling Unit Loads ({totalPerUnitKva.toFixed(2)} kVA each)
                                </text>

                                {/* Legend */}
                                <g transform="translate(50, 30)">
                                  <rect x="0" y="0" width="200" height="90" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" rx="4" />
                                  <text x="10" y="20" className="fill-foreground font-semibold text-xs">Legend:</text>
                                  <line x1="10" y1="35" x2="30" y2="35" stroke="currentColor" strokeWidth="3" className="stroke-foreground" />
                                  <text x="40" y="39" className="fill-muted-foreground text-[10px]">Power Cable</text>
                                  
                                  <rect x="10" y="45" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="stroke-primary" />
                                  <line x1="10" y1="50" x2="30" y2="60" stroke="currentColor" strokeWidth="2" className="stroke-primary" />
                                  <text x="40" y="59" className="fill-muted-foreground text-[10px]">Circuit Breaker</text>
                                  
                                  <circle cx="20" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="2" className="stroke-foreground" />
                                  <text x="40" y="84" className="fill-muted-foreground text-[10px]">Load Connection</text>
                                </g>
                              </svg>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground space-y-1">
                              <p>• <strong>Configuration:</strong> 3-phase balanced distribution with {unitsPerPhase} units per phase</p>
                              <p>• <strong>Discrimination ratios:</strong> Unit→Sub: {unitToSubDiscrimination.ratio.toFixed(2)}:1, Sub→Main: {subToMainDiscrimination.ratio.toFixed(2)}:1</p>
                              <p>• <strong>Cable sizing:</strong> Based on {currentPerPhase.toFixed(0)}A per phase with SANS 10142-1 derating</p>
                            </div>
                          </div>

                          {/* Protection Coordination Notes */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 text-xs">
                            <p className="font-semibold mb-2 text-blue-800 dark:text-blue-400">🛡️ Protection Coordination Requirements:</p>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• <strong>Selectivity Ratio:</strong> Upstream breaker rating should be ≥1.6× downstream for full discrimination (IEC 60947-2)</li>
                              <li>• <strong>Time Grading:</strong> Curves show coordination zones - downstream trips before upstream under fault conditions</li>
                              <li>• <strong>Trip Curves:</strong> {unitBreaker.tripCurve}-curve breakers selected based on load characteristics</li>
                              <li>• <strong>Breaking Capacity:</strong> Verify breakers have adequate fault rating for installation location (typically 6-10kA for domestic, 15-25kA for distribution)</li>
                              <li>• <strong>Earth Fault Protection:</strong> Consider RCDs (30mA for final circuits, 100-300mA time-delayed for distribution)</li>
                              <li>• <strong>Overload vs Short Circuit:</strong> Thermal elements protect against overload, magnetic elements against short circuits</li>
                              <li>• <strong>Cable Protection:</strong> Breaker rating must protect cable from overload (In ≤ Iz, cable current-carrying capacity)</li>
                            </ul>
                          </div>

                          {/* Summary */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                              <p className="text-xs text-muted-foreground mb-1">Per-Unit Protection</p>
                              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {unitBreaker.rating}A {unitBreaker.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {unitBreaker.tripCurve}-curve, 1P+N
                              </p>
                            </div>

                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                              <p className="text-xs text-muted-foreground mb-1">Sub-Distribution</p>
                              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {subDistBreaker.rating}A {subDistBreaker.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {subDistBreaker.tripCurve}, 3P
                              </p>
                            </div>

                            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                              <p className="text-xs text-muted-foreground mb-1">Main Incomer</p>
                              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {mainBreaker.rating}A {mainBreaker.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mainBreaker.tripCurve}, 3P+N
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
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
