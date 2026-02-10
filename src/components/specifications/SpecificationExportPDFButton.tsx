import { Button } from "@/components/ui/button";
import { Download, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";
import { format } from "date-fns";
import { 
  initializePDF, 
  getStandardTableStyles, 
  type PDFExportOptions 
} from "@/utils/pdfExportBase";
import { addRunningHeaders, addRunningFooter, getAutoTableDefaults } from "@/utils/pdf/jspdfStandards";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";

interface SpecificationExportPDFButtonProps {
  specification: any;
}

export const SpecificationExportPDFButton = ({ specification }: SpecificationExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  const handleExport = async () => {
    setLoading(true);
    try {
      // Create PDF with standardized settings
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = initializePDF(exportOptions);
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        project_name: specification.specification_name,
        client_name: specification.project_name || "",
        report_title: "Technical Specification",
        report_date: format(new Date(specification.created_at), "dd MMMM yyyy"),
        revision: specification.revision || "Rev.0",
        subtitle: specification.spec_number || "",
        project_id: specification.project_id,
        contact_id: selectedContactId || undefined,
      });

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
        ...getAutoTableDefaults(),
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

      // Add standardized running headers and footers
      addRunningHeaders(doc, "Technical Specification", specification.specification_name, 2);
      addRunningFooter(doc, format(new Date(), "dd MMMM yyyy"), 2);

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
          <Button onClick={() => {
            setDialogOpen(false);
            handleExport();
          }} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
