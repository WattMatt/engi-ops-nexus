/**
 * AI Prediction PDF Export
 * 
 * MIGRATED TO PDFMAKE: This file maintains backward compatibility with jsPDF
 * while providing pdfmake alternatives for new implementations.
 */

import jsPDF from "jspdf";
import { captureChartAsCanvas, createHighQualityPDF, addHighQualityImage, waitForElementRender, captureChartAsBase64 } from "@/utils/pdfQualitySettings";
import { generateCoverPage, fetchCompanyDetails } from "@/utils/pdfCoverPage";
import { addRunningHeaders, addRunningFooter } from "@/utils/pdf/jspdfStandards";
import { createDocument, downloadPdf } from "./pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
interface PredictionData {
  summary: {
    totalEstimate: number;
    confidenceLevel: number;
    currency: string;
  };
  costBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  historicalTrend: Array<{
    project: string;
    budgeted: number;
    actual: number;
  }>;
  riskFactors: Array<{
    risk: string;
    probability: number;
    impact: number;
  }>;
  analysis: string;
}

interface ExportParams {
  predictionData: PredictionData;
  projectName: string;
  projectNumber: string;
  parameters: {
    projectSize: string;
    complexity: string;
    timeline: string;
    location: string;
  };
}

export const exportPredictionToPDF = async ({
  predictionData,
  projectName,
  projectNumber,
  parameters,
}: ExportParams) => {
  const doc = createHighQualityPDF("portrait", true);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Fetch company details
  const companyDetails = await fetchCompanyDetails();

  // Generate cover page
  await generateCoverPage(
    doc,
    {
      title: "AI Cost Prediction Report",
      projectName,
      subtitle: `Timeline: ${parameters.timeline} | Complexity: ${parameters.complexity}`,
      revision: "AI Generated",
    },
    companyDetails
  );

  // Add new page for content
  doc.addPage();
  yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Prediction Analysis", 14, yPos);
  yPos += 10;

  // Project Parameters Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Project Parameters", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Project Size: ${parameters.projectSize}`, 14, yPos);
  yPos += 6;
  doc.text(`Complexity: ${parameters.complexity}`, 14, yPos);
  yPos += 6;
  doc.text(`Timeline: ${parameters.timeline}`, 14, yPos);
  yPos += 6;
  doc.text(`Location: ${parameters.location}`, 14, yPos);
  yPos += 10;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  doc.text(
    `Total Estimated Cost: ${formatCurrency(predictionData.summary.totalEstimate)}`,
    14,
    yPos
  );
  yPos += 6;
  doc.text(
    `Confidence Level: ${predictionData.summary.confidenceLevel}%`,
    14,
    yPos
  );
  yPos += 10;

  // Cost Breakdown Table
  if (predictionData.costBreakdown.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Cost Breakdown", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Table header
    doc.setFont("helvetica", "bold");
    doc.text("Category", 14, yPos);
    doc.text("Amount", 100, yPos);
    doc.text("Percentage", 150, yPos);
    yPos += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    predictionData.costBreakdown.forEach((item) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(item.category, 14, yPos);
      doc.text(formatCurrency(item.amount), 100, yPos);
      doc.text(`${item.percentage}%`, 150, yPos);
      yPos += 6;
    });
    yPos += 10;
  }

  // Capture and add charts
  const chartsContainer = document.getElementById("prediction-charts");
  if (chartsContainer) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Visual Analysis", 14, yPos);
    yPos += 10;

    try {
      await waitForElementRender(1500);
      const canvas = await captureChartAsCanvas(chartsContainer);

      const imgWidth = pageWidth - 28;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - 40) {
        // Split into multiple pages if needed
        const ratio = (pageHeight - 40) / imgHeight;
        addHighQualityImage(doc, canvas, 14, yPos, imgWidth * ratio, (pageHeight - 40));
      } else {
        addHighQualityImage(doc, canvas, 14, yPos, imgWidth, imgHeight);
      }
    } catch (error) {
      console.error("Error capturing charts:", error);
    }
  }

  // Risk Factors Section
  if (predictionData.riskFactors.length > 0) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Risk Assessment", 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    predictionData.riskFactors.forEach((risk) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`• ${risk.risk}`, 14, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`  Probability: ${risk.probability}%`, 14, yPos);
      yPos += 5;
      doc.text(`  Potential Impact: ${formatCurrency(risk.impact)}`, 14, yPos);
      yPos += 8;
    });
  }

  // Detailed Analysis
  doc.addPage();
  yPos = 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Analysis", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Split analysis text into lines
  const analysisLines = doc.splitTextToSize(
    predictionData.analysis.replace(/[#*`]/g, ""),
    pageWidth - 28
  );

  analysisLines.forEach((line: string) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 14, yPos);
    yPos += 6;
  });

  // Add standardized running headers and footers
  addRunningHeaders(doc, 'AI Cost Prediction Report', projectName);
  addRunningFooter(doc, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Save the PDF
  const fileName = `Cost_Prediction_${projectName.replace(/\s+/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.pdf`;
  doc.save(fileName);
};
