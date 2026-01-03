import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFGenerationContext, PDF_COLORS } from "../types";
import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";

export async function generateExecutiveSummarySection(
  context: PDFGenerationContext
): Promise<number> {
  const { doc, pageWidth, contentStartX, contentStartY, margins, categoryTotals, grandTotals } = context;

  doc.addPage();
  const pageNumber = doc.getCurrentPageInfo().pageNumber;

  // Simple professional header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("EXECUTIVE SUMMARY", pageWidth / 2, contentStartY + 3, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, contentStartY + 9, { align: "center" });

  // Subtle line under header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(contentStartX, contentStartY + 12, pageWidth - margins.right, contentStartY + 12);

  doc.setTextColor(...PDF_COLORS.text);
  let tableY = contentStartY + 16;

  // Generate table data using shared utility
  const tableData = generateExecutiveSummaryTableData(categoryTotals, grandTotals);

  // Prepare table rows for autoTable
  const tableRows = [
    ...tableData.categoryRows.map(row => [
      row.code,
      row.description,
      `R${row.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${row.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${row.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      row.percentOfTotal,
      `${row.currentVariance >= 0 ? '+' : ''}R${Math.abs(row.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `${row.originalVariance >= 0 ? '+' : ''}R${Math.abs(row.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    ]),
    // Grand total row
    [
      '',
      tableData.grandTotalRow.description,
      `R${tableData.grandTotalRow.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${tableData.grandTotalRow.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R${tableData.grandTotalRow.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      tableData.grandTotalRow.percentOfTotal,
      `${tableData.grandTotalRow.currentVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `${tableData.grandTotalRow.originalVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
    ]
  ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: 10, right: 10 },
    head: [tableData.headers],
    body: tableRows,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      overflow: 'linebreak',
      halign: 'left',
      minCellHeight: 8,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: PDF_COLORS.tableHeader,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto', halign: 'right' },
      3: { cellWidth: 'auto', halign: 'right' },
      4: { cellWidth: 'auto', halign: 'right' },
      5: { cellWidth: 'auto', halign: 'center' },
      6: { cellWidth: 'auto', halign: 'right' },
      7: { cellWidth: 'auto', halign: 'right' }
    },
    didParseCell: (data: any) => {
      // Make category rows slightly bold
      if (data.section === 'body' && data.row.index < tableRows.length - 1) {
        if (data.column.index === 0 || data.column.index === 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Color totals row variance
      if (data.section === 'body' && data.row.index === tableRows.length - 1) {
        if (data.column.index === 6) {
          if (tableData.grandTotalRow.currentVariance < 0) {
            data.cell.styles.textColor = PDF_COLORS.success;
          } else if (tableData.grandTotalRow.currentVariance > 0) {
            data.cell.styles.textColor = PDF_COLORS.danger;
          }
        }
        if (data.column.index === 7) {
          if (tableData.grandTotalRow.originalVariance < 0) {
            data.cell.styles.textColor = PDF_COLORS.success;
          } else if (tableData.grandTotalRow.originalVariance > 0) {
            data.cell.styles.textColor = PDF_COLORS.danger;
          }
        }
      }
    }
  });

  return pageNumber;
}
