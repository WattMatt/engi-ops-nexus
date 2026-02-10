import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateCoverPage, fetchCompanyDetails } from "@/utils/pdfCoverPage";
import { 
  initializePDF, 
  getStandardTableStyles,
  type PDFExportOptions 
} from "@/utils/pdfExportBase";
import { addRunningHeaders, addRunningFooter, getAutoTableDefaults } from "@/utils/pdf/jspdfStandards";

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
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = initializePDF(exportOptions);
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

      // Add File Naming Convention page
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("File Naming Convention & Structure", 14, yPos);
      yPos += 12;

      // Introduction
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const introText = doc.splitTextToSize(
        "All handover documents uploaded to this system follow a standardized naming convention to ensure easy identification, traceability, and searchability. This structured approach links files directly to projects, tenants, and document types.",
        pageWidth - 28
      );
      introText.forEach((line: string) => {
        doc.text(line, 14, yPos);
        yPos += 5;
      });
      yPos += 8;

      // File Name Structure
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("File Name Structure", 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Format:", 14, yPos);
      yPos += 6;
      
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.text("[ProjectNum]_[ShopNum]_[ShopName]_[DocType]_[Date].[ext]", 20, yPos);
      yPos += 10;

      // Component Breakdown
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Component Breakdown", 14, yPos);
      yPos += 8;

      const components = [
        {
          name: "ProjectNum",
          desc: "Project number or abbreviated project name (max 10 characters, alphanumeric only)",
          example: "PRJ12345, MALL2024"
        },
        {
          name: "ShopNum",
          desc: "Shop/Tenant number with special characters removed (alphanumeric only)",
          example: "S101, T042, UNIT25"
        },
        {
          name: "ShopName",
          desc: "Abbreviated shop name (max 20 characters, alphanumeric only)",
          example: "COFFEESHOP, RETAILSTORE"
        },
        {
          name: "DocType",
          desc: "Document type code (uppercase, no underscores)",
          example: "ELECTRICALCOC, ASBUILTDRAWING, LINEDIAGRAM"
        },
        {
          name: "Date",
          desc: "Upload date in YYYYMMDD format (8 digits)",
          example: "20250315, 20241225"
        },
        {
          name: "ext",
          desc: "Original file extension",
          example: "pdf, jpg, png, dwg"
        }
      ];

      doc.setFontSize(9);
      components.forEach((comp) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`[${comp.name}]`, 20, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(comp.desc, pageWidth - 50);
        descLines.forEach((line: string) => {
          doc.text(line, 26, yPos);
          yPos += 4;
        });

        doc.setFont("helvetica", "italic");
        doc.text(`Example: ${comp.example}`, 26, yPos);
        yPos += 8;
      });

      // Real Examples
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Complete File Name Examples", 14, yPos);
      yPos += 8;

      const examples = [
        "MALL2024_S101_COFFEESHOP_ELECTRICALCOC_20250315.pdf",
        "PRJ12345_T042_RETAILSTORE_ASBUILTDRAWING_20250110.dwg",
        "OFFICE_UNIT25_ACCOUNTINGFIRM_LINEDIAGRAM_20241220.pdf",
        "RETAIL_S200_FASHIONBOUTIQUE_QCINSPECTIONREPORT_20250228.pdf"
      ];

      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      examples.forEach((example) => {
        doc.text(example, 20, yPos);
        yPos += 5;
      });
      yPos += 8;

      // Search & Traceability Guide
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Search & Traceability Guide", 14, yPos);
      yPos += 8;

      const searchTips = [
        {
          title: "Search by Project",
          tip: "Use the project number or name at the start of the filename",
          example: "Search for: MALL2024_* or PRJ12345_*"
        },
        {
          title: "Search by Tenant",
          tip: "Use shop number or shop name in the search",
          example: "Search for: *_S101_* or *_COFFEESHOP_*"
        },
        {
          title: "Search by Document Type",
          tip: "Use the document type code in uppercase",
          example: "Search for: *_ELECTRICALCOC_* or *_LINEDIAGRAM_*"
        },
        {
          title: "Search by Date Range",
          tip: "Use date format YYYYMMDD to find files from specific periods",
          example: "Search for: *_202503*_ (all files from March 2025)"
        },
        {
          title: "Combined Search",
          tip: "Combine multiple components for precise results",
          example: "Search for: MALL2024_S101_*_ELECTRICALCOC_*"
        }
      ];

      doc.setFontSize(9);
      searchTips.forEach((tip) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`• ${tip.title}:`, 20, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        const tipLines = doc.splitTextToSize(tip.tip, pageWidth - 50);
        tipLines.forEach((line: string) => {
          doc.text(line, 26, yPos);
          yPos += 4;
        });

        doc.setFont("courier", "italic");
        doc.setFontSize(8);
        doc.text(tip.example, 26, yPos);
        yPos += 8;
        doc.setFontSize(9);
      });

      // Benefits Section
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Benefits of Structured Naming", 14, yPos);
      yPos += 8;

      const benefits = [
        "Instant identification of file contents without opening",
        "Consistent organization across all project documents",
        "Easy filtering and searching in file systems",
        "Automated sorting by project, tenant, or date",
        "Reduced risk of file duplication or misplacement",
        "Enhanced collaboration through clear file identification",
        "Simplified audit trails and compliance verification"
      ];

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      benefits.forEach((benefit) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${benefit}`, 20, yPos);
        yPos += 6;
      });

      // Add summary page
      doc.addPage();
      yPos = 20;

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
        ...getAutoTableDefaults(),
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

      // Add standardized running headers and footers
      addRunningHeaders(doc, "Tenant Handover Completion Report", projectName, 2);
      addRunningFooter(doc, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 2);

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
