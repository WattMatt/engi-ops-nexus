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

  // ========== TABLE OF CONTENTS ==========
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

  // ========== EXECUTIVE SUMMARY PAGE ==========
  doc.addPage();
  tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("EXECUTIVE SUMMARY", pageWidth / 2, contentStartY + 5, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, contentStartY + 12, { align: "center" });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, contentStartY + 15, pageWidth - useMargins.right, contentStartY + 15);

  doc.setTextColor(...colors.text);
  let yPos = contentStartY + 25;
  
  // KPI Placeholder text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("[KPI Cards would appear here with actual values]", contentStartX, yPos);
  yPos += 70;

  // ========== PROJECT INFORMATION PAGE ==========
  doc.addPage();
  tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
  yPos = contentStartY;
  
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

  // ========== COST SUMMARY PAGE ==========
  doc.addPage();
  tocSections.push({ title: "Cost Summary", page: doc.getCurrentPageInfo().pageNumber });
  yPos = contentStartY;
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  doc.text("COST SUMMARY", contentStartX, yPos);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
  
  yPos += 12;

  const summaryBody = templateData.categories.map((cat: any) => [
    cat.code || "{Code}",
    cat.description || "{Description}",
    "{Original_Budget}",
    "{Previous_Report}",
    "{Anticipated_Final}",
  ]);

  summaryBody.push([
    { content: "TOTAL", styles: { fontStyle: 'bold' } },
    "",
    { content: "{Total_Original_Budget}", styles: { fontStyle: 'bold' } },
    { content: "{Total_Previous_Report}", styles: { fontStyle: 'bold' } },
    { content: "{Total_Anticipated_Final}", styles: { fontStyle: 'bold' } },
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
    body: summaryBody,
    ...getStandardTableStyles(),
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== DETAILED CATEGORIES ==========
  templateData.categories.forEach((category: any) => {
    const categoryLineItems = templateData.lineItems.filter(
      (item: any) => item.category_id === category.id
    );

    if (categoryLineItems.length === 0) return;

    doc.addPage();
    tocSections.push({ title: `${category.code || '{Code}'} - ${category.description || '{Description}'}`, page: doc.getCurrentPageInfo().pageNumber });
    yPos = contentStartY;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text(`${category.code || '{Code}'} - ${category.description || '{Description}'}`, contentStartX, yPos);
    doc.setLineWidth(0.5);
    doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
    
    yPos += 12;

    const categoryBody = categoryLineItems.map((item: any) => [
      item.code || "{Code}",
      item.description || "{Description}",
      "{Original_Budget}",
      "{Previous_Report}",
      "{Anticipated_Final}",
    ]);

    categoryBody.push([
      { content: "SUBTOTAL", styles: { fontStyle: 'bold' } },
      "",
      { content: "{Subtotal_Original_Budget}", styles: { fontStyle: 'bold' } },
      { content: "{Subtotal_Previous_Report}", styles: { fontStyle: 'bold' } },
      { content: "{Subtotal_Anticipated_Final}", styles: { fontStyle: 'bold' } },
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
      body: categoryBody,
      ...getStandardTableStyles(),
    });
  });

  // ========== VARIATIONS ==========
  if (templateData.variations && templateData.variations.length > 0) {
    doc.addPage();
    tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
    yPos = contentStartY;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primary);
    doc.text("VARIATIONS", contentStartX, yPos);
    doc.setLineWidth(0.5);
    doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
    
    yPos += 12;

    const variationsBody = templateData.variations.map((variation: any) => [
      variation.code || "{Code}",
      variation.description || "{Description}",
      "{Amount}",
      variation.is_credit ? "Credit" : "Debit",
    ]);

    variationsBody.push([
      { content: "TOTAL VARIATIONS", styles: { fontStyle: 'bold' } },
      "",
      { content: "{Total_Variations}", styles: { fontStyle: 'bold' } },
      "",
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Amount", "Type"]],
      body: variationsBody,
      ...getStandardTableStyles(),
    });
  }

  // ========== DETAILS SECTIONS ==========
  if (templateData.details && templateData.details.length > 0) {
    templateData.details.forEach((detail: any) => {
      doc.addPage();
      tocSections.push({ title: detail.section_title || "{Section_Title}", page: doc.getCurrentPageInfo().pageNumber });
      yPos = contentStartY;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text(detail.section_title || "{Section_Title}", contentStartX, yPos);
      doc.setLineWidth(0.5);
      doc.line(contentStartX, yPos + 2, pageWidth - useMargins.right, yPos + 2);
      
      yPos += 12;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      const content = detail.section_content || "{Section_Content}";
      const lines = doc.splitTextToSize(content, contentWidth);
      
      lines.forEach((line: string) => {
        if (yPos > pageHeight - useMargins.bottom) {
          doc.addPage();
          yPos = contentStartY;
        }
        doc.text(line, contentStartX, yPos);
        yPos += 6;
      });
    });
  }

  // Update TOC with actual page numbers
  doc.setPage(tocPage);
  let tocY = tocStartY;
  doc.setFontSize(10);
  tocSections.forEach((section) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);
    doc.text(section.title, contentStartX, tocY);
    doc.text(String(section.page), pageWidth - useMargins.right - 10, tocY, { align: "right" });
    
    // Add dotted line
    const titleWidth = doc.getTextWidth(section.title);
    const pageNumWidth = doc.getTextWidth(String(section.page));
    const dotsStartX = contentStartX + titleWidth + 3;
    const dotsEndX = pageWidth - useMargins.right - pageNumWidth - 13;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    for (let x = dotsStartX; x < dotsEndX; x += 3) {
      doc.text(".", x, tocY);
    }
    
    tocY += 7;
  });

  // Add page numbers (starting from page 2, skipping cover)
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i - 1} of ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  }

  // Save the PDF
  const fileName = `Template_Cost_Report_${Date.now()}.pdf`;
  doc.save(fileName);
};
