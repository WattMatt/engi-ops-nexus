/**
 * PDF export utility for Final Account Sections
 * 
 * MIGRATED TO PDFMAKE: This file maintains backward compatibility with jsPDF
 * while providing pdfmake alternatives for new implementations.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import {
  initializePDF,
  getStandardTableStyles,
  addSectionHeader,
  addKeyValue,
  addPageNumbers,
  STANDARD_MARGINS,
  checkPageBreak,
} from "./pdfExportBase";
import { addRunningHeaders, addRunningFooter, getAutoTableDefaults } from "@/utils/pdf/jspdfStandards";
import { createDocument, downloadPdf } from "./pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

interface SectionData {
  id: string;
  section_code: string;
  section_name: string;
  description: string | null;
  contract_total: number;
  final_total: number;
  variation_total: number;
}

interface ItemData {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  contract_quantity: number;
  final_quantity: number;
  supply_rate: number;
  install_rate: number;
  contract_amount: number;
  final_amount: number;
  variation_amount: number;
  is_prime_cost?: boolean;
  pc_allowance?: number;
  pc_actual_cost?: number;
  is_pa_item?: boolean;
  pa_parent_item_id?: string;
  pa_percentage?: number;
}

interface BillData {
  bill_number: string;
  bill_name: string;
}

interface AccountData {
  account_number: string;
  account_name: string;
  project_name?: string;
}

export async function generateSectionPDF(sectionId: string): Promise<Blob> {
  // Fetch section data with bill and account info
  const { data: section, error: sectionError } = await supabase
    .from("final_account_sections")
    .select(`
      *,
      final_account_bills!inner(
        bill_number,
        bill_name,
        final_accounts!inner(
          account_number,
          account_name,
          projects(name)
        )
      )
    `)
    .eq("id", sectionId)
    .single();

  if (sectionError || !section) {
    throw new Error("Failed to fetch section data");
  }

  // Fetch items for this section
  const { data: items, error: itemsError } = await supabase
    .from("final_account_items")
    .select("*")
    .eq("section_id", sectionId)
    .order("display_order", { ascending: true });

  if (itemsError) {
    throw new Error("Failed to fetch section items");
  }

  const bill = section.final_account_bills as unknown as {
    bill_number: string;
    bill_name: string;
    final_accounts: {
      account_number: string;
      account_name: string;
      projects: { name: string } | null;
    };
  };

  const account = bill.final_accounts;
  const projectName = account.projects?.name || "Project";

  // Create PDF
  const doc = initializePDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  let y = STANDARD_MARGINS.top;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Final Account Section Review", STANDARD_MARGINS.left, y);
  y += 12;

  // Project and account info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - STANDARD_MARGINS.right - 50, STANDARD_MARGINS.top);

  y = addKeyValue(doc, "Project", projectName, STANDARD_MARGINS.left, y);
  y = addKeyValue(doc, "Account", `${account.account_number} - ${account.account_name}`, STANDARD_MARGINS.left, y);
  y = addKeyValue(doc, "Bill", `${bill.bill_number} - ${bill.bill_name}`, STANDARD_MARGINS.left, y);
  y += 4;

  // Section header
  y = addSectionHeader(doc, `${section.section_code} - ${section.section_name}`, y);

  if (section.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text(section.description, STANDARD_MARGINS.left, y);
    y += 8;
  }

  // Summary box
  y = checkPageBreak(doc, y, 30);
  
  const summaryData = [
    ["Contract Total", `R ${Number(section.contract_total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`],
    ["Final Total", `R ${Number(section.final_total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`],
    ["Variation", `R ${Number(section.variation_total || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    ...getAutoTableDefaults(),
    startY: y,
    head: [["Summary", "Amount"]],
    body: summaryData,
    theme: "grid",
    tableWidth: 100,
    margin: { left: STANDARD_MARGINS.left },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Items table
  if (items && items.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionHeader(doc, "Line Items", y);

    // Create item map for P&A parent lookups
    const itemMap = new Map(items.map((item: ItemData) => [item.id, item]));

    const tableData = items.map((item: ItemData) => {
      let contractAmt = Number(item.contract_amount || 0);
      let finalAmt = Number(item.final_amount || 0);
      let variationAmt = Number(item.variation_amount || 0);

      // Check if this is a header/description row (no unit) - but NOT P&A items with % unit
      const hasNoUnit = !item.unit || item.unit.trim() === '';

      // Calculate PC item values
      if (item.is_prime_cost) {
        contractAmt = Number(item.pc_allowance) || Number(item.contract_amount) || 0;
        finalAmt = Number(item.pc_actual_cost) || 0;
        variationAmt = finalAmt - contractAmt;
      }

      // Calculate P&A item values
      if (item.is_pa_item && item.pa_parent_item_id) {
        const parentItem = itemMap.get(item.pa_parent_item_id);
        if (parentItem) {
          const parentAllowance = Number(parentItem.pc_allowance) || Number(parentItem.contract_amount) || 0;
          const parentActual = Number(parentItem.pc_actual_cost) || 0;
          const paPercent = Number(item.pa_percentage) || 0;
          contractAmt = parentAllowance * (paPercent / 100);
          finalAmt = parentActual * (paPercent / 100);
          variationAmt = finalAmt - contractAmt;
        }
      }

      // For header/description rows without units, hide all numeric values
      if (hasNoUnit) {
        return [
          item.item_code || "",
          item.description || "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ];
      }

      // Format quantities - show empty if null/undefined
      const formatQty = (val: number | null | undefined) => 
        val === null || val === undefined ? "" : Number(val).toFixed(2);
      
      // Format currency - show empty if null/undefined  
      const formatRate = (val: number | null | undefined) =>
        val === null || val === undefined ? "" : `R ${Number(val).toFixed(2)}`;

      return [
        item.item_code || "",
        item.description || "",
        item.unit || "",
        formatQty(item.contract_quantity),
        formatQty(item.final_quantity),
        formatRate(item.supply_rate),
        formatRate(item.install_rate),
        `R ${contractAmt.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
        `R ${finalAmt.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
        `R ${variationAmt.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      ];
    });

    autoTable(doc, {
      ...getAutoTableDefaults(),
      startY: y,
      head: [[
        "Code",
        "Description",
        "Unit",
        "Contract Qty",
        "Final Qty",
        "Supply Rate",
        "Install Rate",
        "Contract Amt",
        "Final Amt",
        "Variation",
      ]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [71, 85, 105] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 15 },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 25, halign: "right" },
        7: { cellWidth: 28, halign: "right" },
        8: { cellWidth: 28, halign: "right" },
        9: { cellWidth: 28, halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("No line items in this section", STANDARD_MARGINS.left, y);
  }

  // Signature area
  doc.addPage();
  y = STANDARD_MARGINS.top;

  y = addSectionHeader(doc, "Review Sign-off", y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  doc.text("I confirm that I have reviewed the above section and:", STANDARD_MARGINS.left, y);
  y += 10;

  const checkboxY = y;
  doc.rect(STANDARD_MARGINS.left, checkboxY - 4, 5, 5);
  doc.text("Approve this section as accurate", STANDARD_MARGINS.left + 10, checkboxY);
  y += 10;

  doc.rect(STANDARD_MARGINS.left, y - 4, 5, 5);
  doc.text("Request changes (see comments below)", STANDARD_MARGINS.left + 10, y);
  y += 20;

  doc.text("Comments:", STANDARD_MARGINS.left, y);
  y += 5;
  doc.rect(STANDARD_MARGINS.left, y, pageWidth - STANDARD_MARGINS.left - STANDARD_MARGINS.right, 40);
  y += 50;

  doc.text("Reviewer Name: ____________________________________", STANDARD_MARGINS.left, y);
  y += 15;
  doc.text("Signature: ____________________________________", STANDARD_MARGINS.left, y);
  doc.text("Date: ____________________", pageWidth / 2, y);

  // Add standardized running headers and footers
  addRunningHeaders(doc, 'Final Account Section Review', projectName);
  addRunningFooter(doc, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Return as blob
  return doc.output("blob");
}

export async function downloadSectionPDF(sectionId: string, sectionName: string): Promise<void> {
  const blob = await generateSectionPDF(sectionId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Section_Review_${sectionName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
