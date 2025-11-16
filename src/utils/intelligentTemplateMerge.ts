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
  imagePlaceholders?: string[];
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
  const children: any[] = [];

  // Title
  children.push(
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
    })
  );

  // Add image placeholder section if images detected
  if (blankStructure.hasImages && blankStructure.images.length > 0) {
    children.push(
      new Paragraph({
        text: "DOCUMENT IMAGES",
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: "DOCUMENT IMAGES",
            bold: true,
            size: 20,
          }),
        ],
      })
    );

    blankStructure.images.forEach((img) => {
      const placeholderName = img.context.toLowerCase().replace(/\s+/g, "_") + "_image";
      children.push(
        new Paragraph({
          text: `${img.context}: {{%${placeholderName}}}`,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `${img.context}: `,
              bold: true,
            }),
            new TextRun({
              text: `{{%${placeholderName}}}`,
              italics: true,
            }),
          ],
        })
      );
      
      if (img.beforeText || img.afterText) {
        children.push(
          new Paragraph({
            text: `Context: "${img.beforeText}..." | "...${img.afterText}"`,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Context: "${img.beforeText}..." | "...${img.afterText}"`,
                size: 18,
                color: "666666",
              }),
            ],
          })
        );
      }
    });
  }

  // Project Information Section
  children.push(
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
    })
  );

  // Report Details
  children.push(
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
    })
  );

  // Construction Period
  children.push(
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
    })
  );

  // Contractors
  children.push(
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
      text: "Standby Plants: {{standby_plants_contractor}}",
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: "Earthing Contractor: {{earthing_contractor}}",
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: "CCTV Contractor: {{cctv_contractor}}",
      spacing: { after: 100 },
    })
  );

  // Financial Summary Table
  children.push(
    new Paragraph({
      text: "FINANCIAL SUMMARY",
      spacing: { before: 400, after: 200 },
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
              children: [new Paragraph({ text: "Description", children: [new TextRun({ text: "Description", bold: true })] })],
              shading: { fill: "CCCCCC" },
            }),
            new TableCell({
              children: [new Paragraph({ text: "Amount (R)", children: [new TextRun({ text: "Amount (R)", bold: true })] })],
              shading: { fill: "CCCCCC" },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Total Original Budget")] }),
            new TableCell({ children: [new Paragraph("{{total_original_budget}}")] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Total Variations")] }),
            new TableCell({ children: [new Paragraph("{{total_variations}}")] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Total Anticipated Final")] }),
            new TableCell({ children: [new Paragraph("{{total_anticipated_final}}")] }),
          ],
        }),
      ],
    })
  );

  // Category Distribution with Nested Loops
  children.push(
    new Paragraph({
      text: "CATEGORY BREAKDOWN",
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: "CATEGORY BREAKDOWN",
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
    })
  );

  // Variations Table with Loop
  children.push(
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
    })
  );

  // Notes Section
  children.push(
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
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function getPlaceholderSuggestions(
  blankStructure: TemplateStructure
): {
  standardPlaceholders: string[];
  loopSyntax: Array<{ section: string; syntax: string }>;
  imagePlaceholders: string[];
} {
  const standardPlaceholders: string[] = [];
  const loopSyntax: Array<{ section: string; syntax: string }> = [];
  const imagePlaceholders: string[] = [];

  // Add standard placeholders from schema
  COST_REPORT_SCHEMA.forEach((mapping) => {
    standardPlaceholders.push(...mapping.placeholders);
    if (mapping.loopSyntax) {
      loopSyntax.push({
        section: mapping.section,
        syntax: `${mapping.loopSyntax.start} ... ${mapping.loopSyntax.end}`,
      });
    }
  });

  // Add image placeholders based on detected images
  if (blankStructure.hasImages) {
    blankStructure.images.forEach((img) => {
      const placeholderName = `${img.context.toLowerCase().replace(/\s+/g, "_")}_image`;
      imagePlaceholders.push(`{{%${placeholderName}}} - ${img.context}`);
    });
  }

  return {
    standardPlaceholders,
    loopSyntax,
    imagePlaceholders,
  };
}
