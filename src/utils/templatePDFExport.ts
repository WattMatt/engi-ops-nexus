import jsPDF from "jspdf";
import "jspdf-autotable";
import { initializePDF, getStandardTableStyles, addSectionHeader, addPageNumbers, addKeyValue, checkPageBreak, STANDARD_MARGINS } from "./pdfExportBase";
import { generateCoverPage } from "./pdfCoverPage";

export const exportTemplatePDF = async (templateData: any, companyDetails: any) => {
  const doc = initializePDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Generate cover page with placeholders
  await generateCoverPage(
    doc,
    {
      project_name: "{Project_Name}",
      client_name: "{Client_Name}",
      project_number: "{Project_Number}",
      report_date: "{Report_Date}",
      report_number: "{Report_Number}",
    } as any,
    companyDetails,
    "Cost Report Template"
  );

  doc.addPage();
  let yPos = STANDARD_MARGINS.top;

  // Project Information Section
  yPos = addSectionHeader(doc, "PROJECT INFORMATION", yPos);
  yPos += 5;
  
  yPos = addKeyValue(doc, "Project Name:", "{Project_Name}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Client Name:", "{Client_Name}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Project Number:", "{Project_Number}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Report Date:", "{Report_Date}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Report Number:", "{Report_Number}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Practical Completion Date:", "{Practical_Completion_Date}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Site Handover Date:", "{Site_Handover_Date}", STANDARD_MARGINS.left, yPos);
  
  yPos += 10;
  yPos = checkPageBreak(doc, yPos);

  // Contractors Section
  yPos = addSectionHeader(doc, "CONTRACTORS", yPos);
  yPos += 5;
  
  yPos = addKeyValue(doc, "Electrical Contractor:", "{Electrical_Contractor}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "CCTV Contractor:", "{CCTV_Contractor}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Standby Plants Contractor:", "{Standby_Plants_Contractor}", STANDARD_MARGINS.left, yPos);
  yPos = addKeyValue(doc, "Earthing Contractor:", "{Earthing_Contractor}", STANDARD_MARGINS.left, yPos);
  
  yPos += 10;
  yPos = checkPageBreak(doc, yPos);

  // Summary Table
  yPos = addSectionHeader(doc, "COST SUMMARY", yPos);
  yPos += 5;

  const summaryBody = templateData.categories.map((cat: any) => [
    cat.code || `{Category_Code}`,
    cat.description || `{Category_Description}`,
    "{Original_Budget}",
    "{Previous_Report}",
    "{Anticipated_Final}",
  ]);

  summaryBody.push([
    "TOTAL",
    "",
    "{Total_Original_Budget}",
    "{Total_Previous_Report}",
    "{Total_Anticipated_Final}",
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
    body: summaryBody,
    ...getStandardTableStyles(),
    didDrawPage: (data: any) => {
      yPos = data.cursor.y;
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;
  yPos = checkPageBreak(doc, yPos);

  // Detailed Categories
  templateData.categories.forEach((category: any, catIndex: number) => {
    const categoryLineItems = templateData.lineItems.filter(
      (item: any) => item.category_id === category.id
    );

    if (categoryLineItems.length === 0) return;

    yPos = checkPageBreak(doc, yPos, 60);
    yPos = addSectionHeader(doc, `${category.code || '{Code}'} - ${category.description || '{Description}'}`, yPos);
    yPos += 5;

    const categoryBody = categoryLineItems.map((item: any) => [
      item.code || "{Line_Item_Code}",
      item.description || "{Line_Item_Description}",
      "{Original_Budget}",
      "{Previous_Report}",
      "{Anticipated_Final}",
    ]);

    categoryBody.push([
      "SUBTOTAL",
      "",
      "{Subtotal_Original_Budget}",
      "{Subtotal_Previous_Report}",
      "{Subtotal_Anticipated_Final}",
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
      body: categoryBody,
      ...getStandardTableStyles(),
      didDrawPage: (data: any) => {
        yPos = data.cursor.y;
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  });

  // Variations Section
  if (templateData.variations && templateData.variations.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60);
    yPos = addSectionHeader(doc, "VARIATIONS", yPos);
    yPos += 5;

    const variationsBody = templateData.variations.map((variation: any) => [
      variation.code || "{Variation_Code}",
      variation.description || "{Variation_Description}",
      "{Amount}",
      variation.is_credit ? "Credit" : "Debit",
    ]);

    variationsBody.push([
      "TOTAL VARIATIONS",
      "",
      "{Total_Variations}",
      "",
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Amount", "Type"]],
      body: variationsBody,
      ...getStandardTableStyles(),
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Details Sections
  if (templateData.details && templateData.details.length > 0) {
    templateData.details.forEach((detail: any) => {
      yPos = checkPageBreak(doc, yPos, 40);
      yPos = addSectionHeader(doc, detail.section_title || "{Section_Title}", yPos);
      yPos += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const content = detail.section_content || "{Section_Content}";
      const lines = doc.splitTextToSize(content, pageWidth - STANDARD_MARGINS.left - STANDARD_MARGINS.right);
      
      lines.forEach((line: string) => {
        yPos = checkPageBreak(doc, yPos);
        doc.text(line, STANDARD_MARGINS.left, yPos);
        yPos += 6;
      });

      yPos += 5;
    });
  }

  // Add page numbers
  addPageNumbers(doc, 2);

  // Save the PDF
  const fileName = `Template_Cost_Report_${Date.now()}.pdf`;
  doc.save(fileName);
};
