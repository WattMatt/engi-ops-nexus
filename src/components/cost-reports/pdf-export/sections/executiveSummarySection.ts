import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFGenerationContext, PdfmakeGenerationContext, PdfmakeSectionResult, PDF_COLORS, PDF_COLORS_HEX } from "../types";
import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";

// ============================================================================
// jsPDF Implementation (Legacy)
// ============================================================================

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

// ============================================================================
// pdfmake Implementation (New - preferred)
// ============================================================================

/**
 * Build executive summary content for pdfmake
 */
export function buildExecutiveSummaryContent(
  context: PdfmakeGenerationContext
): PdfmakeSectionResult {
  const { categoryTotals, grandTotals } = context;
  const tableData = generateExecutiveSummaryTableData(categoryTotals, grandTotals);

  const content: any[] = [
    // Header
    {
      text: 'EXECUTIVE SUMMARY',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 5],
    },
    {
      text: 'Key Performance Indicators & Financial Overview',
      fontSize: 9,
      color: '#3c3c3c',
      alignment: 'center',
      margin: [0, 0, 0, 10],
    },
    // Separator line
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#c8c8c8',
        },
      ],
      margin: [0, 0, 0, 15],
    },
    // Table
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          // Header row
          tableData.headers.map(h => ({
            text: h,
            style: 'tableHeader',
            alignment: h === 'Code' ? 'center' : (h === 'Description' ? 'left' : 'right'),
          } as any)),
          // Data rows
          ...tableData.categoryRows.map(row => [
            { text: row.code, bold: true, alignment: 'center' as const, fontSize: 8 },
            { text: row.description, bold: true, fontSize: 8 },
            { text: `R${row.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: `R${row.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: `R${row.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, fontSize: 8 },
            { text: row.percentOfTotal, alignment: 'center' as const, fontSize: 8 },
            { 
              text: `${row.currentVariance >= 0 ? '+' : ''}R${Math.abs(row.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              fontSize: 8,
              color: row.currentVariance < 0 ? PDF_COLORS_HEX.success : (row.currentVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
            { 
              text: `${row.originalVariance >= 0 ? '+' : ''}R${Math.abs(row.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              fontSize: 8,
              color: row.originalVariance < 0 ? PDF_COLORS_HEX.success : (row.originalVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
          ] as any[]),
          // Grand total row
          [
            { text: '', fontSize: 8 },
            { text: tableData.grandTotalRow.description, bold: true, fontSize: 8 },
            { text: `R${tableData.grandTotalRow.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8 },
            { text: `R${tableData.grandTotalRow.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8 },
            { text: `R${tableData.grandTotalRow.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, alignment: 'right' as const, bold: true, fontSize: 8 },
            { text: tableData.grandTotalRow.percentOfTotal, alignment: 'center' as const, bold: true, fontSize: 8 },
            { 
              text: `${tableData.grandTotalRow.currentVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              bold: true, 
              fontSize: 8,
              color: tableData.grandTotalRow.currentVariance < 0 ? PDF_COLORS_HEX.success : (tableData.grandTotalRow.currentVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
            { 
              text: `${tableData.grandTotalRow.originalVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 
              alignment: 'right' as const, 
              bold: true, 
              fontSize: 8,
              color: tableData.grandTotalRow.originalVariance < 0 ? PDF_COLORS_HEX.success : (tableData.grandTotalRow.originalVariance > 0 ? PDF_COLORS_HEX.danger : undefined),
            },
          ] as any[],
        ],
      },
      layout: {
        hLineWidth: () => 0.1,
        vLineWidth: () => 0.1,
        hLineColor: () => '#dcdcdc',
        vLineColor: () => '#dcdcdc',
        fillColor: (rowIndex: number) => rowIndex % 2 === 0 ? '#f9f9f9' : null,
      },
    },
  ];

  return {
    content,
    pageBreakBefore: true,
  };
}
