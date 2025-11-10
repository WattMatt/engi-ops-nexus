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

      // Calculate totals for KPIs (needed for dashboard pages)
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

      // Helper function to check page space
      const checkPageSpace = (currentY: number, requiredHeight: number) => {
        if (currentY + requiredHeight > pageHeight - 40) {
          doc.addPage();
          return 30;
        }
        return currentY;
      };

      // Helper function to draw metric card
      const drawMetricCard = (x: number, y: number, width: number, height: number, title: string, value: string, color: [number, number, number]) => {
        // Card background
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, width, height, 2, 2, 'F');
        
        // Accent top border
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, width, 3, 2, 2, 'F');
        
        // Title
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(title, x + width / 2, y + 12, { align: "center" });
        
        // Value
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(value, x + width / 2, y + 24, { align: "center" });
      };

      // Helper function to draw category legend item
      const drawCategoryLegendItem = (x: number, y: number, color: [number, number, number], code: string, description: string, percentage: number, amount: number) => {
        // Color square
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y - 3, 4, 4, 0.5, 0.5, 'F');
        
        // Code
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(code, x + 6, y);
        
        // Description
        doc.setFont("helvetica", "normal");
        const truncDesc = description.length > 25 ? description.substring(0, 22) + "..." : description;
        doc.text(truncDesc, x + 14, y);
        
        // Percentage
        doc.text(`${percentage.toFixed(1)}%`, x + 70, y);
        
        // Amount
        doc.setFont("helvetica", "bold");
        doc.text(`R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`, x + 85, y, { align: "right" });
      };

      // Helper function to draw category detail card
      const drawCategoryDetailCard = (x: number, y: number, width: number, height: number, category: any, color: [number, number, number]) => {
        // Card background
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, width, height, 2, 2, 'F');
        
        // Border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, width, height, 2, 2, 'S');
        
        // Left colored border
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, y + 2, 4, height - 4, 'F');
        
        // Category badge
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x + 8, y + 5, 12, 5, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(category.code, x + 14, y + 8.5, { align: "center" });
        
        // Description
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        const truncDesc = category.description.length > 20 ? category.description.substring(0, 17) + "..." : category.description;
        doc.text(truncDesc, x + 8, y + 14);
        
        // Metrics
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        
        // Original Budget
        doc.text("Original Budget:", x + 8, y + 20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(`R${category.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`, x + 8, y + 24);
        
        // Anticipated Final
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Anticipated Final:", x + 8, y + 30);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(`R${category.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`, x + 8, y + 34);
        
        // Variance
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Variance:", x + 8, y + 40);
        doc.setFont("helvetica", "bold");
        
        const varianceColor = category.variance < 0 ? [34, 197, 94] : [239, 68, 68];
        doc.setTextColor(varianceColor[0], varianceColor[1], varianceColor[2]);
        const varianceSign = category.variance < 0 ? '-' : '+';
        doc.text(`${varianceSign}R${Math.abs(category.variance).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`, x + 8, y + 44);
        
        // Status badge
        doc.setFillColor(category.variance < 0 ? 220 : 254, category.variance < 0 ? 252 : 226, category.variance < 0 ? 231 : 226);
        doc.roundedRect(x + 8, y + height - 10, width - 16, 6, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(category.variance < 0 ? 'SAVING' : 'EXTRA', x + width / 2, y + height - 6.5, { align: "center" });
      };

      // ========== PAGE 2: KPI DASHBOARD - PAGE 1 ==========
      doc.addPage();
      tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
      let yPos = 20;

      // Header with themed background
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("EXECUTIVE SUMMARY & KEY PERFORMANCE INDICATORS", pageWidth / 2, 22, { align: "center" });
      
      yPos = 45;

      // Key Metrics Cards (3-column layout)
      const cardWidth = (pageWidth - 28 - 16) / 3; // 3 cards with gaps
      const cardHeight = 30;
      
      drawMetricCard(14, yPos, cardWidth, cardHeight, "ORIGINAL BUDGET", 
        `R ${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
        [41, 128, 185]);
      
      drawMetricCard(14 + cardWidth + 8, yPos, cardWidth, cardHeight, "ANTICIPATED FINAL", 
        `R ${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
        [136, 132, 216]);
      
      const varianceColor = totalVariance < 0 ? [34, 197, 94] : [239, 68, 68];
      const varianceLabel = totalVariance < 0 ? "TOTAL SAVING" : "TOTAL EXTRA";
      drawMetricCard(14 + (cardWidth + 8) * 2, yPos, cardWidth, cardHeight, varianceLabel, 
        `R ${Math.abs(totalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
        varianceColor as [number, number, number]);
      
      yPos += cardHeight + 20;

      // Visual Analytics Section Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("VISUAL ANALYTICS", 14, yPos);
      yPos += 10;

      // Two-column layout for analytics
      const leftColX = 14;
      const rightColX = pageWidth / 2 + 4;
      const colWidth = pageWidth / 2 - 18;

      // LEFT: Category Distribution
      const analyticsY = yPos;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(leftColX, analyticsY, colWidth, 95, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Category Distribution", leftColX + 4, analyticsY + 8);
      
      // Category legend with percentages
      let legendY = analyticsY + 18;
      categoryTotals.forEach((cat: any, index: number) => {
        if (index < 8) { // Limit to 8 categories on this page
          const color = COLORS[index % COLORS.length] as [number, number, number];
          const percentage = (cat.originalBudget / totalOriginalBudget) * 100;
          drawCategoryLegendItem(leftColX + 6, legendY, color, cat.code, cat.description, percentage, cat.originalBudget);
          legendY += 10;
        }
      });

      // RIGHT: Variance Analysis
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(rightColX, analyticsY, colWidth, 95, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Variance by Category", rightColX + 4, analyticsY + 8);
      
      // Variance table
      const varianceTableData = categoryTotals.slice(0, 8).map((cat: any) => {
        const varianceSign = cat.variance < 0 ? '-' : '+';
        return [
          cat.code,
          `${varianceSign}R${Math.abs(cat.variance).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`,
          cat.variance < 0 ? 'Saving' : 'Extra'
        ];
      });

      autoTable(doc, {
        startY: analyticsY + 12,
        body: varianceTableData,
        theme: "plain",
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 15, fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 20, halign: 'center', fontSize: 6 },
        },
        margin: { left: rightColX + 4, right: pageWidth - rightColX - colWidth + 4 },
        willDrawCell: (data) => {
          if (data.column.index === 1 || data.column.index === 2) {
            const cat = categoryTotals[data.row.index];
            if (cat && cat.variance < 0) {
              data.cell.styles.textColor = [34, 197, 94];
              if (data.column.index === 2) {
                data.cell.styles.fillColor = [220, 252, 231];
              }
            } else {
              data.cell.styles.textColor = [239, 68, 68];
              if (data.column.index === 2) {
                data.cell.styles.fillColor = [254, 226, 226];
              }
            }
          }
        },
      });

      yPos = analyticsY + 100;

      // Overall variance percentage
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const variancePercentage = ((Math.abs(totalVariance) / totalOriginalBudget) * 100).toFixed(2);
      doc.text(`Overall variance: ${variancePercentage}% ${totalVariance < 0 ? 'under' : 'over'} budget`, pageWidth / 2, yPos, { align: "center" });

      // ========== PAGE 3: KPI DASHBOARD - PAGE 2 ==========
      doc.addPage();
      tocSections.push({ title: "Category Performance Details", page: doc.getCurrentPageInfo().pageNumber });
      yPos = 20;

      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("CATEGORY PERFORMANCE DETAILS", pageWidth / 2, 22, { align: "center" });
      
      yPos = 45;

      // Category cards grid (3 columns)
      const categoryCardWidth = (pageWidth - 28 - 16) / 3;
      const categoryCardHeight = 50;
      const categoryCardGap = 8;

      categoryTotals.forEach((cat: any, index: number) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = 14 + col * (categoryCardWidth + categoryCardGap);
        const y = yPos + row * (categoryCardHeight + categoryCardGap);
        
        // Check if we need a new page
        if (y > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
          const newRow = 0;
          const newY = yPos + newRow * (categoryCardHeight + categoryCardGap);
          drawCategoryDetailCard(x, newY, categoryCardWidth, categoryCardHeight, cat, COLORS[index % COLORS.length] as [number, number, number]);
        } else {
          drawCategoryDetailCard(x, y, categoryCardWidth, categoryCardHeight, cat, COLORS[index % COLORS.length] as [number, number, number]);
        }
      });

      // Calculate space needed for project metadata
      const numRows = Math.ceil(categoryTotals.length / 3);
      yPos += numRows * (categoryCardHeight + categoryCardGap) + 15;

      // Check page space for metadata
      yPos = checkPageSpace(yPos, 60);

      // Project Metadata Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("PROJECT INFORMATION", 14, yPos);
      yPos += 8;

      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 45, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      
      const metadataY = yPos + 8;
      doc.text(`Client: ${report.client_name}`, 18, metadataY);
      doc.text(`Project: ${report.project_name}`, 18, metadataY + 6);
      doc.text(`Project Number: ${report.project_number}`, 18, metadataY + 12);
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}`, 18, metadataY + 18);

      // Contractors (if any)
      let contractorY = metadataY + 24;
      if (report.electrical_contractor || report.earthing_contractor || report.cctv_contractor || report.standby_plants_contractor) {
        doc.setFont("helvetica", "bold");
        doc.text("Contractors:", 18, contractorY);
        contractorY += 6;
        doc.setFont("helvetica", "normal");
        
        if (report.electrical_contractor) {
          doc.text(`• Electrical: ${report.electrical_contractor}`, 18, contractorY);
          contractorY += 5;
        }
        if (report.earthing_contractor) {
          doc.text(`• Earthing: ${report.earthing_contractor}`, 18, contractorY);
          contractorY += 5;
        }
      }

      // ========== PAGE 4: PROJECT INFORMATION (old structure continues) ==========
      doc.addPage();
      tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
      yPos = 20;

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

      // KPI Cards in a table format (for backward compatibility - now replaced by dashboard pages)
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
