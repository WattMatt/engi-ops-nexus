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
