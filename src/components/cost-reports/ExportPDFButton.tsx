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
      const [categoriesResult, variationsResult, detailsResult] = await Promise.all([
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
          .order("display_order"),
        supabase
          .from("cost_report_details")
          .select("*")
          .eq("cost_report_id", report.id)
          .order("display_order")
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (variationsResult.error) throw variationsResult.error;
      if (detailsResult.error) throw detailsResult.error;

      const categories = categoriesResult.data || [];
      const variations = variationsResult.data || [];
      const details = detailsResult.data || [];

      // Track sections and their page numbers for TOC
      const tocSections: { title: string; page: number }[] = [];

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
      tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
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
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, yPos);
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

      // ========== REPORT DETAILS SECTIONS ==========
      if (details.length > 0) {
        tocSections.push({ title: "Report Details", page: doc.getCurrentPageInfo().pageNumber });
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("REPORT DETAILS", 14, yPos);
        yPos += 10;

        // General section header
        doc.setFontSize(12);
        doc.text("1. GENERAL", 14, yPos);
        yPos += 8;

        for (const section of details) {
          // Check if we need a new page
          if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(`${section.section_number}. ${section.section_title}`, 14, yPos);
          yPos += 6;

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");

          // Special formatting for certain sections
          let content = section.section_content || "";
          
          if (section.section_number === 1) {
            content = `${content} ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`;
          } else if (section.section_number === 5) {
            // Construction period
            const constructionContent = [];
            if (report.site_handover_date) {
              constructionContent.push(`Site handover: ${new Date(report.site_handover_date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`);
            }
            if (report.practical_completion_date) {
              constructionContent.push(`Practical completion: ${new Date(report.practical_completion_date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`);
            }
            if (content) {
              constructionContent.push(content);
            }
            content = constructionContent.join('\n');
          } else if (section.section_number === 8) {
            // Contract information
            const contractContent = [];
            if (report.electrical_contractor) {
              contractContent.push(`Electrical: ${report.electrical_contractor}`);
            }
            if (report.earthing_contractor) {
              contractContent.push(`Earthing and lightning protection: ${report.earthing_contractor}`);
            }
            if (report.standby_plants_contractor) {
              contractContent.push(`Standby Plants: ${report.standby_plants_contractor}`);
            }
            if (report.cctv_contractor) {
              contractContent.push(`CCTV and access control: ${report.cctv_contractor}`);
            }
            if (content) {
              contractContent.push(content);
            }
            content = contractContent.join('\n');
          }

          if (content) {
            const lines = doc.splitTextToSize(content, pageWidth - 28);
            for (const line of lines) {
              if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
              }
              doc.text(line, 14, yPos);
              yPos += 5;
            }
          }

          yPos += 6;
        }

        yPos += 10;
      }

      // ========== COST CATEGORIES SUMMARY ==========
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      tocSections.push({ title: "Cost Summary", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", 14, yPos);
      yPos += 12;

      // Calculate totals for KPIs
      const categoryTotals = categories.map((cat: any) => {
        const lineItems = cat.cost_line_items || [];
        const originalBudget = lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.original_budget || 0), 0);
        const anticipatedFinal = lineItems.reduce((sum: number, item: any) => 
          sum + Number(item.anticipated_final || 0), 0);
        
        return {
          code: cat.code,
          description: cat.description,
          originalBudget,
          anticipatedFinal,
          variance: anticipatedFinal - originalBudget
        };
      });

      const totalOriginalBudget = categoryTotals.reduce((sum: number, cat: any) => sum + cat.originalBudget, 0);
      const totalAnticipatedFinal = categoryTotals.reduce((sum: number, cat: any) => sum + cat.anticipatedFinal, 0);
      const totalVariance = totalAnticipatedFinal - totalOriginalBudget;

      // KPI Cards in a table format
      const kpiData = [
        ['Metric', 'Value'],
        ['Original Budget', `R ${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
        ['Anticipated Final', `R ${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
        [
          totalVariance < 0 ? 'Total Saving' : 'Total Extra', 
          `R ${Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${((Math.abs(totalVariance) / totalOriginalBudget) * 100).toFixed(2)}%)`
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: "plain",
        headStyles: { 
          fillColor: [41, 128, 185],
          fontSize: 10,
          fontStyle: 'bold',
          textColor: [255, 255, 255]
        },
        styles: { 
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 107, halign: 'right', fontStyle: 'bold', fontSize: 11 },
        },
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
          // Highlight the variance row
          if (data.section === 'body' && data.row.index === 2) {
            if (totalVariance < 0) {
              data.cell.styles.textColor = [34, 197, 94]; // Green for savings
            } else {
              data.cell.styles.textColor = [239, 68, 68]; // Red for extras
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // ========== CATEGORY BREAKDOWN WITH VISUAL INDICATORS ==========
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("CATEGORY BREAKDOWN", 14, yPos);
      yPos += 10;

      // Color palette for categories
      const COLORS = [
        [0, 136, 254],    // Blue
        [0, 196, 159],    // Teal
        [255, 187, 40],   // Yellow
        [255, 128, 66],   // Orange
        [136, 132, 216],  // Purple
        [130, 202, 157],  // Green
        [255, 198, 88],   // Gold
        [255, 107, 157],  // Pink
      ];

      // Create detailed category breakdown table
      const categoryBreakdownData = categoryTotals.map((cat: any, index: number) => {
        const varianceSign = cat.variance < 0 ? '-' : '+';
        const varianceLabel = cat.variance < 0 ? 'Saving' : 'Extra';
        
        return [
          cat.code,
          cat.description,
          `R ${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${varianceSign}R ${Math.abs(cat.variance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          varianceLabel,
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Code', 'Category', 'Original Budget', 'Anticipated Final', 'Variance', 'Status']],
        body: categoryBreakdownData,
        theme: "grid",
        headStyles: { 
          fillColor: [41, 128, 185],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
          const rowIndex = data.row.index;
          
          if (data.section === 'body') {
            // Color the code column with category colors
            if (data.column.index === 0) {
              const color = COLORS[rowIndex % COLORS.length] as [number, number, number];
              data.cell.styles.fillColor = color;
              data.cell.styles.textColor = [255, 255, 255];
            }
            
            // Color the variance and status columns based on savings/extras
            if (data.column.index === 4 || data.column.index === 5) {
              const cat = categoryTotals[rowIndex];
              if (cat && cat.variance < 0) {
                data.cell.styles.textColor = [34, 197, 94]; // Green for savings
                if (data.column.index === 5) {
                  data.cell.styles.fillColor = [220, 252, 231]; // Light green background
                }
              } else {
                data.cell.styles.textColor = [239, 68, 68]; // Red for extras
                if (data.column.index === 5) {
                  data.cell.styles.fillColor = [254, 226, 226]; // Light red background
                }
              }
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // ========== DETAILED COST BREAKDOWN ==========
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED COST BREAKDOWN", 14, yPos);
      yPos += 10;
      // ========== DETAILED LINE ITEMS ==========
      if (categories.length > 0) {
        doc.addPage();
        tocSections.push({ title: "Detailed Line Items", page: doc.getCurrentPageInfo().pageNumber });
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
        tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
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

      // ========== INSERT TABLE OF CONTENTS ==========
      // Insert TOC after cover page (page 2 becomes TOC, others shift)
      doc.insertPage(2);
      doc.setPage(2);
      
      // Draw TOC header
      yPos = 30;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("TABLE OF CONTENTS", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 20;
      
      // Draw TOC entries
      doc.setFontSize(11);
      for (const section of tocSections) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 30;
        }
        
        doc.setFont("helvetica", "normal");
        doc.text(section.title, 20, yPos);
        
        // Add dots
        const dotsWidth = pageWidth - 60;
        const titleWidth = doc.getTextWidth(section.title);
        const pageNumText = `${section.page + 1}`; // +1 because TOC is now page 2
        const pageNumWidth = doc.getTextWidth(pageNumText);
        const dotsSpace = dotsWidth - titleWidth - pageNumWidth;
        const numDots = Math.floor(dotsSpace / 3);
        const dots = '.'.repeat(Math.max(0, numDots));
        
        doc.setTextColor(150);
        doc.text(dots, 20 + titleWidth + 2, yPos);
        doc.setTextColor(0);
        
        doc.setFont("helvetica", "bold");
        doc.text(pageNumText, pageWidth - 20, yPos, { align: "right" });
        
        yPos += 8;
      }

      // Add page numbers to all pages except cover and TOC
      const totalPages = doc.getNumberOfPages();
      for (let i = 3; i <= totalPages; i++) {
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
