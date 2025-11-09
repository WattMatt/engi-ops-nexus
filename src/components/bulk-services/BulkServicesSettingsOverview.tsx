import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Download, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CalculationTutorial } from "./CalculationTutorial";

// SANS 10142-1 Socket outlet loads (VA/m²) by building type
const SANS_10142_SOCKET_LOADS = {
  residential: {
    name: "Residential (Dwellings, Flats, Hotels)",
    ranges: [
      { range: "0-20 m²", load: 70 },
      { range: "20-40 m²", load: 55 },
      { range: "40-60 m²", load: 45 },
      { range: "60-80 m²", load: 40 },
      { range: "80-120 m²", load: 35 },
      { range: "120-200 m²", load: 30 },
      { range: ">200 m²", load: 25 },
    ],
  },
  office: {
    name: "Offices & Banks",
    ranges: [
      { range: "0-100 m²", load: 45 },
      { range: "100-300 m²", load: 40 },
      { range: "300-500 m²", load: 35 },
      { range: "500-1000 m²", load: 30 },
      { range: ">1000 m²", load: 25 },
    ],
  },
  retail: {
    name: "Shops & Showrooms",
    ranges: [
      { range: "0-100 m²", load: 35 },
      { range: "100-400 m²", load: 30 },
      { range: "400-1000 m²", load: 25 },
      { range: ">1000 m²", load: 20 },
    ],
  },
  industrial: {
    name: "Industrial & Workshop",
    ranges: [
      { range: "0-500 m²", load: 25 },
      { range: "500-2000 m²", load: 20 },
      { range: ">2000 m²", load: 15 },
    ],
  },
  education: {
    name: "Schools & Educational",
    ranges: [
      { range: "0-200 m²", load: 30 },
      { range: "200-1000 m²", load: 25 },
      { range: ">1000 m²", load: 20 },
    ],
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

// ADMD Diversity Table - Based on units per phase
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
  { unitsPerPhase: 350, diversityFactor: 0.34 },
];

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

interface BulkServicesSettingsOverviewProps {
  documentId: string;
  currentCalculationType?: string;
}

export const BulkServicesSettingsOverview = ({
  documentId,
  currentCalculationType,
}: BulkServicesSettingsOverviewProps) => {
  const [calculationType, setCalculationType] = useState(
    currentCalculationType || "sans_204"
  );
  const [saving, setSaving] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Calculate statistics
  const allVaValues = Object.values(SANS_204_TABLE).flatMap(bt => bt.zones);
  const minVa = Math.min(...allVaValues);
  const maxVa = Math.max(...allVaValues);
  const avgVa = allVaValues.reduce((sum, val) => sum + val, 0) / allVaValues.length;

  // Per-zone statistics
  const zoneStats = Array.from({ length: 6 }, (_, zoneIdx) => {
    const zoneValues = Object.values(SANS_204_TABLE).map(bt => bt.zones[zoneIdx]);
    const avg = zoneValues.reduce((sum, val) => sum + val, 0) / zoneValues.length;
    const min = Math.min(...zoneValues);
    const max = Math.max(...zoneValues);
    return { avg, min, max };
  });

  // Generate heat map color based on VA value
  const getHeatMapColor = (va: number) => {
    if (!showHeatMap) return "";
    const normalized = (va - minVa) / (maxVa - minVa);
    
    if (normalized < 0.33) {
      return "bg-green-100 dark:bg-green-950/30";
    } else if (normalized < 0.67) {
      return "bg-yellow-100 dark:bg-yellow-950/30";
    } else {
      return "bg-red-100 dark:bg-red-950/30";
    }
  };

  const handleSaveCalculationType = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({ building_calculation_type: calculationType })
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Calculation method updated successfully");
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating calculation type:", error);
      toast.error("Failed to update calculation method");
    } finally {
      setSaving(false);
    }
  };

  const generateSANS204Guide = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SANS 204 Calculation Guide", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Energy Efficiency in Buildings - Maximum Electrical Demand", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Section 1: Overview
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("1. Overview", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const overviewText = [
      "SANS 204 provides maximum energy demand values (VA/m²) for different building types",
      "across South Africa's six climatic zones. This standard is primarily used for commercial",
      "and retail buildings to ensure energy-efficient electrical installations."
    ];
    overviewText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 5;

    // Section 2: Building Classifications
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Building Classifications", 14, yPos);
    yPos += 8;

    const buildingData = Object.entries(SANS_204_TABLE).map(([code, data]) => [
      code,
      data.name,
      `${Math.min(...data.zones)} - ${Math.max(...data.zones)} VA/m²`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Code", "Building Type", "Range"]],
      body: buildingData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 3: Climatic Zones
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Climatic Zones", 14, yPos);
    yPos += 8;

    const zoneData = CLIMATIC_ZONES.map(zone => [
      `Zone ${zone.value}`,
      zone.name,
      zone.cities
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Zone", "Climate Type", "Major Cities"]],
      body: zoneData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 4: Worked Example
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. Worked Example", 14, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project: Shopping Centre in Johannesburg", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const exampleSteps = [
      "Given Information:",
      "  • Building Type: Large Shop (Retail) - Code F1",
      "  • Location: Johannesburg (Zone 1 - Cold Interior)",
      "  • Total Floor Area: 5,000 m²",
      "  • Diversity Factor: 0.75 (typical for retail)",
      "",
      "Step 1: Identify the VA/m² value from SANS 204 Table",
      "  F1 in Zone 1 = 90 VA/m²",
      "",
      "Step 2: Calculate Total Connected Load",
      "  Total Connected Load = Floor Area × VA/m²",
      "  = 5,000 m² × 90 VA/m²",
      "  = 450,000 VA = 450 kVA",
      "",
      "Step 3: Apply Diversity Factor",
      "  Maximum Demand = Total Connected Load × Diversity Factor",
      "  = 450 kVA × 0.75",
      "  = 337.5 kVA",
      "",
      "Step 4: Account for Future Expansion (typical 20%)",
      "  Design Load = Maximum Demand × 1.20",
      "  = 337.5 kVA × 1.20",
      "  = 405 kVA",
      "",
      "Conclusion: Specify a 500 kVA transformer for this installation"
    ];

    exampleSteps.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });

    // Section 5: Best Practices
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. Best Practices", 14, yPos);
    yPos += 10;

    const bestPractices = [
      "✓ Always verify the building classification code with SANS 204 Table 1",
      "✓ Confirm the correct climatic zone for the project location",
      "✓ Use typical diversity factors: 0.65-0.75 for retail, 0.70-0.80 for offices",
      "✓ Include 15-20% future expansion factor for growing facilities",
      "✓ Consider seasonal variations in climatic zones 3 and 5",
      "✓ Document all assumptions and calculations in your report",
      "✓ Verify final design with municipal electrical inspector",
      "",
      "Common Pitfalls to Avoid:",
      "✗ Using incorrect zone (e.g., using coastal values for inland locations)",
      "✗ Applying residential diversity factors to commercial buildings",
      "✗ Ignoring future expansion requirements",
      "✗ Not accounting for special equipment or high-load areas",
      "✗ Mixing SANS 204 values with other calculation methods"
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    bestPractices.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `SANS 204 Guide - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save("SANS_204_Calculation_Guide.pdf");
    toast.success("SANS 204 guide downloaded successfully");
  };

  const generateSANS10142Guide = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SANS 10142-1 Calculation Guide", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Wiring of Premises - Socket Outlet and Lighting Loads", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Section 1: Overview
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("1. Overview", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const overviewText = [
      "SANS 10142-1 provides comprehensive guidelines for calculating electrical loads in various",
      "building types. It covers socket outlet loads, lighting requirements, and fixed appliances",
      "for residential, commercial, industrial, and institutional buildings."
    ];
    overviewText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 10;

    // Section 2: Socket Outlet Loads
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Socket Outlet Loads by Building Type", 14, yPos);
    yPos += 10;

    Object.entries(SANS_10142_SOCKET_LOADS).forEach(([key, data]) => {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(data.name, 14, yPos);
      yPos += 6;

      const tableData = data.ranges.map(item => [item.range, `${item.load} VA/m²`]);

      autoTable(doc, {
        startY: yPos,
        head: [["Floor Area Range", "Socket Load"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;
    });

    // Section 3: Lighting Loads
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Lighting Loads", 14, yPos);
    yPos += 8;

    const lightingData = Object.entries(SANS_10142_LIGHTING_LOADS).map(([key, data]) => [
      data.name,
      `${data.min} VA/m²`,
      `${data.typical} VA/m²`,
      `${data.max} VA/m²`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Building Type", "Minimum", "Typical", "Maximum"]],
      body: lightingData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 4: Worked Example
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. Worked Example", 14, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project: Office Building", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const exampleSteps = [
      "Given Information:",
      "  • Building Type: Office",
      "  • Total Floor Area: 800 m²",
      "  • Fixed Appliances: 50 kW (air conditioning, lifts, etc.)",
      "  • Diversity Factor: 0.75",
      "",
      "Step 1: Determine Socket Outlet Load",
      "  For 800 m² office: 30 VA/m² (from table)",
      "  Socket Load = 800 m² × 30 VA/m² = 24,000 VA = 24 kVA",
      "",
      "Step 2: Determine Lighting Load",
      "  Use typical value: 25 VA/m²",
      "  Lighting Load = 800 m² × 25 VA/m² = 20,000 VA = 20 kVA",
      "",
      "Step 3: Add Fixed Appliances",
      "  Fixed Appliances = 50 kW",
      "",
      "Step 4: Calculate Total Connected Load",
      "  Total = Socket + Lighting + Fixed Appliances",
      "  = 24 kVA + 20 kVA + 50 kVA",
      "  = 94 kVA",
      "",
      "Step 5: Apply Diversity Factor",
      "  Maximum Demand = 94 kVA × 0.75 = 70.5 kVA",
      "",
      "Step 6: Add Safety Margin (15%)",
      "  Design Load = 70.5 kVA × 1.15 = 81 kVA",
      "",
      "Conclusion: Specify a 100 kVA supply for this office building"
    ];

    exampleSteps.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });

    // Section 5: Best Practices
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. Best Practices", 14, yPos);
    yPos += 10;

    const bestPractices = [
      "✓ Use the appropriate table for the specific building type",
      "✓ Select socket loads based on actual floor area ranges",
      "✓ Choose lighting values appropriate to the space usage",
      "✓ Account for all fixed appliances separately",
      "✓ Apply realistic diversity factors (0.70-0.85 typical)",
      "✓ Include future expansion allowance (10-20%)",
      "✓ Document all load calculations clearly",
      "",
      "Common Pitfalls to Avoid:",
      "✗ Using the wrong building type classification",
      "✗ Overlooking fixed appliances in the calculation",
      "✗ Applying unrealistic diversity factors",
      "✗ Mixing area ranges from different tables",
      "✗ Not accounting for emergency and standby loads"
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    bestPractices.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `SANS 10142-1 Guide - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save("SANS_10142-1_Calculation_Guide.pdf");
    toast.success("SANS 10142-1 guide downloaded successfully");
  };

  const generateResidentialADMDGuide = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Residential ADMD Calculation Guide", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("After Diversity Maximum Demand for Multi-Unit Residential", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Section 1: Overview
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("1. Overview", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const overviewText = [
      "The ADMD method is specifically designed for residential developments with multiple units.",
      "It accounts for the statistical reality that not all units will use maximum power simultaneously.",
      "This method is based on units per phase for three-phase distribution systems."
    ];
    overviewText.forEach(line => {
      doc.text(line, 14, yPos);
      yPos += 5;
    });
    yPos += 10;

    // Section 2: ADMD Table
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. ADMD Diversity Factors", 14, yPos);
    yPos += 8;

    const admdData = ADMD_DIVERSITY_TABLE.slice(0, 15).map(row => [
      row.unitsPerPhase.toString(),
      row.diversityFactor.toFixed(2),
      `${row.unitsPerPhase * 3} units`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Units/Phase", "Diversity Factor", "Total Units (3-phase)"]],
      body: admdData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 3: Typical Unit Loads
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Typical Residential Unit Loads", 14, yPos);
    yPos += 8;

    const unitLoadsData = [
      ["Lighting", "5-8 × 15W", "75-120 W", "0.50"],
      ["Socket Outlets", "1-2 × 3000W", "3000-6000 W", "0.50"],
      ["Geyser", "1 × 2000W", "2000 W", "1.00"],
      ["Stove", "1 × 2000W", "2000 W", "0.50"],
      ["Pool Pump", "0-1 × 1500W", "0-1500 W", "1.00"]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["Load Type", "Quantity × Rating", "Total Load", "Diversity"]],
      body: unitLoadsData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Section 4: Worked Example
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. Worked Example", 14, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project: 18-Unit Apartment Complex (3-phase supply)", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const exampleSteps = [
      "Step 1: Calculate Load per Unit",
      "  Lighting: 5 × 15W × 0.5 = 37.5 W",
      "  Sockets: 1 × 3000W × 0.5 = 1500 W",
      "  Geyser: 1 × 2000W × 1.0 = 2000 W",
      "  Stove: 1 × 2000W × 0.5 = 1000 W",
      "  Total per unit after diversity = 4537.5 W ≈ 4.54 kW",
      "",
      "Step 2: Calculate Total Units per Phase",
      "  18 units ÷ 3 phases = 6 units per phase",
      "",
      "Step 3: Determine ADMD Factor",
      "  From table: 6 units/phase = 0.50 diversity factor",
      "",
      "Step 4: Calculate Maximum Demand per Phase",
      "  Per phase: 6 units × 4.54 kW × 0.50 = 13.62 kW",
      "",
      "Step 5: Calculate Total Maximum Demand",
      "  Total: 13.62 kW × 3 phases = 40.86 kW",
      "",
      "Step 6: Account for Unbalanced Loading (add 15%)",
      "  Design load: 40.86 kW × 1.15 = 47 kW",
      "",
      "Step 7: Convert to kVA (assuming 0.95 power factor)",
      "  Design capacity: 47 kW ÷ 0.95 = 49.5 kVA",
      "",
      "Conclusion: Specify a 63 kVA or 80 kVA three-phase supply"
    ];

    exampleSteps.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });

    // Section 5: Best Practices
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. Best Practices", 14, yPos);
    yPos += 10;

    const bestPractices = [
      "✓ Always calculate based on units per phase, not total units",
      "✓ Use realistic diversity factors for individual loads",
      "✓ Account for future electric vehicle charging (add 20-30%)",
      "✓ Consider unbalanced loading (add 10-15% safety margin)",
      "✓ Verify power factor assumptions (typical 0.90-0.95)",
      "✓ Document all load assumptions clearly",
      "✓ Consider seasonal variations (heating/cooling)",
      "",
      "Common Pitfalls to Avoid:",
      "✗ Using total units instead of units per phase",
      "✗ Applying commercial diversity factors to residential",
      "✗ Ignoring three-phase distribution",
      "✗ Not accounting for future EV charging loads",
      "✗ Using incorrect ADMD factor from table",
      "✗ Forgetting to convert kW to kVA for final sizing"
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    bestPractices.forEach(line => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Residential ADMD Guide - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save("Residential_ADMD_Calculation_Guide.pdf");
    toast.success("Residential ADMD guide downloaded successfully");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold">Calculation Method</h3>
        
        <div className="space-y-2">
          <Label>Select Calculation Standard</Label>
          <Select value={calculationType} onValueChange={setCalculationType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select calculation method" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="sans_204">SANS 204 - Commercial/Retail</SelectItem>
              <SelectItem value="sans_10142">SANS 10142-1 - General Buildings</SelectItem>
              <SelectItem value="residential">Residential ADMD Method</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSaveCalculationType} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Calculation Method"}
          </Button>

          <Button variant="outline" onClick={() => setTutorialOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Start Tutorial
          </Button>

          {calculationType === "sans_204" && (
            <Button variant="outline" onClick={generateSANS204Guide}>
              <Download className="mr-2 h-4 w-4" />
              Download Guide
            </Button>
          )}
          {calculationType === "sans_10142" && (
            <Button variant="outline" onClick={generateSANS10142Guide}>
              <Download className="mr-2 h-4 w-4" />
              Download Guide
            </Button>
          )}
          {calculationType === "residential" && (
            <Button variant="outline" onClick={generateResidentialADMDGuide}>
              <Download className="mr-2 h-4 w-4" />
              Download Guide
            </Button>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>SANS 204:</strong> Used for commercial and retail buildings. Provides maximum energy demand based on building classification and climatic zone.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>SANS 10142-1:</strong> General electrical installation standard for various building types including offices, industrial, and educational facilities.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Residential ADMD:</strong> After Diversity Maximum Demand method specifically designed for residential developments and multi-unit dwellings.
          </p>
        </div>
      </div>

      {/* Conditional rendering based on calculation type */}
      {calculationType === "sans_204" && (
        <>
          <div className="space-y-4 border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">SANS 204 Summary Statistics</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHeatMap(!showHeatMap)}
              >
                {showHeatMap ? "Hide" : "Show"} Heat Map
              </Button>
            </div>

        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold">{Math.round(avgVa * 10) / 10}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <p className="text-sm text-muted-foreground mb-1">Minimum</p>
            <p className="text-2xl font-bold">{minVa}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
          <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
            <p className="text-sm text-muted-foreground mb-1">Maximum</p>
            <p className="text-2xl font-bold">{maxVa}</p>
            <p className="text-xs text-muted-foreground">VA/m²</p>
          </div>
        </div>

        {/* Zone Statistics Grid */}
        <div className="pt-4">
          <h4 className="text-sm font-semibold mb-3">Statistics by Climatic Zone</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {zoneStats.map((stat, idx) => (
              <div key={idx} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">Zone {idx + 1}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg:</span>
                    <span className="font-medium">{Math.round(stat.avg * 10) / 10}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="font-medium">{stat.min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="font-medium">{stat.max}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-6 bg-card">
        <h3 className="text-lg font-semibold">SANS 204 Complete Zone Comparison (VA/m²)</h3>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Maximum energy demand values per building class across all climatic zones
          </p>

          {showHeatMap && (
            <div className="flex items-center gap-4 text-xs">
              <span className="font-medium">Heat Map Legend:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 dark:bg-green-950/30 border rounded"></div>
                <span>Low ({minVa}-{minVa + 6} VA/m²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-950/30 border rounded"></div>
                <span>Medium ({minVa + 7}-{maxVa - 7} VA/m²)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-950/30 border rounded"></div>
                <span>High ({maxVa - 6}-{maxVa} VA/m²)</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-3 text-sm font-semibold bg-muted/50">Class</th>
                  <th className="text-left p-3 text-sm font-semibold bg-muted/50">Building Type</th>
                  {CLIMATIC_ZONES.map((zone) => (
                    <th key={zone.value} className="text-center p-3 text-sm font-semibold bg-muted/50">
                      <div>Zone {zone.value}</div>
                      <div className="text-xs font-normal text-muted-foreground">{zone.name.split(' ')[0]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(SANS_204_TABLE).map(([code, data]) => (
                  <tr key={code} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono">{code}</Badge>
                    </td>
                    <td className="p-3 text-sm font-medium">{data.name}</td>
                    {data.zones.map((value, idx) => (
                      <td 
                        key={idx} 
                        className={`text-center p-3 text-sm font-bold transition-colors ${getHeatMapColor(value)}`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold mb-3">Climatic Zones Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CLIMATIC_ZONES.map((zone) => (
                <div key={zone.value} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs font-mono">Zone {zone.value}</Badge>
                    <span className="text-sm font-semibold">{zone.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Major cities: {zone.cities}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {calculationType === "sans_10142" && (
        <>
          <div className="space-y-4 border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold">SANS 10142-1 Socket Outlet Loads</h3>
            <p className="text-sm text-muted-foreground">
              Socket outlet loads (VA/m²) by building type and floor area
            </p>

            <div className="space-y-6 mt-4">
              {Object.entries(SANS_10142_SOCKET_LOADS).map(([key, data]) => (
                <div key={key} className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-semibold mb-3">{data.name}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.ranges.map((item, idx) => (
                      <div key={idx} className="p-3 border rounded bg-card">
                        <p className="text-xs text-muted-foreground mb-1">{item.range}</p>
                        <p className="text-lg font-bold">{item.load}</p>
                        <p className="text-xs text-muted-foreground">VA/m²</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold">SANS 10142-1 Lighting Loads</h3>
            <p className="text-sm text-muted-foreground">
              Lighting load values (VA/m²) by building type
            </p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3 text-sm font-semibold bg-muted/50">Building Type</th>
                    <th className="text-center p-3 text-sm font-semibold bg-muted/50">Minimum</th>
                    <th className="text-center p-3 text-sm font-semibold bg-muted/50">Typical</th>
                    <th className="text-center p-3 text-sm font-semibold bg-muted/50">Maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SANS_10142_LIGHTING_LOADS).map(([key, data]) => (
                    <tr key={key} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium">{data.name}</td>
                      <td className="text-center p-3 text-sm font-bold bg-green-50 dark:bg-green-950/20">{data.min}</td>
                      <td className="text-center p-3 text-sm font-bold bg-blue-50 dark:bg-blue-950/20">{data.typical}</td>
                      <td className="text-center p-3 text-sm font-bold bg-orange-50 dark:bg-orange-950/20">{data.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> Total load = Socket outlet load + Lighting load + Fixed appliances load. 
                Apply appropriate diversity factor based on building usage.
              </p>
            </div>
          </div>
        </>
      )}

      {calculationType === "residential" && (
        <>
          <div className="space-y-4 border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold">Residential ADMD Diversity Factors</h3>
            <p className="text-sm text-muted-foreground">
              After Diversity Maximum Demand factors based on units per phase (three-phase distribution)
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { label: "1 Unit/Phase", value: "1.00" },
                { label: "2-3 Units/Phase", value: "0.62-0.72" },
                { label: "4-9 Units/Phase", value: "0.45-0.57" },
                { label: "10-19 Units/Phase", value: "0.42-0.45" },
                { label: "20-39 Units/Phase", value: "0.37-0.40" },
                { label: "40-99 Units/Phase", value: "0.36-0.37" },
                { label: "100+ Units/Phase", value: "0.34-0.36" },
                { label: "Maximum (350)", value: "0.34" },
              ].map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <h4 className="font-semibold mb-3">Complete ADMD Table</h4>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3 text-sm font-semibold bg-muted/50">Units per Phase</th>
                    <th className="text-center p-3 text-sm font-semibold bg-muted/50">Diversity Factor</th>
                    <th className="text-left p-3 text-sm font-semibold bg-muted/50">Equivalent Total Units (3-phase)</th>
                  </tr>
                </thead>
                <tbody>
                  {ADMD_DIVERSITY_TABLE.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm">{row.unitsPerPhase}</td>
                      <td className="text-center p-3 text-sm font-bold">{row.diversityFactor.toFixed(2)}</td>
                      <td className="p-3 text-sm text-muted-foreground">{row.unitsPerPhase * 3} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold">Typical Residential Load Components</h3>
            <p className="text-sm text-muted-foreground">
              Standard load values for residential unit calculations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Lighting</Badge>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Per lamp</span>
                    <span className="font-bold">15 W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Typical units</span>
                    <span className="font-bold">5-8 lamps</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity</span>
                    <span className="font-bold">0.5 (50%)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Socket Outlets</Badge>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Per outlet</span>
                    <span className="font-bold">3000 W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Typical units</span>
                    <span className="font-bold">1-2 outlets</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity</span>
                    <span className="font-bold">0.5 (50%)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Geyser</Badge>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Load</span>
                    <span className="font-bold">2000 W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per unit</span>
                    <span className="font-bold">1 geyser</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity</span>
                    <span className="font-bold">1.0 (100%)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Stove</Badge>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Load</span>
                    <span className="font-bold">2000 W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per unit</span>
                    <span className="font-bold">1 stove</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diversity</span>
                    <span className="font-bold">0.5 (50%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm">
                <strong>Calculation Method:</strong> Sum all loads per unit × diversity factors, then multiply by the 
                ADMD diversity factor based on total units per phase to get maximum demand.
              </p>
            </div>
          </div>
        </>
      )}
      
      <CalculationTutorial
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        calculationType={calculationType}
      />
    </div>
  );
};
