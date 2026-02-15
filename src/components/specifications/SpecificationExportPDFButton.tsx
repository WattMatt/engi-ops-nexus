import { Button } from "@/components/ui/button";
import { Download, Settings, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildSpecificationPdf, type SpecificationPdfData } from "@/utils/svg-pdf/specificationPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";

interface SpecificationExportPDFButtonProps {
  specification: any;
}

export const SpecificationExportPDFButton = ({ specification }: SpecificationExportPDFButtonProps) => {
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  const handleExport = async () => {
    setDialogOpen(false);

    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Technical Specification",
        reportSubtitle: specification.spec_number || "",
        projectName: specification.specification_name,
        revision: specification.revision || "Rev.0",
        date: format(new Date(specification.created_at), "dd MMMM yyyy"),
        ...companyData,
      };

      const pdfData: SpecificationPdfData = { specification, coverData };
      return buildSpecificationPdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "specification-reports",
      dbTable: "specification_reports",
      foreignKeyColumn: "specification_id",
      foreignKeyValue: specification.id,
      projectId: specification.project_id,
      revision: specification.revision || "Rev.0",
      reportName: `Specification_${specification.spec_number || specification.specification_name}`,
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Specification PDF</DialogTitle>
          <DialogDescription>
            Select which contact should appear on the cover page
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <ContactSelector
            projectId={specification.project_id}
            value={selectedContactId}
            onValueChange={setSelectedContactId}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Generate PDF</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
