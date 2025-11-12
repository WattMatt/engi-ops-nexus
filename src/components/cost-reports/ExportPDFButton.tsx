import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { PDFExportSettings, DEFAULT_MARGINS, type PDFMargins } from "./PDFExportSettings";
import { calculateCategoryTotals, calculateGrandTotals, validateTotals } from "@/utils/costReportCalculations";
import { ValidationWarningDialog } from "./ValidationWarningDialog";
import { captureKPICards, prepareElementForCapture, canvasToDataURL } from "@/utils/captureUIForPDF";
import { TemplateExportDialog } from "./TemplateExportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportPDFButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const ExportPDFButton = ({ report, onReportGenerated }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>("");
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [margins, setMargins] = useState<PDFMargins>(DEFAULT_MARGINS);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationMismatches, setValidationMismatches] = useState<string[]>([]);
  const [pendingExport, setPendingExport] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const handleExport = async (useMargins: PDFMargins = margins, skipValidation: boolean = false) => {
    setLoading(true);
    setCurrentSection("Fetching data...");
    try {
      // Fetch all data
      const [categoriesResult, variationsResult, detailsResult, allLineItemsResult] = await Promise.all([
        supabase
          .from("cost_categories")
          .select(`*, cost_line_items (*)`)
          .eq("cost_report_id", report.id)
          .order("display_order"),
        supabase
          .from("cost_variations")
          .select("*")
          .eq("cost_report_id", report.id)
          .order("display_order"),
        supabase
          .from("cost_report_details")
          .select("*")
          .eq("cost_report_id", report.id)
          .order("display_order"),
        supabase
          .from("cost_line_items")
          .select("*, cost_categories!inner(cost_report_id)")
          .eq("cost_categories.cost_report_id", report.id)
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (variationsResult.error) throw variationsResult.error;
      if (detailsResult.error) throw detailsResult.error;
      if (allLineItemsResult.error) throw allLineItemsResult.error;

      const categories = categoriesResult.data || [];
      const variations = variationsResult.data || [];
      const details = detailsResult.data || [];
      const allLineItems = allLineItemsResult.data || [];
      
      // Calculate totals using shared utility and sort alphabetically
      const pdfCategoryTotals = calculateCategoryTotals(categories, allLineItems, variations)
        .sort((a, b) => a.code.localeCompare(b.code));
      const pdfGrandTotals = calculateGrandTotals(pdfCategoryTotals);
      
      // Validate totals if not skipping validation
      if (!skipValidation) {
        // Calculate UI totals from flat line items list and sort alphabetically
        const uiCategoryTotals = calculateCategoryTotals(categories, allLineItems, variations)
          .sort((a, b) => a.code.localeCompare(b.code));
        const uiGrandTotals = calculateGrandTotals(uiCategoryTotals);
        
        const validation = validateTotals(uiGrandTotals, pdfGrandTotals);
        
        if (!validation.isValid) {
          setValidationMismatches(validation.mismatches);
          setValidationDialogOpen(true);
          setPendingExport(true);
          setLoading(false);
          return;
        }
      }
      
      setCurrentSection("Preparing company details...");
      const companyDetails = await fetchCompanyDetails();

      setCurrentSection("Initializing PDF document...");
      // Create PDF
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const tocSections: { title: string; page: number }[] = [];
      
      // Calculate content dimensions based on margins
      const contentWidth = pageWidth - useMargins.left - useMargins.right;
      const contentStartX = useMargins.left;
      const contentStartY = useMargins.top;

      setCurrentSection("Generating cover page...");
      // ========== COVER PAGE ==========
      await generateCoverPage(doc, {
        title: "Cost Report",
        projectName: report.project_name,
        subtitle: `Report #${report.report_number}`,
        revision: `Report ${report.report_number}`,
      }, companyDetails);

      setCurrentSection("Creating table of contents...");
      // ========== TABLE OF CONTENTS ==========
      doc.addPage();
      const tocPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("TABLE OF CONTENTS", pageWidth / 2, contentStartY + 10, { align: "center" });

      // We'll fill this in after generating all pages
      const tocStartY = contentStartY + 30;

      // Use the already calculated totals
      const categoryTotals = pdfCategoryTotals.map(ct => ({
        code: ct.code,
        description: ct.description,
        originalBudget: ct.originalBudget,
        previousReport: ct.previousReport,
        anticipatedFinal: ct.anticipatedFinal,
        currentVariance: ct.currentVariance,
        originalVariance: ct.originalVariance
      }));

      const totalOriginalBudget = pdfGrandTotals.originalBudget;
      const totalPreviousReport = pdfGrandTotals.previousReport;
      const totalAnticipatedFinal = pdfGrandTotals.anticipatedFinal;
      const currentVariance = pdfGrandTotals.currentVariance;
      const originalVariance = pdfGrandTotals.originalVariance;
      
      const currentVariancePercentage = totalPreviousReport > 0 
        ? ((Math.abs(currentVariance) / totalPreviousReport) * 100) 
        : 0;
      const originalVariancePercentage = totalOriginalBudget > 0 
        ? ((Math.abs(originalVariance) / totalOriginalBudget) * 100) 
        : 0;

      setCurrentSection("Preparing for capture...");
      
      // Try multiple methods to switch to Overview tab
      console.log("Attempting to switch to Overview tab...");
      
      // Method 1: Click the trigger button directly
      const overviewTrigger = document.querySelector('[value="overview"]') as HTMLElement;
      if (overviewTrigger) {
        console.log("Found overview trigger, clicking...");
        overviewTrigger.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Method 2: Try finding by text content
      if (!overviewTrigger) {
        const triggers = Array.from(document.querySelectorAll('button[role="tab"]'));
        const overviewButton = triggers.find(btn => btn.textContent?.includes('Overview')) as HTMLElement;
        if (overviewButton) {
          console.log("Found overview button by text, clicking...");
          overviewButton.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      // Check if element exists now
      const kpiElement = document.getElementById("cost-report-kpi-cards");
      console.log("KPI element after tab switch:", kpiElement ? "Found" : "Not found");
      console.log("KPI element visible:", kpiElement?.offsetParent !== null);
      
      setCurrentSection("Capturing UI components...");
      // Capture the KPI cards from the actual rendered UI
      let kpiCardsCanvas;
      let kpiCardsImage;
      try {
        await prepareElementForCapture("cost-report-kpi-cards");
        kpiCardsCanvas = await captureKPICards("cost-report-kpi-cards", { scale: 2, timeout: 15000 });
        kpiCardsImage = canvasToDataURL(kpiCardsCanvas, 'JPEG', 0.9);
      } catch (error) {
        console.error("Error capturing KPI cards:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Full error details:", errorMessage);
        
        toast({
          title: "Export Failed",
          description: (
            <div className="space-y-2">
              <p>Unable to capture report visuals.</p>
              <p className="text-sm font-semibold">Quick Fix:</p>
              <ol className="text-sm list-decimal list-inside space-y-1">
                <li>Click on the "Overview" tab above</li>
                <li>Wait 2 seconds for it to load</li>
                <li>Click "Export PDF" again</li>
              </ol>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
        setLoading(false);
        return;
      }
      
      setCurrentSection("Generating executive summary...");
      // ========== EXECUTIVE SUMMARY PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("EXECUTIVE SUMMARY", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, 30, { align: "center" });

      // Helper function to create gradient background (used elsewhere in the PDF)
      const createGradientCard = (x: number, y: number, width: number, height: number, color1: number[], color2: number[]) => {
        const steps = 10;
        const stepHeight = height / steps;
        for (let i = 0; i < steps; i++) {
          const ratio = i / steps;
          const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
          const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
          const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(x, y + i * stepHeight, width, stepHeight, 'F');
        }
      };

      // Add captured KPI cards image
      doc.setTextColor(0, 0, 0);
      let kpiY = contentStartY + 35;
      
      // Calculate dimensions to fit the captured image
      const kpiImageAspectRatio = kpiCardsCanvas.width / kpiCardsCanvas.height;
      const kpiImageWidth = contentWidth;
      const kpiImageHeight = kpiImageWidth / kpiImageAspectRatio;
      
      doc.addImage(kpiCardsImage, 'JPEG', contentStartX, kpiY, kpiImageWidth, kpiImageHeight, undefined, 'FAST');
      
      kpiY += kpiImageHeight + 5;

      // Define colors for all visual elements
      const cardColors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green
        [251, 191, 36],   // Yellow
        [249, 115, 22],   // Orange
        [139, 92, 246],   // Purple
        [236, 72, 153],   // Pink
        [134, 239, 172]   // Light green
      ];

      // Category Distribution & Financial Variance Table
      doc.setTextColor(0, 0, 0);
      let tableY = kpiY + 15;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Category Distribution & Financial Variance", contentStartX, tableY);
      tableY += 10;

      // Prepare table data matching the category summary structure
      const tableData = categoryTotals.map((cat: any, index: number) => {
        const percentage = totalAnticipatedFinal > 0 
          ? ((cat.anticipatedFinal / totalAnticipatedFinal) * 100).toFixed(1)
          : '0.0';
        
        return [
          cat.code,
          cat.description,
          `R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R${cat.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${percentage}%`,
          `${cat.currentVariance >= 0 ? '+' : ''}R${Math.abs(cat.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.originalVariance >= 0 ? '+' : ''}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
        ];
      });

      // Add totals row
      tableData.push([
        '',
        'GRAND TOTAL',
        `R${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${totalPreviousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `R${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        '100%',
        `${currentVariance >= 0 ? '+' : ''}R${Math.abs(currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `${originalVariance >= 0 ? '+' : ''}R${Math.abs(originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: tableY,
        margin: { left: contentStartX, right: useMargins.right },
        head: [[
          'Code',
          'Category',
          'Original Budget',
          'Previous Report',
          'Anticipated Final',
          '% of Total',
          'Current Variance',
          'Original Variance'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 6.5,
          cellPadding: 2
        },
        bodyStyles: { 
          fontSize: 6.5,
          cellPadding: 2,
          minCellHeight: 8
        },
        columnStyles: {
          0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: contentWidth * 0.18 },
          2: { cellWidth: contentWidth * 0.135, halign: 'right' },
          3: { cellWidth: contentWidth * 0.135, halign: 'right' },
          4: { cellWidth: contentWidth * 0.135, halign: 'right' },
          5: { cellWidth: contentWidth * 0.07, halign: 'center' },
          6: { cellWidth: contentWidth * 0.135, halign: 'right' },
          7: { cellWidth: contentWidth * 0.135, halign: 'right' }
        },
        didDrawCell: (data) => {
          // Add colored indicator bar on the left of each row (except totals row)
          if (data.section === 'body' && data.column.index === 0 && data.row.index < categoryTotals.length) {
            const color = cardColors[data.row.index % cardColors.length];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(data.cell.x - 3, data.cell.y, 3, data.cell.height, 'F');
          }
          
          // Highlight the totals row
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            data.cell.styles.fillColor = [220, 230, 240];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 8;
          }
          
          // Color the variance cells
          if (data.section === 'body' && data.row.index < categoryTotals.length) {
            const cat = categoryTotals[data.row.index];
            // Current Variance column
            if (data.column.index === 6) {
              if (cat.currentVariance < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else if (cat.currentVariance > 0) {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
            // Original Variance column
            if (data.column.index === 7) {
              if (cat.originalVariance < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else if (cat.originalVariance > 0) {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
          
          // Color totals row variance
          if (data.section === 'body' && data.row.index === tableData.length - 1) {
            if (data.column.index === 6) {
              if (currentVariance < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else if (currentVariance > 0) {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
            if (data.column.index === 7) {
              if (originalVariance < 0) {
                data.cell.styles.textColor = [0, 150, 0];
              } else if (originalVariance > 0) {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
        }
      });

      let cardY = (doc as any).lastAutoTable.finalY + 15;
      const cardWidth = (contentWidth - 8) / 2; // Two cards per row
      const cardHeight = 45;
      const cardsPerRow = 2;
      
      // Check if we need a new page for the cards
      const totalRows = Math.ceil(categoryTotals.length / cardsPerRow);
      const totalCardsHeight = totalRows * (cardHeight + 8);
      
      if (cardY + totalCardsHeight > pageHeight - useMargins.bottom) {
        doc.addPage();
        cardY = contentStartY;
      }
      
      categoryTotals.forEach((cat: any, index: number) => {
        const col = index % cardsPerRow;
        const row = Math.floor(index / cardsPerRow);
        const x = contentStartX + col * (cardWidth + 8);
        const y = cardY + row * (cardHeight + 8);
        
        if (y > pageHeight - useMargins.bottom - 60) {
          doc.addPage();
          cardY = contentStartY;
        }
        
        const finalY = row === 0 ? cardY : cardY + row * (cardHeight + 8);
        const color = cardColors[index % cardColors.length];
        
        // Card background with subtle gradient
        createGradientCard(x, finalY, cardWidth, cardHeight, [250, 250, 250], [255, 255, 255]);
        
        // Card border
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.rect(x, finalY, cardWidth, cardHeight);
        
        // Left colored border (thicker, like border-l-[6px])
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, finalY, 3, cardHeight, 'F');
        
        // Badge with rounded corners
        const badgeX = x + 6;
        const badgeY = finalY + 6;
        const badgeSize = 11;
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2, 2, 'F');
        
        // Badge text
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(cat.code, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 2, { align: "center" });
        
        // Category name
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const catName = doc.splitTextToSize(cat.description, cardWidth - 25);
        doc.text(catName, badgeX + badgeSize + 3, finalY + 8);
        
        // Original Budget
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text("ORIGINAL BUDGET", x + 5, finalY + 20);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 26);
        
        // Anticipated Final
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text("ANTICIPATED FINAL", x + 5, finalY + 31);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 37);
        
        // Border separator
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.line(x + 5, finalY + 39, x + cardWidth - 5, finalY + 39);
        
        // Variance label
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text("VARIANCE", x + 5, finalY + 43);
        
        // Variance value
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const isExtra = cat.originalVariance > 0;
        doc.setTextColor(isExtra ? 220 : 22, isExtra ? 38 : 163, isExtra ? 38 : 74);
        const varianceText = `${cat.originalVariance >= 0 ? '+' : ''}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
        doc.text(varianceText, x + 5, finalY + 49);
        
        // Status badge pill
        const badgeText = isExtra ? 'EXTRA' : 'SAVING';
        const badgeWidth = doc.getTextWidth(badgeText) + 5;
        const pillX = x + cardWidth - badgeWidth - 5;
        const pillY = finalY + 43;
        
        // Badge pill background
        doc.setFillColor(isExtra ? 254 : 220, isExtra ? 226 : 252, isExtra ? 226 : 231);
        doc.roundedRect(pillX, pillY, badgeWidth, 6, 3, 3, 'F');
        
        // Badge pill text
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isExtra ? 185 : 21, isExtra ? 28 : 128, isExtra ? 28 : 61);
        doc.text(badgeText, pillX + badgeWidth / 2, pillY + 4.5, { align: "center" });
      });

      // ========== CATEGORY PERFORMANCE DETAILS PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Category Performance Details", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("CATEGORY PERFORMANCE DETAILS", pageWidth / 2, contentStartY + 10, { align: "center" });

      autoTable(doc, {
        startY: contentStartY + 20,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Code', 'Category', 'Original Budget', 'Anticipated Final', 'Variance', 'Status']],
        body: categoryTotals.map((cat: any) => [
          cat.code,
          cat.description,
          `R ${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.originalVariance >= 0 ? '+' : ''}R ${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          cat.originalVariance < 0 ? 'Saving' : 'Extra'
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      setCurrentSection("Adding project information...");
      // ========== PROJECT INFORMATION PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Project Information", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("PROJECT INFORMATION", pageWidth / 2, 22, { align: "center" });

      let yPos = contentStartY + 30;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT DETAILS", contentStartX, yPos);
      yPos += 10;

      // Add report details sections
      details.forEach((detail: any, index: number) => {
        if (yPos > pageHeight - useMargins.bottom - 10) {
          doc.addPage();
          yPos = contentStartY;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${detail.section_number}. ${detail.section_title}`, contentStartX, yPos);
        yPos += 6;

        if (detail.section_content) {
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(detail.section_content, contentWidth - 4);
          doc.text(lines, contentStartX, yPos);
          yPos += lines.length * 5;
        }
        yPos += 5;
      });

      // Add contract information
      if (yPos > pageHeight - useMargins.bottom - 30) {
        doc.addPage();
        yPos = contentStartY;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("8. CONTRACT INFORMATION", contentStartX, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      
      const contractors = [
        { label: 'Electrical', value: report.electrical_contractor },
        { label: 'Earthing and lightning protection', value: report.earthing_contractor },
        { label: 'Standby Plants', value: report.standby_plants_contractor },
        { label: 'CCTV and access control', value: report.cctv_contractor }
      ].filter(c => c.value);

      contractors.forEach(c => {
        doc.text(`${c.label}: ${c.value}`, contentStartX, yPos);
        yPos += 5;
      });

      setCurrentSection("Creating cost summary...");
      // ========== COST SUMMARY PAGE ==========
      doc.addPage();
      tocSections.push({ title: "Cost Summary", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("EXECUTIVE SUMMARY", contentStartX, contentStartY + 10);

      // Summary table
      autoTable(doc, {
        startY: contentStartY + 20,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Metric', 'Value']],
        body: [
          ['Original Budget', `R ${totalOriginalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
          ['Previous Report', `R ${totalPreviousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
          ['Anticipated Final', `R ${totalAnticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
          ['Current Variance', `R ${Math.abs(currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${currentVariancePercentage.toFixed(2)}%)`],
          ['Original Variance', `R ${Math.abs(originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${originalVariancePercentage.toFixed(2)}%)`]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' }
      });

      // Category breakdown table
      const lastY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CATEGORY BREAKDOWN", contentStartX, lastY);

      autoTable(doc, {
        startY: lastY + 5,
        margin: { left: contentStartX, right: useMargins.right },
        head: [['Code', 'Category', 'Original Budget', 'Previous Report', 'Anticipated Final', 'Current Variance', 'Original Variance']],
        body: categoryTotals.map((cat: any) => [
          cat.code,
          cat.description,
          `R ${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `R ${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.currentVariance >= 0 ? '+' : ''}R ${Math.abs(cat.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `${cat.originalVariance >= 0 ? '+' : ''}R ${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 }
      });

      // ========== DETAILED LINE ITEMS PAGES ==========
      categories.forEach((category: any, index: number) => {
        setCurrentSection(`Adding detailed line items (${index + 1}/${categories.length})...`);
        const lineItems = category.cost_line_items || [];
        if (lineItems.length === 0) return;

        doc.addPage();
        tocSections.push({ title: `Detailed Line Items - ${category.description}`, page: doc.getCurrentPageInfo().pageNumber });
        
        // Get the category color from the same palette used in executive summary
        const categoryColor = cardColors[index % cardColors.length];
        
        // Add colored header bar
        doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2]);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        // Add category badge circle
        doc.setFillColor(255, 255, 255);
        doc.circle(contentStartX + 8, 12, 5, 'F');
        doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2]);
        doc.circle(contentStartX + 8, 12, 4, 'F');
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(category.code, contentStartX + 8, 14, { align: "center" });
        
        // Category title
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`${category.description}`, contentStartX + 20, 15);

        // Find the corresponding category totals for this category
        const catTotals = categoryTotals.find((ct: any) => ct.code === category.code);
        
        if (catTotals) {
          // Add category summary cards
          let summaryY = 35;
          const cardWidth = (contentWidth - 12) / 3; // 3 cards per row
          const cardHeight = 22;
          const cardSpacing = 6;
          
          // Row 1: Original Budget, Previous Report, Anticipated Final
          doc.setLineWidth(0.5);
          
          // Original Budget
          createGradientCard(contentStartX, summaryY, cardWidth, cardHeight, [20, 184, 166], [13, 148, 136]);
          doc.setDrawColor(20, 184, 166);
          doc.rect(contentStartX, summaryY, cardWidth, cardHeight);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(255, 255, 255);
          doc.text("Original Budget", contentStartX + 2, summaryY + 4);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`R${catTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + 2, summaryY + 12);
          
          // Previous Report
          createGradientCard(contentStartX + cardWidth + cardSpacing, summaryY, cardWidth, cardHeight, [59, 130, 246], [37, 99, 235]);
          doc.setDrawColor(59, 130, 246);
          doc.rect(contentStartX + cardWidth + cardSpacing, summaryY, cardWidth, cardHeight);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(255, 255, 255);
          doc.text("Previous Report", contentStartX + cardWidth + cardSpacing + 2, summaryY + 4);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`R${catTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + cardWidth + cardSpacing + 2, summaryY + 12);
          
          // Anticipated Final
          createGradientCard(contentStartX + (cardWidth + cardSpacing) * 2, summaryY, cardWidth, cardHeight, [139, 92, 246], [124, 58, 237]);
          doc.setDrawColor(139, 92, 246);
          doc.rect(contentStartX + (cardWidth + cardSpacing) * 2, summaryY, cardWidth, cardHeight);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(255, 255, 255);
          doc.text("Anticipated Final", contentStartX + (cardWidth + cardSpacing) * 2 + 2, summaryY + 4);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`R${catTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, contentStartX + (cardWidth + cardSpacing) * 2 + 2, summaryY + 12);
          
          // Row 2: Current Variance, Original Variance (centered)
          summaryY += cardHeight + cardSpacing;
          const twoCardWidth = (contentWidth - cardSpacing) / 2;
          const twoCardStartX = contentStartX + (contentWidth - (twoCardWidth * 2 + cardSpacing)) / 2;
          
          // Current Variance
          const catCurrentVarianceColors = catTotals.currentVariance < 0 
            ? [[34, 197, 94], [22, 163, 74]] 
            : [[239, 68, 68], [220, 38, 38]];
          createGradientCard(twoCardStartX, summaryY, twoCardWidth, cardHeight, catCurrentVarianceColors[0], catCurrentVarianceColors[1]);
          doc.setDrawColor(catCurrentVarianceColors[0][0], catCurrentVarianceColors[0][1], catCurrentVarianceColors[0][2]);
          doc.setTextColor(0, 0, 0);
          doc.rect(twoCardStartX, summaryY, twoCardWidth, cardHeight);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(255, 255, 255);
          doc.text(`Current ${catTotals.currentVariance < 0 ? '(Saving)' : 'Extra'}`, twoCardStartX + 2, summaryY + 4);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(`${catTotals.currentVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, twoCardStartX + 2, summaryY + 12);
          
          // Original Variance
          const catOriginalVarianceColors = catTotals.originalVariance < 0 
            ? [[34, 197, 94], [22, 163, 74]] 
            : [[239, 68, 68], [220, 38, 38]];
          createGradientCard(twoCardStartX + twoCardWidth + cardSpacing, summaryY, twoCardWidth, cardHeight, catOriginalVarianceColors[0], catOriginalVarianceColors[1]);
          doc.setDrawColor(catOriginalVarianceColors[0][0], catOriginalVarianceColors[0][1], catOriginalVarianceColors[0][2]);
          doc.setTextColor(0, 0, 0);
          doc.rect(twoCardStartX + twoCardWidth + cardSpacing, summaryY, twoCardWidth, cardHeight);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(255, 255, 255);
          doc.text(`${catTotals.originalVariance < 0 ? '(Saving)' : 'Extra'} vs Original`, twoCardStartX + twoCardWidth + cardSpacing + 2, summaryY + 4);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(`${catTotals.originalVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, twoCardStartX + twoCardWidth + cardSpacing + 2, summaryY + 12);
          
          summaryY += cardHeight + 10;
          
          autoTable(doc, {
            startY: summaryY,
            margin: { left: contentStartX, right: useMargins.right },
            head: [['Code', 'Description', 'Original Budget', 'Previous Report', 'Anticipated Final', 'Current Variance', 'Original Variance']],
            body: lineItems.map((item: any) => {
              const currentVar = Number(item.anticipated_final || 0) - Number(item.previous_report || 0);
              const originalVar = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
              return [
                item.code,
                item.description,
                `R ${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R ${Number(item.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R ${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${currentVar >= 0 ? '+' : ''}R ${Math.abs(currentVar).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${originalVar >= 0 ? '+' : ''}R ${Math.abs(originalVar).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              ];
            }),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [categoryColor[0], categoryColor[1], categoryColor[2]], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 12 },
              1: { cellWidth: contentWidth * 0.30 },
              2: { cellWidth: contentWidth * 0.12, halign: 'right' },
              3: { cellWidth: contentWidth * 0.12, halign: 'right' },
              4: { cellWidth: contentWidth * 0.12, halign: 'right' },
              5: { cellWidth: contentWidth * 0.12, halign: 'right' },
              6: { cellWidth: contentWidth * 0.12, halign: 'right' }
            },
            didDrawCell: (data) => {
              // Add colored bar on the left side of each row
              if (data.section === 'body' && data.column.index === 0) {
                doc.setFillColor(categoryColor[0], categoryColor[1], categoryColor[2]);
                doc.rect(data.cell.x - 3, data.cell.y, 3, data.cell.height, 'F');
              }
              
              // Color variance cells
              if (data.section === 'body') {
                const item = lineItems[data.row.index];
                const currentVar = Number(item.anticipated_final || 0) - Number(item.previous_report || 0);
                const originalVar = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
                
                if (data.column.index === 5) {
                  data.cell.styles.textColor = currentVar < 0 ? [0, 150, 0] : currentVar > 0 ? [255, 0, 0] : [0, 0, 0];
                }
                if (data.column.index === 6) {
                  data.cell.styles.textColor = originalVar < 0 ? [0, 150, 0] : originalVar > 0 ? [255, 0, 0] : [0, 0, 0];
                }
              }
            }
          });
        } else {
          // Fallback to old table if no totals found
          autoTable(doc, {
            startY: contentStartY + 20,
            margin: { left: contentStartX, right: useMargins.right },
            head: [['Code', 'Description', 'Original Budget', 'Anticipated Final', 'Variance']],
            body: lineItems.map((item: any) => {
              const variance = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
              return [
                item.code,
                item.description,
                `R ${Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R ${Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${variance >= 0 ? '+' : ''}R ${variance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              ];
            }),
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
              1: { cellWidth: contentWidth * 0.4 }
            }
          });
        }
      });

      // ========== VARIATIONS PAGE ==========
      if (variations.length > 0) {
        setCurrentSection("Adding variations...");
        doc.addPage();
        tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("VARIATIONS", contentStartX, contentStartY + 10);

        autoTable(doc, {
          startY: contentStartY + 20,
          margin: { left: contentStartX, right: useMargins.right },
          head: [['Code', 'Description', 'Amount', 'Type']],
          body: variations.map((v: any) => [
            v.code,
            v.description,
            `R ${Math.abs(Number(v.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            v.is_credit ? 'Credit' : 'Debit'
          ]),
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            1: { cellWidth: contentWidth * 0.5 }
          }
        });
      }

      setCurrentSection("Finalizing table of contents...");
      // ========== FILL IN TABLE OF CONTENTS ==========
      const tocPageRef = doc.setPage(tocPage);
      let tocY = tocStartY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      tocSections.forEach((section) => {
        const maxWidth = contentWidth - 4;
        const dots = '.'.repeat(Math.floor((maxWidth - doc.getTextWidth(section.title) - doc.getTextWidth(String(section.page))) / doc.getTextWidth('.')));
        doc.text(`${section.title} ${dots} ${section.page}`, contentStartX, tocY);
        tocY += 8;
      });

      setCurrentSection("Adding page numbers...");
      // Add page numbers to all pages except cover
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - useMargins.bottom + 5, { align: "center" });
      }

      setCurrentSection("Saving PDF...");
      // Save PDF
      const pdfBlob = doc.output("blob");
      const fileName = `Cost_Report_${report.report_number}_${Date.now()}.pdf`;
      const filePath = `${report.project_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cost-report-pdfs")
        .upload(filePath, pdfBlob);

      if (uploadError) throw uploadError;

      // Save PDF record
      const { data: pdfRecord, error: recordError } = await supabase
        .from("cost_report_pdfs")
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_path: filePath,
          file_name: fileName,
          file_size: pdfBlob.size,
          revision: `Report ${report.report_number}`,
          generated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (recordError) throw recordError;

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      setPreviewReport(pdfRecord);
      onReportGenerated?.();
      setPendingExport(false);

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCurrentSection("");
    }
  };
  
  const handleValidationProceed = () => {
    setValidationDialogOpen(false);
    // Re-run export with validation skipped
    handleExport(margins, true);
  };

  return (
    <>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentSection || "Generating..."}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport()}>
              <Download className="mr-2 h-4 w-4" />
              Quick Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Export with Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setSettingsOpen(true)}
          disabled={loading}
          title="PDF Export Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <PDFExportSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        margins={margins}
        onMarginsChange={setMargins}
        onApply={() => handleExport()}
      />
      
      <ValidationWarningDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        mismatches={validationMismatches}
        onProceed={handleValidationProceed}
      />
      
      {previewReport && (
        <StandardReportPreview
          report={previewReport}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="cost-report-pdfs"
        />
      )}

      <TemplateExportDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        report={report}
        projectId={report.project_id}
      />
      
    </>
  );
};
