import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";

interface ExportPDFButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const ExportPDFButton = ({ report, onReportGenerated }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch all related data
      const [categoriesResult, variationsResult] = await Promise.all([
        supabase
          .from("cost_categories")
          .select(`
            *,
            cost_line_items (*)
          `)
          .eq("cost_report_id", report.id)
          .order("display_order"),
        supabase
          .from("cost_variations")
          .select("*")
          .eq("cost_report_id", report.id)
          .order("display_order")
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (variationsResult.error) throw variationsResult.error;

      const categories = categoriesResult.data || [];
      const variations = variationsResult.data || [];

      // Create PDF
      const doc = new jsPDF("portrait");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Fetch company details for cover page
      const companyDetails = await fetchCompanyDetails();

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Cost Report",
        projectName: report.project_name,
        subtitle: `Report #${report.report_number}`,
        revision: `Report ${report.report_number}`,
      }, companyDetails);

      // ========== PAGE 2: PROJECT INFORMATION ==========
      doc.addPage();
      let yPos = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PROJECT INFORMATION", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Client: ${report.client_name}`, 14, yPos);
      yPos += 6;
      doc.text(`Project: ${report.project_name}`, 14, yPos);
      yPos += 6;
      doc.text(`Project Number: ${report.project_number}`, 14, yPos);
      yPos += 6;
      doc.text(`Report Date: ${new Date(report.report_date).toLocaleDateString()}`, 14, yPos);
      yPos += 6;

      if (report.electrical_contractor) {
        doc.text(`Electrical Contractor: ${report.electrical_contractor}`, 14, yPos);
        yPos += 6;
      }
      if (report.earthing_contractor) {
        doc.text(`Earthing Contractor: ${report.earthing_contractor}`, 14, yPos);
        yPos += 6;
      }
      if (report.cctv_contractor) {
        doc.text(`CCTV Contractor: ${report.cctv_contractor}`, 14, yPos);
        yPos += 6;
      }
      if (report.standby_plants_contractor) {
        doc.text(`Standby Plants Contractor: ${report.standby_plants_contractor}`, 14, yPos);
        yPos += 6;
      }

      yPos += 10;

      // ========== COST CATEGORIES SUMMARY ==========
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("COST SUMMARY", 14, yPos);
      yPos += 10;

      // Summary table data
      const summaryData = categories.map((cat: any) => {
        const lineItems = cat.cost_line_items || [];
        const originalBudget = lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.original_budget || 0), Number(cat.original_budget || 0));
        const previousReport = lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.previous_report || 0), Number(cat.previous_report || 0));
        const anticipatedFinal = lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.anticipated_final || 0), Number(cat.anticipated_final || 0));
        const variance = anticipatedFinal - originalBudget;

        return [
          cat.code,
          cat.description,
          `R${originalBudget.toFixed(2)}`,
          `R${previousReport.toFixed(2)}`,
          `R${anticipatedFinal.toFixed(2)}`,
          `R${variance.toFixed(2)}`,
        ];
      });

      // Calculate totals
      const totals = categories.reduce((acc: any, cat: any) => {
        const lineItems = cat.cost_line_items || [];
        acc.originalBudget += lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.original_budget || 0), Number(cat.original_budget || 0));
        acc.previousReport += lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.previous_report || 0), Number(cat.previous_report || 0));
        acc.anticipatedFinal += lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.anticipated_final || 0), Number(cat.anticipated_final || 0));
        return acc;
      }, { originalBudget: 0, previousReport: 0, anticipatedFinal: 0 });

      const totalVariance = totals.anticipatedFinal - totals.originalBudget;

      summaryData.push([
        '',
        'TOTAL',
        `R${totals.originalBudget.toFixed(2)}`,
        `R${totals.previousReport.toFixed(2)}`,
        `R${totals.anticipatedFinal.toFixed(2)}`,
        `R${totalVariance.toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[
          "Code",
          "Description",
          "Original Budget",
          "Previous Report",
          "Anticipated Final",
          "Variance",
        ]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [220, 230, 240], fontStyle: 'bold', fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
        },
      });

      // ========== DETAILED LINE ITEMS ==========
      if (categories.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DETAILED LINE ITEMS", 14, yPos);
        yPos += 10;

        for (const category of categories) {
          const lineItems = category.cost_line_items || [];
          if (lineItems.length === 0) continue;

          // Check if we need a new page
          if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${category.code} - ${category.description}`, 14, yPos);
          yPos += 5;

          const lineItemData = lineItems.map((item: any) => {
            const variance = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
            return [
              item.code,
              item.description,
              `R${Number(item.original_budget || 0).toFixed(2)}`,
              `R${Number(item.previous_report || 0).toFixed(2)}`,
              `R${Number(item.anticipated_final || 0).toFixed(2)}`,
              `R${variance.toFixed(2)}`,
            ];
          });

          autoTable(doc, {
            startY: yPos,
            head: [[
              "Code",
              "Description",
              "Original",
              "Previous",
              "Anticipated",
              "Variance",
            ]],
            body: lineItemData,
            theme: "striped",
            headStyles: { fillColor: [133, 163, 207], fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 18 },
              1: { cellWidth: 70 },
              2: { cellWidth: 22, halign: 'right' },
              3: { cellWidth: 22, halign: 'right' },
              4: { cellWidth: 22, halign: 'right' },
              5: { cellWidth: 22, halign: 'right' },
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // ========== VARIATIONS ==========
      if (variations.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("VARIATIONS", 14, yPos);
        yPos += 10;

        const variationData = variations.map((variation: any) => [
          variation.code,
          variation.description,
          variation.is_credit ? "Credit" : "Debit",
          `R${Number(variation.amount || 0).toFixed(2)}`,
        ]);

        const variationTotal = variations.reduce((sum: number, v: any) => 
          sum + (v.is_credit ? Number(v.amount || 0) : -Number(v.amount || 0)), 0);

        variationData.push([
          '',
          'TOTAL',
          '',
          `R${variationTotal.toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Code", "Description", "Type", "Amount"]],
          body: variationData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          footStyles: { fillColor: [220, 230, 240], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 100 },
            2: { cellWidth: 25 },
            3: { cellWidth: 30, halign: 'right' },
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

      // Generate PDF as blob
      const pdfBlob = doc.output("blob");
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `Cost_Report_${report.report_number}_${timestamp}.pdf`;
      const filePath = `${report.project_id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("cost-report-pdfs")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save record to database
      const { data: savedReport, error: dbError } = await supabase
        .from("cost_report_pdfs")
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_path: filePath,
          file_name: fileName,
          file_size: pdfBlob.size,
          revision: `Report ${report.report_number}`,
          generated_by: user?.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Cost report PDF generated successfully",
      });

      // Show preview
      setPreviewReport(savedReport);
      
      // Notify parent to refresh
      onReportGenerated?.();
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
    <>
      <Button onClick={handleExport} disabled={loading}>
        <FileText className="mr-2 h-4 w-4" />
        {loading ? "Generating..." : "Generate PDF"}
      </Button>
      
      {previewReport && (
        <StandardReportPreview
          report={previewReport}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="cost-report-pdfs"
        />
      )}
    </>
  );
};
