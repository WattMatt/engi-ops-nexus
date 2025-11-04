import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { format } from "date-fns";

interface FinalAccountExportPDFButtonProps {
  account: any;
}

export const FinalAccountExportPDFButton = ({ account }: FinalAccountExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all line items for this final account
      const { data: items, error } = await supabase
        .from("final_account_items")
        .select("*")
        .eq("final_account_id", account.id)
        .order("item_number");

      if (error) throw error;

      // Create PDF
      const doc = new jsPDF("portrait");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Fetch company details for cover page
      const companyDetails = await fetchCompanyDetails();

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Final Account",
        projectName: account.account_name,
        subtitle: `Account #${account.account_number}`,
        revision: account.submission_date ? format(new Date(account.submission_date), "dd MMM yyyy") : undefined,
      }, companyDetails);

      // ========== PAGE 2: ACCOUNT SUMMARY ==========
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("ACCOUNT SUMMARY", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const infoData = [
        ["Account Number", account.account_number],
        ["Account Name", account.account_name],
        ["Client Name", account.client_name || "N/A"],
        ["Status", account.status?.toUpperCase() || "DRAFT"],
        ["Contract Value", account.contract_value ? `R ${Number(account.contract_value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : "N/A"],
        ["Variations Total", account.variations_total ? `R ${Number(account.variations_total).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : "R 0.00"],
        ["Final Value", account.final_value ? `R ${Number(account.final_value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : "N/A"],
        ["Submission Date", account.submission_date ? format(new Date(account.submission_date), "dd MMMM yyyy") : "N/A"],
      ];

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

      if (account.notes) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 14, yPos);
        yPos += 7;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(account.notes, pageWidth - 28);
        doc.text(splitNotes, 14, yPos);
        yPos += (splitNotes.length * 5) + 10;
      }

      // ========== PAGE 3: LINE ITEMS ==========
      if (items && items.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("FINAL ACCOUNT LINE ITEMS", 14, yPos);
        yPos += 10;

        const tableData = items.map((item) => {
          const variance = Number(item.final_amount || 0) - Number(item.contract_amount || 0);
          return [
            item.item_number,
            item.description,
            `R ${Number(item.contract_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R ${Number(item.final_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R ${variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            item.notes || "-",
          ];
        });

        // Calculate totals
        const totalContract = items.reduce((sum, item) => sum + Number(item.contract_amount || 0), 0);
        const totalFinal = items.reduce((sum, item) => sum + Number(item.final_amount || 0), 0);
        const totalVariance = totalFinal - totalContract;

        tableData.push([
          "",
          "TOTAL",
          `R ${totalContract.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${totalFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${totalVariance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          "",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [[
            "Item #",
            "Description",
            "Contract Amount",
            "Final Amount",
            "Variance",
            "Notes",
          ]],
          body: tableData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          footStyles: { fillColor: [220, 230, 240], fontStyle: 'bold', fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 60 },
            2: { cellWidth: 28, halign: 'right' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 28, halign: 'right' },
            5: { cellWidth: 28 },
          },
          willDrawCell: (data) => {
            // Highlight the totals row
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [220, 230, 240];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });
      }

      // Add page numbers to all pages except cover
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      doc.save(`Final_Account_${account.account_number}_${Date.now()}.pdf`);

      toast({
        title: "Success",
        description: "Final account PDF exported successfully",
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
