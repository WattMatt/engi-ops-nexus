import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Eye, EyeOff, Clock, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import { buildCoverPageSvg, buildExecutiveSummarySvg } from "@/utils/svg-pdf/costReportSvgBuilder";
import { svgPagesToDownload } from "@/utils/svg-pdf/svgToPdfEngine";

interface SvgPdfTestButtonProps {
  report: any;
}

export const SvgPdfTestButton = ({ report }: SvgPdfTestButtonProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [benchmarks, setBenchmarks] = useState<{ timeMs: number; sizeBytes: number } | null>(null);
  const [svgPages, setSvgPages] = useState<SVGSVGElement[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const buildSvgPages = async (): Promise<SVGSVGElement[]> => {
    // Fetch company settings
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Fetch categories with line items
    const { data: categoriesData } = await supabase
      .from("cost_categories")
      .select("*, cost_line_items(*)")
      .eq("cost_report_id", report.id)
      .order("display_order");

    // Fetch variations
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

    // Build Cover Page
    const coverSvg = buildCoverPageSvg({
      companyName: company?.company_name || "Company Name",
      projectName: report.project_name || "Project",
      reportNumber: report.report_number || 1,
      revision: report.revision || "A",
      date: new Date().toLocaleDateString("en-ZA"),
      projectNumber: report.project_number,
    });

    // Build Executive Summary
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

    return [coverSvg, summarySvg];
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setBenchmarks(null);

    try {
      const pages = await buildSvgPages();
      setSvgPages(pages);

      const result = await svgPagesToDownload(pages, {
        filename: `CostReport_${report.report_number}_SVG.pdf`,
      });

      setBenchmarks(result);

      toast({
        title: "SVG PDF Generated",
        description: `Generated in ${result.timeMs}ms (${(result.sizeBytes / 1024).toFixed(1)} KB)`,
      });
    } catch (error: any) {
      console.error("[SVG-PDF] Generation failed:", error);
      toast({
        title: "SVG PDF Failed",
        description: error.message || "Failed to generate SVG PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (svgPages.length === 0) {
      setIsGenerating(true);
      try {
        const pages = await buildSvgPages();
        setSvgPages(pages);
      } catch (error: any) {
        toast({
          title: "Preview Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      setIsGenerating(false);
    }
    setShowPreview(!showPreview);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export SVG PDF
            </>
          )}
        </Button>
        <Button onClick={handlePreview} variant="ghost" size="sm" disabled={isGenerating}>
          {showPreview ? (
            <><EyeOff className="mr-1 h-4 w-4" /> Hide Preview</>
          ) : (
            <><Eye className="mr-1 h-4 w-4" /> Preview SVG</>
          )}
        </Button>
        <Badge variant="secondary" className="text-xs">Beta</Badge>
      </div>

      {/* Benchmarks */}
      {benchmarks && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {benchmarks.timeMs}ms
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5" />
            {(benchmarks.sizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>
      )}

      {/* SVG Preview */}
      {showPreview && svgPages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">SVG Preview ({svgPages.length} pages)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={previewRef} className="space-y-4 overflow-auto max-h-[600px]">
              {svgPages.map((svg, i) => (
                <div
                  key={i}
                  className="border rounded-lg shadow-sm bg-background p-2"
                  dangerouslySetInnerHTML={{ __html: svg.outerHTML }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
