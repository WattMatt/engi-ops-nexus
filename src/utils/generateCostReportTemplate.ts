import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, HeadingLevel, BorderStyle } from "docx";

export async function generateCostReportTemplate(): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "COST REPORT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Report Information
          new Paragraph({
            children: [
              new TextRun({ text: "Project: ", bold: true }),
              new TextRun("{{project_name}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Project Number: ", bold: true }),
              new TextRun("{{project_number}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Client: ", bold: true }),
              new TextRun("{{client_name}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Report Number: ", bold: true }),
              new TextRun("{{report_number}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Report Date: ", bold: true }),
              new TextRun("{{report_date}}"),
            ],
            spacing: { after: 400 },
          }),

          // Construction Period
          new Paragraph({
            text: "CONSTRUCTION PERIOD",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Site Handover: ", bold: true }),
              new TextRun("{{site_handover_date}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Practical Completion: ", bold: true }),
              new TextRun("{{practical_completion_date}}"),
            ],
            spacing: { after: 400 },
          }),

          // Contractors
          new Paragraph({
            text: "CONTRACT INFORMATION",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Electrical Contractor: ", bold: true }),
              new TextRun("{{electrical_contractor}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Earthing Contractor: ", bold: true }),
              new TextRun("{{earthing_contractor}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Standby Plants Contractor: ", bold: true }),
              new TextRun("{{standby_plants_contractor}}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CCTV Contractor: ", bold: true }),
              new TextRun("{{cctv_contractor}}"),
            ],
            spacing: { after: 400 },
          }),

          // Category Distribution Table Header
          new Paragraph({
            text: "CATEGORY DISTRIBUTION",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),

          // Category Distribution Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Code", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Original Budget", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Anticipated Final", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Variance", bold: true })] })] }),
                ],
              }),
              // Loop Row - This is the key part that docxtemplater will process
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("{#categories}{code}")] }),
                  new TableCell({ children: [new Paragraph("{description}")] }),
                  new TableCell({ children: [new Paragraph("R {original_budget}")] }),
                  new TableCell({ children: [new Paragraph("R {anticipated_final}")] }),
                  new TableCell({ children: [new Paragraph("{variance}{/categories}")] }),
                ],
              }),
              // Totals Row
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph("R {{total_original_budget}}")] }),
                  new TableCell({ children: [new Paragraph("R {{total_anticipated_final}}")] }),
                  new TableCell({ children: [new Paragraph("{{total_variance}}")] }),
                ],
              }),
            ],
          }),

          // Detailed Categories Section
          new Paragraph({
            text: "DETAILED BREAKDOWN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          
          new Paragraph("{#categories}"),
          new Paragraph({
            children: [
              new TextRun({ text: "{code} {description}", bold: true, size: 28 }),
            ],
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Original Budget: ", bold: true }),
              new TextRun("R {original_budget}"),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Anticipated Final: ", bold: true }),
              new TextRun("R {anticipated_final}"),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Variance: ", bold: true }),
              new TextRun("{variance}"),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Line Items:", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph("{#line_items}"),
          new Paragraph({
            children: [
              new TextRun("• {code}: {description} - Original: R {original_budget} → Anticipated: R {anticipated_final}"),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph("{/line_items}"),
          new Paragraph("{/categories}"),

          // Variations Section
          new Paragraph({
            text: "VARIATIONS",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Code", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("{#variations}{code}")] }),
                  new TableCell({ children: [new Paragraph("{description}")] }),
                  new TableCell({ children: [new Paragraph("{type}")] }),
                  new TableCell({ children: [new Paragraph("R {amount}{/variations}")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL VARIATIONS", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph("")] }),
                  new TableCell({ children: [new Paragraph("R {{total_variations}}")] }),
                ],
              }),
            ],
          }),

          // Notes
          new Paragraph({
            text: "NOTES",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph("{{notes}}"),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
