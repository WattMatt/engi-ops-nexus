import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { format } from "date-fns";
import { 
  initializePDF, 
  addPageNumbers,
  type PDFExportOptions 
} from "@/utils/pdfExportBase";
import { formatCurrency } from "@/utils/formatters";

interface FinalAccountExportPDFButtonProps {
  account: any;
}

interface BillWithSections {
  id: string;
  bill_number: number;
  bill_name: string;
  contract_total: number;
  final_total: number;
  variation_total: number;
  sections: SectionWithItems[];
}

interface SectionWithItems {
  id: string;
  section_code: string;
  section_name: string;
  contract_total: number;
  final_total: number;
  variation_total: number;
  items: any[];
}

export const FinalAccountExportPDFButton = ({ account }: FinalAccountExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all bills for this final account
      const { data: bills, error: billsError } = await supabase
        .from("final_account_bills")
        .select("*")
        .eq("final_account_id", account.id)
        .order("bill_number");

      if (billsError) throw billsError;

      // Fetch sections and items for each bill
      const billsWithData: BillWithSections[] = [];
      
      for (const bill of bills || []) {
        const { data: sections } = await supabase
          .from("final_account_sections")
          .select("*")
          .eq("bill_id", bill.id)
          .order("display_order");

        const sectionsWithItems: SectionWithItems[] = [];
        
        for (const section of sections || []) {
          const { data: items } = await supabase
            .from("final_account_items")
            .select("*")
            .eq("section_id", section.id)
            .order("display_order");

          sectionsWithItems.push({
            ...section,
            items: items || [],
          });
        }

        billsWithData.push({
          ...bill,
          sections: sectionsWithItems,
        });
      }

      // Create PDF with standardized settings
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'landscape' };
      const doc = initializePDF(exportOptions);
      const pageWidth = doc.internal.pageSize.width;

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
        ["Contract Value", formatCurrency(account.contract_value)],
        ["Variations Total", formatCurrency(account.variations_total)],
        ["Final Value", formatCurrency(account.final_value)],
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

      // ========== BILLS SUMMARY TABLE ==========
      if (billsWithData.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BILLS SUMMARY", 14, yPos);
        yPos += 8;

        const billsSummary = billsWithData.map(bill => [
          `Bill No. ${bill.bill_number}`,
          bill.bill_name,
          formatCurrency(bill.contract_total),
          formatCurrency(bill.final_total),
          formatCurrency(bill.variation_total),
        ]);

        const totals = billsWithData.reduce(
          (acc, bill) => ({
            contract: acc.contract + Number(bill.contract_total || 0),
            final: acc.final + Number(bill.final_total || 0),
            variation: acc.variation + Number(bill.variation_total || 0),
          }),
          { contract: 0, final: 0, variation: 0 }
        );

        billsSummary.push([
          "",
          "TOTAL",
          formatCurrency(totals.contract),
          formatCurrency(totals.final),
          formatCurrency(totals.variation),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Bill #", "Name", "Contract Total", "Final Total", "Variation"]],
          body: billsSummary,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
        });
      }

      // ========== DETAILED BILLS ==========
      for (const bill of billsWithData) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`BILL NO. ${bill.bill_number} - ${bill.bill_name.toUpperCase()}`, 14, yPos);
        yPos += 12;

        for (const section of bill.sections) {
          if (yPos > doc.internal.pageSize.height - 60) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`Section ${section.section_code} - ${section.section_name}`, 14, yPos);
          yPos += 8;

          if (section.items.length > 0) {
            const itemsData = section.items.map(item => [
              item.item_code,
              item.description,
              item.unit || "",
              item.contract_quantity?.toString() || "-",
              item.final_quantity?.toString() || "-",
              formatCurrency(item.supply_rate),
              formatCurrency(item.install_rate),
              formatCurrency(item.contract_amount),
              formatCurrency(item.final_amount),
              formatCurrency(item.variation_amount),
            ]);

            autoTable(doc, {
              startY: yPos,
              head: [["Code", "Description", "Unit", "Contract Qty", "Final Qty", "Supply Rate", "Install Rate", "Contract Amt", "Final Amt", "Variation"]],
              body: itemsData,
              theme: "grid",
              headStyles: { fillColor: [100, 116, 139], fontSize: 7 },
              bodyStyles: { fontSize: 7 },
              columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 55 },
                2: { cellWidth: 15 },
                3: { cellWidth: 22, halign: 'right' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'right' },
                7: { cellWidth: 28, halign: 'right' },
                8: { cellWidth: 28, halign: 'right' },
                9: { cellWidth: 25, halign: 'right' },
              },
            });

            yPos = (doc as any).lastAutoTable.finalY + 10;
          } else {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("No items in this section", 20, yPos);
            yPos += 10;
          }
        }
      }

      // Add standardized page numbers
      addPageNumbers(doc, 2, exportOptions.quality);

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
