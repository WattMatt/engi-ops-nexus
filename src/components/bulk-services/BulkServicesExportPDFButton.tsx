/**
 * Bulk Services PDF Export Button
 * 
 * Full implementation following the cost report pattern with:
 * - Progress tracking
 * - Storage upload + preview
 * - Proper error handling and timeouts
 */

import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { 
  generateBulkServicesPDF,
  type BulkServicesDocument,
  type BulkServicesSection,
} from "@/utils/pdfmake/bulkServices";

interface BulkServicesExportPDFButtonProps {
  documentId: string;
  onReportSaved?: () => void;
}

export function BulkServicesExportPDFButton({ 
  documentId, 
  onReportSaved 
}: BulkServicesExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [previewReport, setPreviewReport] = useState<any>(null);

  // Fetch document data
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

  // Fetch sections
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

  // Get next revision number
  const getNextRevision = async (): Promise<string> => {
    const { data: latestReport } = await supabase
      .from("bulk_services_reports")
      .select("revision")
      .eq("document_id", documentId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReport?.revision) {
      const currentRevNum = parseInt(latestReport.revision.replace("Rev.", ""));
      return `Rev.${currentRevNum + 1}`;
    }
    return "Rev.0";
  };

  // Get project name
  const getProjectName = async (): Promise<string> => {
    if (!document?.project_id) return "Bulk Services";
    
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", document.project_id)
      .single();
    
    return project?.name || "Bulk Services";
  };

  const handleExport = async () => {
    if (!document) {
      toast.error("No document data available");
      return;
    }

    setIsGenerating(true);
    setCurrentStep("Initializing...");

    try {
      const [revision, projectName] = await Promise.all([
        getNextRevision(),
        getProjectName(),
      ]);

      // Generate PDF blob
      const { blob, filename } = await generateBulkServicesPDF(
        document,
        sections,
        {
          projectName,
          revision,
          onProgress: (step) => {
            setCurrentStep(step);
          },
        }
      );

      console.log('[BulkServicesPDF] Generated blob size:', blob.size);

      // Upload to storage
      setCurrentStep("Uploading...");
      const filePath = `${document.project_id}/${filename}`;
      
      const { error: uploadError } = await supabase.storage
        .from("bulk-services-reports")
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save report record
      setCurrentStep("Saving record...");
      const { data: savedReport, error: saveError } = await supabase
        .from("bulk_services_reports")
        .insert({
          document_id: documentId,
          project_id: document.project_id,
          file_path: filePath,
          revision: revision,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast.success("PDF report generated and saved");
      setPreviewReport(savedReport);
      onReportSaved?.();
    } catch (error: any) {
      console.error("[BulkServicesPDF] Export error:", error);
      const errorMessage = error?.message || "Unknown error";
      toast.error(`Export failed: ${errorMessage.slice(0, 100)}`);
    } finally {
      setIsGenerating(false);
      setCurrentStep("");
    }
  };

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={isGenerating || !document}
        variant="default"
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {currentStep || "Generating..."}
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
