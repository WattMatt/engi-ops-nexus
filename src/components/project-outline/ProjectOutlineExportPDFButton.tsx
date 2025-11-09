import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import { format } from "date-fns";

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

      // ========== CUSTOM COVER PAGE (matching baseline document format) ==========
      let yPos = 60;
      
      // Document title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(outline.document_title || "BASELINE DOCUMENT", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Project name (larger)
      doc.setFontSize(22);
      doc.text(outline.project_name, pageWidth / 2, yPos, { align: "center" });
      yPos += 30;

      // Prepared by section
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("PREPARED BY:", margin, yPos);
      yPos += 8;

      doc.setFont("helvetica", "bold");
      if (outline.prepared_by) {
        doc.text(outline.prepared_by, margin, yPos);
        yPos += 8;
      }

      doc.setFont("helvetica", "normal");
      if (outline.address_line1) {
        doc.text(outline.address_line1, margin, yPos);
        yPos += 6;
      }
      if (outline.address_line2) {
        doc.text(outline.address_line2, margin, yPos);
        yPos += 6;
      }
      if (outline.address_line3) {
        doc.text(outline.address_line3, margin, yPos);
        yPos += 6;
      }

      yPos += 3;
      if (outline.telephone) {
        doc.text(`Tel: ${outline.telephone}`, margin, yPos);
        yPos += 6;
      }
      if (outline.contact_person) {
        doc.text(`Contact: ${outline.contact_person}`, margin, yPos);
        yPos += 6;
      }

      yPos += 10;
      doc.text(`DATE: ${format(new Date(outline.date), "EEEE, dd MMMM yyyy")}`, margin, yPos);
      yPos += 8;
      doc.text(`REVISION: ${outline.revision}`, margin, yPos);

      // Page number at bottom
      doc.setFontSize(11);
      doc.text("1", pageWidth / 2, pageHeight - 15, { align: "center" });

      // ========== PAGE 2: INDEX ==========
      doc.addPage();
      yPos = 30;

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
