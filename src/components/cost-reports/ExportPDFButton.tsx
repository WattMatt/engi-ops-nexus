import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { generateCoverPage } from "@/utils/pdfCoverPageSimple";
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

  // Check for Word template availability (both cover page and full report)
  const { data: templates } = useQuery({
    queryKey: ["cost-report-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .in("template_type", ["cost_report", "cover_page"])
        .eq("is_active", true)
        .order("is_default_cover", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) console.error("Template fetch error:", error);
      
      // Separate templates by type
      const costReportTemplate = data?.find(t => t.template_type === "cost_report");
      const coverPageTemplate = data?.find(t => t.template_type === "cover_page");
      
      return {
        costReport: costReportTemplate,
        coverPage: coverPageTemplate,
        hasCostReport: !!costReportTemplate,
        hasCoverPage: !!coverPageTemplate
      };
    },
  });

  const template = templates?.costReport; // For backward compatibility

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
      
      if (!template) {
        toast({
          title: "No Template Found",
          description: "Please upload a cost report template in Settings → PDF Templates",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setCurrentSection("Processing template and data...");

      // Prepare placeholder data using existing utility
      const { placeholderData, imagePlaceholders } = await prepareCostReportTemplateData(report.id);
      
      console.log('Template-based export - Using uploaded Word template only');
      console.log('Image placeholders:', JSON.stringify(imagePlaceholders, null, 2));

      // Use existing convert-word-to-pdf function - this IS the only source of truth
      const { data, error } = await supabase.functions.invoke('convert-word-to-pdf', {
        body: { 
          templateUrl: template.file_url,
          templateId: template.id,
          placeholderData,
          imagePlaceholders 
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
      
      setCurrentSection("Saving PDF...");
      
      // Save the generated PDF directly to cost_report_pdfs
      const fileName = `${report.project_name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${report.report_number}.pdf`;
      const filePath = `${report.project_id}/${fileName}`;
      
      // Download the PDF
      const pdfResponse = await fetch(data.pdfUrl);
      if (!pdfResponse.ok) throw new Error('Failed to fetch generated PDF');
      const pdfBlob = await pdfResponse.blob();
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('cost-report-pdfs')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cost-report-pdfs')
        .getPublicUrl(filePath);
      
      // Save to database
      const { data: pdfRecord, error: dbError } = await supabase
        .from('cost_report_pdfs')
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_path: filePath,
          file_name: fileName,
          generated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      setPreviewReport({
        file_path: publicUrl,
        report_name: fileName,
        generated_at: new Date().toISOString()
      });
      
      onReportGenerated?.();
      
      toast({
        title: "Success",
        description: "Cost report PDF generated successfully from template",
      });
      
    } catch (error: any) {
      console.error('Template PDF export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCurrentSection("");
    }
  };

  const exportPDF = async () => {
    setLoading(true);
    setCurrentSection("Initializing PDF export...");

    try {
      const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      const companyDetails = {
        companyName: company?.company_name || "Company Name",
        contactName: company?.client_name || "",
        contactPhone: company?.client_phone || "",
        company_logo_url: company?.company_logo_url || null,
        client_logo_url: company?.client_logo_url || null,
      };

      const contactId = selectedContactId || (contacts && contacts.length > 0 ? contacts[0].id : null);

      const useSections = {
        ...DEFAULT_SECTIONS,
        ...sections,
      };

      const useMargins = {
        ...STANDARD_MARGINS,
        ...margins,
      };

      // Fetch all necessary data
      setCurrentSection("Fetching report data...");
      
      const { data: categoriesData } = await supabase
        .from("cost_categories")
        .select("*, cost_line_items(*)")
        .eq("cost_report_id", report.id)
        .order("display_order");

      const { data: variationsData } = await supabase
        .from("cost_variations")
        .select(`
          *,
          tenants(shop_name, shop_number),
          variation_line_items(*)
        `)
        .eq("cost_report_id", report.id)
        .order("display_order");
      
      // Sort variations by extracting numeric part from code (e.g., G1, G2, G10)
      const sortedVariations = (variationsData || []).sort((a, b) => {
        const aMatch = a.code.match(/\d+/);
        const bMatch = b.code.match(/\d+/);
        const aNum = aMatch ? parseInt(aMatch[0], 10) : 0;
        const bNum = bMatch ? parseInt(bMatch[0], 10) : 0;
        return aNum - bNum;
      });

      const { data: details } = await supabase
        .from("cost_report_details")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");

      // Extract line items from categories
      const allLineItems = (categoriesData || []).flatMap(cat => cat.cost_line_items || []);

      // Calculate totals using the utility
      const pdfCategoryTotals = calculateCategoryTotals(categoriesData || [], allLineItems, sortedVariations || []);
      const pdfGrandTotals = calculateGrandTotals(pdfCategoryTotals);

      // Initialize PDF document
      setCurrentSection("Initializing PDF document...");
      const exportOptions: PDFExportOptions = { quality: 'standard', orientation: 'portrait' };
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Custom autoTable to prevent page numbers from being overwritten
      const originalAutoTable = (doc as any).autoTable;
      (doc as any).autoTable = function(options: any) {
        // Store current page numbers
        const currentPageInfo = doc.getCurrentPageInfo();
        const totalPages = doc.getNumberOfPages();
        
        // Call original autoTable
        const result = originalAutoTable.call(this, options);
        
        // Only re-add page numbers if they were there before and got overwritten
        if (currentPageInfo.pageNumber > 0) {
          const newTotalPages = doc.getNumberOfPages();
          // If new pages were added by autoTable, they need page numbers
          for (let i = currentPageInfo.pageNumber; i <= newTotalPages; i++) {
            doc.setPage(i);
            // Don't add page number here, let the final step handle it
          }
        }
        
        return result;
      };
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const tocSections: { title: string; page: number }[] = [];
      
      // Calculate content dimensions based on margins
      const contentWidth = pageWidth - useMargins.left - useMargins.right;
      const contentStartX = useMargins.left;
      const contentStartY = useMargins.top;
      
      // Track page content for mapping
      const pageContentMap: Record<number, string[]> = {};
      const trackPageContent = (content: string) => {
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        if (!pageContentMap[currentPage]) {
          pageContentMap[currentPage] = [];
        }
        pageContentMap[currentPage].push(content);
      };
      
      // Sort categories by display order
      const sortedCategories = [...(categoriesData || [])].sort((a, b) => a.display_order - b.display_order);
      
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
        // Check if we have a cover page template
        if (templates?.coverPage) {
          console.log('Using Word template for cover page:', templates.coverPage.name);
          
          // Prepare cover page data with exact placeholder names from template
          const coverPageData: Record<string, string> = {
            report_title: "COST REPORT",
            project_title: "COST REPORT",
            project_name: report.project_name || "",
            project_number: report.project_number || "",
            client_name: report.client_name || "",
            date: format(new Date(report.report_date), "dd MMMM yyyy"),
            report_date: format(new Date(report.report_date), "dd MMMM yyyy"),
            revision: `Report ${report.report_number}`,
            report_number: `Report ${report.report_number}`,
            
            // Initialize Prepared For section
            prepared_for_company: "",
            prepared_for_address: "",
            prepared_for_tel: "",
            prepared_for_contact: "",
            
            // Prepared By section (Company details)
            prepared_by_company: companyDetails.companyName || "",
            prepared_by_address: [
              "141 Witch Hazel ave",
              "Highveld Techno Park",
              "Buliding : 4A",
              "Centurion (pretoria)",
              "info@wm.co.za"
            ].join('\n'),
            prepared_by_tel: "",
            prepared_by_contact: "Wessel Marais",
            prepared_by_email: "info@wm.co.za",
            
            // Additional fields
            electrical_contractor: report.electrical_contractor || "",
            cctv_contractor: report.cctv_contractor || "",
            earthing_contractor: report.earthing_contractor || "",
            standby_plants_contractor: report.standby_plants_contractor || "",
            practical_completion_date: report.practical_completion_date 
              ? format(new Date(report.practical_completion_date), "dd MMMM yyyy")
              : "",
            site_handover_date: report.site_handover_date
              ? format(new Date(report.site_handover_date), "dd MMMM yyyy")
              : "",
          };
          
          console.log('Cover page data prepared:', coverPageData);
          
          // Fetch contact if selected
          if (contactId) {
            const { data: contact } = await supabase
              .from("project_contacts")
              .select("*")
              .eq("id", contactId)
              .single();
            
            if (contact) {
              coverPageData.prepared_for_company = contact.organization_name || report.client_name || "";
              coverPageData.prepared_for_contact = contact.contact_person_name || "";
              coverPageData.prepared_for_address = [
                contact.address_line1,
                contact.address_line2
              ].filter(Boolean).join(', ');
              coverPageData.prepared_for_tel = contact.phone || "";
              console.log('Contact data added:', { company: coverPageData.prepared_for_company, contact: coverPageData.prepared_for_contact });
            }
          }
          
          console.log('Sending to convert-word-to-pdf:', { 
            templateUrl: templates.coverPage.file_url,
            placeholderDataKeys: Object.keys(coverPageData),
            sampleData: {
              project_name: coverPageData.project_name,
              prepared_for_company: coverPageData.prepared_for_company
            }
          });
          
          // Prepare image placeholders
          const imagePlaceholders: Record<string, string> = {};
          if (companyDetails.company_logo_url) {
            imagePlaceholders.company_logo = companyDetails.company_logo_url;
            imagePlaceholders.company_image = companyDetails.company_logo_url;
          }
          if (companyDetails.client_logo_url) {
            imagePlaceholders.client_logo = companyDetails.client_logo_url;
            imagePlaceholders.client_image = companyDetails.client_logo_url;
          }
          
          // Convert Word template to PDF
          const { data: coverPdfData, error: coverError } = await supabase.functions.invoke('convert-word-to-pdf', {
            body: { 
              templateUrl: templates.coverPage.file_url,
              placeholderData: coverPageData,
              imagePlaceholders 
            }
          });
          
          if (coverError || !coverPdfData?.pdfUrl) {
            console.error('Failed to generate cover from template, falling back to jsPDF');
            await generateCoverPage(doc, {
              project_name: report.project_name,
              client_name: report.client_name,
              report_title: "Cost Report",
              report_date: format(new Date(), "dd MMMM yyyy"),
              revision: `Report ${report.report_number}`,
              subtitle: `Report #${report.report_number}`,
              project_id: report.project_id,
              contact_id: contactId || undefined
            });
          } else {
            console.log('Cover page PDF generated from template:', coverPdfData.pdfUrl);
            
            // Download the cover PDF
            const coverResponse = await fetch(coverPdfData.pdfUrl);
            const coverArrayBuffer = await coverResponse.arrayBuffer();
            
            // Save current jsPDF content
            const currentPdfBlob = doc.output('blob');
            const currentPdfBuffer = await currentPdfBlob.arrayBuffer();
            
            // Load both PDFs using pdf-lib
            const { PDFDocument } = await import('pdf-lib');
            const coverPdfDoc = await PDFDocument.load(coverArrayBuffer);
            const mainPdfDoc = await PDFDocument.load(currentPdfBuffer);
            
            // Create new merged document
            const mergedPdf = await PDFDocument.create();
            
            // Copy cover pages first
            const coverPages = await mergedPdf.copyPages(coverPdfDoc, coverPdfDoc.getPageIndices());
            coverPages.forEach(page => mergedPdf.addPage(page));
            
            // Then copy main content pages (skip the first blank page from jsPDF)
            const mainPages = await mergedPdf.copyPages(mainPdfDoc, mainPdfDoc.getPageIndices().slice(1));
            mainPages.forEach(page => mergedPdf.addPage(page));
            
            // Save merged PDF
            const mergedPdfBytes = await mergedPdf.save();
            
            // Replace jsPDF document with merged content
            // We'll continue building the rest of the report with jsPDF
            // and merge again at the end
            console.log('Cover page will be merged at final export');
            
            // Store cover PDF bytes for final merge
            (doc as any)._coverPdfBytes = mergedPdfBytes;
          }
        } else {
          // No template, use jsPDF cover page
          await generateCoverPage(doc, {
            project_name: report.project_name,
            client_name: report.client_name,
            report_title: "Cost Report",
            report_date: format(new Date(), "dd MMMM yyyy"),
            revision: `Report ${report.report_number}`,
            subtitle: `Report #${report.report_number}`,
            project_id: report.project_id,
            contact_id: contactId || undefined
          });
        }
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

      // ========== CATEGORY PERFORMANCE DETAILS PAGE ==========
      if (useSections.categoryDetails) {
      doc.addPage();
      tocSections.push({ title: "Category Performance Details", page: doc.getCurrentPageInfo().pageNumber });
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("CATEGORY PERFORMANCE DETAILS", pageWidth / 2, contentStartY + 5, { align: "center" });

      // Generate category cards programmatically for better performance
      const cardColors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green  
        [251, 191, 36],   // Yellow
        [249, 115, 22],   // Orange
        [139, 92, 246],   // Purple
        [236, 72, 153],   // Pink
        [134, 239, 172]   // Light green
      ];
      
      let yPos = contentStartY + 15;
      const cardWidth = (pageWidth - contentStartX - useMargins.right - 20) / 2;
      const cardHeight = 45;
      const cardPadding = 10;
      let xPos = contentStartX;
      let cardsInRow = 0;
      
      categoryTotals.forEach((cat: any, index: number) => {
        const color = cardColors[index % cardColors.length];
        
        // Check if we need a new row or page
        if (cardsInRow === 2) {
          xPos = contentStartX;
          yPos += cardHeight + cardPadding;
          cardsInRow = 0;
        }
        
        if (yPos + cardHeight > pageHeight - 30) {
          doc.addPage();
          yPos = contentStartY;
          xPos = contentStartX;
          cardsInRow = 0;
        }
        
        // Draw card background with border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'FD');
        
        // Draw colored side bar
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(xPos, yPos, 3, cardHeight, 'F');
        
        // Category code badge
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(xPos + 8, yPos + 5, 12, 8, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(cat.code, xPos + 14, yPos + 10, { align: 'center' });
        
        // Category description
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        const descLines = doc.splitTextToSize(cat.description, cardWidth - 28);
        doc.text(descLines[0], xPos + 24, yPos + 10);
        
        // Original Budget
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("ORIGINAL BUDGET", xPos + 8, yPos + 18);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`R${cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, xPos + 8, yPos + 24);
        
        // Anticipated Final
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("ANTICIPATED FINAL", xPos + 8, yPos + 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`R${cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, xPos + 8, yPos + 36);
        
        // Variance badge
        const isNegative = cat.originalVariance < 0;
        doc.setFillColor(isNegative ? 220 : 254, isNegative ? 252 : 226, isNegative ? 231 : 226);
        doc.roundedRect(xPos + cardWidth - 25, yPos + 28, 20, 6, 1, 1, 'F');
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isNegative ? 22 : 185, isNegative ? 163 : 28, isNegative ? 74 : 39);
        doc.text(isNegative ? 'SAVING' : 'EXTRA', xPos + cardWidth - 15, yPos + 32, { align: 'center' });
        
        // Variance amount
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(
          `${isNegative ? '-' : '+'}R${Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          xPos + cardWidth - 8,
          yPos + 24,
          { align: 'right' }
        );
        
        xPos += cardWidth + cardPadding;
        cardsInRow++;
        trackPageContent(`Category Card: ${cat.code} - ${cat.description}`);
      });
      }

      setCurrentSection("Generating executive summary...");
      // ========== EXECUTIVE SUMMARY PAGE ==========
      if (useSections.executiveSummary) {
        doc.addPage();
        tocSections.push({ title: "Executive Summary", page: doc.getCurrentPageInfo().pageNumber });
        
        // Simple professional header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("EXECUTIVE SUMMARY", pageWidth / 2, contentStartY + 3, { align: "center" });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text("Key Performance Indicators & Financial Overview", pageWidth / 2, contentStartY + 9, { align: "center" });

        // Add a subtle line under the header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(contentStartX, contentStartY + 12, pageWidth - useMargins.right, contentStartY + 12);

        doc.setTextColor(...colors.text);
        let tableY = contentStartY + 16;
        
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
          margin: { left: 10, right: 10 },
          head: [tableData.headers],
          body: tableRows,
          theme: 'striped',
          styles: {
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
            overflow: 'linebreak',
            halign: 'left',
            minCellHeight: 8,
            lineColor: [220, 220, 220],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'left',
            fontSize: 8,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
          },
          columnStyles: {
            0: { cellWidth: 'auto', halign: 'center' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 'auto', halign: 'right' },
            3: { cellWidth: 'auto', halign: 'right' },
            4: { cellWidth: 'auto', halign: 'right' },
            5: { cellWidth: 'auto', halign: 'center' },
            6: { cellWidth: 'auto', halign: 'right' },
            7: { cellWidth: 'auto', halign: 'right' }
          },
          didParseCell: (data: any) => {
            // Make category rows slightly bold
            if (data.section === 'body' && data.row.index < tableRows.length - 1) {
              if (data.column.index === 0 || data.column.index === 1) {
                data.cell.styles.fontStyle = 'bold';
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

      setCurrentSection("Adding project information...");
      // ========== PROJECT INFORMATION PAGE ==========
      if (useSections.projectInfo) {
      doc.addPage();
      const projectInfoPage = doc.getCurrentPageInfo().pageNumber;
      tocSections.push({ title: "Project Information", page: projectInfoPage });
      
      // Initialize page content array
      if (!pageContentMap[projectInfoPage]) pageContentMap[projectInfoPage] = [];
      
      let yPos = contentStartY;
      yPos = addSectionHeader(doc, "PROJECT INFORMATION", yPos);
      yPos += 5;
      pageContentMap[projectInfoPage].push("PROJECT INFORMATION");
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

        // Special handling for CONTRACT INFORMATION section
        if (detail.section_title.toUpperCase().includes('CONTRACT INFORMATION')) {
          doc.setFont("helvetica", "normal");
          const contractors = [
            { label: 'Electrical', value: report.electrical_contractor },
            { label: 'Earthing and lightning protection', value: report.earthing_contractor },
            { label: 'Standby Plants', value: report.standby_plants_contractor },
            { label: 'CCTV and access control', value: report.cctv_contractor }
          ].filter(c => c.value);

          contractors.forEach(c => {
            doc.text(`${c.label}: ${c.value}`, contentStartX, yPos);
            pageContentMap[currentPage].push(`${c.label}: ${c.value}`);
            yPos += 5;
          });
        } else if (detail.section_content) {
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(detail.section_content, contentWidth - 4);
          doc.text(lines, contentStartX, yPos);
          pageContentMap[currentPage].push(detail.section_content);
          yPos += lines.length * 5;
        }
        yPos += 5;
      });
      }

      // ========== DETAILED LINE ITEMS PAGES ==========
      sortedCategories.forEach((category: any, index: number) => {
        // Skip VARIATIONS category as it will be handled in the dedicated variations section
        if (category.code === 'G' || category.description.toUpperCase().includes('VARIATION')) {
          return;
        }
        
        setCurrentSection(`Adding detailed line items (${index + 1}/${sortedCategories.length})...`);
        const lineItems = category.cost_line_items || [];

        doc.addPage();
        tocSections.push({ title: `Detailed Line Items - ${category.description}`, page: doc.getCurrentPageInfo().pageNumber });
        
        // Find the corresponding category totals for this category
        const catTotals = categoryTotals.find((ct: any) => ct.code === category.code);
        let summaryY = contentStartY + 5;
        
        if (catTotals) {
          // Create single combined table with category header and line items
          const tableBody = lineItems.length > 0 ? lineItems.map((item: any) => {
            const currentVar = Number(item.anticipated_final || 0) - Number(item.previous_report || 0);
            const originalVar = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
            return [
              item.code,
              item.description,
              Number(item.original_budget || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              Number(item.previous_report || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              Number(item.anticipated_final || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              `${currentVar >= 0 ? '+' : '-'}${Math.abs(currentVar).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `${originalVar >= 0 ? '+' : '-'}${Math.abs(originalVar).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          }) : [['', 'No line items added yet', '', '', '', '', '']];
          
          autoTable(doc, {
            startY: summaryY,
            margin: { left: contentStartX, right: useMargins.right },
            head: [
              // Category summary row (cyan)
              [
                category.code,
                category.description.toUpperCase(),
                `R${catTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R${catTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R${catTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${catTotals.currentVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${catTotals.originalVariance >= 0 ? '+' : ''}R${Math.abs(catTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              ],
              // Column headers row (blue)
              ['Code', 'Description', 'Original\nBudget', 'Previous\nReport', 'Anticipated\nFinal', 'Current\nVariance', 'Original\nVariance']
            ],
            body: tableBody,
            theme: 'striped',
            styles: { 
              fontSize: 7, 
              cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
              valign: 'middle',
              minCellHeight: 8,
              overflow: 'linebreak',
              lineColor: [220, 220, 220],
              lineWidth: 0.1
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: [255, 255, 255], 
              fontStyle: 'bold', 
              fontSize: 7,
              halign: 'center',
              valign: 'middle',
              cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
              minCellHeight: 10
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250]
            },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
              1: { cellWidth: 36, halign: 'left' },
              2: { cellWidth: 27, halign: 'right' },
              3: { cellWidth: 27, halign: 'right' },
              4: { cellWidth: 27, halign: 'right' },
              5: { cellWidth: 27, halign: 'right' },
              6: { cellWidth: 27, halign: 'right' }
            },
            didParseCell: (data: any) => {
              // Style the first header row (category summary) with cyan background
              if (data.section === 'head' && data.row.index === 0) {
                data.cell.styles.fillColor = [34, 197, 218];
                data.cell.styles.textColor = [0, 0, 0];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 8;
                data.cell.styles.halign = data.column.index === 0 ? 'center' : (data.column.index === 1 ? 'left' : 'right');
              }
            },
            didDrawCell: (data) => {
              // Color variance cells only if we have line items
              if (data.section === 'body' && lineItems.length > 0 && lineItems[data.row.index]) {
                const item = lineItems[data.row.index];
                const currentVar = Number(item.anticipated_final || 0) - Number(item.previous_report || 0);
                const originalVar = Number(item.anticipated_final || 0) - Number(item.original_budget || 0);
                
                // Green for savings (negative variance), Red for extra costs (positive variance)
                if (data.column.index === 5 && currentVar !== 0) {
                  data.cell.styles.textColor = currentVar < 0 ? [22, 163, 74] : [220, 38, 38];
                  data.cell.styles.fontStyle = 'bold';
                }
                if (data.column.index === 6 && originalVar !== 0) {
                  data.cell.styles.textColor = originalVar < 0 ? [22, 163, 74] : [220, 38, 38];
                  data.cell.styles.fontStyle = 'bold';
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

      // ========== VARIATIONS PAGE - REMOVED ==========
      // This section was removed as variations are now shown in:
      // 1. Detailed Line Items - VARIATIONS page (created below)
      // 2. Individual Variation Order Sheets
      
      // Instead, create a proper Detailed Line Items - VARIATIONS page
      if (sortedVariations.length > 0) {
        setCurrentSection("Adding variations detailed page...");
        doc.addPage();
        tocSections.push({ title: "Detailed Line Items - VARIATIONS", page: doc.getCurrentPageInfo().pageNumber });
        
        // Find variations totals
        const varTotals = categoryTotals.find((ct: any) => ct.code === 'G');
        let summaryY = contentStartY + 5;
        
        if (varTotals) {
          // Create table with variations header and individual variations
          const tableBody = sortedVariations.map((v: any) => [
            v.code,
            v.description,
            'R0.00', // Original budget is always 0 for variations
            'R0.00', // Previous report
            `R${Math.abs(v.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${v.is_credit ? '-' : '+'}R${Math.abs(v.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${v.is_credit ? '-' : '+'}R${Math.abs(v.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);
          
          autoTable(doc, {
            startY: summaryY,
            margin: { left: contentStartX, right: useMargins.right },
            head: [
              // Category summary row (cyan)
              [
                'G',
                'VARIATIONS',
                `R${varTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R${varTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `R${varTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${varTotals.currentVariance >= 0 ? '+' : ''}R${Math.abs(varTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
                `${varTotals.originalVariance >= 0 ? '+' : ''}R${Math.abs(varTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
              ],
              // Column headers row (blue)
              ['Code', 'Description', 'Original\nBudget', 'Previous\nReport', 'Anticipated\nFinal', 'Current\nVariance', 'Original\nVariance']
            ],
            body: tableBody,
            theme: 'striped',
            styles: { 
              fontSize: 7, 
              cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
              valign: 'middle',
              minCellHeight: 8,
              overflow: 'linebreak',
              lineColor: [220, 220, 220],
              lineWidth: 0.1
            },
            headStyles: { 
              fillColor: [41, 128, 185], 
              textColor: [255, 255, 255], 
              fontStyle: 'bold',
              fontSize: 8,
              overflow: 'linebreak',
              valign: 'middle'
            }
          });
        }
      }

      // Skip the old variations summary page entirely
      if (false && useSections.variations && sortedVariations.length > 0) {
        setCurrentSection("Adding variations...");
        doc.addPage();
        tocSections.push({ title: "Variations", page: doc.getCurrentPageInfo().pageNumber });
        
        // Simple professional header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("VARIATIONS", contentStartX, contentStartY + 5);
        
        // Add a subtle line under the header
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(contentStartX, contentStartY + 8, pageWidth - useMargins.right, contentStartY + 8);

        autoTable(doc, {
          startY: contentStartY + 15,
          margin: { left: contentStartX, right: useMargins.right },
          head: [['Code', 'Description', 'Amount', 'Type']],
          body: sortedVariations.map((v: any) => [
            v.code,
            v.description,
            Math.abs(Number(v.amount || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            v.is_credit ? 'Credit' : 'Debit'
          ]),
          theme: 'striped',
          styles: { 
            fontSize: 7, 
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            valign: 'middle',
            minCellHeight: 8,
            lineColor: [220, 220, 220],
            lineWidth: 0.1
          },
          headStyles: { 
            fillColor: [30, 58, 138], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
            valign: 'middle',
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
            minCellHeight: 10
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250]
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 72, halign: 'left' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 18, halign: 'center' }
          },
          didDrawCell: (data) => {
            // Color the type cell
            if (data.section === 'body' && data.column.index === 3) {
              const variation = sortedVariations[data.row.index];
              if (variation.is_credit) {
                data.cell.styles.textColor = [0, 120, 0];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });
        
        // Close the disabled old variations summary page block
      }
      
      // ========== INDIVIDUAL VARIATION DETAIL SHEETS ==========
      if (useSections.variations && sortedVariations.length > 0) {
        const variationSheetsStartPage = doc.getCurrentPageInfo().pageNumber + 1;
        
        // Fetch line items for all variations
        const variationLineItemsMap = new Map();
        for (const variation of sortedVariations) {
          const { data: lineItems } = await supabase
            .from("variation_line_items")
            .select("*")
            .eq("variation_id", variation.id)
            .order("line_number");
          variationLineItemsMap.set(variation.id, lineItems || []);
        }
        
        sortedVariations.forEach((variation: any, index: number) => {
          setCurrentSection(`Adding variation sheet ${index + 1}/${sortedVariations.length}...`);
          doc.addPage();
          
          const lineItems = variationLineItemsMap.get(variation.id) || [];
          
          // Professional header matching Excel template
          let yPos = contentStartY;
          
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
          
          trackPageContent(`Variation Sheet: ${variation.code}`);
        });
        
        // Add summary entry to TOC for all variation sheets
        if (sortedVariations.length > 0) {
          const variationSheetsEndPage = doc.getCurrentPageInfo().pageNumber;
          tocSections.push({ 
            title: `Variation Order Sheets (${sortedVariations.length} sheets)`,
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
      
      // Check if we need to merge cover page from template
      let finalPdfBlob: Blob;
      
      if ((doc as any)._coverPdfBytes) {
        console.log('Merging template cover page with generated content...');
        
        // Get the main content PDF
        const mainPdfBlob = doc.output("blob");
        const mainPdfBuffer = await mainPdfBlob.arrayBuffer();
        
        // Load both PDFs
        const { PDFDocument } = await import('pdf-lib');
        const mainPdfDoc = await PDFDocument.load(mainPdfBuffer);
        const coverPdfDoc = await PDFDocument.load((doc as any)._coverPdfBytes);
        
        // Create merged document
        const mergedPdf = await PDFDocument.create();
        
        // Copy cover pages first
        const coverPages = await mergedPdf.copyPages(coverPdfDoc, [0]); // Just the cover page
        coverPages.forEach(page => mergedPdf.addPage(page));
        
        // Then copy main content (skip first page if it was blank)
        const mainPageIndices = mainPdfDoc.getPageIndices();
        const mainPages = await mergedPdf.copyPages(mainPdfDoc, useSections.coverPage ? mainPageIndices.slice(1) : mainPageIndices);
        mainPages.forEach(page => mergedPdf.addPage(page));
        
        const mergedPdfBytes = await mergedPdf.save();
        finalPdfBlob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
        console.log('Cover page merged successfully');
      } else {
        // No cover template, use jsPDF output directly
        finalPdfBlob = doc.output("blob");
      }
      
      const fileName = `Cost_Report_${report.report_number}_${Date.now()}.pdf`;
      const filePath = `${report.project_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cost-report-pdfs")
        .upload(filePath, finalPdfBlob);

      if (uploadError) throw uploadError;

      // Save PDF record
      const { data: pdfRecord, error: recordError } = await supabase
        .from("cost_report_pdfs")
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_path: filePath,
          file_name: fileName,
          file_size: finalPdfBlob.size,
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
    exportPDF();
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button 
            onClick={() => template ? exportWithTemplate() : exportPDF()} 
            disabled={loading}
            title={template ? `Using template: ${template.name}` : "Using built-in PDF generation"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {template ? "Export with Template" : "Export PDF"}
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
        onApply={() => template ? exportWithTemplate() : exportPDF()}
        projectId={report.project_id}
        hasTemplate={!!template}
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
