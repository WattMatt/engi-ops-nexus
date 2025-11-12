import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";

interface ProjectOutlineExportPDFButtonProps {
  outline: any;
  sections: any[];
}

export const ProjectOutlineExportPDFButton = ({ outline, sections }: ProjectOutlineExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF("portrait");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      // Fetch company details for cover page
      const companyDetails = await fetchCompanyDetails();

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: outline.document_title || "Baseline Document",
        projectName: outline.project_name,
        subtitle: outline.prepared_by || "",
        revision: outline.revision,
      }, companyDetails);

      // ========== PAGE 2: INDEX ==========
      doc.addPage();
      let yPos = 30;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(outline.project_name, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      doc.setFontSize(14);
      doc.text("Index:", margin, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      sections.forEach((section) => {
        doc.text(`${section.section_number}. ${section.section_title}`, margin + 5, yPos);
        yPos += 7;
      });

      yPos = pageHeight - 30;
      doc.setFontSize(9);
      doc.text(`Created by: ${outline.contact_person || ""}`, margin, yPos);
      yPos += 5;
      doc.text(`Representing: ${outline.prepared_by || ""}`, margin, yPos);

      // ========== SECTION PAGES ==========
      sections.forEach((section, index) => {
        doc.addPage();
        yPos = 30;

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(outline.project_name, pageWidth / 2, yPos, { align: "center" });
        yPos += 15;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`${section.section_number}. ${section.section_title}:`, margin, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        if (section.content) {
          const lines = doc.splitTextToSize(section.content, pageWidth - (2 * margin));
          
          lines.forEach((line: string) => {
            if (yPos > pageHeight - 40) {
              doc.addPage();
              yPos = 30;
            }
            doc.text(line, margin, yPos);
            yPos += 6;
          });
        }

        // Footer on each section page
        yPos = pageHeight - 30;
        doc.setFontSize(9);
        doc.text(`Created by: ${outline.contact_person || ""}`, margin, yPos);
        yPos += 5;
        doc.text(`Representing: ${outline.prepared_by || ""}`, margin, yPos);
      });

      // Add page numbers (skip cover page)
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
          `${i - 1}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `${outline.project_name.replace(/[^a-z0-9]/gi, '_')}_Baseline_Document_${Date.now()}.pdf`;
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Baseline document exported successfully",
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
