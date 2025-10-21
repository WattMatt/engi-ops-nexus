import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CostReport {
  report_number: number;
  report_date: string;
  project_number: string;
  project_name: string;
  client_name: string;
  site_handover_date?: string;
  practical_completion_date?: string;
  electrical_contractor?: string;
  earthing_contractor?: string;
  standby_plants_contractor?: string;
  cctv_contractor?: string;
  notes?: string;
  project_logo_url?: string;
  client_logo_url?: string;
}

interface Category {
  code: string;
  description: string;
  original_budget: number;
  previous_report: number;
  anticipated_final: number;
}

interface LineItem {
  code: string;
  description: string;
  original_budget: number;
  previous_report: number;
  anticipated_final: number;
}

interface Variation {
  code: string;
  description: string;
  amount: number;
  is_credit: boolean;
  tenant?: {
    shop_name: string;
    shop_number: string;
  };
}

export const generateCostReportPDF = (
  report: CostReport,
  categories: Category[],
  lineItems: Record<string, LineItem[]>,
  variations: Variation[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title Page with logos if available
  if (report.project_logo_url || report.client_logo_url) {
    let yOffset = 20;
    
    // Add project logo if available
    if (report.project_logo_url) {
      try {
        doc.addImage(report.project_logo_url, "PNG", pageWidth / 2 - 25, yOffset, 50, 30);
        yOffset += 35;
      } catch (e) {
        console.warn("Could not load project logo");
      }
    }

    // Add client logo if available
    if (report.client_logo_url) {
      try {
        doc.addImage(report.client_logo_url, "PNG", pageWidth / 2 - 25, yOffset, 50, 30);
        yOffset += 35;
      } catch (e) {
        console.warn("Could not load client logo");
      }
    }
  }

  // Title Page
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`COST REPORT NO. ${report.report_number}`, pageWidth / 2, 40, {
    align: "center",
  });

  doc.setFontSize(16);
  doc.text("FOR", pageWidth / 2, 60, { align: "center" });

  doc.setFontSize(18);
  doc.text(report.project_name.toUpperCase(), pageWidth / 2, 80, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${report.project_number}`, pageWidth / 2, 100, { align: "center" });
  doc.text(
    new Date(report.report_date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    pageWidth / 2,
    110,
    { align: "center" }
  );

  // Page 2 - General Information
  doc.addPage();
  let yPos = 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`PROJECT NO. - ${report.project_number}`, 14, yPos);
  yPos += 6;
  doc.text(`PROJECT NAME - ${report.project_name}`, 14, yPos);
  yPos += 6;
  doc.text(`CLIENT - ${report.client_name}`, 14, yPos);
  yPos += 6;
  doc.text(
    `DATE - ${new Date(report.report_date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
    14,
    yPos
  );
  yPos += 6;
  doc.text(`COST REPORT NO. - ${report.report_number}`, 14, yPos);
  yPos += 15;

  doc.setFont("helvetica", "normal");
  doc.text("1  GENERAL", 14, yPos);
  yPos += 10;

  doc.text("1  BASIS FOR COSTS", 14, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.text(
    `The costs used herein are based on drawings and all information as at ${new Date(
      report.report_date
    ).toLocaleDateString("en-GB")}`,
    14,
    yPos
  );
  yPos += 10;

  doc.setFontSize(10);
  if (report.site_handover_date || report.practical_completion_date) {
    doc.text("5  CONSTRUCTION PERIOD", 14, yPos);
    yPos += 6;
    doc.setFontSize(9);
    if (report.site_handover_date) {
      doc.text(
        `Site handover: ${new Date(report.site_handover_date).toLocaleDateString("en-GB")}`,
        14,
        yPos
      );
      yPos += 5;
    }
    if (report.practical_completion_date) {
      doc.text(
        `Practical completion: ${new Date(
          report.practical_completion_date
        ).toLocaleDateString("en-GB")}`,
        14,
        yPos
      );
      yPos += 5;
    }
    yPos += 5;
  }

  doc.setFontSize(10);
  if (
    report.electrical_contractor ||
    report.earthing_contractor ||
    report.standby_plants_contractor ||
    report.cctv_contractor
  ) {
    doc.text("8  CONTRACT INFORMATION", 14, yPos);
    yPos += 6;
    doc.setFontSize(9);
    if (report.electrical_contractor) {
      doc.text(`Electrical: ${report.electrical_contractor}`, 14, yPos);
      yPos += 5;
    }
    if (report.earthing_contractor) {
      doc.text(
        `Earthing and lightning protection: ${report.earthing_contractor}`,
        14,
        yPos
      );
      yPos += 5;
    }
    if (report.standby_plants_contractor) {
      doc.text(
        `Standby Plants: ${report.standby_plants_contractor}`,
        14,
        yPos
      );
      yPos += 5;
    }
    if (report.cctv_contractor) {
      doc.text(`CCTV and access control: ${report.cctv_contractor}`, 14, yPos);
      yPos += 5;
    }
  }

  // Overall Summary Page
  doc.addPage();
  yPos = 20;

  const totalOriginalBudget = categories.reduce(
    (sum, cat) => sum + Number(cat.original_budget),
    0
  );
  const totalPreviousReport = categories.reduce(
    (sum, cat) => sum + Number(cat.previous_report),
    0
  );
  const totalAnticipatedFinal = categories.reduce(
    (sum, cat) => sum + Number(cat.anticipated_final),
    0
  );
  const currentExtra = totalAnticipatedFinal - totalPreviousReport;
  const extraFromOriginal = totalAnticipatedFinal - totalOriginalBudget;

  const summaryData = [
    [
      "OVERALL SUMMARY",
      formatCurrency(totalOriginalBudget),
      formatCurrency(totalPreviousReport),
      formatCurrency(totalAnticipatedFinal),
      formatCurrency(currentExtra),
      formatCurrency(extraFromOriginal),
    ],
    ["", "", "", "", "", ""],
    ...categories.map((cat) => {
      const catCurrentExtra = Number(cat.anticipated_final) - Number(cat.previous_report);
      const catExtraFromOriginal = Number(cat.anticipated_final) - Number(cat.original_budget);
      return [
        `${cat.code} - ${cat.description}`,
        formatCurrency(cat.original_budget),
        formatCurrency(cat.previous_report),
        formatCurrency(cat.anticipated_final),
        formatCurrency(catCurrentExtra),
        formatCurrency(catExtraFromOriginal),
      ];
    }),
  ];

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        "CODE / DESCRIPTION",
        "ORIGINAL\nBUDGET",
        "PREVIOUS\nCOST REPORT",
        "ANTICIPATED\nFINAL COST",
        "CURRENT\n(SAVING)/EXTRA",
        "(SAVING)/EXTRA\nORIGINAL BUDGET",
      ],
    ],
    body: summaryData,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 25, halign: "right" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
    },
  });

  // Category Detail Pages
  categories.forEach((category) => {
    doc.addPage();
    yPos = 20;

    const items = lineItems[category.code] || [];
    
    const categoryData = [
      [
        `${category.code} - ${category.description}`,
        formatCurrency(category.original_budget),
        formatCurrency(category.previous_report),
        formatCurrency(category.anticipated_final),
        formatCurrency(
          Number(category.anticipated_final) - Number(category.previous_report)
        ),
        formatCurrency(
          Number(category.anticipated_final) - Number(category.original_budget)
        ),
      ],
      ["", "", "", "", "", ""],
      ...items.map((item) => {
        const itemCurrentExtra =
          Number(item.anticipated_final) - Number(item.previous_report);
        const itemExtraFromOriginal =
          Number(item.anticipated_final) - Number(item.original_budget);
        return [
          `${item.code} - ${item.description}`,
          formatCurrency(item.original_budget),
          formatCurrency(item.previous_report),
          formatCurrency(item.anticipated_final),
          formatCurrency(itemCurrentExtra),
          formatCurrency(itemExtraFromOriginal),
        ];
      }),
    ];

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          "CODE / DESCRIPTION",
          "ORIGINAL\nBUDGET",
          "PREVIOUS\nCOST REPORT",
          "ANTICIPATED\nFINAL COST",
          "CURRENT\n(SAVING)/EXTRA",
          "(SAVING)/EXTRA\nORIGINAL BUDGET",
        ],
      ],
      body: categoryData,
      theme: "grid",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: "right" },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
      },
    });
  });

  // Variations Page
  if (variations.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("VARIATIONS", 14, yPos);
    yPos += 10;

    const variationsData = variations.map((v) => [
      v.code,
      v.description +
        (v.tenant ? ` (${v.tenant.shop_number} - ${v.tenant.shop_name})` : ""),
      v.is_credit ? `-${formatCurrency(v.amount)}` : formatCurrency(v.amount),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["CODE", "DESCRIPTION", "AMOUNT"]],
      body: variationsData,
      theme: "grid",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 120 },
        2: { cellWidth: 30, halign: "right" },
      },
    });
  }

  // Save PDF
  doc.save(
    `Cost_Report_${report.report_number}_${report.project_name.replace(/\s+/g, "_")}.pdf`
  );
};

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(${formatted})` : formatted;
}
