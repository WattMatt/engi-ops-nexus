import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

// pdfmake imports
import { createDocument, sectionHeader, paragraph, spacer } from "@/utils/pdfmake";
import { getCostReportStyles, PDF_COLORS_HEX } from "@/components/cost-reports/pdf-export/types";

// Legacy jsPDF imports (for backward compatibility if needed)
import jsPDF from "jspdf";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { 
  initializePDF, 
  addPageNumbers,
  type PDFExportOptions 
} from "@/utils/pdfExportBase";

interface ProjectOutlineExportPDFButtonProps {
  outline: any;
  sections: any[];
  usePdfmake?: boolean; // Feature flag for pdfmake migration
}

export const ProjectOutlineExportPDFButton = ({ 
  outline, 
  sections,
  usePdfmake = true // Default to new pdfmake implementation
}: ProjectOutlineExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * New pdfmake-based export implementation
   */
  const handleExportPdfmake = async () => {
    setLoading(true);
    try {
      const doc = createDocument({
        pageSize: 'A4',
        orientation: 'portrait',
        margins: [40, 60, 40, 60],
      });

      // Cover page content
      doc.add([
        { text: '', pageBreak: 'after' }, // Empty first page placeholder for cover
      ]);

      // Build cover page
      doc.add([
        spacer(80),
        {
          text: outline.document_title || 'Baseline Document',
          fontSize: 28,
          bold: true,
          color: PDF_COLORS_HEX.primary,
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: outline.project_name,
          fontSize: 18,
          color: PDF_COLORS_HEX.text,
          alignment: 'center',
          margin: [0, 0, 0, 40],
        },
        {
          text: outline.prepared_by || '',
          fontSize: 12,
          color: PDF_COLORS_HEX.neutral,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        {
          text: `Revision: ${outline.revision || 'A'}`,
          fontSize: 10,
          color: PDF_COLORS_HEX.neutral,
          alignment: 'center',
          margin: [0, 0, 0, 40],
        },
        {
          text: format(new Date(), 'dd MMMM yyyy'),
          fontSize: 10,
          color: PDF_COLORS_HEX.neutral,
          alignment: 'center',
        },
        { text: '', pageBreak: 'after' },
      ]);

      // Index page
      doc.add([
        {
          text: outline.project_name,
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          text: 'Index:',
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        {
          ul: sections.map((section: any) => ({
            text: `${section.section_number}. ${section.section_title}`,
            fontSize: 11,
            margin: [0, 3, 0, 3],
          })),
          margin: [20, 0, 0, 30],
        },
        spacer(20),
        {
          text: `Created by: ${outline.contact_person || ''}`,
          fontSize: 9,
          color: PDF_COLORS_HEX.neutral,
        },
        {
          text: `Representing: ${outline.prepared_by || ''}`,
          fontSize: 9,
          color: PDF_COLORS_HEX.neutral,
        },
      ]);

      // Section pages
      sections.forEach((section: any, index: number) => {
        doc.add([
          { text: '', pageBreak: 'before' },
          {
            text: outline.project_name,
            fontSize: 18,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20],
          },
          {
            text: `${section.section_number}. ${section.section_title}:`,
            fontSize: 14,
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: section.content || '',
            fontSize: 11,
            lineHeight: 1.4,
            margin: [0, 0, 0, 20],
          },
          spacer(20),
          {
            text: `Created by: ${outline.contact_person || ''}`,
            fontSize: 9,
            color: PDF_COLORS_HEX.neutral,
          },
          {
            text: `Representing: ${outline.prepared_by || ''}`,
            fontSize: 9,
            color: PDF_COLORS_HEX.neutral,
          },
        ]);
      });

      // Add standard header/footer
      doc.withStandardHeader(outline.project_name, outline.revision || 'A');
      doc.withStandardFooter();

      // Generate and download
      const fileName = `${outline.project_name.replace(/[^a-z0-9]/gi, '_')}_Baseline_Document_${Date.now()}.pdf`;
      doc.download(fileName);

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

  /**
   * Legacy jsPDF-based export implementation
   * @deprecated Use handleExportPdfmake instead
   */
  const handleExportJsPDF = async () => {
    setLoading(true);
    try {
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = initializePDF(exportOptions);
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

      // Add standardized page numbers
      addPageNumbers(doc, 2, exportOptions.quality);

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

  const handleExport = usePdfmake ? handleExportPdfmake : handleExportJsPDF;

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Export PDF"}
    </Button>
  );
};
