/**
 * COC Validation PDF Builder
 * Generates a "Certificate of Evidence" PDF using jsPDF
 * Jurisdiction: South Africa (OHS Act 85 of 1993, SANS 10142-1)
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COCData, COCTestReport, COCValidationResult, COCRuleResult } from "@/utils/cocValidationEngine";

interface COCPdfInput {
  data: COCData;
  test: COCTestReport;
  result: COCValidationResult;
}

const COLORS = {
  navy: [15, 30, 65] as [number, number, number],
  green: [34, 139, 34] as [number, number, number],
  red: [200, 30, 30] as [number, number, number],
  amber: [200, 150, 20] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case "VALID": return COLORS.green;
    case "INVALID": return COLORS.red;
    case "REQUIRES_REVIEW": return COLORS.amber;
    default: return COLORS.gray;
  }
}

function getResultLabel(passed: boolean, severity: string): string {
  if (passed) return severity === "WARNING" ? "WARNING" : "PASS";
  return severity === "CRITICAL" ? "FAIL" : severity === "WARNING" ? "WARNING" : "FAIL";
}

function formatCategory(cat: string): string {
  return cat.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function generateCOCValidationPdf(input: COCPdfInput): jsPDF {
  const { data, test, result } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 25;

  // ====== Header ======
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("COC Validation Report", margin, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Certificate of Evidence", margin, 26);
  doc.setFontSize(8);
  doc.text(`Ref: ${data.cocReferenceNumber}  |  Generated: ${new Date().toLocaleDateString("en-ZA")}`, margin, 34);
  y = 48;

  // ====== Status Banner ======
  const statusColor = getStatusColor(result.status);
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`VALIDATION STATUS: ${result.status}`, pageWidth / 2, y + 9, { align: "center" });
  y += 22;

  // ====== Fraud Risk Badge ======
  const fraudColor = getStatusColor(result.fraudRiskScore === "LOW" ? "VALID" : result.fraudRiskScore === "HIGH" ? "INVALID" : "REQUIRES_REVIEW");
  doc.setFillColor(...fraudColor);
  doc.roundedRect(margin, y, 60, 8, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Fraud Risk: ${result.fraudRiskScore}`, margin + 30, y + 5.5, { align: "center" });

  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(margin + 65, y, 50, 8, 2, 2, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(8);
  doc.text(`${result.passedRules.length}/${result.totalRulesChecked} Rules Passed`, margin + 90, y + 5.5, { align: "center" });
  y += 16;

  // ====== Section: Certificate Details ======
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. Certificate Details", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.gray }, 1: { cellWidth: 70 }, 2: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.gray } },
    body: [
      ["Certificate Type", formatCategory(data.certificateType), "Installation Type", formatCategory(data.installationType)],
      ["Address", data.installationAddress, "Phase", formatCategory(data.phaseConfiguration)],
      ["Supply Voltage", `${data.supplyVoltage} V`, "Frequency", `${data.supplyFrequency} Hz`],
      ["Date of Issue", data.dateOfIssue ? new Date(data.dateOfIssue).toLocaleDateString("en-ZA") : "N/A", "", ""],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ====== Section: Registered Person ======
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. Registered Person (Issuer)", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50, textColor: COLORS.gray } },
    body: [
      ["Name", data.registeredPersonName],
      ["Registration No.", data.registrationNumber],
      ["Category", formatCategory(data.registrationCategory)],
      ["Signature", test.hasSignature ? `Signed on ${test.signatureDate ? new Date(test.signatureDate).toLocaleDateString("en-ZA") : "N/A"}` : "MISSING"],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ====== Section: Test Results Table ======
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("3. Section 4 Test Results", margin, y);
  y += 2;

  const testRows: (string | number)[][] = [
    ["Insulation Resistance", test.insulationResistance_MOhm ?? "NOT MEASURED", "MΩ", "> 1.0", test.insulationResistance_MOhm != null ? (test.insulationResistance_MOhm > 1.0 ? "PASS" : "FAIL") : "INCOMPLETE"],
    ["Earth Loop Impedance (Zs)", test.earthLoopImpedance_Zs_Ohm ?? "NOT MEASURED", "Ω", "≤ 1.67", test.earthLoopImpedance_Zs_Ohm != null ? (test.earthLoopImpedance_Zs_Ohm <= 1.67 ? "PASS" : "WARNING") : "INCOMPLETE"],
    ["RCD Trip Time", test.rcdTripTime_ms ?? "NOT MEASURED", "ms", "≤ 300", test.rcdTripTime_ms != null ? (test.rcdTripTime_ms <= 300 ? (test.rcdTripTime_ms > 200 ? "WARNING" : "PASS") : "FAIL") : "INCOMPLETE"],
    ["RCD Rated Current", test.rcdRatedCurrent_mA, "mA", "—", "INFO"],
    ["PSCC", test.pscc_kA ?? "NOT MEASURED", "kA", "0.5–25", test.pscc_kA != null ? (test.pscc_kA >= 0.5 && test.pscc_kA <= 25 ? "PASS" : "WARNING") : "INCOMPLETE"],
    ["Earth Continuity", test.earthContinuity_Ohm ?? "—", "Ω", "—", test.earthContinuity_Ohm != null ? "MEASURED" : "—"],
    ["Voltage at Main DB", test.voltageAtMainDB_V ?? "—", "V", "—", test.voltageAtMainDB_V != null ? "MEASURED" : "—"],
    ["Polarity", test.polarityCorrect ? "Correct" : "Incorrect", "—", "Correct", test.polarityCorrect ? "PASS" : "FAIL"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Test Field", "Measured Value", "Unit", "SANS Threshold", "Result"]],
    body: testRows.map(r => r.map(String)),
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 4) {
        const val = String(hookData.cell.raw);
        if (val === "PASS" || val === "MEASURED") hookData.cell.styles.textColor = COLORS.green;
        else if (val === "FAIL" || val === "INCOMPLETE") hookData.cell.styles.textColor = COLORS.red;
        else if (val === "WARNING") hookData.cell.styles.textColor = COLORS.amber;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ====== Section: Solar/BESS (if applicable) ======
  if (test.hasSolarPV || test.hasBESS) {
    if (y > 240) { doc.addPage(); y = 25; }
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("4. SANS 10142-1:2024 — New Technology", margin, y);
    y += 2;

    const techRows: string[][] = [];
    if (test.hasSolarPV) {
      techRows.push(["Solar PV", "Grounding Verified", test.solarGroundingVerified ? "Yes" : "No", test.solarGroundingVerified ? "PASS" : "FAIL"]);
      techRows.push(["Solar PV", "Inverter Sync Verified", test.inverterSyncVerified ? "Yes" : "No", test.inverterSyncVerified ? "PASS" : "FAIL"]);
    }
    if (test.hasBESS) {
      techRows.push(["BESS", "Fire Protection Verified", test.bessFireProtection ? "Yes" : "No", test.bessFireProtection ? "PASS" : "FAIL"]);
    }
    techRows.push(["SPD", "Operational", test.spdOperational ? "Yes" : "No", test.spdOperational ? "PASS" : "FAIL"]);
    if (test.afddInstalled != null) {
      techRows.push(["AFDD", "Installed", test.afddInstalled ? "Yes" : "No", "INFO"]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["System", "Check", "Status", "Result"]],
      body: techRows,
      headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 3) {
          const val = String(hookData.cell.raw);
          if (val === "PASS") hookData.cell.styles.textColor = COLORS.green;
          else if (val === "FAIL") hookData.cell.styles.textColor = COLORS.red;
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ====== Section: Validation Rules Breakdown ======
  if (y > 220) { doc.addPage(); y = 25; }
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${test.hasSolarPV || test.hasBESS ? "5" : "4"}. Validation Rules Breakdown`, margin, y);
  y += 2;

  const allRules = [...result.failedRules, ...result.passedRules];
  const ruleRows = allRules.map((r: COCRuleResult) => [
    r.ruleId,
    r.ruleName,
    r.reference,
    getResultLabel(r.passed, r.severity),
    r.passed ? "" : r.message,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["ID", "Rule", "Reference", "Result", "Details"]],
    body: ruleRows,
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 32 }, 2: { cellWidth: 40 }, 3: { cellWidth: 16 }, 4: { cellWidth: contentWidth - 106 } },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 3) {
        const val = String(hookData.cell.raw);
        if (val === "PASS") hookData.cell.styles.textColor = COLORS.green;
        else if (val === "FAIL") hookData.cell.styles.textColor = COLORS.red;
        else if (val === "WARNING") hookData.cell.styles.textColor = COLORS.amber;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ====== Fraud Risk Assessment ======
  if (y > 250) { doc.addPage(); y = 25; }
  const sectionNum = test.hasSolarPV || test.hasBESS ? "6" : "5";
  doc.setTextColor(...COLORS.navy);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${sectionNum}. Fraud Risk Assessment`, margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  result.fraudRiskReasons.forEach((reason) => {
    if (y > 275) { doc.addPage(); y = 25; }
    doc.text(`• ${reason}`, margin + 4, y);
    y += 5;
  });
  y += 4;

  // ====== Footer ======
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(0, pageH - 18, pageWidth, 18, "F");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by WM Consulting Spud Operations Platform", margin, pageH - 11);
    doc.text("Jurisdiction: South Africa (OHS Act 85 of 1993, SANS 10142-1)", margin, pageH - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageH - 9, { align: "right" });
  }

  return doc;
}

export function downloadCOCValidationPdf(input: COCPdfInput, filename?: string): void {
  const doc = generateCOCValidationPdf(input);
  const name = filename || `COC-Validation-${input.data.cocReferenceNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}
