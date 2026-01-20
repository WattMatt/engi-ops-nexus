import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { PDFExportSettings, DEFAULT_MARGINS, DEFAULT_SECTIONS, type PDFMargins, type PDFSectionOptions } from "./PDFExportSettings";
import { ValidationWarningDialog } from "./ValidationWarningDialog";
import { STANDARD_MARGINS } from "@/utils/pdfExportBase";
import { prepareCostReportTemplateData } from "@/utils/prepareCostReportTemplateData";
import { generateStandardizedPDFFilename, generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { PDFPreviewBeforeExport, captureCostReportCharts, waitForChartsToRender, useCostReportData } from "./pdf-export";
import { CostReportProgressIndicator } from "./pdf-export/components/CostReportProgressIndicator";
import { generateCostReportPdfmake, downloadCostReportPdfmake } from "@/utils/pdfmake/costReport";

interface ExportPDFButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const ExportPDFButton = ({ report, onReportGenerated }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [margins, setMargins] = useState<PDFMargins>(DEFAULT_MARGINS);
  const [sections, setSections] = useState<PDFSectionOptions>(DEFAULT_SECTIONS);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationMismatches, setValidationMismatches] = useState<string[]>([]);
  const [pendingExport, setPendingExport] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  
  // PDF Generation progress state
  const [generationStep, setGenerationStep] = useState<string>("");
  const [generationPercentage, setGenerationPercentage] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Preview before export state
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isSavingAfterPreview, setIsSavingAfterPreview] = useState(false);
  const [pendingPdfData, setPendingPdfData] = useState<{
    blob: Blob;
    fileName: string;
    filePath: string;
    storageFileName: string;
  } | null>(null);
  
  // Use the new data fetching hook (follows Roadmap Review pattern)
  const { fetchReportData, progress: dataProgress, isFetching, resetProgress } = useCostReportData();

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

  // Helper function to save PDF to storage and database
  const savePdfToStorage = async (pdfBlob: Blob, filePath: string, fileName: string) => {
    const { error: uploadError } = await supabase.storage
      .from("cost-report-pdfs")
      .upload(filePath, pdfBlob, { upsert: true });

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
      description: "PDF generated and saved successfully",
    });

    setPreviewReport(pdfRecord);
    onReportGenerated?.();
    setPendingExport(false);
  };

  // Handle preview confirmation - save the PDF
  const handlePreviewConfirm = async () => {
    if (!pendingPdfData) return;

    setIsSavingAfterPreview(true);
    try {
      await savePdfToStorage(
        pendingPdfData.blob, 
        pendingPdfData.filePath, 
        pendingPdfData.fileName
      );
      setPreviewDialogOpen(false);
      setPendingPdfData(null);
      setPreviewBlob(null);
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      toast({
        title: "Error",
        description: "Failed to save PDF",
        variant: "destructive",
      });
    } finally {
      setIsSavingAfterPreview(false);
    }
  };

  // Handle preview cancel
  const handlePreviewCancel = () => {
    setPendingPdfData(null);
    setPreviewBlob(null);
    setPreviewFileName("");
    toast({
      title: "Export cancelled",
      description: "PDF was not saved",
    });
  };

  const exportWithTemplate = async () => {
    setLoading(true);
    setGenerationStep("Preparing template data...");
    
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

      setGenerationStep("Processing template and data...");

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
      
      setGenerationStep("Saving PDF...");
      
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
      setGenerationStep("");
    }
  };

  /**
   * Main PDF export function - follows Roadmap Review architecture:
   * Phase 1: Data Fetching (via useCostReportData hook)
   * Phase 2: PDF Generation (via pdfmake)
   */
  const exportPDF = async () => {
    setLoading(true);
    setIsGenerating(false);
    setGenerationStep("");
    setGenerationPercentage(0);
    resetProgress();

    try {
      console.log('[CostReportPDF] Starting export for report:', report.id);

      // ========================================
      // PHASE 1: Data Fetching (handled by hook)
      // ========================================
      const reportData = await fetchReportData(report.id);
      
      if (!reportData) {
        toast({
          title: "Data Fetch Failed",
          description: "Unable to load report data. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { company, categoriesData, variationsData, categoryTotals, grandTotals } = reportData;

      // Build company details object
      const companyDetails = {
        companyName: company?.company_name || "Company Name",
        contactName: company?.client_name || "",
        contactPhone: company?.client_phone || "",
        company_logo_url: company?.company_logo_url || null,
        client_logo_url: company?.client_logo_url || null,
      };

      const useSections = { ...DEFAULT_SECTIONS, ...sections };
      const useMargins = { ...STANDARD_MARGINS, ...margins };

      // ========================================
      // PHASE 2: PDF Generation
      // ========================================
      setIsGenerating(true);
      setGenerationStep("Preparing PDF generation...");
      setGenerationPercentage(10);
      
      // Capture charts if visual summary is enabled
      let chartImages: string[] = [];
      if (useSections.visualSummary) {
        setGenerationStep("Capturing charts...");
        setGenerationPercentage(20);
        await waitForChartsToRender();
        const capturedCharts = await captureCostReportCharts();
        chartImages = capturedCharts
          .filter(chart => chart.canvas)
          .map(chart => chart.canvas.toDataURL('image/png'))
          .filter(dataUrl => dataUrl && dataUrl.length > 100 && dataUrl !== 'data:,');
        console.log(`[CostReportPDF] Captured ${chartImages.length} valid chart images`);
      }
      
      // Build variation line items map
      const variationLineItemsMap = new Map<string, any[]>();
      variationsData.forEach((variation: any) => {
        variationLineItemsMap.set(variation.id, variation.variation_line_items || []);
      });

      // Generate filename
      const downloadFilename = generateStandardizedPDFFilename({
        projectNumber: report.project_number || report.project_id?.slice(0, 8),
        reportType: "CostReport",
        revision: report.revision || "A",
        reportNumber: report.report_number,
      });

      setGenerationStep("Building PDF document...");
      setGenerationPercentage(40);

      // ============================================
      // QUICK EXPORT PATH - Direct Download (most reliable)
      // ============================================
      if (useSections.useQuickExport) {
        setGenerationStep("Generating PDF (direct download)...");
        setGenerationPercentage(60);
        
        await downloadCostReportPdfmake({
          report,
          categoriesData,
          variationsData,
          variationLineItemsMap,
          companyDetails,
          categoryTotals,
          grandTotals,
          options: {
            includeCoverPage: useSections.coverPage,
            includeTableOfContents: useSections.tableOfContents,
            includeExecutiveSummary: useSections.executiveSummary,
            includeCategoryDetails: useSections.categoryDetails,
            includeDetailedLineItems: useSections.detailedLineItems,
            includeVariations: useSections.variations,
            includeVisualSummary: useSections.visualSummary,
            chartImages,
            margins: useMargins,
          },
        }, downloadFilename);
        
        setGenerationPercentage(100);
        setGenerationStep("Complete!");
        
        toast({
          title: "PDF Downloaded",
          description: "Cost report exported successfully",
        });
        onReportGenerated?.();
        
        // Quick export path - reset handled by finally block
        return;
      }

      // ============================================
      // STANDARD PATH - Blob Generation (for preview/storage)
      // ============================================
      setGenerationStep("Rendering PDF to blob...");
      setGenerationPercentage(60);
      
      const pdfBlob = await generateCostReportPdfmake({
        report,
        categoriesData,
        variationsData,
        variationLineItemsMap,
        companyDetails,
        categoryTotals,
        grandTotals,
        options: {
          includeCoverPage: useSections.coverPage,
          includeTableOfContents: useSections.tableOfContents,
          includeExecutiveSummary: useSections.executiveSummary,
          includeCategoryDetails: useSections.categoryDetails,
          includeDetailedLineItems: useSections.detailedLineItems,
          includeVariations: useSections.variations,
          includeVisualSummary: useSections.visualSummary,
          chartImages,
          margins: useMargins,
          onProgress: (section: string) => {
            setGenerationStep(section);
          },
        },
      });

      setGenerationPercentage(80);

      // Generate storage filename
      const storageFileName = generateStorageFilename({
        projectNumber: report.project_number || report.project_id?.slice(0, 8),
        reportType: "CostReport",
        revision: report.revision || "A",
        reportNumber: report.report_number,
      });
      const filePath = `${report.project_id}/${storageFileName}`;

      // Show preview or save directly
      if (useSections.previewBeforeExport) {
        setPreviewBlob(pdfBlob);
        setPreviewFileName(downloadFilename);
        setPendingPdfData({
          blob: pdfBlob,
          fileName: downloadFilename,
          filePath,
          storageFileName,
        });
        setPreviewDialogOpen(true);
        setGenerationPercentage(100);
        setGenerationStep("Preview ready");
        setLoading(false);
        setIsGenerating(false);
        return;
      }

      // Direct save to storage
      setGenerationStep("Saving to storage...");
      setGenerationPercentage(90);
      await savePdfToStorage(pdfBlob, filePath, downloadFilename);
      
      setGenerationPercentage(100);
      setGenerationStep("Complete!");

    } catch (error: any) {
      console.error('[CostReportPDF] Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
      // Immediately reset on error - don't leave progress stuck
      setLoading(false);
      setIsGenerating(false);
      setGenerationStep("");
      setGenerationPercentage(0);
      resetProgress();
      return; // Exit early on error
    }
    
    // Success path - delayed cleanup to show completion state briefly
    setTimeout(() => {
      setLoading(false);
      setIsGenerating(false);
      setGenerationStep("");
      setGenerationPercentage(0);
      resetProgress();
    }, 1500);
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
        
        {/* Two-Phase Progress Indicator - only show while actively working */}
        {(isFetching || isGenerating) && (
          <CostReportProgressIndicator
            dataProgress={dataProgress}
            generationStep={generationStep}
            generationPercentage={generationPercentage}
            isGenerating={isGenerating}
            isFetching={isFetching}
          />
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
      
      {/* PDF Preview Before Export Dialog */}
      <PDFPreviewBeforeExport
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        pdfBlob={previewBlob}
        fileName={previewFileName}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
        isSaving={isSavingAfterPreview}
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
