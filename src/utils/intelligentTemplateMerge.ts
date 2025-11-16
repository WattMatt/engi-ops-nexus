import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
} from "docx";
import { TemplateStructure } from "./analyzeWordTemplate";

export interface PlaceholderMapping {
  section: string;
  placeholders: string[];
  loopSyntax?: { start: string; end: string };
}

// Known placeholder schema for cost reports
const COST_REPORT_SCHEMA: PlaceholderMapping[] = [
  {
    section: "Project Information",
    placeholders: ["project_name", "project_number", "client_name"],
  },
  {
    section: "Report Details",
    placeholders: ["report_number", "report_date"],
  },
  {
    section: "Construction Period",
    placeholders: ["site_handover_date", "practical_completion_date"],
  },
  {
    section: "Contractors",
    placeholders: [
      "electrical_contractor",
      "standby_plants_contractor",
      "earthing_contractor",
      "cctv_contractor",
    ],
  },
  {
    section: "Financial Summary",
    placeholders: [
      "total_original_budget",
      "total_variations",
      "total_anticipated_final",
    ],
  },
  {
    section: "Category Distribution",
    placeholders: [],
    loopSyntax: {
      start: "{#categories}",
      end: "{/categories}",
    },
  },
  {
    section: "Variations",
    placeholders: [],
    loopSyntax: {
      start: "{#variations}",
      end: "{/variations}",
    },
  },
];

export async function generateIntelligentTemplate(
  blankStructure: TemplateStructure
): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "COST REPORT",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "COST REPORT",
                bold: true,
                size: 32,
              }),
            ],
          }),

          // Project Information Section
          new Paragraph({
            text: "PROJECT INFORMATION",
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text: "PROJECT INFORMATION",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "Project: {{project_name}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Project Number: {{project_number}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Client: {{client_name}}",
            spacing: { after: 100 },
          }),

          // Report Details
          new Paragraph({
            text: "REPORT DETAILS",
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text: "REPORT DETAILS",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "Report Number: {{report_number}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Report Date: {{report_date}}",
            spacing: { after: 100 },
          }),

          // Construction Period
          new Paragraph({
            text: "CONSTRUCTION PERIOD",
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text: "CONSTRUCTION PERIOD",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "Site Handover: {{site_handover_date}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Practical Completion: {{practical_completion_date}}",
            spacing: { after: 100 },
          }),

          // Contractors
          new Paragraph({
            text: "CONTRACT INFORMATION",
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text: "CONTRACT INFORMATION",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "Electrical Contractor: {{electrical_contractor}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Standby Plants Contractor: {{standby_plants_contractor}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "Earthing Contractor: {{earthing_contractor}}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "CCTV Contractor: {{cctv_contractor}}",
            spacing: { after: 200 },
          }),

          // Financial Summary Table
          new Paragraph({
            text: "FINANCIAL SUMMARY",
            spacing: { before: 300, after: 200 },
            children: [
              new TextRun({
                text: "FINANCIAL SUMMARY",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: "Description",
                        children: [
                          new TextRun({ text: "Description", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: "Amount (ZAR)",
                        children: [
                          new TextRun({ text: "Amount (ZAR)", bold: true }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Original Budget")],
                  }),
                  new TableCell({
                    children: [new Paragraph("R {{total_original_budget}}")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Total Variations")],
                  }),
                  new TableCell({
                    children: [new Paragraph("R {{total_variations}}")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("Anticipated Final")],
                  }),
                  new TableCell({
                    children: [new Paragraph("R {{total_anticipated_final}}")],
                  }),
                ],
              }),
            ],
          }),

          // Category Distribution with Loop
          new Paragraph({
            text: "CATEGORY DISTRIBUTION",
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "CATEGORY DISTRIBUTION",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "{#categories}",
            spacing: { after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("{{code}}")] }),
                  new TableCell({ children: [new Paragraph("{{description}}")] }),
                  new TableCell({ children: [new Paragraph("R {{original_budget}}")] }),
                  new TableCell({ children: [new Paragraph("R {{anticipated_final}}")] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: "{/categories}",
            spacing: { before: 100, after: 300 },
          }),

          // Detailed Breakdown with Nested Loop
          new Paragraph({
            text: "DETAILED BREAKDOWN",
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "DETAILED BREAKDOWN",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "{#categories}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "{{code}} - {{description}}",
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "{{code}} - {{description}}",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "{#line_items}",
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: "  {{code}}: {{description}} - R {{anticipated_final}}",
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: "{/line_items}",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "{/categories}",
            spacing: { after: 300 },
          }),

          // Variations Table with Loop
          new Paragraph({
            text: "VARIATIONS",
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "VARIATIONS",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "{#variations}",
            spacing: { after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("{{code}}")] }),
                  new TableCell({ children: [new Paragraph("{{description}}")] }),
                  new TableCell({ children: [new Paragraph("R {{amount}}")] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: "{/variations}",
            spacing: { before: 100, after: 300 },
          }),

          // Notes Section
          new Paragraph({
            text: "NOTES",
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "NOTES",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            text: "{{notes}}",
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function getPlaceholderSuggestions(
  blankStructure: TemplateStructure
): {
  suggestedPlacements: Array<{
    section: string;
    placeholders: string[];
    reasoning: string;
  }>;
  warnings: string[];
} {
  const suggestedPlacements = COST_REPORT_SCHEMA.map((schema) => ({
    section: schema.section,
    placeholders: schema.placeholders,
    reasoning: `These placeholders should appear in the "${schema.section}" section`,
  }));

  const warnings: string[] = [];

  if (!blankStructure.hasTableStructure) {
    warnings.push(
      "No tables detected in blank template. Financial data typically requires tabular format."
    );
  }

  if (blankStructure.headings.length < 3) {
    warnings.push(
      "Few headings detected. Consider adding section headings for better organization."
    );
  }

  return { suggestedPlacements, warnings };
}
