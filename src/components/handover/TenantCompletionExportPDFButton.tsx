import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateCoverPage, fetchCompanyDetails } from "@/utils/pdfCoverPage";

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
}

interface ExclusionData {
  document_type: string;
  notes: string | null;
  created_at: string;
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

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  electrical_coc: "Electrical COC",
  as_built_drawing: "As Built Drawing",
  line_diagram: "Line Diagram",
  qc_inspection_report: "QC Inspection Report",
  lighting_guarantee: "Lighting Guarantee",
  db_guarantee: "DB Guarantee",
};

const TENANT_DOCUMENT_TYPES = [
  "electrical_coc",
  "as_built_drawing",
  "line_diagram",
  "qc_inspection_report",
  "lighting_guarantee",
  "db_guarantee",
];

export const TenantCompletionExportPDFButton = ({
  projectId,
  projectName,
  tenants,
  allDocuments,
  allExclusions,
  stats,
}: ExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Fetch company details and generate cover page
      const companyDetails = await fetchCompanyDetails();
      await generateCoverPage(
        doc,
        {
          title: "Tenant Handover Completion Report",
          projectName,
          subtitle: "Document Completion Status and Index",
          revision: new Date().toLocaleDateString(),
        },
        companyDetails
      );

      // Add summary page
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Handover Completion Summary", 14, yPos);
      yPos += 15;

      // Overall statistics
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Progress", 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Overall Completion: ${stats.overallPercentage}%`, 14, yPos);
      yPos += 6;
      doc.text(`Total Tenants: ${stats.total}`, 14, yPos);
      yPos += 6;
      doc.text(`Complete: ${stats.complete} (${stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0}%)`, 14, yPos);
      yPos += 6;
      doc.text(`In Progress: ${stats.inProgress} (${stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%)`, 14, yPos);
      yPos += 6;
      doc.text(`Not Started: ${stats.notStarted} (${stats.total > 0 ? Math.round((stats.notStarted / stats.total) * 100) : 0}%)`, 14, yPos);
      yPos += 15;

      // Summary table by completion status
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Completion Overview", 14, yPos);
      yPos += 8;

      const summaryData = tenants.map((t) => [
        t.shop_number,
        t.shop_name,
        `${t.completedCount}/${t.totalCount}`,
        `${t.completionPercentage}%`,
        t.completionPercentage === 100
          ? "Complete"
          : t.completionPercentage > 0
          ? "In Progress"
          : "Not Started",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Shop No.", "Shop Name", "Documents", "Progress", "Status"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 },
        },
      });

      // Detailed tenant sections
      for (const tenant of tenants) {
        doc.addPage();
        yPos = 20;

        // Tenant header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${tenant.shop_number} - ${tenant.shop_name}`, 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Completion: ${tenant.completionPercentage}% (${tenant.completedCount}/${tenant.totalCount} documents)`, 14, yPos);
        yPos += 12;

        // Document details table
        const tenantDocs = allDocuments.filter((d: any) => d.source_id === tenant.id);
        const tenantExclusions = allExclusions.filter((e: any) => e.tenant_id === tenant.id);

        const documentData = TENANT_DOCUMENT_TYPES.map((type) => {
          const doc = tenantDocs.find((d: any) => d.document_type === type);
          const exclusion = tenantExclusions.find((e: any) => e.document_type === type);

          let status = "Missing";
          let details = "-";

          if (doc) {
            status = "Uploaded";
            details = doc.file_name || "File available";
          } else if (exclusion) {
            status = "By Tenant";
            details = exclusion.notes || "Marked as tenant responsibility";
          }

          return [DOCUMENT_TYPE_LABELS[type] || type, status, details];
        });

        autoTable(doc, {
          startY: yPos,
          head: [["Document Type", "Status", "Details"]],
          body: documentData,
          theme: "grid",
          headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: "bold" },
          styles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30 },
            2: { cellWidth: 80 },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              const status = data.cell.raw as string;
              if (status === "Uploaded") {
                data.cell.styles.textColor = [34, 139, 34];
                data.cell.styles.fontStyle = "bold";
              } else if (status === "By Tenant") {
                data.cell.styles.textColor = [255, 140, 0];
                data.cell.styles.fontStyle = "bold";
              } else if (status === "Missing") {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });
      }

      // Add footer to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" }
        );
      }

      // Save the PDF
      const fileName = `Handover_Completion_${projectName.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);

      toast({
        title: "Export successful",
        description: "Tenant completion report has been downloaded",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={exportToPDF} disabled={isExporting} variant="outline" size="sm">
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF Report
        </>
      )}
    </Button>
  );
};
