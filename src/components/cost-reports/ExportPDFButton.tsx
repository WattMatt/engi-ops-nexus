import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyDetails, generateCoverPage } from "@/utils/pdfCoverPage";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { PDFExportSettings, DEFAULT_MARGINS, DEFAULT_SECTIONS, type PDFMargins, type PDFSectionOptions } from "./PDFExportSettings";
import { calculateCategoryTotals, calculateGrandTotals, validateTotals } from "@/utils/costReportCalculations";
import { ValidationWarningDialog } from "./ValidationWarningDialog";
import { captureKPICards, prepareElementForCapture, canvasToDataURL } from "@/utils/captureUIForPDF";
import { format } from "date-fns";
import {
  initializePDF,
  getStandardTableStyles,
  addSectionHeader,
  addPageNumbers,
  addKeyValue,
  checkPageBreak,
  STANDARD_MARGINS,
  type PDFExportOptions
} from "@/utils/pdfExportBase";
import {
  captureElementAsCanvas,
  captureChartAsCanvas,
  addHighQualityImage
} from "@/utils/pdfQualitySettings";

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
  const [sections, setSections] = useState<PDFSectionOptions>(DEFAULT_SECTIONS);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationMismatches, setValidationMismatches] = useState<string[]>([]);
  const [pendingExport, setPendingExport] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  // Fetch project contacts and set primary contact as default
  const { data: contacts } = useQuery({
    queryKey: ["project-contacts", report.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", report.project_id)
        .order("is_primary", { ascending: false })
        .order("contact_type");
      
      if (error) throw error;
      
      // Automatically select the primary contact if available
      if (data && data.length > 0 && !selectedContactId) {
        const primaryContact = data.find(c => c.is_primary);
        setSelectedContactId(primaryContact?.id || data[0].id);
      }
      
      return data;
    },
    enabled: !!report.project_id,
  });

  const handleExport = async (useMargins: PDFMargins = margins, useSections: PDFSectionOptions = sections, skipValidation: boolean = false, contactId: string = selectedContactId) => {
    setLoading(true);
    setCurrentSection("Fetching data...");
    
    // Initialize page content map to track what goes on each page
    const pageContentMap: Record<number, string[]> = {};
    
    // Helper to add content to pageContentMap
    const trackPageContent = (docInstance: jsPDF, content: string) => {
      const currentPage = docInstance.getCurrentPageInfo().pageNumber;
      if (!pageContentMap[currentPage]) {
        pageContentMap[currentPage] = [];
      }
      const trimmed = content.trim();
      if (trimmed.length > 0) {
        pageContentMap[currentPage].push(trimmed);
      }
    };
    
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
      // Create PDF with standardized quality settings
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = initializePDF(exportOptions);
      
      // Wrap doc.text to capture all content
      const originalText = doc.text.bind(doc);
      (doc as any).text = function(...args: any[]) {
        const textContent = typeof args[0] === 'string' ? args[0] : 
                           Array.isArray(args[0]) ? args[0].join(' ') : '';
        trackPageContent(doc, textContent);
        return originalText(...args);
      };
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const tocSections: { title: string; page: number }[] = [];
      
      // Calculate content dimensions based on margins
      const contentWidth = pageWidth - useMargins.left - useMargins.right;
      const contentStartX = useMargins.left;
      const contentStartY = useMargins.top;
      
      // Professional color palette
      const colors = {
        primary: [30, 58, 138] as [number, number, number],
        secondary: [59, 130, 246] as [number, number, number],
        accent: [99, 102, 241] as [number, number, number],
        success: [16, 185, 129] as [number, number, number],
        warning: [251, 191, 36] as [number, number, number],
        danger: [239, 68, 68] as [number, number, number],
        neutral: [71, 85, 105] as [number, number, number],
        light: [241, 245, 249] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        text: [15, 23, 42] as [number, number, number]
      };

      setCurrentSection("Generating cover page...");
      // ========== COVER PAGE ==========
      if (useSections.coverPage) {
        await generateCoverPage(doc, {
          title: "Cost Report",
          projectName: report.project_name,
          subtitle: `Report #${report.report_number}`,
          revision: `Report ${report.report_number}`,
          date: format(new Date(), "dd MMMM yyyy"), // Current date
        }, companyDetails, contactId || undefined);
      }

      setCurrentSection("Creating table of contents...");
      // ========== TABLE OF CONTENTS ==========
      let tocPage = 0;
      if (useSections.tableOfContents) {
        doc.addPage();
        tocPage = doc.getCurrentPageInfo().pageNumber;
        
        // Simple professional header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("TABLE OF CONTENTS", pageWidth / 2, contentStartY + 5, { align: "center" });
        
        // Add a subtle line under the header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(contentStartX, contentStartY + 8, pageWidth - useMargins.right, contentStartY + 8);
      }

      // Start TOC entries below the header
      const tocStartY = contentStartY + 20;

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

      // Define colors and utility functions for all visual elements
      const cardColors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green
        [251, 191, 36],   // Yellow
        [249, 115, 22],   // Orange
        [139, 92, 246],   // Purple
        [236, 72, 153],   // Pink
        [134, 239, 172]   // Light green
      ];

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

      setCurrentSection("Generating executive summary...");
      // ========== EXECUTIVE SUMMARY PAGE ==========
      if (useSections.executiveSummary) {
        doc.addPage();
        tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
        
        // Simple professional header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("EXECUTIVE SUMMARY", pageWidth / 2, contentStartY + 5, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, contentStartY + 12, { align: "center" });

        // Add a subtle line under the header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(contentStartX, contentStartY + 15, pageWidth - useMargins.right, contentStartY + 15);

        doc.setTextColor(...colors.text);
        let kpiY = contentStartY + 25;
        
        // Try to capture KPI cards, but fall back to manual rendering if not available
        try {
          setCurrentSection("Capturing UI components...");
          await prepareElementForCapture("cost-report-kpi-cards");
          const kpiCardsCanvas = await captureKPICards("cost-report-kpi-cards", { scale: 2 });
          
          // Validate canvas dimensions before proceeding
          if (kpiCardsCanvas && kpiCardsCanvas.width > 0 && kpiCardsCanvas.height > 0) {
            const kpiCardsImage = canvasToDataURL(kpiCardsCanvas, 'JPEG', 0.9);
            
            // Calculate dimensions to fit the captured image - validate to prevent NaN/Infinity
            const kpiImageAspectRatio = kpiCardsCanvas.width / kpiCardsCanvas.height;
            const kpiImageWidth = contentWidth;
            const kpiImageHeight = kpiImageWidth / kpiImageAspectRatio;
            
            // Final validation before adding image
            if (isFinite(kpiImageHeight) && kpiImageHeight > 0) {
              doc.addImage(kpiCardsImage, 'JPEG', contentStartX, kpiY, kpiImageWidth, kpiImageHeight, undefined, 'FAST');
              kpiY += kpiImageHeight + 5;
            }
          }
        } catch (error) {
          console.log("Could not capture KPI cards, will render manually:", error);
          // Continue with manual rendering if capture fails
        }

        // Category Distribution & Financial Variance Table with improved styling
        doc.setTextColor(...colors.text);
        let tableY = kpiY + 20;
        
        // Section header with accent line
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Category Distribution & Financial Variance", contentStartX, tableY);
        doc.setDrawColor(...colors.secondary);
        doc.setLineWidth(0.8);
        doc.line(contentStartX, tableY + 2, contentStartX + 90, tableY + 2);
        tableY += 12;

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
          theme: 'striped',
          headStyles: { 
            fillColor: colors.primary, 
            textColor: colors.white, 
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: colors.light,
            valign: 'middle',
            halign: 'center',
            overflow: 'linebreak',
            minCellWidth: 10
          },
          bodyStyles: { 
            fontSize: 8,
            cellPadding: 4,
            minCellHeight: 12,
            textColor: colors.text,
            lineWidth: 0.1,
            lineColor: [226, 232, 240],
            valign: 'middle',
            overflow: 'linebreak'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold', halign: 'center' },
            1: { cellWidth: 38, halign: 'left', cellPadding: { left: 5, right: 3, top: 4, bottom: 4 } },
            2: { cellWidth: 22, halign: 'right', cellPadding: { right: 5 } },
            3: { cellWidth: 22, halign: 'right', cellPadding: { right: 5 } },
            4: { cellWidth: 22, halign: 'right', cellPadding: { right: 5 } },
            5: { cellWidth: 10, halign: 'center' },
            6: { cellWidth: 22, halign: 'right', cellPadding: { right: 5 } },
            7: { cellWidth: 22, halign: 'right', cellPadding: { right: 5 } }
          },
          didDrawCell: (data) => {
            // Add colored indicator bar on the left of each row (except totals row)
            if (data.section === 'body' && data.column.index === 0 && data.row.index < categoryTotals.length) {
              const color = cardColors[data.row.index % cardColors.length];
              doc.setFillColor(color[0], color[1], color[2]);
              doc.rect(data.cell.x - 3, data.cell.y, 3, data.cell.height, 'F');
            }
            
            // Highlight the totals row with modern styling
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [226, 232, 240];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 8.5;
              data.cell.styles.textColor = colors.primary;
            }
            
            // Color the variance cells
            if (data.section === 'body' && data.row.index < categoryTotals.length) {
              const cat = categoryTotals[data.row.index];
              // Current Variance column with professional colors
              if (data.column.index === 6) {
                if (cat.currentVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                  data.cell.styles.fontStyle = 'bold';
                } else if (cat.currentVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                  data.cell.styles.fontStyle = 'bold';
                }
              }
              // Original Variance column with professional colors
              if (data.column.index === 7) {
                if (cat.originalVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                  data.cell.styles.fontStyle = 'bold';
                } else if (cat.originalVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
            
            // Color totals row variance with professional colors
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
              if (data.column.index === 6) {
                if (currentVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                } else if (currentVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                }
              }
              if (data.column.index === 7) {
                if (originalVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                } else if (originalVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                }
              }
            }
          }
        });

        let cardY = (doc as any).lastAutoTable.finalY + 15;
        const cardWidth = (contentWidth - 8) / 2; // Two cards per row
        const cardHeight = 52;
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
          doc.text("ORIGINAL BUDGET", x + 5, finalY + 21);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(`R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 27);
          
          // Anticipated Final
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(120, 120, 120);
          doc.text("ANTICIPATED FINAL", x + 5, finalY + 33);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(`R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, x + 5, finalY + 39);
          
          // Border separator
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.line(x + 5, finalY + 42, x + cardWidth - 5, finalY + 42);
          
          // Variance label
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(120, 120, 120);
          doc.text("VARIANCE", x + 5, finalY + 46);
          
          // Variance value
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          const isExtra = cat.originalVariance > 0;
          doc.setTextColor(isExtra ? 220 : 22, isExtra ? 38 : 163, isExtra ? 38 : 74);
          const varianceText = `${cat.originalVariance >= 0 ? '+' : ''}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
          doc.text(varianceText, x + 5, finalY + 50);
          
          // Status badge pill
          const badgeText = isExtra ? 'EXTRA' : 'SAVING';
          const badgeWidth = doc.getTextWidth(badgeText) + 5;
          const pillX = x + cardWidth - badgeWidth - 5;
          const pillY = finalY + 45;
          
          // Badge pill background
          doc.setFillColor(isExtra ? 254 : 220, isExtra ? 226 : 252, isExtra ? 226 : 231);
          doc.roundedRect(pillX, pillY, badgeWidth, 7, 3, 3, 'F');
          
          // Badge pill text
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(isExtra ? 185 : 21, isExtra ? 28 : 128, isExtra ? 28 : 61);
          doc.text(badgeText, pillX + badgeWidth / 2, pillY + 4.8, { align: "center" });
        });
      }

      // ========== CATEGORY PERFORMANCE DETAILS PAGE ==========
      if (useSections.categoryDetails) {
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
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          overflow: 'linebreak',
          valign: 'middle',
          halign: 'center'
        }
      });
      }

      setCurrentSection("Adding project information...");
      // ========== PROJECT INFORMATION PAGE ==========
      if (useSections.projectInfo) {
      doc.addPage();
      const projectInfoPage = doc.getCurrentPageInfo().pageNumber;
      tocSections.push({ title: "Project Information", page: projectInfoPage });
      
      // Initialize page content array
      if (!pageContentMap[projectInfoPage]) pageContentMap[projectInfoPage] = [];
      
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      const headerText = "PROJECT INFORMATION";
      doc.text(headerText, pageWidth / 2, 22, { align: "center" });
      pageContentMap[projectInfoPage].push(headerText);

      let yPos = contentStartY + 30;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const reportDetailsHeader = "REPORT DETAILS";
      doc.text(reportDetailsHeader, contentStartX, yPos);
      pageContentMap[projectInfoPage].push(reportDetailsHeader);
      yPos += 10;

      // Add report details sections
      details.forEach((detail: any, index: number) => {
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        if (!pageContentMap[currentPage]) pageContentMap[currentPage] = [];
        
        if (yPos > pageHeight - useMargins.bottom - 10) {
          doc.addPage();
          yPos = contentStartY;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const sectionTitle = `${detail.section_number}. ${detail.section_title}`;
        doc.text(sectionTitle, contentStartX, yPos);
        pageContentMap[currentPage].push(sectionTitle);
        yPos += 6;

        if (detail.section_content) {
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(detail.section_content, contentWidth - 4);
          doc.text(lines, contentStartX, yPos);
          pageContentMap[currentPage].push(detail.section_content);
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
      }

      setCurrentSection("Creating cost summary...");
      // ========== COST SUMMARY PAGE ==========
      if (useSections.costSummary) {
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
        styles: { 
          fontSize: 10, 
          cellPadding: 5, 
          overflow: 'linebreak', 
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          overflow: 'linebreak',
          valign: 'middle',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 70, halign: 'left' },
          1: { cellWidth: 'auto', halign: 'right' }
        },
        didParseCell: function(data) {
          // Ensure text is rendered as single strings
          data.cell.styles.cellPadding = 5;
        }
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
        styles: { 
          fontSize: 8, 
          cellPadding: 4,
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 38, halign: 'left' },
          2: { halign: 'right', cellWidth: 22 },
          3: { halign: 'right', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 22 }
        }
      });

      // ========== DETAILED LINE ITEMS PAGES ==========
      categories.forEach((category: any, index: number) => {
        setCurrentSection(`Adding detailed line items (${index + 1}/${categories.length})...`);
        const lineItems = category.cost_line_items || [];
        if (lineItems.length === 0) return;

        doc.addPage();
        tocSections.push({ title: `Detailed Line Items - ${category.description}`, page: doc.getCurrentPageInfo().pageNumber });
        
        // Simple professional header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`${category.code} - ${category.description}`, contentStartX, contentStartY + 5);
        
        // Add a subtle line under the header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(contentStartX, contentStartY + 8, pageWidth - useMargins.right, contentStartY + 8);

        // Find the corresponding category totals for this category
        const catTotals = categoryTotals.find((ct: any) => ct.code === category.code);
        
        let summaryY = contentStartY + 15;
        
        if (catTotals) {
          // Add simple summary text
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          
          const summaryText = [
            `Original Budget: R${catTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `Previous Report: R${catTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `Anticipated Final: R${catTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `Current Variance: ${catTotals.currentVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `Original Variance: ${catTotals.originalVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
          ];
          
          summaryText.forEach((text, idx) => {
            doc.text(text, contentStartX, summaryY + (idx * 5));
          });
          
          summaryY += 30;
          
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
            styles: { 
              fontSize: 8, 
              cellPadding: 4,
              valign: 'middle',
              minCellHeight: 10,
              overflow: 'linebreak'
            },
            headStyles: { 
              fillColor: [30, 58, 138], 
              textColor: [255, 255, 255], 
              fontStyle: 'bold', 
              fontSize: 8,
              halign: 'center',
              valign: 'middle',
              cellPadding: 4,
              overflow: 'linebreak'
            },
            columnStyles: {
              0: { cellWidth: 12, halign: 'center' },
              1: { cellWidth: 46, halign: 'left', cellPadding: { left: 4, right: 3 } },
              2: { cellWidth: 20, halign: 'right', cellPadding: { right: 4 } },
              3: { cellWidth: 20, halign: 'right', cellPadding: { right: 4 } },
              4: { cellWidth: 20, halign: 'right', cellPadding: { right: 4 } },
              5: { cellWidth: 20, halign: 'right', cellPadding: { right: 4 } },
              6: { cellWidth: 20, halign: 'right', cellPadding: { right: 4 } }
            },
            didDrawCell: (data) => {
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
            styles: { 
              fontSize: 9, 
              cellPadding: 3,
              overflow: 'linebreak',
              valign: 'middle'
            },
            headStyles: { 
              fillColor: [30, 58, 138], 
              textColor: [255, 255, 255], 
              fontStyle: 'bold',
              overflow: 'linebreak',
              valign: 'middle',
              halign: 'center'
            },
            columnStyles: {
              1: { cellWidth: contentWidth * 0.4 }
            }
          });
        }
      });
      }

      // ========== VARIATIONS PAGE ==========
      if (useSections.variations && variations.length > 0) {
        setCurrentSection("Adding variations...");
        doc.addPage();
        tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
        
        // Add gradient header bar
        const headerHeight = 40;
        for (let i = 0; i < headerHeight; i++) {
          const ratio = i / headerHeight;
          const r = Math.round(colors.accent[0] + (colors.secondary[0] - colors.accent[0]) * ratio);
          const g = Math.round(colors.accent[1] + (colors.secondary[1] - colors.accent[1]) * ratio);
          const b = Math.round(colors.accent[2] + (colors.secondary[2] - colors.accent[2]) * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(0, i, pageWidth, 1, 'F');
        }
        
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.white);
        doc.text("VARIATIONS", pageWidth / 2, 22, { align: "center" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Contract Variations & Adjustments", pageWidth / 2, 32, { align: "center" });

        autoTable(doc, {
          startY: contentStartY + 30,
          margin: { left: contentStartX, right: useMargins.right },
          head: [['Code', 'Description', 'Amount', 'Type']],
          body: variations.map((v: any) => [
            v.code,
            v.description,
            `R ${Math.abs(Number(v.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            v.is_credit ? 'Credit' : 'Debit'
          ]),
          theme: 'grid',
          styles: { 
            fontSize: 9, 
            cellPadding: 4,
            valign: 'middle',
            minCellHeight: 10,
            overflow: 'linebreak'
          },
          headStyles: { 
            fillColor: [30, 58, 138], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
            valign: 'middle',
            cellPadding: 4,
            overflow: 'linebreak'
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 88, halign: 'left', cellPadding: { left: 4, right: 3 } },
            2: { cellWidth: 28, halign: 'right', cellPadding: { right: 4 } },
            3: { cellWidth: 18, halign: 'center' }
          }
        });
        
        // ========== INDIVIDUAL VARIATION DETAIL SHEETS ==========
        const variationSheetsStartPage = doc.getCurrentPageInfo().pageNumber + 1;
        variations.forEach((variation: any, index: number) => {
          setCurrentSection(`Adding variation sheet ${index + 1}/${variations.length}...`);
          doc.addPage();
          // Don't add individual sheets to TOC - we'll add a summary instead
          
          // Header with variation type color
          const variationColor = variation.is_credit ? colors.success : colors.danger;
          const headerHeight = 50;
          for (let i = 0; i < headerHeight; i++) {
            const ratio = i / headerHeight;
            const r = Math.round(variationColor[0] + (variationColor[0] * 0.2) * ratio);
            const g = Math.round(variationColor[1] + (variationColor[1] * 0.2) * ratio);
            const b = Math.round(variationColor[2] + (variationColor[2] * 0.2) * ratio);
            doc.setFillColor(r, g, b);
            doc.rect(0, i, pageWidth, 1, 'F');
          }
          
          // Variation badge
          doc.setFillColor(...colors.white);
          doc.circle(contentStartX + 10, 25, 8, 'F');
          doc.setFillColor(...variationColor);
          doc.circle(contentStartX + 10, 25, 7, 'F');
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.white);
          doc.text(variation.code, contentStartX + 10, 27.5, { align: "center" });
          
          // Title
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...colors.white);
          doc.text("VARIATION SHEET", contentStartX + 25, 23);
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text(variation.is_credit ? "Credit Note" : "Extra Work", contentStartX + 25, 32);
          
          let yPos = contentStartY + 35;
          
          // Variation details card
          doc.setFillColor(...colors.light);
          doc.roundedRect(contentStartX, yPos, contentWidth, 50, 3, 3, 'F');
          
          yPos += 8;
          doc.setTextColor(...colors.primary);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("VARIATION DETAILS", contentStartX + 5, yPos);
          
          yPos += 8;
          doc.setTextColor(...colors.text);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Code:", contentStartX + 5, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(variation.code, contentStartX + 25, yPos);
          
          yPos += 7;
          doc.setFont("helvetica", "bold");
          doc.text("Description:", contentStartX + 5, yPos);
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(variation.description || "N/A", contentWidth - 35);
          doc.text(descLines, contentStartX + 25, yPos);
          yPos += (descLines.length * 5);
          
          yPos += 2;
          doc.setFont("helvetica", "bold");
          doc.text("Amount:", contentStartX + 5, yPos);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...variationColor);
          doc.setFontSize(11);
          doc.text(
            `R ${Math.abs(Number(variation.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            contentStartX + 25, 
            yPos
          );
          
          yPos += 7;
          doc.setTextColor(...colors.text);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("Type:", contentStartX + 5, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(variation.is_credit ? "Credit (Deduction)" : "Debit (Addition)", contentStartX + 25, yPos);
          
          yPos += 10;
          
          // Additional details section
          if (variation.notes || variation.category_id || variation.date_created) {
            yPos += 5;
            doc.setFillColor(...colors.white);
            doc.roundedRect(contentStartX, yPos, contentWidth, 45, 3, 3, 'F');
            doc.setDrawColor(...colors.light);
            doc.setLineWidth(0.5);
            doc.roundedRect(contentStartX, yPos, contentWidth, 45, 3, 3, 'S');
            
            yPos += 8;
            doc.setTextColor(...colors.primary);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("ADDITIONAL INFORMATION", contentStartX + 5, yPos);
            
            yPos += 8;
            doc.setTextColor(...colors.text);
            doc.setFontSize(9);
            
            if (variation.date_created) {
              doc.setFont("helvetica", "bold");
              doc.text("Date Created:", contentStartX + 5, yPos);
              doc.setFont("helvetica", "normal");
              doc.text(
                format(new Date(variation.created_at), "dd MMMM yyyy"),
                contentStartX + 30,
                yPos
              );
              yPos += 7;
            }
            
            if (variation.notes) {
              doc.setFont("helvetica", "bold");
              doc.text("Notes:", contentStartX + 5, yPos);
              doc.setFont("helvetica", "normal");
              const notesLines = doc.splitTextToSize(variation.notes, contentWidth - 35);
              doc.text(notesLines, contentStartX + 30, yPos);
              yPos += (notesLines.length * 5);
            }
          }
          
          // Impact summary
          yPos += 10;
          doc.setFillColor(...variationColor);
          doc.roundedRect(contentStartX, yPos, contentWidth, 35, 3, 3, 'F');
          
          yPos += 10;
          doc.setTextColor(...colors.white);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("FINANCIAL IMPACT", pageWidth / 2, yPos, { align: "center" });
          
          yPos += 10;
          doc.setFontSize(16);
          const impactText = variation.is_credit 
            ? `REDUCES CONTRACT VALUE BY R ${Math.abs(Number(variation.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
            : `INCREASES CONTRACT VALUE BY R ${Math.abs(Number(variation.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
          doc.text(impactText, pageWidth / 2, yPos, { align: "center" });
          
          // Footer with approval section
          yPos = pageHeight - 70;
          doc.setDrawColor(...colors.neutral);
          doc.setLineWidth(0.3);
          doc.line(contentStartX, yPos, pageWidth - useMargins.right, yPos);
          
          yPos += 10;
          doc.setTextColor(...colors.neutral);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("APPROVALS", contentStartX, yPos);
          
          yPos += 10;
          const approvalWidth = (contentWidth - 10) / 3;
          
          // Client approval
          doc.setFont("helvetica", "normal");
          doc.text("Client Representative", contentStartX, yPos);
          doc.line(contentStartX, yPos + 12, contentStartX + approvalWidth - 5, yPos + 12);
          doc.setFontSize(7);
          doc.text("Signature & Date", contentStartX, yPos + 16);
          
          // Contractor approval
          doc.setFontSize(8);
          doc.text("Contractor Representative", contentStartX + approvalWidth + 5, yPos);
          doc.line(contentStartX + approvalWidth + 5, yPos + 12, contentStartX + (approvalWidth * 2), yPos + 12);
          doc.setFontSize(7);
          doc.text("Signature & Date", contentStartX + approvalWidth + 5, yPos + 16);
          
          // Engineer approval
          doc.setFontSize(8);
          doc.text("Engineer's Approval", contentStartX + (approvalWidth * 2) + 10, yPos);
          doc.line(contentStartX + (approvalWidth * 2) + 10, yPos + 12, pageWidth - useMargins.right, yPos + 12);
          doc.setFontSize(7);
          doc.text("Signature & Date", contentStartX + (approvalWidth * 2) + 10, yPos + 16);
        });
        
        // Add summary entry to TOC for all variation sheets
        if (variations.length > 0) {
          const variationSheetsEndPage = doc.getCurrentPageInfo().pageNumber;
          tocSections.push({ 
            title: `Variation Order Sheets (${variations.length} sheets)`, 
            page: variationSheetsStartPage 
          });
        }
      }

      setCurrentSection("Finalizing table of contents...");
      // ========== FILL IN TABLE OF CONTENTS WITH CLICKABLE LINKS ==========
      if (useSections.tableOfContents && tocPage > 0) {
        doc.setPage(tocPage);
        let tocY = tocStartY;
        doc.setTextColor(...colors.text);
        
        tocSections.forEach((section, index) => {
          // Add some spacing between sections
          if (index > 0) tocY += 2;
          
          // Calculate dots for leader
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          const titleWidth = doc.getTextWidth(section.title);
          const pageNumWidth = doc.getTextWidth(String(section.page));
          const availableSpace = contentWidth - titleWidth - pageNumWidth - 10; // 10mm spacing
          const dotWidth = doc.getTextWidth('.');
          const numDots = Math.max(3, Math.floor(availableSpace / dotWidth));
          const dots = '.'.repeat(numDots);
          
          // Draw section title with clickable link
          doc.setTextColor(...colors.primary);
          doc.textWithLink(section.title, contentStartX, tocY, { 
            pageNumber: section.page 
          });
          
          // Draw dots
          doc.setTextColor(...colors.neutral);
          doc.setFontSize(10);
          doc.text(dots, contentStartX + titleWidth + 2, tocY);
          
          // Draw page number
          doc.setFontSize(12);
          doc.setTextColor(...colors.text);
          doc.text(String(section.page), pageWidth - useMargins.right - pageNumWidth, tocY);
          
          tocY += 10;
        });
      }

      setCurrentSection("Adding page numbers...");
      // Add standardized page numbers
      addPageNumbers(doc, 2, exportOptions.quality);

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
    handleExport(margins, sections, true);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={() => handleExport()} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
          <Button onClick={() => setSettingsOpen(true)} variant="outline" size="icon" disabled={loading}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {loading && currentSection && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-lg border border-border/50 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 bg-primary rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {currentSection}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <PDFExportSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        margins={margins}
        onMarginsChange={setMargins}
        sections={sections}
        onSectionsChange={setSections}
        onApply={() => handleExport()}
        projectId={report.project_id}
        selectedContactId={selectedContactId}
        onContactChange={setSelectedContactId}
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
      
    </>
  );
};
