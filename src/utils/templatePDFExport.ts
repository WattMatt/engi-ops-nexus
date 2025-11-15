import jsPDF from "jspdf";
import "jspdf-autotable";

export const exportTemplatePDF = async (templateData: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Add cover page
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("{Project_Name}", pageWidth / 2, 80, { align: "center" });
  
  doc.setFontSize(18);
  doc.text("Cost Report Template", pageWidth / 2, 100, { align: "center" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("{Client_Name}", pageWidth / 2, 120, { align: "center" });
  doc.text("Report Number: {Report_Number}", pageWidth / 2, 130, { align: "center" });
  doc.text("Date: {Report_Date}", pageWidth / 2, 140, { align: "center" });

  // Add summary page
  doc.addPage();
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("COST SUMMARY", pageWidth / 2, 22, { align: "center" });

  doc.setTextColor(0, 0, 0);
  let yPos = 50;

  (doc as any).autoTable({
    startY: yPos,
    head: [["Description", "Original Budget", "Previous Report", "Anticipated Final"]],
    body: templateData.categories.map((cat: any) => [
      cat.description,
      "{Original_Budget}",
      "{Previous_Report}",
      "{Anticipated_Final}",
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
  });

  // Add detailed categories
  templateData.categories.forEach((category: any, catIndex: number) => {
    const categoryLineItems = templateData.lineItems.filter(
      (item: any) => item.category_id === category.id
    );

    if (categoryLineItems.length === 0) return;

    doc.addPage();
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(category.description, pageWidth / 2, 22, { align: "center" });

    doc.setTextColor(0, 0, 0);
    yPos = 50;

    (doc as any).autoTable({
      startY: yPos,
      head: [["Code", "Description", "Original Budget", "Previous Report", "Anticipated Final"]],
      body: categoryLineItems.map((item: any) => [
        item.code,
        item.description,
        "{Original_Budget}",
        "{Previous_Report}",
        "{Anticipated_Final}",
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
  });

  // Add variations page
  if (templateData.variations && templateData.variations.length > 0) {
    doc.addPage();
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("VARIATIONS", pageWidth / 2, 22, { align: "center" });

    doc.setTextColor(0, 0, 0);
    (doc as any).autoTable({
      startY: 50,
      head: [["Code", "Description", "Amount"]],
      body: templateData.variations.map((variation: any) => [
        variation.code,
        variation.description,
        "{Amount}",
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
  }

  // Save the PDF
  const fileName = `Template_Cost_Report_${Date.now()}.pdf`;
  doc.save(fileName);
};
