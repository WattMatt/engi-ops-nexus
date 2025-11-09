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
        .single();

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
        ['Class', 'Building Type', 'Zone 1\nCold', 'Zone 2\nTemp Int', 'Zone 3\nHot Int', 'Zone 4\nTemp Coast', 'Zone 5\nSub-trop', 'Zone 6\nArid'],
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

      // Statistics section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SANS 204 Summary Statistics", 14, yPos);
      yPos += 8;

      const statsData = [
        ['Metric', 'Value'],
        ['Overall Average', '82.6 VA/m²'],
        ['Minimum Value', '75 VA/m²'],
        ['Maximum Value', '95 VA/m²'],
        ['Range', '20 VA/m² (27% variation)'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [statsData[0]],
        body: statsData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 67, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Zone-specific statistics
      const zoneStatsData = [
        ['Zone', 'Description', 'Average', 'Min', 'Max'],
        ['Zone 1', 'Cold Interior', '84.3', '80', '90'],
        ['Zone 2', 'Temp Interior', '79.3', '75', '85'],
        ['Zone 3', 'Hot Interior', '89.3', '85', '95'],
        ['Zone 4', 'Temp Coastal', '79.3', '75', '85'],
        ['Zone 5', 'Sub-tropical', '79.3', '75', '85'],
        ['Zone 6', 'Arid Interior', '84.3', '80', '90'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [zoneStatsData[0]],
        body: zoneStatsData.slice(1),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 50 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Key Insights
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Key Insights", 14, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const insights = [
        '• The range across all zones and building types is 20 VA/m² (27% variation)',
        '• Hot interior zones (Zone 3) require the highest loads due to cooling requirements',
        '• Retail (F1) and Hotels (H1) have the highest load requirements',
        `• Your selected configuration requires ${document.va_per_sqm || '90'} VA/m² in ${document.climatic_zone || 'Zone 1'}`,
      ];

      insights.forEach(insight => {
        const splitText = doc.splitTextToSize(insight, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 5 + 2;
      });

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
