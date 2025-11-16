import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";

export type TemplateType = "cover_page" | "cost_report" | "cable_schedule" | "final_account" | "specification" | "project_outline" | "bulk_services";

interface PlaceholderSection {
  title: string;
  placeholders: string[];
}

const PLACEHOLDER_DEFINITIONS: Record<TemplateType, PlaceholderSection[]> = {
  cover_page: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{project_number}}",
        "{{report_title}}",
        "{{date}}",
        "{{revision}}"
      ]
    },
    {
      title: "PREPARED BY",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}",
        "{{prepared_by_email}}",
        "{{prepared_by_phone}}"
      ]
    },
    {
      title: "PREPARED FOR",
      placeholders: [
        "{{client_name}}",
        "{{prepared_for_name}}",
        "{{prepared_for_contact}}",
        "{{prepared_for_address1}}",
        "{{prepared_for_address2}}",
        "{{prepared_for_phone}}"
      ]
    },
    {
      title: "LOGOS (Insert manually using Insert > Pictures)",
      placeholders: [
        "Company Logo - Insert at top left",
        "Client Logo - Insert at top right"
      ]
    }
  ],
  cost_report: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{project_number}}",
        "{{client_name}}",
        "{{report_number}}",
        "{{report_date}}",
        "{{practical_completion_date}}",
        "{{site_handover_date}}"
      ]
    },
    {
      title: "CONTRACTORS",
      placeholders: [
        "{{electrical_contractor}}",
        "{{earthing_contractor}}",
        "{{cctv_contractor}}",
        "{{standby_plants_contractor}}"
      ]
    },
    {
      title: "COST SUMMARY",
      placeholders: [
        "{{total_original_budget}}",
        "{{total_anticipated_final}}",
        "{{total_variations}}",
        "{{budget_variance}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{company_tagline}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}"
      ]
    }
  ],
  cable_schedule: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{schedule_name}}",
        "{{schedule_number}}",
        "{{schedule_date}}",
        "{{revision}}",
        "{{layout_name}}"
      ]
    },
    {
      title: "CABLE SUMMARY",
      placeholders: [
        "{{total_cables}}",
        "{{total_length}}",
        "{{total_supply_cost}}",
        "{{total_install_cost}}",
        "{{total_cost}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}"
      ]
    }
  ],
  final_account: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{project_number}}",
        "{{client_name}}",
        "{{account_date}}",
        "{{revision}}"
      ]
    },
    {
      title: "FINANCIAL SUMMARY",
      placeholders: [
        "{{total_contract_value}}",
        "{{total_variations}}",
        "{{total_final_account}}",
        "{{retention_amount}}",
        "{{amount_due}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}"
      ]
    }
  ],
  specification: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{project_number}}",
        "{{specification_title}}",
        "{{revision}}",
        "{{date}}"
      ]
    },
    {
      title: "SPECIFICATION DETAILS",
      placeholders: [
        "{{scope_of_work}}",
        "{{technical_standards}}",
        "{{quality_requirements}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}"
      ]
    }
  ],
  project_outline: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{project_number}}",
        "{{outline_title}}",
        "{{date}}",
        "{{revision}}"
      ]
    },
    {
      title: "PROJECT SUMMARY",
      placeholders: [
        "{{project_description}}",
        "{{total_sections}}",
        "{{completion_date}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by_name}}",
        "{{prepared_by_contact}}"
      ]
    }
  ],
  bulk_services: [
    {
      title: "PROJECT INFORMATION",
      placeholders: [
        "{{project_name}}",
        "{{document_number}}",
        "{{document_date}}",
        "{{revision}}",
        "{{client_name}}"
      ]
    },
    {
      title: "TECHNICAL DETAILS",
      placeholders: [
        "{{total_connected_load}}",
        "{{maximum_demand}}",
        "{{diversity_factor}}",
        "{{climatic_zone}}",
        "{{supply_authority}}",
        "{{primary_voltage}}"
      ]
    },
    {
      title: "COMPANY DETAILS",
      placeholders: [
        "{{company_name}}",
        "{{prepared_by}}",
        "{{prepared_by_contact}}",
        "{{architect}}",
        "{{client_representative}}"
      ]
    }
  ]
};

export const generatePlaceholderDocument = (templateType: TemplateType): Document => {
  const sections = PLACEHOLDER_DEFINITIONS[templateType] || [];
  
  const children: Paragraph[] = [
    new Paragraph({
      text: "========================================",
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "TEMPLATE PLACEHOLDERS - REFERENCE GUIDE",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "========================================",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: "Copy and paste these placeholders into your document where needed.",
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "The placeholders will be automatically replaced with actual data when generating reports.",
      spacing: { after: 400 }
    }),
  ];

  sections.forEach(section => {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
      })
    );

    section.placeholders.forEach(placeholder => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: placeholder,
              bold: true
            })
          ],
          spacing: { after: 100 }
        })
      );
    });
  });

  children.push(
    new Paragraph({
      text: "",
      spacing: { before: 400 }
    }),
    new Paragraph({
      text: "========================================",
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 }
    }),
    new Paragraph({
      text: "END OF PLACEHOLDER REFERENCE",
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      text: "========================================",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  return new Document({
    sections: [{
      children
    }]
  });
};

export const getPlaceholdersByType = (templateType: TemplateType): PlaceholderSection[] => {
  return PLACEHOLDER_DEFINITIONS[templateType] || [];
};
