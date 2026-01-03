import jsPDF from "jspdf";
import { PDFGenerationContext, CATEGORY_COLORS } from "../types";

export async function generateCategoryDetailsSection(
  context: PDFGenerationContext
): Promise<number> {
  const { doc, pageWidth, pageHeight, contentStartX, contentStartY, margins, categoryTotals } = context;

  doc.addPage();
  const pageNumber = doc.getCurrentPageInfo().pageNumber;
  const contentWidth = pageWidth - contentStartX - margins.right;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("CATEGORY PERFORMANCE DETAILS", pageWidth / 2, contentStartY + 5, { align: "center" });

  // Generate category cards
  let yPos = contentStartY + 15;
  const cardWidth = (contentWidth - 20) / 2;
  const cardHeight = 45;
  const cardPadding = 10;
  let xPos = contentStartX;
  let cardsInRow = 0;

  categoryTotals.forEach((cat, index) => {
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

    // Check if we need a new row or page
    if (cardsInRow === 2) {
      xPos = contentStartX;
      yPos += cardHeight + cardPadding;
      cardsInRow = 0;
    }

    if (yPos + cardHeight > pageHeight - 30) {
      doc.addPage();
      yPos = contentStartY;
      xPos = contentStartX;
      cardsInRow = 0;
    }

    // Draw card background with border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'FD');

    // Draw colored side bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(xPos, yPos, 3, cardHeight, 'F');

    // Category code badge
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(xPos + 8, yPos + 5, 12, 8, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(cat.code, xPos + 14, yPos + 10, { align: 'center' });

    // Category description
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const descLines = doc.splitTextToSize(cat.description, cardWidth - 28);
    doc.text(descLines[0], xPos + 24, yPos + 10);

    // Original Budget
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("ORIGINAL BUDGET", xPos + 8, yPos + 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, xPos + 8, yPos + 24);

    // Anticipated Final
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("ANTICIPATED FINAL", xPos + 8, yPos + 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, xPos + 8, yPos + 36);

    // Variance badge
    const isNegative = cat.originalVariance < 0;
    doc.setFillColor(isNegative ? 220 : 254, isNegative ? 252 : 226, isNegative ? 231 : 226);
    doc.roundedRect(xPos + cardWidth - 25, yPos + 28, 20, 6, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isNegative ? 22 : 185, isNegative ? 163 : 28, isNegative ? 74 : 39);
    doc.text(isNegative ? 'SAVING' : 'EXTRA', xPos + cardWidth - 15, yPos + 32, { align: 'center' });

    // Variance amount
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${isNegative ? '-' : '+'}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      xPos + cardWidth - 8,
      yPos + 24,
      { align: 'right' }
    );

    xPos += cardWidth + cardPadding;
    cardsInRow++;
  });

  return pageNumber;
}
