import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { captureChartAsCanvas, waitForElementRender } from "@/utils/pdfQualitySettings";
import { 
  generateBulkServicesPDF,
  type BulkServicesDocument,
  type BulkServicesSection,
} from "@/utils/pdfmake/bulkServicesBuilder";

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
      return data as BulkServicesDocument;
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
      return (data || []) as BulkServicesSection[];
    },
    enabled: !!documentId,
  });

  const generatePDF = async () => {
    if (!document) {
      toast.error("No document data available");
      return;
    }

    setIsGenerating(true);

    try {
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

      // Fetch project name
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", document.project_id)
        .single();

      // Try to capture chart if available
      let chartDataUrl: string | undefined;
      try {
        const chartElement = window.document.getElementById('zone-statistics-chart');
        if (chartElement) {
          await waitForElementRender(1500);
          const canvas = await captureChartAsCanvas(chartElement);
          chartDataUrl = canvas.toDataURL('image/png');
        }
      } catch (error) {
        console.warn('[BulkServicesPDF] Chart capture failed:', error);
      }

      console.log('[BulkServicesPDFButton] Starting PDF generation...');
      
      // Generate PDF using pdfmake with timeout wrapper
      const pdfGenerationPromise = generateBulkServicesPDF(
        document,
        sections,
        {
          projectName: project?.name || "Bulk Services",
          revision: nextRevision,
          chartDataUrl,
        }
      );
      
      // Add an overall timeout for the PDF generation
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out after 120 seconds')), 120000)
      );
      
      const { blob, filename } = await Promise.race([pdfGenerationPromise, timeoutPromise]);
      
      console.log('[BulkServicesPDFButton] PDF generated, size:', blob.size);
      
      // Check if we got a real blob or a fallback placeholder
      if (blob.type === 'text/plain') {
        // Direct download fallback was used - file was already saved
        toast.success("PDF downloaded directly (fallback mode)");
        onReportSaved?.();
        return;
      }

      // Upload to storage
      const filePath = `${document.project_id}/${filename}`;
      console.log('[BulkServicesPDFButton] Uploading to storage:', filePath);
      
      const { error: uploadError } = await supabase.storage
        .from("bulk-services-reports")
        .upload(filePath, blob, {
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
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      const errorMessage = error?.message || "Unknown error";
      if (errorMessage.includes('timed out')) {
        toast.error("PDF generation timed out. Try again or use a simpler document.");
      } else {
        toast.error(`Failed to generate PDF: ${errorMessage.slice(0, 100)}`);
      }
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
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </>
        )}
      </Button>
      
      {previewReport && (
        <StandardReportPreview
          report={{
            ...previewReport,
            report_name: `Bulk Services Report - ${previewReport.revision}`,
          }}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="bulk-services-reports"
        />
      )}
    </>
  );
}
