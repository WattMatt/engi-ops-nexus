import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildProjectOutlinePdf, type ProjectOutlinePdfData } from "@/utils/svg-pdf/projectOutlinePdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface ProjectOutlineExportPDFButtonProps {
  outline: any;
  sections: any[];
}

export const ProjectOutlineExportPDFButton = ({ 
  outline, 
  sections,
}: ProjectOutlineExportPDFButtonProps) => {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: outline.document_title || "Baseline Document",
        projectName: outline.project_name,
        revision: outline.revision || "A",
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
        contactName: outline.contact_person || undefined,
      };

      const pdfData: ProjectOutlinePdfData = { outline, sections, coverData };
      return buildProjectOutlinePdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "project-outline-reports",
      dbTable: "project_outline_reports",
      foreignKeyColumn: "outline_id",
      foreignKeyValue: outline.id,
      projectId: outline.project_id,
      revision: outline.revision || "A",
      reportName: `Baseline_Document_${outline.project_name}`,
    });
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
      ) : (
        <><Download className="mr-2 h-4 w-4" />Export PDF</>
      )}
    </Button>
  );
};
