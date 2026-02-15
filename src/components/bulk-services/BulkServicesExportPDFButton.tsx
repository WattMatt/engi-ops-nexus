/**
 * Bulk Services PDF Export Button
 * Uses client-side SVG engine for PDF generation.
 */
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildBulkServicesPdf, type BulkServicesData } from "@/utils/svg-pdf/bulkServicesPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { format } from "date-fns";

interface BulkServicesExportPDFButtonProps {
  documentId: string;
  onReportSaved?: () => void;
}

export function BulkServicesExportPDFButton({ 
  documentId, 
  onReportSaved 
}: BulkServicesExportPDFButtonProps) {
  const [previewReport, setPreviewReport] = useState<any>(null);
  const { isGenerating, progress, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

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
      return data;
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
      return data || [];
    },
    enabled: !!documentId,
  });

  const handleExport = async () => {
    if (!document) return;

    const buildFn = async () => {
      // Fetch project name
      let projectName = "Bulk Services";
      if (document.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", document.project_id)
          .single();
        projectName = project?.name || "Bulk Services";
      }

      // Fetch workflow phases
      const { data: phases } = await supabase
        .from("bulk_services_workflow_phases")
        .select("*, bulk_services_workflow_tasks(*)")
        .eq("document_id", documentId)
        .order("display_order");

      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Bulk Services Report",
        reportSubtitle: `Document ${document.document_number}`,
        projectName,
        revision: document.revision,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const bulkData: BulkServicesData = {
        coverData,
        projectName,
        documentNumber: document.document_number,
        supplyAuthority: document.supply_authority || undefined,
        connectionSize: document.connection_size || undefined,
        totalConnectedLoad: document.total_connected_load || 0,
        maximumDemand: document.maximum_demand || 0,
        diversityFactor: document.diversity_factor || 0.7,
        transformerSize: document.transformer_size_kva || undefined,
        loadSchedule: [], // Could be populated from load_schedule_items JSON
        phases: (phases || []).map((p: any) => ({
          name: p.phase_name,
          status: p.status as 'completed' | 'in_progress' | 'pending',
          tasks: (p.bulk_services_workflow_tasks || []).map((t: any) => ({
            title: t.task_title,
            completed: t.is_completed,
          })),
        })),
        notes: document.notes || undefined,
      };

      return buildBulkServicesPdf(bulkData);
    };

    await generateAndPersist(
      buildFn,
      {
        storageBucket: "bulk-services-reports",
        dbTable: "bulk_services_reports",
        foreignKeyColumn: "document_id",
        foreignKeyValue: documentId,
        projectId: document.project_id,
        reportName: `BulkServices_${document.document_number}`,
      },
      () => {
        onReportSaved?.();
      },
    );
  };

  const progressLabel = progress === 'building' ? 'Preparing...'
    : progress === 'converting' ? 'Generating PDF...'
    : progress === 'uploading' ? 'Uploading...'
    : progress === 'saving' ? 'Saving record...'
    : null;

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
            {progressLabel || "Generating..."}
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
