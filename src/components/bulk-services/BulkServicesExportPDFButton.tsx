import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import html2canvas from "html2canvas";
import { COPPER_CABLE_TABLE } from "@/utils/cableSizing";

interface BulkServicesExportPDFButtonProps {
  documentId: string;
  onReportSaved?: () => void;
}

export function BulkServicesExportPDFButton({ documentId, onReportSaved }: BulkServicesExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);

  const { data: document } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("id", documentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["bulk-services-sections", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_sections")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId,
  });

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    if (!document) {
      toast.error("No document data available");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Get the latest revision
      const { data: latestReport } = await supabase
        .from("bulk_services_reports")
        .select("revision")
        .eq("document_id", documentId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextRevision = "Rev.0";
      if (latestReport?.revision) {
        const currentRevNum = parseInt(latestReport.revision.replace("Rev.", ""));
        nextRevision = `Rev.${currentRevNum + 1}`;
      }

      const companyDetails = await fetchCompanyDetails();

      // Fetch project to get project name
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", document.project_id)
        .single();

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Bulk Services Report",
        projectName: project?.name || "Bulk Services",
        subtitle: `Document ${document.document_number}`,
        revision: nextRevision,
      }, companyDetails);

      // ========== PAGE 2: DOCUMENT INFORMATION ==========
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DOCUMENT INFORMATION", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Document Number: ${document.document_number}`, 14, yPos);
      yPos += 6;
      doc.text(`Project: ${project?.name || ""}`, 14, yPos);
      yPos += 6;
      doc.text(`Created: ${format(new Date(document.created_at), "dd MMMM yyyy")}`, 14, yPos);
      yPos += 6;
      
      if (document.building_calculation_type) {
        const methodNames: Record<string, string> = {
          'sans_204': 'SANS 204 - Commercial/Retail',
          'sans_10142': 'SANS 10142-1 - General Buildings',
          'residential': 'Residential ADMD Method'
        };
        doc.text(`Calculation Method: ${methodNames[document.building_calculation_type] || document.building_calculation_type}`, 14, yPos);
        yPos += 6;
      }

      if (document.notes) {
        yPos += 4;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const splitNotes = doc.splitTextToSize(document.notes, 180);
        doc.text(splitNotes, 14, yPos);
        yPos += splitNotes.length * 5 + 6;
      }

      // ========== PAGE 3: SANS 204 ANALYSIS ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SANS 204 LOAD ANALYSIS", 14, yPos);
      yPos += 10;

      // Building classification info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const methodNames: Record<string, string> = {
        'sans_204': 'SANS 204 - Commercial/Retail',
        'sans_10142': 'SANS 10142-1 - General Buildings',
        'residential': 'Residential ADMD Method'
      };
      doc.text(`Calculation Method: ${methodNames[document.building_calculation_type] || 'SANS 204'}`, 14, yPos);
      yPos += 6;
      doc.text(`Project Area: ${document.project_area ? document.project_area.toLocaleString() : 'Not set'} m²`, 14, yPos);
      yPos += 6;
      doc.text(`Climatic Zone: ${document.climatic_zone || 'Not set'}`, 14, yPos);
      yPos += 6;
      doc.text(`Applied Load: ${document.va_per_sqm || 'Not set'} VA/m²`, 14, yPos);
      yPos += 10;

      // SANS 204 Table 1 - Zone Comparison
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SANS 204 Table 1 - Zone Comparison (VA/m²)", 14, yPos);
      yPos += 8;

      const sans204Data = [
        ['Class', 'Building Type', 'Zone 1\nCold Int', 'Zone 2\nTemp Int', 'Zone 3\nHot Int', 'Zone 4\nTemp Coast', 'Zone 5\nSub-trop', 'Zone 6\nArid Int'],
        ['A1', 'Entertainment & Assembly', '85', '80', '90', '80', '80', '85'],
        ['A2', 'Theatrical & Indoor Sport', '85', '80', '90', '80', '80', '85'],
        ['A3', 'Places of Instruction', '80', '75', '85', '75', '75', '80'],
        ['A4', 'Worship', '80', '75', '85', '75', '75', '80'],
        ['F1', 'Large Shop (Retail)', '90', '85', '95', '85', '85', '90'],
        ['G1', 'Offices', '80', '75', '85', '75', '75', '80'],
        ['H1', 'Hotel', '90', '85', '95', '85', '85', '90'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [sans204Data[0]],
        body: sans204Data.slice(1),
        theme: "grid",
        headStyles: { 
          fillColor: [41, 128, 185], 
          fontSize: 7,
          halign: 'center',
        },
        styles: { 
          fontSize: 7,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 15, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
          // Highlight cells based on value (heatmap effect)
          if (data.section === 'body' && data.column.index >= 2) {
            const value = parseInt(data.cell.text[0]);
            if (value >= 89) {
              data.cell.styles.fillColor = [255, 200, 200]; // High - light red
            } else if (value >= 82) {
              data.cell.styles.fillColor = [255, 235, 200]; // Medium - light orange
            } else {
              data.cell.styles.fillColor = [200, 230, 255]; // Low - light blue
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Helper function to draw a statistic card
      const drawStatCard = (
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        value: string,
        unit: string,
        fillColor: [number, number, number],
        borderColor: [number, number, number],
        textColor: [number, number, number]
      ) => {
        // Draw background with rounded corners
        doc.setFillColor(...fillColor);
        doc.roundedRect(x, y, width, height, 2, 2, 'F');
        
        // Draw border
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, width, height, 2, 2, 'S');
        
        // Draw label (top)
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + width/2, y + 8, { align: 'center' });
        
        // Draw value (center, large)
        doc.setTextColor(...textColor);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + width/2, y + height/2 + 3, { align: 'center' });
        
        // Draw unit (bottom)
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(unit, x + width/2, y + height - 6, { align: 'center' });
        
        // Reset colors
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
      };

      // Helper function to draw a zone card
      const drawZoneCard = (
        x: number,
        y: number,
        width: number,
        height: number,
        zoneNum: string,
        zoneName: string,
        avg: string,
        min: string,
        max: string,
        isSelected: boolean = false
      ) => {
        // Draw background
        if (isSelected) {
          doc.setFillColor(224, 242, 254);
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(1);
        } else {
          doc.setFillColor(249, 250, 251);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
        }
        doc.roundedRect(x, y, width, height, 2, 2, 'FD');
        
        // Zone header
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${zoneNum}`, x + 3, y + 6);
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(zoneName, x + 3, y + 10);
        
        // Statistics (stacked)
        doc.setFontSize(8);
        const statsStartY = y + 16;
        const lineHeight = 4;
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Avg:", x + 3, statsStartY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(avg, x + width - 3, statsStartY, { align: 'right' });
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Min:", x + 3, statsStartY + lineHeight);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(min, x + width - 3, statsStartY + lineHeight, { align: 'right' });
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Max:", x + 3, statsStartY + lineHeight * 2);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(max, x + width - 3, statsStartY + lineHeight * 2, { align: 'right' });
        
        // Reset
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
      };

      // ========== OVERALL STATISTICS CARDS ==========
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Statistics", 14, yPos);
      yPos += 8;

      const cardWidth = 60;
      const cardHeight = 35;
      const cardGap = 5;
      const cardsStartX = 14;

      // Average Card (Blue)
      drawStatCard(
        cardsStartX,
        yPos,
        cardWidth,
        cardHeight,
        "Average",
        "82.6",
        "VA/m²",
        [224, 242, 254], // Light blue fill
        [147, 197, 253], // Blue border
        [37, 99, 235]    // Blue text
      );

      // Minimum Card (Green)
      drawStatCard(
        cardsStartX + cardWidth + cardGap,
        yPos,
        cardWidth,
        cardHeight,
        "Minimum",
        "75",
        "VA/m²",
        [220, 252, 231], // Light green fill
        [134, 239, 172], // Green border
        [22, 163, 74]    // Green text
      );

      // Maximum Card (Red)
      drawStatCard(
        cardsStartX + (cardWidth + cardGap) * 2,
        yPos,
        cardWidth,
        cardHeight,
        "Maximum",
        "95",
        "VA/m²",
        [254, 226, 226], // Light red fill
        [252, 165, 165], // Red border
        [220, 38, 38]    // Red text
      );

      yPos += cardHeight + 15;

      // ========== ZONE STATISTICS GRID ==========
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Zone Statistics", 14, yPos);
      yPos += 8;

      const zoneCardWidth = 60;
      const zoneCardHeight = 30;
      const zoneCardGap = 5;
      const zonesStartX = 14;
      const zonesPerRow = 3;

      const zoneData = [
        { num: "Zone 1", name: "Cold Interior", avg: "84.3", min: "80", max: "90" },
        { num: "Zone 2", name: "Temperate Interior", avg: "79.3", min: "75", max: "85" },
        { num: "Zone 3", name: "Hot Interior", avg: "89.3", min: "85", max: "95" },
        { num: "Zone 4", name: "Temperate Coastal", avg: "79.3", min: "75", max: "85" },
        { num: "Zone 5", name: "Sub-tropical Coastal", avg: "79.3", min: "75", max: "85" },
        { num: "Zone 6", name: "Arid Interior", avg: "84.3", min: "80", max: "90" },
      ];

      // Determine selected zone based on document.climatic_zone
      const selectedZoneNum = document.climatic_zone ? 
        parseInt(document.climatic_zone.replace(/\D/g, '')) : null;

      zoneData.forEach((zone, index) => {
        const row = Math.floor(index / zonesPerRow);
        const col = index % zonesPerRow;
        const x = zonesStartX + col * (zoneCardWidth + zoneCardGap);
        const y = yPos + row * (zoneCardHeight + zoneCardGap);
        const zoneNum = parseInt(zone.num.replace(/\D/g, ''));
        const isSelected = zoneNum === selectedZoneNum;

        drawZoneCard(x, y, zoneCardWidth, zoneCardHeight, zone.num, zone.name, 
          zone.avg, zone.min, zone.max, isSelected);
      });

      yPos += Math.ceil(zoneData.length / zonesPerRow) * (zoneCardHeight + zoneCardGap) + 10;

      // ========== KEY INSIGHTS ==========
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Key Insights", 14, yPos);
      yPos += 8;

      const insights = [
        '• The range across all zones and building types is 20 VA/m² (27% variation)',
        '• Hot interior zones (Zone 3) require the highest loads due to cooling requirements',
        '• Retail (F1) and Hotels (H1) have the highest load requirements',
        `• Your selected configuration requires ${document.va_per_sqm || '90'} VA/m² in ${document.climatic_zone || 'Zone 1'}`,
      ];

      // Calculate box height based on content
      const insightsBoxPadding = 6;
      const insightLineHeight = 5;
      let totalInsightHeight = insightsBoxPadding;
      insights.forEach(insight => {
        const splitText = doc.splitTextToSize(insight, 180 - insightsBoxPadding * 2);
        totalInsightHeight += splitText.length * insightLineHeight + 2;
      });
      totalInsightHeight += insightsBoxPadding;

      // Draw background box for insights
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, yPos, 180, totalInsightHeight, 2, 2, 'FD');

      yPos += insightsBoxPadding + 4;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      insights.forEach(insight => {
        const splitText = doc.splitTextToSize(insight, 180 - insightsBoxPadding * 2);
        doc.text(splitText, 14 + insightsBoxPadding, yPos);
        yPos += splitText.length * insightLineHeight + 2;
      });

      doc.setTextColor(0, 0, 0);
      yPos += insightsBoxPadding;

      // ========== ZONE STATISTICS CHART ==========
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Zone Load Comparison Chart", 14, yPos);
      yPos += 8;

      try {
        // Try to capture the chart from the UI
        const chartElement = window.document.getElementById('zone-statistics-chart');
        if (chartElement) {
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 180;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if we need a new page
          if (yPos + imgHeight > 270) {
            doc.addPage();
            yPos = 20;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Zone Load Comparison Chart", 14, yPos);
            yPos += 8;
          }
          
          doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } else {
          // Fallback: Add a note if chart not available
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          doc.text("(Zone comparison chart not available - open calculator to include chart)", 14, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 10;
        }
      } catch (error) {
        console.error("Error capturing chart:", error);
        // Continue without chart
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("(Zone comparison chart could not be generated)", 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }

      // Calculation breakdown if data available
      if (document.project_area && document.va_per_sqm) {
        yPos += 6;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Calculation Breakdown", 14, yPos);
        yPos += 8;

        const totalConnectedLoad = document.project_area * document.va_per_sqm / 1000;
        const maxDemand = totalConnectedLoad * (document.diversity_factor || 0.75);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        doc.text(`1. SANS 204 Applied Load: ${document.va_per_sqm} VA/m²`, 20, yPos);
        yPos += 6;
        doc.text(`2. Total Connected Load: ${document.project_area.toLocaleString()} m² × ${document.va_per_sqm} VA/m² = ${(document.project_area * document.va_per_sqm).toLocaleString()} VA`, 20, yPos);
        yPos += 6;
        doc.text(`3. Convert to kVA: ${(document.project_area * document.va_per_sqm).toLocaleString()} VA ÷ 1000 = ${totalConnectedLoad.toFixed(2)} kVA`, 20, yPos);
        yPos += 6;
        doc.text(`4. Apply Diversity Factor: ${totalConnectedLoad.toFixed(2)} kVA × ${document.diversity_factor || 0.75} = ${maxDemand.toFixed(2)} kVA`, 20, yPos);
        yPos += 10;

        // Summary box
        const summaryData = [
          ['Parameter', 'Value'],
          ['Total Connected Load', `${totalConnectedLoad.toFixed(2)} kVA`],
          ['Diversity Factor', `${document.diversity_factor || 0.75}`],
          ['Maximum Demand', `${maxDemand.toFixed(2)} kVA`],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [summaryData[0]],
          body: summaryData.slice(1),
          theme: "plain",
          headStyles: { fillColor: [240, 240, 240], fontSize: 9, fontStyle: 'bold' },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 80, fontStyle: 'bold' },
            1: { cellWidth: 67, halign: 'right' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ========== PAGE: CONNECTION SIZE & CABLE ROUTING ==========
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CONNECTION SIZE & CABLE ROUTING RECOMMENDATIONS", 14, yPos);
      yPos += 10;

      // Calculate cable requirements
      const maxDemandKVA = document.maximum_demand || 0;
      const maxDemandAmps = maxDemandKVA > 0 ? (maxDemandKVA * 1000) / (Math.sqrt(3) * 400) : 0;
      
      // Determine number of cables needed
      const maxAmpsPerCable = 300; // Standard max per cable
      const cablesNeeded = Math.ceil(maxDemandAmps / maxAmpsPerCable);
      const ampsPerCable = maxDemandAmps / cablesNeeded;
      
      
      // Find suitable cable size from table
      const suitableCable = COPPER_CABLE_TABLE.find(cable => cable.currentRatingAir >= ampsPerCable) 
        || COPPER_CABLE_TABLE[COPPER_CABLE_TABLE.length - 1];

      // Connection Details Box
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Connection Parameters", 14, yPos);
      yPos += 8;

      const connectionData = [
        ['Parameter', 'Value', 'Notes'],
        ['Maximum Demand', `${maxDemandKVA.toFixed(2)} kVA`, 'After diversity'],
        ['Supply Voltage', `${document.primary_voltage || '11kV/400V'}`, '3-Phase'],
        ['Design Current', `${maxDemandAmps.toFixed(1)} A`, 'Per phase'],
        ['Connection Size', `${document.connection_size || maxDemandKVA.toFixed(0) + ' kVA'}`, 'Required capacity'],
        ['Supply Authority', `${document.supply_authority || 'TBD'}`, 'Local municipality'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [connectionData[0]],
        body: connectionData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [52, 152, 219], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 45, halign: 'center' },
          2: { cellWidth: 82 },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Visual Diagram - Connection Point to Distribution
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Single Line Diagram - Bulk Connection", 14, yPos);
      yPos += 8;

      const diagramStartX = 30;
      const diagramWidth = 150;
      
      // Draw Supply Point (top)
      doc.setFillColor(52, 152, 219);
      doc.roundedRect(diagramStartX + diagramWidth/2 - 30, yPos, 60, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SUPPLY AUTHORITY", diagramStartX + diagramWidth/2, yPos + 8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 18;
      
      // Supply details
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`${document.primary_voltage || '11kV'}`, diagramStartX + diagramWidth/2, yPos, { align: 'center' });
      yPos += 5;

      // Vertical line from supply
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(diagramStartX + diagramWidth/2, yPos, diagramStartX + diagramWidth/2, yPos + 15);
      yPos += 18;

      // Metering Equipment
      doc.setFillColor(241, 196, 15);
      doc.roundedRect(diagramStartX + diagramWidth/2 - 35, yPos, 70, 16, 2, 2, 'FD');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("BULK METERING", diagramStartX + diagramWidth/2, yPos + 6, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`${document.connection_size || maxDemandKVA.toFixed(0) + ' kVA'}`, 
        diagramStartX + diagramWidth/2, yPos + 11, { align: 'center' });
      doc.text("(Municipal Equipment)", diagramStartX + diagramWidth/2, yPos + 14, { align: 'center' });
      
      yPos += 22;

      // Vertical line
      doc.line(diagramStartX + diagramWidth/2, yPos, diagramStartX + diagramWidth/2, yPos + 12);
      yPos += 15;

      // Main Protection Device
      doc.setFillColor(231, 76, 60);
      doc.roundedRect(diagramStartX + diagramWidth/2 - 40, yPos, 80, 16, 2, 2, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("MAIN PROTECTION", diagramStartX + diagramWidth/2, yPos + 6, { align: 'center' });
      
      const breakerSize = Math.ceil(maxDemandAmps / 50) * 50; // Round up to nearest 50A
      doc.setFontSize(8);
      doc.text(`MCCB ${breakerSize}A`, diagramStartX + diagramWidth/2, yPos + 11, { align: 'center' });
      doc.text(`@ 400V 3φ`, diagramStartX + diagramWidth/2, yPos + 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 22;

      // Vertical line with cable annotation
      doc.line(diagramStartX + diagramWidth/2, yPos, diagramStartX + diagramWidth/2, yPos + 20);
      
      // Cable annotation
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      if (cablesNeeded > 1) {
        doc.text(`${cablesNeeded}x ${suitableCable.size} COPPER`, diagramStartX + diagramWidth/2 + 5, yPos + 8);
        doc.text(`(${ampsPerCable.toFixed(0)}A per cable)`, diagramStartX + diagramWidth/2 + 5, yPos + 12);
      } else {
        doc.text(`${suitableCable.size} COPPER`, diagramStartX + diagramWidth/2 + 5, yPos + 8);
        doc.text(`(${maxDemandAmps.toFixed(0)}A)`, diagramStartX + diagramWidth/2 + 5, yPos + 12);
      }
      doc.text(`PVC/SWA/PVC`, diagramStartX + diagramWidth/2 + 5, yPos + 16);
      
      yPos += 25;

      // Main Distribution Board
      doc.setFillColor(46, 204, 113);
      doc.roundedRect(diagramStartX + diagramWidth/2 - 45, yPos, 90, 16, 2, 2, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("MAIN DISTRIBUTION BOARD", diagramStartX + diagramWidth/2, yPos + 6, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("(MDB - Location per layout)", diagramStartX + diagramWidth/2, yPos + 11, { align: 'center' });
      doc.text(`Busbar Rating: ${breakerSize}A`, diagramStartX + diagramWidth/2, yPos + 14, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 22;

      // Distribution lines to sub-boards
      const subBoardCount = 3;
      const subBoardSpacing = diagramWidth / (subBoardCount + 1);
      
      // Draw distribution lines
      for (let i = 1; i <= subBoardCount; i++) {
        const xPos = diagramStartX + (subBoardSpacing * i);
        // Vertical line down from MDB
        doc.line(diagramStartX + diagramWidth/2, yPos, xPos, yPos + 8);
        doc.line(xPos, yPos + 8, xPos, yPos + 15);
      }
      
      yPos += 18;

      // Sub-distribution boards
      for (let i = 1; i <= subBoardCount; i++) {
        const xPos = diagramStartX + (subBoardSpacing * i) - 18;
        doc.setFillColor(155, 89, 182);
        doc.roundedRect(xPos, yPos, 36, 12, 2, 2, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(`SUB-DB ${i}`, xPos + 18, yPos + 5, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.text(`Area ${i}`, xPos + 18, yPos + 9, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0);

      yPos += 18;

      // Cable Routing Recommendations Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Cable Routing Recommendations", 14, yPos);
      yPos += 8;

      const cableRouteData = [
        ['Route Segment', 'Cable Size', 'Installation Method', 'Protection'],
        ['Supply → Metering', 'By Supply Authority', 'Underground (Ducts)', 'As per Authority'],
        ['Metering → Main Protection', suitableCable.size + (cablesNeeded > 1 ? ` (${cablesNeeded} cables)` : ''), 'Underground/Trunking', `${breakerSize}A MCCB`],
        ['Main → Sub-distribution', 'Per sub-board load', 'Trunking/Cable Tray', 'Per circuit design'],
        ['Future Expansion', `Allow ${Math.round((document.future_expansion_factor || 1.2 - 1) * 100)}% spare capacity`, 'Reserve conduits', 'Upsize protection'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [cableRouteData[0]],
        body: cableRouteData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 42 },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Technical Notes
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Technical Notes:", 14, yPos);
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const technicalNotes = [
        `• All cables to be copper conductors, PVC insulated, SWA armoured, PVC sheathed`,
        `• Cable sizing based on ${maxDemandKVA.toFixed(2)} kVA maximum demand (${maxDemandAmps.toFixed(1)}A)`,
        `• Installation method: ${suitableCable.currentRatingAir}A rating (air/trunking installation)`,
        `• Voltage drop allowance: 2.5% from source to final distribution point`,
        `• All cable terminations to be crimped with appropriate lugs`,
        `• Earth continuity to be maintained throughout via cable armouring and earth bar`,
        `• Color coding: Brown/Black/Grey (L1/L2/L3), Blue (Neutral), Green-Yellow (Earth)`,
        `• Future expansion factor of ${((document.future_expansion_factor || 1.2) * 100).toFixed(0)}% considered in main infrastructure`,
      ];

      technicalNotes.forEach(note => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const splitText = doc.splitTextToSize(note, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 4 + 2;
      });

      // ========== SECTIONS CONTENT ==========
      if (sections.length > 0) {
        for (const section of sections) {
          // Add new page for each section
          doc.addPage();
          yPos = 20;

          // Section heading
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(`${section.section_number}. ${section.section_title}`, 14, yPos);
          yPos += 10;

          // Section content
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          
          if (section.content) {
            const contentLines = section.content.split('\n');
            
            for (const line of contentLines) {
              // Check if we need a new page
              if (yPos > 270) {
                doc.addPage();
                yPos = 20;
              }

              const trimmedLine = line.trim();
              
              // Handle headers
              if (trimmedLine.startsWith('## ')) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                const headerText = trimmedLine.replace('## ', '');
                doc.text(headerText, 14, yPos);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                yPos += 8;
              }
              // Handle table rows (simple rendering)
              else if (trimmedLine.startsWith('|')) {
                doc.setFont("courier", "normal");
                doc.setFontSize(8);
                const splitText = doc.splitTextToSize(trimmedLine, 180);
                doc.text(splitText, 14, yPos);
                yPos += splitText.length * 4;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
              }
              // Handle bullet points
              else if (trimmedLine.startsWith('- ')) {
                const bulletText = trimmedLine.replace('- ', '• ');
                const splitText = doc.splitTextToSize(bulletText, 170);
                doc.text(splitText, 18, yPos);
                yPos += splitText.length * 5 + 2;
              }
              // Regular text
              else if (trimmedLine) {
                const splitText = doc.splitTextToSize(trimmedLine, 180);
                doc.text(splitText, 14, yPos);
                yPos += splitText.length * 5 + 3;
              } else {
                yPos += 4; // Empty line spacing
              }
            }
          }
        }
      }

      // Generate PDF blob
      const pdfBlob = doc.output("blob");
      const fileName = `bulk-services-${document.document_number.replace(/\s+/g, "-")}-${nextRevision}-${Date.now()}.pdf`;
      const filePath = `${document.project_id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("bulk-services-reports")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save report record
      const { data: savedReport, error: saveError } = await supabase
        .from("bulk_services_reports")
        .insert({
          document_id: documentId,
          project_id: document.project_id,
          file_path: filePath,
          revision: nextRevision,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast.success("PDF report generated successfully");
      
      setPreviewReport(savedReport);
      onReportSaved?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        onClick={generatePDF}
        disabled={isGenerating || !document}
        variant="outline"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </>
        )}
      </Button>

      {previewReport && (
        <StandardReportPreview
          report={previewReport}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="bulk-services-reports"
        />
      )}
    </>
  );
}
