/**
 * Bulk Services PDF Export Button
 * 
 * Uses PDFShift edge function for reliable PDF generation (matching cost report pattern).
 */

import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { format } from "date-fns";

interface BulkServicesDocument {
  id: string;
  project_id: string;
  document_number: string;
  revision: string;
  document_date: string;
  created_at: string;
  notes?: string | null;
  building_calculation_type?: string | null;
  project_area?: number | null;
  climatic_zone?: string | null;
  climatic_zone_city?: string | null;
  va_per_sqm?: number | null;
  diversity_factor?: number | null;
  future_expansion_factor?: number | null;
  maximum_demand?: number | null;
  total_connected_load?: number | null;
  primary_voltage?: string | null;
  connection_size?: string | null;
  supply_authority?: string | null;
  tariff_structure?: string | null;
}

interface BulkServicesSection {
  id: string;
  document_id: string;
  section_number: string;
  section_title: string;
  content?: string | null;
  sort_order: number;
}

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

  // Get company details
  const getCompanyDetails = async () => {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name, company_logo_url")
      .limit(1)
      .maybeSingle();
    
    return {
      companyName: settings?.company_name,
      companyLogoUrl: settings?.company_logo_url,
    };
  };

  const handleExport = async () => {
    if (!document) {
      toast.error("No document data available");
      return;
    }

    setIsGenerating(true);
    setCurrentStep("Preparing...");

    try {
      // Fetch all required data in parallel
      const [revision, projectName, companyDetails] = await Promise.all([
        getNextRevision(),
        getProjectName(),
        getCompanyDetails(),
      ]);

      setCurrentStep("Generating PDF...");
      
      // Generate filename
      const filename = `BulkServices_${document.document_number}_${revision}_${format(new Date(), 'yyyyMMdd')}.pdf`;

      // Call the edge function
      console.log('[BulkServicesPDF] Calling edge function...');
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'generate-bulk-services-pdf',
        {
          body: {
            document,
            sections,
            projectName,
            revision,
            companyDetails,
            filename,
            storageBucket: 'bulk-services-reports',
          },
        }
      );

      if (fnError) throw fnError;
      if (!result?.success) throw new Error(result?.error || 'PDF generation failed');

      console.log('[BulkServicesPDF] PDF generated:', result.filePath);

      // Save report record
      setCurrentStep("Saving record...");
      const { data: savedReport, error: saveError } = await supabase
        .from("bulk_services_reports")
        .insert({
          document_id: documentId,
          project_id: document.project_id,
          file_path: result.filePath,
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
