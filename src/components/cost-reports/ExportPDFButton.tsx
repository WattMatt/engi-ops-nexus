import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import { PDFExportSettings, DEFAULT_MARGINS, type PDFMargins, type PDFSectionOptions } from "./PDFExportSettings";
import { STANDARD_MARGINS } from "@/utils/pdfExportBase";
import { generateStandardizedPDFFilename, generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import { Progress } from "@/components/ui/progress";

interface ExportPDFButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

// Simplified section defaults - no quick export toggle
const SIMPLE_SECTIONS: PDFSectionOptions = {
  coverPage: true,
  tableOfContents: true,
  executiveSummary: true,
  categoryDetails: true,
  projectInfo: true,
  costSummary: false,
  detailedLineItems: true,
  variations: true,
  visualSummary: true,
  previewBeforeExport: false,
  useQuickExport: false, // Ignored - we only have one path now
};

// Timeouts
const DATA_TIMEOUT_MS = 15000;  // 15s for each data query
const PDF_TIMEOUT_MS = 120000; // 120s for PDF generation

export const ExportPDFButton = ({ report, onReportGenerated }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [margins, setMargins] = useState<PDFMargins>(DEFAULT_MARGINS);
  const [sections, setSections] = useState<PDFSectionOptions>(SIMPLE_SECTIONS);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [previewReport, setPreviewReport] = useState<any>(null);
  
  // Simple export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState("");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Single, bulletproof export function
   * No branches, no quick export, just one reliable path
   */
  const handleExport = useCallback(async () => {
    // Prevent double-click
    if (isExporting) return;
    
    // Reset state
    setIsExporting(true);
    setExportStep("Initializing...");
    setExportProgress(0);
    setExportError(null);
    
    // Create abort controller for this export
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      console.log('[CostReportPDF] Starting export for report:', report.id);
      
      // ========================================
      // STEP 1: Fetch all data (0-40%)
      // ========================================
      setExportStep("Loading company settings...");
      setExportProgress(5);
      
      // Company settings
      const companyResult = await Promise.race([
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Company settings timeout")), DATA_TIMEOUT_MS)
        )
      ]);
      
      if (signal.aborted) throw new Error("Export cancelled");
      const company = (companyResult as any).data;
      
      setExportStep("Loading categories...");
      setExportProgress(15);
      
      // Categories with line items
      const categoriesResult = await Promise.race([
        supabase.from("cost_categories")
          .select("*, cost_line_items(*)")
          .eq("cost_report_id", report.id)
          .order("display_order"),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Categories timeout")), DATA_TIMEOUT_MS)
        )
      ]);
      
      if (signal.aborted) throw new Error("Export cancelled");
      const categoriesData = (categoriesResult as any).data || [];
      console.log('[CostReportPDF] Loaded', categoriesData.length, 'categories');
      
      setExportStep("Loading variations...");
      setExportProgress(25);
      
      // Variations
      const variationsResult = await Promise.race([
        supabase.from("cost_variations")
          .select(`*, tenants(shop_name, shop_number), variation_line_items(*)`)
          .eq("cost_report_id", report.id)
          .order("display_order"),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Variations timeout")), DATA_TIMEOUT_MS)
        )
      ]);
      
      if (signal.aborted) throw new Error("Export cancelled");
      const variationsData = ((variationsResult as any).data || []).sort((a: any, b: any) => {
        const aMatch = a.code?.match(/\d+/);
        const bMatch = b.code?.match(/\d+/);
        return (aMatch ? parseInt(aMatch[0], 10) : 0) - (bMatch ? parseInt(bMatch[0], 10) : 0);
      });
      console.log('[CostReportPDF] Loaded', variationsData.length, 'variations');
      
      setExportStep("Calculating totals...");
      setExportProgress(35);
      
      // Calculate totals
      const allLineItems = categoriesData.flatMap((cat: any) => cat.cost_line_items || []);
      const categoryTotals = calculateCategoryTotals(categoriesData, allLineItems, variationsData);
      const grandTotals = calculateGrandTotals(categoryTotals);
      
      // Build variation line items map for TENANT ACCOUNT sheets
      const variationLineItemsMap: Record<string, any[]> = {};
      variationsData.forEach((v: any) => {
        variationLineItemsMap[v.id] = v.variation_line_items || [];
      });
      console.log('[CostReportPDF] Built variationLineItemsMap for', Object.keys(variationLineItemsMap).length, 'variations');
      
      if (signal.aborted) throw new Error("Export cancelled");
      
      setExportProgress(45);
      
      // ========================================
      // STEP 3: Generate PDF via Edge Function (50-90%)
      // Server-side generation is more reliable
      // ========================================
      setExportStep("Building PDF document...");
      setExportProgress(50);
      
      const companyDetails = {
        companyName: company?.company_name || "Company Name",
        contactName: company?.client_name || "",
        contactPhone: company?.client_phone || "",
        company_logo_url: company?.company_logo_url || null,
        client_logo_url: company?.client_logo_url || null,
      };
      
      const useMargins = { ...STANDARD_MARGINS, ...margins };
      
      const pdfData = {
        report,
        categoriesData,
        variationsData,
        variationLineItemsMap,
        companyDetails,
        categoryTotals,
        grandTotals,
      };
      
      const downloadFilename = generateStandardizedPDFFilename({
        projectNumber: report.project_number || report.project_id?.slice(0, 8),
        reportType: "CostReport",
        revision: report.revision || "A",
        reportNumber: report.report_number,
      });
      
      const storageFileName = generateStorageFilename({
        projectNumber: report.project_number || report.project_id?.slice(0, 8),
        reportType: "CostReport",
        revision: report.revision || "A",
        reportNumber: report.report_number,
      });
      
      setExportStep("Generating PDF on server...");
      setExportProgress(60);
      
      try {
        // Call edge function for reliable server-side PDF generation
        console.log('[CostReportPDF] Calling edge function...');
        
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cost-report-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              reportId: report.id,
              pdfData,
              filename: storageFileName,
              options: {
                includeCoverPage: sections.coverPage,
                includeExecutiveSummary: sections.executiveSummary,
                includeCategoryDetails: sections.categoryDetails,
                includeDetailedLineItems: sections.detailedLineItems,
                includeVariations: sections.variations,
              },
            }),
            signal,
          }
        );
        
        if (signal.aborted) throw new Error("Export cancelled");
        
        setExportProgress(85);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[CostReportPDF] Edge function success:', result);
        
        if (signal.aborted) throw new Error("Export cancelled");
        
        // ========================================
        // SUCCESS
        // ========================================
        setExportStep("Complete!");
        setExportProgress(100);
        
        toast({
          title: "PDF Generated",
          description: "Report saved. Click to preview and download.",
        });
        
        if (result.record) {
          setPreviewReport(result.record);
        }
        
        onReportGenerated?.();
        
        // Reset after showing success briefly
        setTimeout(() => {
          setIsExporting(false);
          setExportStep("");
          setExportProgress(0);
        }, 1500);
        
        return;
        
      } catch (genError: any) {
        console.error('[CostReportPDF] Generation failed:', genError);
        throw new Error(`PDF generation failed: ${genError.message}`);
      }
    
    } catch (error: any) {
      console.error('[CostReportPDF] Export failed:', error);
      
      const errorMessage = error.message || "Export failed. Please try again.";
      setExportError(errorMessage);
      setExportStep("");
      setExportProgress(0);
      
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset after showing error
      setTimeout(() => {
        setIsExporting(false);
        setExportError(null);
      }, 3000);
    }
  }, [isExporting, report, sections, margins, toast, onReportGenerated]);

  // Cancel export
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    setExportStep("");
    setExportProgress(0);
    setExportError(null);
    toast({
      title: "Export Cancelled",
      description: "PDF generation was cancelled",
    });
  }, [toast]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
          >
            {isExporting ? (
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
          <Button 
            onClick={() => setSettingsOpen(true)} 
            variant="outline" 
            size="icon" 
            disabled={isExporting}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Simple Progress Indicator */}
        {isExporting && (
          <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {exportProgress === 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <span className="text-sm font-medium">{exportStep}</span>
              </div>
              <span className="text-sm text-muted-foreground">{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
            {exportProgress < 100 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
        
        {/* Error Display */}
        {exportError && !isExporting && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive/90">{exportError}</span>
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
        onApply={handleExport}
        projectId={report.project_id}
        hasTemplate={false}
        selectedContactId={selectedContactId}
        onContactChange={setSelectedContactId}
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
