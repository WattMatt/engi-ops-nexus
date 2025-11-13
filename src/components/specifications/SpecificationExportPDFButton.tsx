import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { format } from "date-fns";
import { 
  initializePDF, 
  getStandardTableStyles, 
  addPageNumbers,
  type PDFExportOptions 
} from "@/utils/pdfExportBase";

interface SpecificationExportPDFButtonProps {
  specification: any;
}

export const SpecificationExportPDFButton = ({ specification }: SpecificationExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Create PDF with standardized settings
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = initializePDF(exportOptions);
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Fetch company details for cover page
      const companyDetails = await fetchCompanyDetails();

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Technical Specification",
        projectName: specification.specification_name,
        subtitle: specification.project_name || "",
        revision: specification.revision || "Rev.0",
      }, companyDetails);

      // ========== PAGE 2: SPECIFICATION OVERVIEW ==========
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SPECIFICATION OVERVIEW", 14, yPos);
      yPos += 10;

      const infoData = [
        ["Specification Name", specification.specification_name],
        ["Specification Number", specification.spec_number || "N/A"],
        ["Project Name", specification.project_name || "N/A"],
        ["Type", specification.spec_type || "N/A"],
        ["Revision", specification.revision || "Rev.0"],
        ["Created", format(new Date(specification.created_at), "dd MMMM yyyy")],
      ];

      if (specification.prepared_for_company) {
        infoData.push(["Prepared For", specification.prepared_for_company]);
      }

      if (specification.prepared_for_contact) {
        infoData.push(["Contact Person", specification.prepared_for_contact]);
      }

      autoTable(doc, {
        startY: yPos,
        body: infoData,
        theme: "plain",
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 130 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Add notes if they exist
      if (specification.notes) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(specification.notes, pageWidth - 28);
        
        for (const line of splitNotes) {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 14, yPos);
          yPos += 5;
        }
      }

      // Add standardized page numbers
      addPageNumbers(doc, 2, exportOptions.quality);

      // Save the PDF
      doc.save(`Specification_${specification.spec_number || specification.specification_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);

      toast({
        title: "Success",
        description: "Specification PDF exported successfully",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Export PDF"}
    </Button>
  );
};
