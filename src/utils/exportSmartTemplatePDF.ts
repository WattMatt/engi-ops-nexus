import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "./pdfCoverPage";
import { calculateCategoryTotals, calculateGrandTotals } from "./costReportCalculations";
import { captureKPICards, prepareElementForCapture, canvasToDataURL } from "./captureUIForPDF";
import type { TemplateConfig } from "@/components/pdf-templates/SmartTemplateBuilder";

interface SmartTemplateExportParams {
  config: TemplateConfig;
  reportType: "cost-report" | "cable-schedule" | "final-account";
  reportId: string;
  projectId: string;
}

/**
 * Generate a custom PDF based on the Smart Template Builder configuration
 */
export const generateSmartTemplatePDF = async ({
  config,
  reportType,
  reportId,
  projectId,
}: SmartTemplateExportParams): Promise<{ url: string; fileName: string }> => {
  // Determine orientation and page size
  const orientation = config.layout.orientation === "landscape" ? "landscape" : "portrait";
  const format: "a4" | "letter" = config.layout.pageSize === "letter" ? "letter" : "a4";
  
  // Initialize PDF
  const doc = new jsPDF(orientation, "mm", format);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Margins
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Get color scheme
  const colors = getColorScheme(config.styling.colorScheme);
  
  // Fetch company details
  const companyDetails = await fetchCompanyDetails();
  
  let currentY = margin;
  
  // ========== COVER PAGE ==========
  if (config.sections.coverPage) {
    await generateCoverPage(doc, {
      title: config.coverPage.title || "Project Report",
      projectName: "Project",
      subtitle: config.coverPage.subtitle || "",
      revision: `Revision 1`,
    }, companyDetails);
    
    doc.addPage();
    currentY = margin;
  }
  
  // ========== FETCH REPORT DATA ==========
  let reportData: any = null;
  let categories: any[] = [];
  let lineItems: any[] = [];
  let variations: any[] = [];
  
  if (reportType === "cost-report") {
    const [reportResult, categoriesResult, variationsResult, allLineItemsResult] = await Promise.all([
      supabase.from("cost_reports").select("*").eq("id", reportId).single(),
      supabase.from("cost_categories").select(`*, cost_line_items (*)`).eq("cost_report_id", reportId).order("display_order"),
      supabase.from("cost_variations").select("*").eq("cost_report_id", reportId).order("display_order"),
      supabase.from("cost_line_items").select("*, cost_categories!inner(cost_report_id)").eq("cost_categories.cost_report_id", reportId)
    ]);
    
    if (reportResult.error) throw reportResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (variationsResult.error) throw variationsResult.error;
    if (allLineItemsResult.error) throw allLineItemsResult.error;
    
    reportData = reportResult.data;
    categories = categoriesResult.data || [];
    variations = variationsResult.data || [];
    lineItems = allLineItemsResult.data || [];
  }
  
  // ========== KPI CARDS ==========
  if (config.sections.kpiCards && reportType === "cost-report") {
    // Add section header
    addSectionHeader(doc, "Key Performance Indicators", currentY, pageWidth, colors);
    currentY += 15;
    
    // Capture KPI cards from UI
    try {
      await prepareElementForCapture("cost-report-kpi-cards");
      const kpiCardsCanvas = await captureKPICards("cost-report-kpi-cards", { scale: 2 });
      const kpiCardsImage = canvasToDataURL(kpiCardsCanvas, 'JPEG', 0.9);
      
      const kpiImageAspectRatio = kpiCardsCanvas.width / kpiCardsCanvas.height;
      const kpiImageWidth = contentWidth;
      const kpiImageHeight = kpiImageWidth / kpiImageAspectRatio;
      
      // Check if we need a new page
      if (currentY + kpiImageHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.addImage(kpiCardsImage, 'JPEG', margin, currentY, kpiImageWidth, kpiImageHeight, undefined, 'FAST');
      currentY += kpiImageHeight + 15;
    } catch (error) {
      console.error("Failed to capture KPI cards:", error);
    }
  }
  
  // ========== CATEGORY BREAKDOWN ==========
  if (config.sections.categoryBreakdown && reportType === "cost-report") {
    const categoryTotals = calculateCategoryTotals(categories, lineItems, variations).sort((a, b) => a.code.localeCompare(b.code));
    const grandTotals = calculateGrandTotals(categoryTotals);
    
    // Check if we need a new page
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = margin;
    }
    
    addSectionHeader(doc, "Category Breakdown & Financial Variance", currentY, pageWidth, colors);
    currentY += 15;
    
    const tableData = categoryTotals.map((cat: any) => {
      const percentage = grandTotals.anticipatedFinal > 0 
        ? ((cat.anticipatedFinal / grandTotals.anticipatedFinal) * 100).toFixed(1)
        : '0.0';
      
      return [
        cat.code,
        cat.description,
        `R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${cat.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `${percentage}%`,
        `${cat.currentVariance >= 0 ? '+' : ''}R${Math.abs(cat.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ];
    });
    
    // Add totals row
    tableData.push([
      '',
      'GRAND TOTAL',
      `R${grandTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${grandTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${grandTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      '100%',
      `${grandTotals.currentVariance >= 0 ? '+' : ''}R${Math.abs(grandTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ]);
    
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Code', 'Category', 'Original Budget', 'Previous Report', 'Anticipated Final', '% of Total', 'Current Variance']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: colors.primary as [number, number, number], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [220, 230, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // ========== DETAILED LINE ITEMS ==========
  if (config.sections.detailedLineItems && reportType === "cost-report") {
    for (const category of categories) {
      const categoryItems = lineItems.filter((item: any) => item.category_id === category.id);
      
      if (categoryItems.length === 0) continue;
      
      // Check if we need a new page
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(`${category.code} - ${category.name}`, margin, currentY);
      currentY += 10;
      
      const itemsData = categoryItems.map((item: any) => [
        item.item_code || '',
        item.description || '',
        item.quantity?.toString() || '0',
        item.unit || '',
        `R${(item.unit_rate || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${((item.quantity || 0) * (item.unit_rate || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ]);
      
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Code', 'Description', 'Qty', 'Unit', 'Rate', 'Amount']],
        body: itemsData,
        theme: 'striped',
        headStyles: { 
          fillColor: colors.secondary as [number, number, number], 
          textColor: [255, 255, 255],
          fontSize: 7,
        },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 30 },
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  }
  
  // ========== ADD PAGE NUMBERS ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }
  
  // ========== SAVE TO STORAGE ==========
  const pdfBlob = doc.output('blob');
  const fileName = `smart_template_${reportType}_${Date.now()}.pdf`;
  const filePath = `${projectId}/${fileName}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('cost-report-pdfs')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });
  
  if (uploadError) throw uploadError;
  
  const { data: { publicUrl } } = supabase.storage
    .from('cost-report-pdfs')
    .getPublicUrl(filePath);
  
  return { url: publicUrl, fileName };
};

/**
 * Helper function to add section headers
 */
function addSectionHeader(doc: jsPDF, title: string, y: number, pageWidth: number, colors: any) {
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(0, y, pageWidth, 12, 'F');
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth / 2, y + 8, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

/**
 * Get color scheme RGB values
 */
function getColorScheme(scheme: string): { primary: number[], secondary: number[], text: number[] } {
  const schemes: Record<string, { primary: number[], secondary: number[], text: number[] }> = {
    blue: {
      primary: [30, 58, 138],
      secondary: [59, 130, 246],
      text: [0, 0, 0],
    },
    green: {
      primary: [21, 128, 61],
      secondary: [34, 197, 94],
      text: [0, 0, 0],
    },
    purple: {
      primary: [88, 28, 135],
      secondary: [168, 85, 247],
      text: [0, 0, 0],
    },
    gray: {
      primary: [55, 65, 81],
      secondary: [107, 114, 128],
      text: [0, 0, 0],
    },
  };
  
  return schemes[scheme] || schemes.blue;
}
