import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Eye, EyeOff, Clock, HardDrive, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import { imageToBase64 } from "@/utils/pdfmake/helpers";
import { generateStandardizedPDFFilename, generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";
import {
  buildCoverPageSvg,
  buildExecutiveSummarySvg,
  buildCategoryDetailsSvg,
  buildVariationsSvg,
  buildVariationSheetsSvg,
  buildBudgetDistributionSvg,
  buildVarianceComparisonSvg,
  buildProjectHealthSvg,
  buildNotesPageSvg,
  buildContractorSummarySvg,
  buildTableOfContentsSvg,
  applyPageFooters,
  type CategoryDetailData,
  type VariationItem,
  type VariationSheetData,
  type TocEntry,
} from "@/utils/svg-pdf/costReportSvgBuilder";
import { svgPagesToPdfBlob } from "@/utils/svg-pdf/svgToPdfEngine";
import { Separator } from "@/components/ui/separator";

interface SvgPdfExportButtonProps {
  report: any;
  onReportGenerated?: () => void;
}


export const SvgPdfExportButton = ({ report, onReportGenerated }: SvgPdfExportButtonProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [benchmarks, setBenchmarks] = useState<{ timeMs: number; sizeBytes: number } | null>(null);
  const [svgPages, setSvgPages] = useState<SVGSVGElement[]>([]);
  const [pageLabels, setPageLabels] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const buildSvgPages = useCallback(async () => {
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const { data: categoriesData } = await supabase
      .from("cost_categories")
      .select("*, cost_line_items(*)")
      .eq("cost_report_id", report.id)
      .order("display_order");

    const { data: variationsData } = await supabase
      .from("cost_variations")
      .select("*, variation_line_items(*)")
      .eq("cost_report_id", report.id)
      .order("display_order");

    const cats = categoriesData || [];
    const vars = variationsData || [];
    const allLineItems = cats.flatMap((c: any) => c.cost_line_items || []);
    const categoryTotals = calculateCategoryTotals(cats, allLineItems, vars);
    const grandTotals = calculateGrandTotals(categoryTotals);

    // Convert logos to base64 with timeout
    let companyLogoBase64: string | null = null;
    let clientLogoBase64: string | null = null;
    const LOGO_TIMEOUT = 4000;

    if (company?.company_logo_url) {
      try {
        companyLogoBase64 = await Promise.race([
          imageToBase64(company.company_logo_url),
          new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), LOGO_TIMEOUT)),
        ]);
      } catch { console.warn('[SVG-PDF] Company logo conversion failed, skipping'); }
    }
    if (company?.client_logo_url) {
      try {
        clientLogoBase64 = await Promise.race([
          imageToBase64(company.client_logo_url),
          new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), LOGO_TIMEOUT)),
        ]);
      } catch { console.warn('[SVG-PDF] Client logo conversion failed, skipping'); }
    }

    // Build standardised cover page with PREPARED FOR / PREPARED BY fields
    const coverSvg = buildCoverPageSvg({
      companyName: company?.company_name || "Company Name",
      projectName: report.project_name || "Project",
      reportNumber: report.report_number || 1,
      revision: report.revision || "A",
      date: new Date().toLocaleDateString("en-ZA"),
      projectNumber: report.project_number,
      companyLogoBase64,
      clientLogoBase64,
      companyAddress: company?.client_address_line1 || "",
      companyPhone: company?.client_phone || "",
      contactOrganization: company?.client_name || "",
      contactPhone: company?.client_phone || "",
    });

    const summaryRows = categoryTotals.map((cat: any) => ({
      code: cat.code,
      description: cat.description,
      originalBudget: cat.originalBudget,
      anticipatedFinal: cat.anticipatedFinal,
      currentVariance: cat.currentVariance,
    }));

    const summarySvg = buildExecutiveSummarySvg({
      rows: summaryRows,
      grandTotal: {
        code: "",
        description: "GRAND TOTAL",
        originalBudget: grandTotals.originalBudget,
        anticipatedFinal: grandTotals.anticipatedFinal,
        currentVariance: grandTotals.currentVariance,
      },
    });

    // Build Category Details pages
    const categoryDetails: CategoryDetailData[] = cats.map((cat: any) => {
      const items = (cat.cost_line_items || []);
      const originalBudget = items.reduce((s: number, i: any) => s + Number(i.original_budget || 0), 0);
      const previousReport = items.reduce((s: number, i: any) => s + Number(i.previous_report || 0), 0);
      const anticipatedFinal = items.reduce((s: number, i: any) => s + Number(i.anticipated_final || 0), 0);
      return {
        code: cat.code,
        description: cat.description,
        lineItems: items.map((i: any) => ({
          description: i.description || '',
          original_budget: Number(i.original_budget || 0),
          previous_report: Number(i.previous_report || 0),
          anticipated_final: Number(i.anticipated_final || 0),
        })),
        subtotals: {
          originalBudget,
          previousReport,
          anticipatedFinal,
          variance: anticipatedFinal - previousReport,
        },
      };
    });
    const categoryPages = buildCategoryDetailsSvg(categoryDetails);

    // Build Variations summary pages
    const variationItems: VariationItem[] = vars.map((v: any) => ({
      code: v.code || '',
      description: v.description || '',
      amount: Number(v.amount || 0),
      status: v.is_credit ? 'credit' : 'addition',
      tenantName: v.tenants?.shop_name || v.tenants?.shop_number || '',
    }));
    const variationsPages = buildVariationsSvg({
      items: variationItems,
      totalAmount: variationItems.reduce((s, v) => s + v.amount, 0),
    });

    // Build individual Variation Sheet pages
    const variationSheets: VariationSheetData[] = vars.map((v: any) => ({
      code: v.code || '',
      description: v.description || '',
      amount: Number(v.amount || 0),
      isCredit: !!v.is_credit,
      lineItems: (v.variation_line_items || []).map((li: any) => ({
        line_number: li.line_number || 0,
        description: li.description || '',
        quantity: li.quantity,
        rate: li.rate,
        amount: Number(li.amount || 0),
        comments: li.comments || '',
      })),
    }));
    const variationSheetPages = buildVariationSheetsSvg(variationSheets);

    // Build Budget Distribution donut chart page
    const distributionSvg = buildBudgetDistributionSvg({
      categories: categoryTotals.map((cat: any) => ({
        code: cat.code,
        description: cat.description,
        amount: cat.originalBudget,
      })),
      totalBudget: grandTotals.originalBudget,
    });

    // Build Variance Comparison bar chart page
    const varianceComparisonSvg = buildVarianceComparisonSvg({
      categories: categoryTotals.map((cat: any) => ({
        code: cat.code,
        description: cat.description,
        originalBudget: cat.originalBudget,
        anticipatedFinal: cat.anticipatedFinal,
      })),
    });

    // Build Project Health KPI dashboard page
    const overBudget = categoryTotals.filter((c: any) => c.anticipatedFinal > c.originalBudget && c.originalBudget > 0).length;
    const underBudget = categoryTotals.filter((c: any) => c.anticipatedFinal < c.originalBudget && c.originalBudget > 0).length;
    const onTrack = categoryTotals.filter((c: any) => c.anticipatedFinal === c.originalBudget || c.originalBudget === 0).length;

    const projectHealthSvg = buildProjectHealthSvg({
      totalOriginalBudget: grandTotals.originalBudget,
      totalAnticipatedFinal: grandTotals.anticipatedFinal,
      totalCurrentVariance: grandTotals.currentVariance,
      totalOriginalVariance: grandTotals.originalVariance,
      categoryCount: categoryTotals.length,
      categoriesOverBudget: overBudget,
      categoriesUnderBudget: underBudget,
      categoriesOnTrack: onTrack,
      variationsCount: vars.length,
      variationsTotal: variationItems.reduce((s, v) => s + v.amount, 0),
    });

    // Build Notes & Assumptions pages (if notes exist)
    const notesPages = report.notes
      ? buildNotesPageSvg({
          notes: report.notes,
          projectName: report.project_name,
          reportDate: report.report_date,
        })
      : [];

    // Build Contractor Summary page (no emoji icons — uses role letter abbreviation)
    const contractorSvg = buildContractorSummarySvg({
      projectName: report.project_name,
      contractors: [
        { role: 'Electrical', name: report.electrical_contractor || null, icon: 'E', accentColor: '#2563eb' },
        { role: 'CCTV', name: report.cctv_contractor || null, icon: 'C', accentColor: '#7c3aed' },
        { role: 'Earthing', name: report.earthing_contractor || null, icon: 'E', accentColor: '#16a34a' },
        { role: 'Standby Plants', name: report.standby_plants_contractor || null, icon: 'S', accentColor: '#ea580c' },
      ],
    });

    // Assemble pages WITHOUT TOC first to determine page counts
    const contentPages = [coverSvg, summarySvg, projectHealthSvg, distributionSvg, varianceComparisonSvg, ...categoryPages, ...variationsPages, ...variationSheetPages, contractorSvg, ...notesPages];
    const contentLabels = [
      'Cover Page',
      'Executive Summary',
      'Project Health',
      'Budget Distribution',
      'Variance Comparison',
      ...categoryPages.map((_, i) => i === 0 ? 'Category Details' : `Categories (p${i + 1})`),
      ...variationsPages.map((_, i) => i === 0 ? 'Variations' : `Variations (p${i + 1})`),
      ...variationSheetPages.map((_, i) => {
        const sheetVar = variationSheets[Math.min(i, variationSheets.length - 1)];
        return `Sheet ${sheetVar?.code || i + 1}`;
      }),
      'Contractor Summary',
      ...notesPages.map((_, i) => i === 0 ? 'Notes & Assumptions' : `Notes (p${i + 1})`),
    ];

    // Build TOC entries — TOC will be inserted at index 1, so all pages shift +1
    const tocEntries: TocEntry[] = contentLabels.slice(1).map((label, i) => ({
      label,
      pageNumber: i + 3, // +1 for cover, +1 for TOC itself, +1 for 1-indexed
      indent: label.includes('(p') || label.includes('(cont'),
    }));

    const tocSvg = buildTableOfContentsSvg(tocEntries);

    // Insert TOC after cover
    const allPages = [contentPages[0], tocSvg, ...contentPages.slice(1)];
    const labels = ['Cover Page', 'Table of Contents', ...contentLabels.slice(1)];
    setPageLabels(labels);

    // Apply footers with accurate "Page X of Y" after full assembly
    applyPageFooters(allPages);

    return allPages;
  }, [report]);

  /**
   * Persist the generated PDF blob to storage and create a history record.
   * Follows the same Generate → Save → DB Record → Preview workflow
   * as the standard ExportPDFButton.
   */
  const persistToHistory = async (blob: Blob): Promise<any | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const storageFileName = generateStorageFilename({
        projectNumber: report.project_number || report.project_id?.slice(0, 8),
        reportType: "CostReport",
        revision: report.revision || "A",
        reportNumber: report.report_number,
      });

      const storagePath = `cost-reports/${report.project_id}/${storageFileName}`;

      // Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from("cost-report-pdfs")
        .upload(storagePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[SVG-PDF] Storage upload failed:', uploadError);
        return null;
      }

      // Create database record
      const { data: record, error: dbError } = await supabase
        .from("cost_report_pdfs")
        .insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_name: storageFileName,
          file_path: storagePath,
          file_size: blob.size,
          revision: report.revision || "A",
          generated_by: userId || null,
          notes: "Generated via SVG engine",
        })
        .select()
        .single();

      if (dbError) {
        console.error('[SVG-PDF] DB record insert failed:', dbError);
        return null;
      }

      console.log('[SVG-PDF] Persisted to history:', record.id);
      return record;
    } catch (err) {
      console.error('[SVG-PDF] Persist failed:', err);
      return null;
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setBenchmarks(null);

    try {
      const pages = await buildSvgPages();
      setSvgPages(pages);
      setShowPreview(true);
      setCurrentPage(0);

      // Generate PDF blob (don't auto-download — persist first)
      const { blob, timeMs } = await svgPagesToPdfBlob(pages);
      const sizeBytes = blob.size;

      setBenchmarks({ timeMs, sizeBytes });

      // Persist to storage + database
      const record = await persistToHistory(blob);

      if (record) {
        setPreviewReport(record);
        onReportGenerated?.();
        toast({
          title: "PDF Generated & Saved",
          description: `Generated in ${timeMs}ms (${(sizeBytes / 1024).toFixed(1)} KB). Report saved to history.`,
        });
      } else {
        // Fallback: direct download if persist fails
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateStandardizedPDFFilename({
          projectNumber: report.project_number || report.project_id?.slice(0, 8),
          reportType: "CostReport",
          revision: report.revision || "A",
          reportNumber: report.report_number,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "PDF Generated",
          description: `Generated in ${timeMs}ms (${(sizeBytes / 1024).toFixed(1)} KB). Downloaded directly.`,
        });
      }
    } catch (error: any) {
      console.error("[SVG-PDF] Generation failed:", error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    if (svgPages.length === 0) {
      setIsGenerating(true);
      try {
        const pages = await buildSvgPages();
        setSvgPages(pages);
        setCurrentPage(0);
      } catch (error: any) {
        toast({ title: "Preview Failed", description: error.message, variant: "destructive" });
        setIsGenerating(false);
        return;
      }
      setIsGenerating(false);
    }
    setShowPreview(true);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
          {isGenerating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" />Export PDF</>
          )}
        </Button>
        <Button onClick={handlePreview} variant="ghost" size="sm" disabled={isGenerating}>
          {showPreview ? (
            <><EyeOff className="mr-1 h-4 w-4" />Hide Preview</>
          ) : (
            <><Eye className="mr-1 h-4 w-4" />Preview</>
          )}
        </Button>
        
      </div>

      {/* Benchmarks */}
      {benchmarks && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{benchmarks.timeMs}ms
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5" />{(benchmarks.sizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>
      )}

      {/* Inline SVG Preview Panel */}
      {showPreview && svgPages.length > 0 && (
        <Card className={isExpanded ? "fixed inset-4 z-50 overflow-hidden flex flex-col" : ""}>
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-medium">
                  Preview
                </CardTitle>
                <Badge variant="outline" className="text-xs font-normal">
                  {pageLabels[currentPage] || `Page ${currentPage + 1}`}
                </Badge>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1">
                {/* Page Navigation */}
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                  {currentPage + 1} / {svgPages.length}
                </span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={currentPage === svgPages.length - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-5 mx-1" />

                {/* Zoom Controls */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[2.5rem] text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomReset} title="Reset zoom">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>

                <Separator orientation="vertical" className="h-5 mx-1" />

                {/* Expand/Collapse */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(e => !e)}>
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className={isExpanded ? "flex-1 overflow-hidden" : ""}>
            {/* Page Thumbnails */}
            <div className="flex gap-2 mb-3">
              {svgPages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${currentPage === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                >
                  {pageLabels[i] || `Page ${i + 1}`}
                </button>
              ))}
            </div>

            {/* SVG Render Area */}
            <div
              ref={previewRef}
              className={`
                overflow-auto border rounded-lg bg-muted/30
                ${isExpanded ? "h-[calc(100%-3rem)]" : "max-h-[500px]"}
              `}
            >
              <div
                className="flex justify-center p-4 transition-transform origin-top"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              >
                <div
                  className="bg-background rounded-lg shadow-lg border"
                  style={{ width: "210mm" }}
                  dangerouslySetInnerHTML={{ __html: svgPages[currentPage].outerHTML }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded backdrop */}
      {isExpanded && showPreview && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Standard Report Preview Dialog (for persisted reports) */}
      {previewReport && (
        <StandardReportPreview
          report={previewReport}
          open={!!previewReport}
          onOpenChange={(open) => !open && setPreviewReport(null)}
          storageBucket="cost-report-pdfs"
        />
      )}
    </div>
  );
};
