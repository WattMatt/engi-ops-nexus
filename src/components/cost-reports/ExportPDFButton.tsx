import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { PDFExportSettings, DEFAULT_MARGINS, type PDFMargins } from "./PDFExportSettings";

interface ExportPDFButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const ExportPDFButton = ({ report, onReportGenerated }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [margins, setMargins] = useState<PDFMargins>(DEFAULT_MARGINS);

  const handleExport = async (useMargins: PDFMargins = margins) => {
    setLoading(true);
    try {
      // Fetch all data
      const [categoriesResult, variationsResult, detailsResult] = await Promise.all([
        supabase
          .from("cost_categories")
          .select(`*, cost_line_items (*)`)
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
      const companyDetails = await fetchCompanyDetails();

      // Create PDF
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const tocSections: { title: string; page: number }[] = [];
      
      // Calculate content dimensions based on margins
      const contentWidth = pageWidth - useMargins.left - useMargins.right;
      const contentStartX = useMargins.left;
      const contentStartY = useMargins.top;

      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Cost Report",
        projectName: report.project_name,
        subtitle: `Report #${report.report_number}`,
        revision: `Report ${report.report_number}`,
      }, companyDetails);

      // ========== TABLE OF CONTENTS ==========
      doc.addPage();
      const tocPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("TABLE OF CONTENTS", pageWidth / 2, contentStartY + 10, { align: "center" });

      // We'll fill this in after generating all pages
      const tocStartY = contentStartY + 30;

      // Calculate totals
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

      const totalOriginalBudget = categoryTotals.reduce((sum: number, cat: any) => 
        sum + cat.originalBudget, 0);
      const totalAnticipatedFinal = categoryTotals.reduce((sum: number, cat: any) => 
        sum + cat.anticipatedFinal, 0);
      const variationsTotal = variations.reduce((sum: number, v: any) => 
        sum + (v.is_credit ? -Number(v.amount || 0) : Number(v.amount || 0)), 0);
      const finalTotal = totalAnticipatedFinal + variationsTotal;
      const totalVariance = finalTotal - totalOriginalBudget;
      const variancePercentage = totalOriginalBudget > 0 
        ? ((Math.abs(totalVariance) / totalOriginalBudget) * 100) 
        : 0;

      // ========== EXECUTIVE SUMMARY PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("EXECUTIVE SUMMARY", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, 30, { align: "center" });

      // Top KPI Cards
      doc.setTextColor(0, 0, 0);
      let kpiY = contentStartY + 35;
      const kpiCardWidth = (contentWidth - 16) / 3; // Distribute width based on content area
      const kpiCardHeight = 25;
      const kpiSpacing = 8;
      
      // Original Budget Card
      doc.setDrawColor(0, 200, 200);
      doc.setLineWidth(0.5);
      doc.rect(contentStartX, kpiY, kpiCardWidth, kpiCardHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Original Budget", contentStartX + 2, kpiY + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`R${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + 2, kpiY + 15);
      
      // Anticipated Final Card
      doc.rect(contentStartX + kpiCardWidth + kpiSpacing, kpiY, kpiCardWidth, kpiCardHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Anticipated Final", contentStartX + kpiCardWidth + kpiSpacing + 2, kpiY + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`R${finalTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + kpiCardWidth + kpiSpacing + 2, kpiY + 15);
      
      // Saving Card
      doc.rect(contentStartX + (kpiCardWidth + kpiSpacing) * 2, kpiY, kpiCardWidth, kpiCardHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(totalVariance < 0 ? "Saving" : "Extra", contentStartX + (kpiCardWidth + kpiSpacing) * 2 + 2, kpiY + 5);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(totalVariance < 0 ? 0 : 255, totalVariance < 0 ? 150 : 0, 0);
      doc.text(`R${Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + (kpiCardWidth + kpiSpacing) * 2 + 2, kpiY + 15);
      doc.setFontSize(7);
      doc.text(`${variancePercentage.toFixed(2)}% variance`, contentStartX + (kpiCardWidth + kpiSpacing) * 2 + 2, kpiY + 20);

      // Define colors for all visual elements
      const cardColors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green
        [251, 191, 36],   // Yellow
        [249, 115, 22],   // Orange
        [139, 92, 246],   // Purple
        [236, 72, 153],   // Pink
        [134, 239, 172]   // Light green
      ];

      // Category Distribution & Financial Variance Table
      doc.setTextColor(0, 0, 0);
      let tableY = kpiY + kpiCardHeight + 15;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Category Distribution & Financial Variance", contentStartX, tableY);
      tableY += 10;

      // Prepare table data with color indicators
      const tableData = categoryTotals.map((cat: any, index: number) => {
        const percentage = totalAnticipatedFinal > 0 
          ? ((cat.anticipatedFinal / totalAnticipatedFinal) * 100).toFixed(1)
          : '0.0';
        
        const variance = cat.anticipatedFinal - cat.originalBudget;
        
        return [
          cat.code,
          cat.description,
          `R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${percentage}%`,
          `${variance >= 0 ? '+' : ''}R${Math.abs(variance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          variance < 0 ? 'Saving' : 'Extra'
        ];
      });

      // Add totals row
      const totalVarianceValue = totalAnticipatedFinal - totalOriginalBudget;
      tableData.push([
        '',
        'TOTAL',
        `R${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        '100%',
        `${totalVarianceValue >= 0 ? '+' : ''}R${Math.abs(totalVarianceValue).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        totalVarianceValue < 0 ? 'Saving' : 'Extra'
      ]);

      autoTable(doc, {
        startY: tableY,
        margin: { left: contentStartX, right: useMargins.right },
        head: [[
          'Code',
          'Category',
          'Original Budget',
          'Anticipated Final',
          '% of Total',
          'Variance',
          'Status'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15, fontStyle: 'bold' },
          1: { cellWidth: contentWidth * 0.26 },
          2: { cellWidth: contentWidth * 0.17, halign: 'right' },
          3: { cellWidth: contentWidth * 0.17, halign: 'right' },
          4: { cellWidth: contentWidth * 0.10, halign: 'center' },
          5: { cellWidth: contentWidth * 0.17, halign: 'right' },
          6: { cellWidth: contentWidth * 0.13, halign: 'center' }
        },
        didDrawCell: (data) => {
          // Add colored indicator bar on the left of each row (except totals row)
          if (data.section === 'body' && data.column.index === 0 && data.row.index < categoryTotals.length) {
            const color = cardColors[data.row.index % cardColors.length];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(data.cell.x - 3, data.cell.y, 3, data.cell.height, 'F');
          }
          
          // Highlight the totals row
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [220, 230, 240];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 9;
          }
          
          // Color the variance and status cells
          if (data.section === 'body' && data.row.index < categoryTotals.length) {
            const cat = categoryTotals[data.row.index];
            const variance = cat.anticipatedFinal - cat.originalBudget;
            if (data.column.index === 5 || data.column.index === 6) {
              if (variance < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
          
          // Color totals row variance
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            if (data.column.index === 5 || data.column.index === 6) {
              if (totalVarianceValue < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
        }
      });

      let cardY = (doc as any).lastAutoTable.finalY + 15;
      const cardWidth = (contentWidth - 8) / 2; // Two cards per row
      const cardHeight = 45;
      const cardsPerRow = 2;
      
      // Check if we need a new page for the cards
      const totalRows = Math.ceil(categoryTotals.length / cardsPerRow);
      const totalCardsHeight = totalRows * (cardHeight + 8);
      
      if (cardY + totalCardsHeight > pageHeight - useMargins.bottom) {
        doc.addPage();
        cardY = contentStartY;
      }
      
      categoryTotals.forEach((cat: any, index: number) => {
        const col = index % cardsPerRow;
        const row = Math.floor(index / cardsPerRow);
        const x = contentStartX + col * (cardWidth + 8);
        const y = cardY + row * (cardHeight + 8);
        
        if (y > pageHeight - useMargins.bottom - 60) {
          doc.addPage();
          cardY = contentStartY;
        }
        
        const finalY = row === 0 ? cardY : cardY + row * (cardHeight + 8);
        
        // Card border
        const color = cardColors[index % cardColors.length];
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(1);
        doc.rect(x, finalY, cardWidth, cardHeight);
        
        // Badge circle
        doc.setFillColor(color[0], color[1], color[2]);
        doc.circle(x + 8, finalY + 8, 4, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(cat.code, x + 8, finalY + 10, { align: "center" });
        
        // Category name
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const catName = doc.splitTextToSize(cat.description, cardWidth - 20);
        doc.text(catName, x + 15, finalY + 7);
        
        // Original Budget
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("ORIGINAL BUDGET", x + 5, finalY + 20);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 26);
        
        // Anticipated Final
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("ANTICIPATED FINAL", x + 5, finalY + 32);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 38);
        
        // Variance
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("VARIANCE", x + 5, finalY + 44);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const isExtra = cat.variance > 0;
        doc.setTextColor(isExtra ? 255 : 0, isExtra ? 0 : 150, 0);
        doc.text(`${cat.variance >= 0 ? '+' : ''}R${cat.variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 50);
        
        // Status badge
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isExtra ? 255 : 0, isExtra ? 0 : 150, 0);
        doc.text(isExtra ? "EXTRA" : "SAVING", x + cardWidth - 18, finalY + 50);
      });

      // ========== CATEGORY PERFORMANCE DETAILS PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Category Performance Details", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("CATEGORY PERFORMANCE DETAILS", pageWidth / 2, contentStartY + 10, { align: "center" });

      autoTable(doc, {
        startY: contentStartY + 20,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Code', 'Category', 'Original Budget', 'Anticipated Final', 'Variance', 'Status']],
        body: categoryTotals.map((cat: any) => [
          cat.code,
          cat.description,
          `R ${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.variance >= 0 ? '+' : ''}R ${cat.variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          cat.variance < 0 ? 'Saving' : 'Extra'
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      // ========== PROJECT INFORMATION PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("PROJECT INFORMATION", pageWidth / 2, 22, { align: "center" });

      let yPos = contentStartY + 30;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT DETAILS", contentStartX, yPos);
      yPos += 10;

      // Add report details sections
      details.forEach((detail: any, index: number) => {
        if (yPos > pageHeight - useMargins.bottom - 10) {
          doc.addPage();
          yPos = contentStartY;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${detail.section_number}. ${detail.section_title}`, contentStartX, yPos);
        yPos += 6;

        if (detail.section_content) {
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(detail.section_content, contentWidth - 4);
          doc.text(lines, contentStartX, yPos);
          yPos += lines.length * 5;
        }
        yPos += 5;
      });

      // Add contract information
      if (yPos > pageHeight - useMargins.bottom - 30) {
        doc.addPage();
        yPos = contentStartY;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("8. CONTRACT INFORMATION", contentStartX, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      
      const contractors = [
        { label: 'Electrical', value: report.electrical_contractor },
        { label: 'Earthing and lightning protection', value: report.earthing_contractor },
        { label: 'Standby Plants', value: report.standby_plants_contractor },
        { label: 'CCTV and access control', value: report.cctv_contractor }
      ].filter(c => c.value);

      contractors.forEach(c => {
        doc.text(`${c.label}: ${c.value}`, contentStartX, yPos);
        yPos += 5;
      });

      // ========== COST SUMMARY PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Cost Summary", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", contentStartX, contentStartY + 10);

      // Summary table
      autoTable(doc, {
        startY: contentStartY + 20,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Metric', 'Value']],
        body: [
          ['Original Budget', `R ${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
          ['Anticipated Final', `R ${finalTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
          ['Total Saving', `R ${Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${variancePercentage.toFixed(2)}%)`]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      // Category breakdown table
      const lastY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CATEGORY BREAKDOWN", contentStartX, lastY);

      autoTable(doc, {
        startY: lastY + 5,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Code', 'Category', 'Original Budget', 'Anticipated Final', 'Variance', 'Status']],
        body: categoryTotals.map((cat: any) => [
          cat.code,
          cat.description,
          `R ${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.variance >= 0 ? '+' : ''}R ${cat.variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          cat.variance < 0 ? 'Saving' : 'Extra'
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      // ========== DETAILED LINE ITEMS PAGES ==========
      categories.forEach((category: any) => {
        const lineItems = category.cost_line_items || [];
        if (lineItems.length === 0) return;

        doc.addPage();
        tocSections.push({ title: `Detailed Line Items - ${category.description}`, page: doc.getCurrentPageInfo().pageNumber });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`${category.code} - ${category.description}`, contentStartX, contentStartY + 10);

        autoTable(doc, {
          startY: contentStartY + 20,
          margin: { left: contentStartX, right: useMargins.right },
          head: [['Code', 'Description', 'Original Budget', 'Anticipated Final', 'Variance']],
          body: lineItems.map((item: any) => {
            const variance = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
            return [
              item.code,
              item.description,
              `R ${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
              `R ${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
              `${variance >= 0 ? '+' : ''}R ${variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
            ];
          }),
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            1: { cellWidth: contentWidth * 0.4 }
          }
        });
      });

      // ========== VARIATIONS PAGE ==========
      if (variations.length > 0) {
        doc.addPage();
        tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("VARIATIONS", contentStartX, contentStartY + 10);

        autoTable(doc, {
          startY: contentStartY + 20,
          margin: { left: contentStartX, right: useMargins.right },
          head: [['Code', 'Description', 'Amount', 'Type']],
          body: variations.map((v: any) => [
            v.code,
            v.description,
            `R ${Math.abs(Number(v.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            v.is_credit ? 'Credit' : 'Debit'
          ]),
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            1: { cellWidth: contentWidth * 0.5 }
          }
        });
      }

      // ========== FILL IN TABLE OF CONTENTS ==========
      const tocPageRef = doc.setPage(tocPage);
      let tocY = tocStartY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      tocSections.forEach((section) => {
        const maxWidth = contentWidth - 4;
        const dots = '.'.repeat(Math.floor((maxWidth - doc.getTextWidth(section.title) - doc.getTextWidth(String(section.page))) / doc.getTextWidth('.')));
        doc.text(`${section.title} ${dots} ${section.page}`, contentStartX, tocY);
        tocY += 8;
      });

      // Add page numbers to all pages except cover
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - useMargins.bottom + 5, { align: "center" });
      }

      // Save PDF
      const pdfBlob = doc.output("blob");
      const fileName = `Cost_Report_${report.report_number}_${Date.now()}.pdf`;
      const filePath = `${report.project_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cost-report-pdfs")
        .upload(filePath, pdfBlob);

      if (uploadError) throw uploadError;

      // Save PDF record
      const { data: pdfRecord, error: recordError } = await supabase
        .from("cost_report_pdfs")
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_path: filePath,
          file_name: fileName,
          file_size: pdfBlob.size,
          revision: `Report ${report.report_number}`,
          generated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (recordError) throw recordError;

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      setPreviewReport(pdfRecord);
      onReportGenerated?.();

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => handleExport()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setSettingsOpen(true)}
          disabled={loading}
          title="PDF Export Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <PDFExportSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        margins={margins}
        onMarginsChange={setMargins}
        onApply={() => handleExport()}
      />
      
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
