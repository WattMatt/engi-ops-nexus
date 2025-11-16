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
import { format } from "date-fns";
import { generateExecutiveSummaryTableData } from "@/utils/executiveSummaryTable";
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
import { prepareCostReportTemplateData } from "@/utils/prepareCostReportTemplateData";

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
  const [useTemplate, setUseTemplate] = useState(false);

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

  const exportWithTemplate = async () => {
    setLoading(true);
    setCurrentSection("Preparing template data...");
    
    try {
      console.log('Starting template-based PDF export for report:', report.id);
      
      // Get default cost report template
      const { data: template, error: templateError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('template_type', 'cost_report')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (templateError || !template) {
        toast({
          title: "No Default Template",
          description: "Please upload and set a default cost report template in Settings → PDF Templates",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setCurrentSection("Processing template and data...");

      // Prepare placeholder data using existing utility
      const { placeholderData } = await prepareCostReportTemplateData(report.id);

      // Use existing convert-word-to-pdf function
      const { data, error } = await supabase.functions.invoke('convert-word-to-pdf', {
        body: { 
          templateUrl: template.file_url,
          templateId: template.id,
          placeholderData 
        }
      });
      
      if (error) {
        console.error('Conversion error:', error);
        toast({
          title: "PDF Generation Failed",
          description: error.message || "Failed to generate PDF from template",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      if (!data?.pdfUrl) {
        throw new Error('No PDF URL returned from conversion');
      }
      
      console.log('PDF generated successfully:', data.pdfUrl);
      
      // Step 1: Fetch the converted cover page PDF
      setCurrentSection("Fetching cover page...");
      const coverResponse = await fetch(data.pdfUrl);
      if (!coverResponse.ok) throw new Error('Failed to fetch cover PDF');
      const coverBlob = await coverResponse.blob();
      const coverArrayBuffer = await coverBlob.arrayBuffer();
      
      // Step 2: Generate report content using standard PDF export
      setCurrentSection("Generating report content...");
      
      // Fetch all data needed for content
      const { data: categories } = await supabase
        .from("cost_categories")
        .select("*, cost_line_items(*)")
        .eq("cost_report_id", report.id)
        .order("display_order");

      const { data: variations } = await supabase
        .from("cost_variations")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");

      const { data: details } = await supabase
        .from("cost_report_details")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");

      // Create content PDF using jsPDF
      const contentDoc = initializePDF({ quality: 'standard', orientation: 'portrait' });
      const pageWidth = contentDoc.internal.pageSize.width;
      const pageHeight = contentDoc.internal.pageSize.height;
      let yPos = STANDARD_MARGINS.top;
      
      // Add cost summary table
      const categoryTotals = categories?.map(cat => {
        const lineItemsTotal = cat.cost_line_items?.reduce((sum: number, item: any) => 
          sum + (item.anticipated_final || 0), 0) || 0;
        return {
          code: cat.code,
          description: cat.description,
          originalBudget: cat.original_budget || 0,
          anticipatedFinal: lineItemsTotal || cat.anticipated_final || 0
        };
      }) || [];
      
      const grandTotals = {
        originalBudget: categoryTotals.reduce((sum, cat) => sum + cat.originalBudget, 0),
        anticipatedFinal: categoryTotals.reduce((sum, cat) => sum + cat.anticipatedFinal, 0)
      };
      
      const tableData = categoryTotals.map(cat => [
        cat.code,
        cat.description,
        `R ${cat.originalBudget.toFixed(2)}`,
        `R ${cat.anticipatedFinal.toFixed(2)}`
      ]);
      
      autoTable(contentDoc, {
        startY: yPos,
        head: [['Code', 'Description', 'Original Budget', 'Anticipated Final']],
        body: tableData,
        foot: [[
          'TOTAL',
          '',
          `R ${grandTotals.originalBudget.toFixed(2)}`,
          `R ${grandTotals.anticipatedFinal.toFixed(2)}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
        footStyles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' }
      });
      
      // Add category details
      for (const category of categories || []) {
        yPos = checkPageBreak(contentDoc, (contentDoc as any).lastAutoTable.finalY + 10);
        yPos = addSectionHeader(contentDoc, `${category.code} - ${category.description}`, yPos);
        
        if (category.cost_line_items && category.cost_line_items.length > 0) {
          const lineItemData = category.cost_line_items.map((item: any) => [
            item.code,
            item.description,
            `R ${item.original_budget.toFixed(2)}`,
            `R ${item.anticipated_final.toFixed(2)}`
          ]);
          
          autoTable(contentDoc, {
            startY: yPos,
            head: [['Code', 'Description', 'Original', 'Anticipated']],
            body: lineItemData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] as [number, number, number] }
          });
          yPos = (contentDoc as any).lastAutoTable.finalY + 10;
        }
      }
      
      // Add variations if any
      if (variations && variations.length > 0) {
        yPos = checkPageBreak(contentDoc, yPos);
        yPos = addSectionHeader(contentDoc, "Variations", yPos);
        
        const variationsData = variations.map(v => [
          v.code,
          v.description,
          v.is_credit ? 'Credit' : 'Extra',
          `R ${Math.abs(v.amount).toFixed(2)}`
        ]);
        
        autoTable(contentDoc, {
          startY: yPos,
          head: [['Code', 'Description', 'Type', 'Amount']],
          body: variationsData,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 138] as [number, number, number] }
        });
      }
      
      // Add page numbers to content
      addPageNumbers(contentDoc, 1);
      
      // Step 3: Merge cover page with content using pdf-lib
      setCurrentSection("Merging PDFs...");
      const PDFLib = await import('pdf-lib');
      
      const coverPdf = await PDFLib.PDFDocument.load(coverArrayBuffer);
      const contentPdfBytes = contentDoc.output('arraybuffer');
      const contentPdf = await PDFLib.PDFDocument.load(contentPdfBytes);
      
      const mergedPdf = await PDFLib.PDFDocument.create();
      
      // Copy cover page
      const coverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
      coverPages.forEach(page => mergedPdf.addPage(page));
      
      // Copy content pages
      const contentPages = await mergedPdf.copyPages(contentPdf, contentPdf.getPageIndices());
      contentPages.forEach(page => mergedPdf.addPage(page));
      
      const mergedPdfBytes = await mergedPdf.save();
      const mergedBlob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
      
      // Step 4: Upload merged PDF to storage
      setCurrentSection("Saving PDF to storage...");
      const fileName = `Cost_Report_${report.report_number}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      const filePath = `cost-reports/${report.project_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cost-report-pdfs')
        .upload(filePath, mergedBlob, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload Failed",
          description: "Failed to save PDF to storage",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cost-report-pdfs')
        .getPublicUrl(filePath);
      
      // Save record to database
      const { error: dbError } = await supabase
        .from('cost_report_pdfs')
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_name: fileName,
          file_path: filePath,
          revision: `R${report.report_number}`,
          notes: 'Generated with Word template cover page'
        });
      
      if (dbError) {
        console.error('Database error:', dbError);
      }
      
      // Show preview dialog
      setPreviewReport({
        ...report,
        pdf_url: publicUrl,
        file_name: fileName
      });

      toast({
        title: "Success",
        description: "PDF with cover page generated. Preview before downloading.",
      });

      if (onReportGenerated) {
        onReportGenerated();
      }
    } catch (error) {
      console.error("Template PDF export error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF from template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCurrentSection("");
    }
  };

  const handleExport = async (useMargins: PDFMargins = margins, useSections: PDFSectionOptions = sections, skipValidation: boolean = false, contactId: string = selectedContactId) => {
    // If template mode is enabled, use template export
    if (useTemplate) {
      return exportWithTemplate();
    }

    // Otherwise use legacy direct PDF generation
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
        let textContent = '';
        if (typeof args[0] === 'string') {
          textContent = args[0];
        } else if (Array.isArray(args[0])) {
          // Join array elements without adding spaces - preserve original formatting
          textContent = args[0].join('');
        }
        if (textContent.trim()) {
          trackPageContent(doc, textContent);
        }
        return originalText(...args);
      };

      // Wrap autoTable to capture table content
      const originalAutoTable = (doc as any).autoTable;
      (doc as any).autoTable = function(options: any) {
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        
        // Capture header content
        if (options.head && Array.isArray(options.head)) {
          options.head.forEach((row: any[]) => {
            row.forEach((cell: any) => {
              const text = typeof cell === 'string' ? cell : cell?.content || '';
              if (text.trim()) trackPageContent(doc, text);
            });
          });
        }
        
        // Capture body content
        if (options.body && Array.isArray(options.body)) {
          options.body.forEach((row: any[]) => {
            row.forEach((cell: any) => {
              const text = typeof cell === 'string' ? cell : cell?.content || '';
              if (text.trim()) trackPageContent(doc, text);
            });
          });
        }
        
        return originalAutoTable.call(this, options);
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
        let tableY = contentStartY + 25;
        
        // Generate table data using shared utility
        const tableData = generateExecutiveSummaryTableData(pdfCategoryTotals, pdfGrandTotals);
        
        // Prepare table rows for autoTable
        const tableRows = [
          ...tableData.categoryRows.map(row => [
            row.code,
            row.description,
            `R${row.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R${row.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R${row.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            row.percentOfTotal,
            `${row.currentVariance >= 0 ? '+' : ''}R${Math.abs(row.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `${row.originalVariance >= 0 ? '+' : ''}R${Math.abs(row.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
          ]),
          // Grand total row
          [
            '',
            tableData.grandTotalRow.description,
            `R${tableData.grandTotalRow.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R${tableData.grandTotalRow.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `R${tableData.grandTotalRow.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            tableData.grandTotalRow.percentOfTotal,
            `${tableData.grandTotalRow.currentVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            `${tableData.grandTotalRow.originalVariance >= 0 ? '+' : ''}R${Math.abs(tableData.grandTotalRow.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
          ]
        ];

        autoTable(doc, {
          startY: tableY,
          margin: { left: contentStartX, right: useMargins.right },
          head: [tableData.headers],
          body: tableRows,
          theme: 'striped',
          tableWidth: 'auto',
          styles: {
            fontSize: 6.5,
            cellPadding: 2.5,
            overflow: 'visible',
            halign: 'left',
            minCellHeight: 7
          },
          headStyles: { 
            fillColor: colors.primary, 
            textColor: colors.white, 
            fontStyle: 'bold',
            fontSize: 6.5,
            cellPadding: 2.5,
            halign: 'left',
            valign: 'middle',
            minCellHeight: 7,
            overflow: 'visible'
          },
          bodyStyles: { 
            fontSize: 6.5,
            cellPadding: 2.5,
            textColor: colors.text,
            valign: 'middle',
            overflow: 'visible'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { cellWidth: 14, fontStyle: 'bold', halign: 'left', overflow: 'visible' },
            1: { cellWidth: 45, halign: 'left', overflow: 'visible' },
            2: { cellWidth: 26, halign: 'right', overflow: 'visible' },
            3: { cellWidth: 26, halign: 'right', overflow: 'visible' },
            4: { cellWidth: 26, halign: 'right', overflow: 'visible' },
            5: { cellWidth: 15, halign: 'right', overflow: 'visible' },
            6: { cellWidth: 26, halign: 'right', overflow: 'visible' },
            7: { cellWidth: 26, halign: 'right', overflow: 'visible' }
          },
          didDrawCell: (data) => {
            // Set header alignment properly
            if (data.section === 'head') {
              if (data.column.index === 0 || data.column.index === 1) {
                data.cell.styles.halign = 'left';
              } else {
                data.cell.styles.halign = 'right';
              }
            }
            
            // Highlight the grand total row
            if (data.section === 'body' && data.row.index === tableRows.length - 1) {
              data.cell.styles.fillColor = [226, 232, 240];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = colors.primary;
            }
            
            // Color the variance cells for category rows
            if (data.section === 'body' && data.row.index < tableData.categoryRows.length) {
              const cat = tableData.categoryRows[data.row.index];
              // Current Variance column
              if (data.column.index === 6) {
                if (cat.currentVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                  data.cell.styles.fontStyle = 'bold';
                } else if (cat.currentVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                  data.cell.styles.fontStyle = 'bold';
                }
              }
              // Original Variance column
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
            
            // Color totals row variance
            if (data.section === 'body' && data.row.index === tableRows.length - 1) {
              if (data.column.index === 6) {
                if (tableData.grandTotalRow.currentVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                } else if (tableData.grandTotalRow.currentVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                }
              }
              if (data.column.index === 7) {
                if (tableData.grandTotalRow.originalVariance < 0) {
                  data.cell.styles.textColor = colors.success;
                } else if (tableData.grandTotalRow.originalVariance > 0) {
                  data.cell.styles.textColor = colors.danger;
                }
              }
            }
          }
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
        
        // Fetch line items for all variations
        const variationLineItemsMap = new Map();
        for (const variation of variations) {
          const { data: lineItems } = await supabase
            .from("variation_line_items")
            .select("*")
            .eq("variation_id", variation.id)
            .order("line_number");
          variationLineItemsMap.set(variation.id, lineItems || []);
        }
        
        variations.forEach((variation: any, index: number) => {
          setCurrentSection(`Adding variation sheet ${index + 1}/${variations.length}...`);
          doc.addPage();
          
          const lineItems = variationLineItemsMap.get(variation.id) || [];
          
          // Professional header matching Excel template
          let yPos = contentStartY;
          
          // Company header with border
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(contentStartX, yPos + 10, contentStartX + contentWidth, yPos + 10);
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text("WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD", contentStartX + contentWidth / 2, yPos + 5, { align: "center" });
          
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("CREATED BY: Arno Mattheus", contentStartX + contentWidth / 2, yPos + 15, { align: "center" });
          
          yPos += 25;
          
          // Title
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(variation.description || "TENANT ACCOUNT", contentStartX + contentWidth / 2, yPos, { align: "center" });
          
          yPos += 15;
          
          // Project details in 2 columns
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          
          const col1X = contentStartX;
          const col2X = contentStartX + contentWidth / 2;
          
          // Row 1
          doc.text("PROJECT: ", col1X, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(report.project_name, col1X + 25, yPos);
          
          doc.setFont("helvetica", "bold");
          doc.text("DATE: ", col2X, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(format(new Date(report.report_date), "dd-MMM-yy"), col2X + 15, yPos);
          
          yPos += 6;
          
          // Row 2
          doc.setFont("helvetica", "bold");
          doc.text("VARIATION ORDER NO.: ", col1X, yPos);
          doc.setFont("helvetica", "normal");
          doc.text(variation.code, col1X + 50, yPos);
          
          doc.setFont("helvetica", "bold");
          doc.text("REVISION: ", col2X, yPos);
          doc.setFont("helvetica", "normal");
          doc.text("0", col2X + 25, yPos);
          
          yPos += 10;
          
          // Tenant name
          if (variation.tenants) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text(`${variation.tenants.shop_number} - ${variation.tenants.shop_name}`, contentStartX + contentWidth / 2, yPos, { align: "center" });
            yPos += 10;
          }
          
          yPos += 5;
          
          // Line Items Table
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          
          if (lineItems.length > 0) {
            const lineItemTotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            
            autoTable(doc, {
              startY: yPos,
              margin: { left: contentStartX, right: useMargins.right },
              head: [['NO', 'DESCRIPTION', 'COMMENTS/ DETAIL', 'QTY:', 'RATE:', 'AMOUNT:']],
              body: lineItems.map((item: any) => [
                item.line_number.toString(),
                item.description || '-',
                item.comments || '',
                item.quantity?.toString() || '0',
                `R${Number(item.rate || 0).toFixed(2)}`,
                `R${Number(item.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ]),
              theme: 'grid',
              styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
              },
              headStyles: {
                fillColor: [245, 245, 245],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'left',
              },
              columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 15, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
              },
              didDrawPage: (data) => {
                // Add bottom border after table
                const finalY = data.cursor?.y || yPos + 50;
                yPos = finalY;
              },
            });
            
            // Total section
            yPos = (doc as any).lastAutoTable.finalY + 15;
            
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(contentStartX, yPos - 5, contentStartX + contentWidth, yPos - 5);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("TOTAL ADDITIONAL WORKS EXCLUSIVE OF VAT", contentStartX + contentWidth - 60, yPos);
            doc.setFontSize(12);
            doc.text(
              `R${lineItemTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              contentStartX + contentWidth,
              yPos + 6,
              { align: 'right' }
            );
          } else {
            doc.text("No line items for this variation", contentStartX, yPos);
          }
          
          trackPageContent(doc, `Variation Sheet: ${variation.code}`);
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
