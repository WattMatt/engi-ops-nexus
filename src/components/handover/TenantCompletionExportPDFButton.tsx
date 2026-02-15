import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildHandoverCompletionPdf, type HandoverPdfData } from "@/utils/svg-pdf/handoverCompletionPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface TenantData {
  id: string;
  shop_number: string;
  shop_name: string;
  completionPercentage: number;
  completedCount: number;
  totalCount: number;
}

interface DocumentData {
  document_type: string;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string;
  source_id?: string;
}

interface ExclusionData {
  document_type: string;
  notes: string | null;
  created_at: string;
  tenant_id?: string;
}

interface ExportProps {
  projectId: string;
  projectName: string;
  tenants: TenantData[];
  allDocuments: DocumentData[];
  allExclusions: ExclusionData[];
  stats: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
    overallPercentage: number;
  };
}

export const TenantCompletionExportPDFButton = ({
  projectId,
  projectName,
  tenants,
  allDocuments,
  allExclusions,
  stats,
}: ExportProps) => {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Tenant Handover Completion",
        reportSubtitle: "Document Completion Status and Index",
        projectName,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const pdfData: HandoverPdfData = {
        coverData,
        tenants,
        stats,
        allDocuments,
        allExclusions,
      };
      return buildHandoverCompletionPdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "handover-reports",
      dbTable: "handover_completion_reports",
      foreignKeyColumn: "project_id",
      foreignKeyValue: projectId,
      projectId,
      reportName: `Handover_Completion_${projectName}`,
    });
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating} variant="outline" size="sm">
      {isGenerating ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
      ) : (
        <><FileDown className="h-4 w-4 mr-2" />Export PDF Report</>
      )}
    </Button>
  );
};
