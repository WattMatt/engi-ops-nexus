import jsPDF from "jspdf";
import "jspdf-autotable";
import { initializePDF, getStandardTableStyles, STANDARD_MARGINS, type PDFExportOptions } from "./pdfExportBase";
import { generateCoverPage } from "./pdfCoverPage";
import { format } from "date-fns";

export const exportTemplatePDF = async (templateData: any, companyDetails: any) => {
  const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
  const doc = initializePDF(exportOptions);
  
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const useMargins = STANDARD_MARGINS;
  const tocSections: { title: string; page: number }[] = [];
  
  const contentWidth = pageWidth - useMargins.left - useMargins.right;
  const contentStartX = useMargins.left;
  const contentStartY = useMargins.top;
  
  const colors = {
    primary: [30, 58, 138] as [number, number, number],
    secondary: [59, 130, 246] as [number, number, number],
    text: [15, 23, 42] as [number, number, number]
  };

  // ========== COVER PAGE ==========
  await generateCoverPage(doc, {
    title: "Cost Report Template",
    projectName: "{Project_Name}",
    subtitle: "Report #{Report_Number}",
    revision: "Report {Report_Number}",
    date: format(new Date(), "dd MMMM yyyy"),
  }, companyDetails);

  // ========== TABLE OF CONTENTS (INDEX) ==========
  doc.addPage();
  const tocPage = doc.getCurrentPageInfo().pageNumber;
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("TABLE OF CONTENTS", pageWidth / 2, contentStartY + 5, { align: "center" });
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, contentStartY + 8, pageWidth - useMargins.right, contentStartY + 8);

  const tocStartY = contentStartY + 20;

  // ========== PROJECT INFORMATION / REPORT DETAILS PAGE ==========
  doc.addPage();
  tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
  let yPos = contentStartY;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text("PROJECT INFORMATION", contentStartX, yPos);
  
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
  
  yPos += 12;
  doc.setTextColor(...colors.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const addKeyValue = (key: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(key, contentStartX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, contentStartX + 60, yPos);
    yPos += 7;
  };
  
  addKeyValue("Project Name:", "{Project_Name}");
  addKeyValue("Client Name:", "{Client_Name}");
  addKeyValue("Project Number:", "{Project_Number}");
  addKeyValue("Report Date:", "{Report_Date}");
  addKeyValue("Report Number:", "{Report_Number}");
  addKeyValue("Practical Completion Date:", "{Practical_Completion_Date}");
  addKeyValue("Site Handover Date:", "{Site_Handover_Date}");
  
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text("CONTRACTORS", contentStartX, yPos);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
  
  yPos += 12;
  doc.setTextColor(...colors.text);
  doc.setFontSize(10);
  
  addKeyValue("Electrical Contractor:", "{Electrical_Contractor}");
  addKeyValue("CCTV Contractor:", "{CCTV_Contractor}");
  addKeyValue("Standby Plants Contractor:", "{Standby_Plants_Contractor}");
  addKeyValue("Earthing Contractor:", "{Earthing_Contractor}");

  // ========== EXECUTIVE SUMMARY PAGE ==========
  doc.addPage();
  tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
  yPos = contentStartY;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text("EXECUTIVE SUMMARY", contentStartX, yPos);
  
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
  
  yPos += 12;
  doc.setTextColor(...colors.text);

  // Executive Summary Table
  (doc as any).autoTable({
    startY: yPos,
    head: [["Category", "Original Budget", "Previous Report", "Anticipated Final", "Variance", "% Variance"]],
    body: [
      ["{Category_Code}", "{Original_Budget}", "{Previous_Report}", "{Anticipated_Final}", "{Variance}", "{Variance_%}"],
      ["TOTAL", "{Total_Original_Budget}", "{Total_Previous_Report}", "{Total_Anticipated_Final}", "{Total_Variance}", "{Total_Variance_%}"]
    ],
    theme: "grid",
    ...getStandardTableStyles(),
    headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [220, 230, 240], fontStyle: "bold" },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== CATEGORY KPI CARDS ==========
  doc.addPage();
  tocSections.push({ title: "Category Performance", page: doc.getCurrentPageInfo().pageNumber });
  yPos = contentStartY;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text("CATEGORY PERFORMANCE", contentStartX, yPos);
  
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
  
  yPos += 12;
  doc.setTextColor(...colors.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // KPI Cards placeholder - in actual implementation, this would render visual cards
  doc.text("Category KPI cards showing visual performance indicators for each category", contentStartX, yPos);
  doc.text("would be displayed here with budget variance indicators and status colors.", contentStartX, yPos + 7);
  yPos += 30;

  // ========== CATEGORIES AND LINE ITEMS ==========
  if (templateData.categories && templateData.categories.length > 0) {
    doc.addPage();
    tocSections.push({ title: "Categories & Line Items", page: doc.getCurrentPageInfo().pageNumber });
    yPos = contentStartY;

    for (const category of templateData.categories) {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = contentStartY;
      }

      // Category header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text(`${category.code} - ${category.description}`, contentStartX, yPos);
      
      doc.setDrawColor(...colors.secondary);
      doc.setLineWidth(0.3);
      doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
      
      yPos += 10;

      // Line items table
      const lineItemsBody = category.lineItems.map((item: any) => [
        item.code,
        item.description,
        `R ${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R ${Number(item.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R ${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ]);

      // Add subtotal row
      lineItemsBody.push([
        "",
        "SUBTOTAL",
        `R ${Number(category.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R ${Number(category.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R ${Number(category.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
        body: lineItemsBody,
        theme: "grid",
        ...getStandardTableStyles(),
        headStyles: { fillColor: colors.secondary, textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 70 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
        },
        willDrawCell: (data: any) => {
          if (data.section === 'body' && data.row.index === lineItemsBody.length - 1) {
            data.cell.styles.fillColor = [220, 230, 240];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // ========== VARIATIONS SECTION ==========
  if (templateData.variations && templateData.variations.length > 0) {
    doc.addPage();
    tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
    yPos = contentStartY;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text("VARIATIONS", contentStartX, yPos);
    
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
    
    yPos += 12;

    const variationsBody = templateData.variations.map((variation: any) => [
      variation.code,
      variation.description,
      variation.tenant_name || "-",
      variation.is_credit ? "Credit" : "Debit",
      `R ${Number(variation.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ]);

    const totalVariations = templateData.variations.reduce(
      (sum: number, v: any) => sum + (v.is_credit ? -Number(v.amount || 0) : Number(v.amount || 0)),
      0
    );

    variationsBody.push([
      "",
      "TOTAL VARIATIONS",
      "",
      "",
      `R ${totalVariations.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Tenant", "Type", "Amount"]],
      body: variationsBody,
      theme: "grid",
      ...getStandardTableStyles(),
      headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 80 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30, halign: 'right' },
      },
      willDrawCell: (data: any) => {
        if (data.section === 'body' && data.row.index === variationsBody.length - 1) {
          data.cell.styles.fillColor = [220, 230, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // ========== DETAILS SECTIONS ==========
  if (templateData.details && templateData.details.length > 0) {
    for (const detail of templateData.details) {
      doc.addPage();
      tocSections.push({ title: detail.section_title, page: doc.getCurrentPageInfo().pageNumber });
      yPos = contentStartY;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text(`${detail.section_number}. ${detail.section_title}`.toUpperCase(), contentStartX, yPos);
      
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.5);
      doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
      
      yPos += 12;
      doc.setTextColor(...colors.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const contentLines = doc.splitTextToSize(
        detail.section_content || "Content for this section would appear here.",
        contentWidth
      );
      doc.text(contentLines, contentStartX, yPos);
      yPos += contentLines.length * 5 + 10;
    }
  }

  // ========== UPDATE TABLE OF CONTENTS ==========
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  doc.setPage(tocPage);
  yPos = tocStartY;
  
  doc.setFontSize(11);
  doc.setTextColor(...colors.text);
  
  tocSections.forEach((section) => {
    doc.setFont("helvetica", "normal");
    doc.text(section.title, contentStartX, yPos);
    
    const pageNumText = String(section.page);
    const pageNumWidth = doc.getTextWidth(pageNumText);
    doc.text(pageNumText, pageWidth - useMargins.right - pageNumWidth, yPos);
    
    // Draw dotted line
    const titleWidth = doc.getTextWidth(section.title);
    const dotsStartX = contentStartX + titleWidth + 3;
    const dotsEndX = pageWidth - useMargins.right - pageNumWidth - 3;
    (doc as any).setLineDash([1, 2]);
    doc.setDrawColor(150, 150, 150);
    doc.line(dotsStartX, yPos - 1, dotsEndX, yPos - 1);
    (doc as any).setLineDash([]);
    
    yPos += 8;
  });
  
  doc.setPage(currentPage);

  // ========== ADD PAGE NUMBERS ==========
  const totalPages = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i - 1} of ${totalPages - 1}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc;
};
