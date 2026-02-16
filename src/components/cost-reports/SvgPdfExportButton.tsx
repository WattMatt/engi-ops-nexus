import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import { generatePDF } from "@/utils/pdfmake/engine";
import type { CostReportData, CostCategory, VariationItem, VariationSheetData } from "@/utils/pdfmake/engine/registrations/costReport";
import { generateStandardizedPDFFilename, generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { format } from "date-fns";

interface SvgPdfExportButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const SvgPdfExportButton = ({ report, onReportGenerated }: SvgPdfExportButtonProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch Related Data
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

      const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      const cats = categoriesData || [];
      const vars = variationsData || [];
      const allLineItems = cats.flatMap((c: any) => c.cost_line_items || []);
      
      // Calculate Totals
      const categoryTotals = calculateCategoryTotals(cats, allLineItems, vars);
      const grandTotals = calculateGrandTotals(categoryTotals);

      // 2. Map to Report Data Structure
      const reportData: CostReportData = {
        projectName: report.project_name || "Project",
        projectNumber: report.project_number,
        reportDate: format(new Date(), "yyyy.MM.dd"),
        reportNumber: report.report_number,
        revision: report.revision || "A",
        notes: report.notes,
        
        // Summary Data
        summary: {
          totalBudget: grandTotals.originalBudget,
          totalPrevious: grandTotals.previousReport,
          totalActual: grandTotals.anticipatedFinal,
          totalVariance: grandTotals.originalVariance,
          variancePercent: grandTotals.originalBudget > 0 
            ? (grandTotals.originalVariance / grandTotals.originalBudget) * 100 
            : 0
        },

        // Categories
        categories: categoryTotals.map(cat => ({
          id: cat.id,
          code: cat.code,
          name: cat.description,
          budgeted: cat.originalBudget,
          previous: cat.previousReport,
          actual: cat.anticipatedFinal,
          variance: cat.originalVariance,
          variancePercent: cat.originalBudget > 0 
            ? (cat.originalVariance / cat.originalBudget) * 100 
            : 0,
          items: (cats.find((c: any) => c.id === cat.id)?.cost_line_items || []).map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity) || undefined,
            unit: item.unit || undefined,
            rate: Number(item.rate) || undefined,
            original_budget: Number(item.original_budget || 0),
            previous_report: Number(item.previous_report || 0),
            anticipated_final: Number(item.anticipated_final || 0)
          }))
        })),

        // Variations Summary
        variations: {
          items: vars.map((v: any) => ({
            code: v.code || '',
            description: v.description || '',
            amount: Number(v.amount || 0),
            status: v.is_credit ? 'credit' : 'addition',
            tenantName: v.tenants?.shop_name || ''
          })),
          total: vars.reduce((sum: number, v: any) => sum + Number(v.amount || 0), 0)
        },

        // Variation Sheets (Detailed)
        variationSheets: vars.map((v: any) => ({
          code: v.code || '',
          description: v.description || '',
          amount: Number(v.amount || 0),
          isCredit: !!v.is_credit,
          lineItems: (v.variation_line_items || []).map((li: any) => ({
            line_number: li.line_number || 0,
            description: li.description || '',
            quantity: Number(li.quantity || 0),
            rate: Number(li.rate || 0),
            amount: Number(li.amount || 0),
            comments: li.comments || ''
          }))
        })),

        // Project Health Metrics
        projectHealth: {
          totalOriginalBudget: grandTotals.originalBudget,
          totalAnticipatedFinal: grandTotals.anticipatedFinal,
          totalCurrentVariance: grandTotals.currentVariance,
          totalOriginalVariance: grandTotals.originalVariance,
          categoryCount: cats.length,
          categoriesOverBudget: categoryTotals.filter(c => c.anticipatedFinal > c.originalBudget).length,
          categoriesUnderBudget: categoryTotals.filter(c => c.anticipatedFinal < c.originalBudget).length,
          categoriesOnTrack: categoryTotals.filter(c => c.anticipatedFinal === c.originalBudget).length,
          variationsCount: vars.length,
          variationsTotal: vars.reduce((sum: number, v: any) => sum + Number(v.amount || 0), 0)
        },

        // Contractors
        contractors: [
          { role: 'Electrical', name: report.electrical_contractor, icon: 'E', accentColor: '#2563eb' },
          { role: 'CCTV & Access', name: report.cctv_contractor, icon: 'C', accentColor: '#7c3aed' },
          { role: 'Earthing', name: report.earthing_contractor, icon: 'L', accentColor: '#16a34a' },
          { role: 'Standby Plants', name: report.standby_plants_contractor, icon: 'G', accentColor: '#ea580c' },
        ]
      };

      // 3. Generate PDF (Unified Engine)
      // The engine will automatically capture charts from the DOM if present
      const result = await generatePDF('cost-report', {
        data: reportData
      }, {
        projectName: report.project_name || "Project",
        projectNumber: report.project_number,
        filename: generateStandardizedPDFFilename({
          projectNumber: report.project_number,
          reportType: 'CostReport',
          revision: report.revision,
          reportNumber: report.report_number
        })
      });

      if (result.success && result.blob) {
        // 4. Upload & Persist
        const storageFileName = generateStorageFilename({
          projectNumber: report.project_number || report.project_id?.slice(0, 8),
          reportType: "CostReport",
          revision: report.revision || "A",
          reportNumber: report.report_number,
        });
        const storagePath = `cost-reports/${report.project_id}/${storageFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("cost-report-pdfs")
          .upload(storagePath, result.blob, { contentType: 'application/pdf', upsert: false });

        if (uploadError) throw uploadError;

        // Create DB record
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("cost_report_pdfs").insert({
          cost_report_id: report.id,
          project_id: report.project_id,
          file_name: storageFileName,
          file_path: storagePath,
          file_size: result.blob.size,
          revision: report.revision || "A",
          generated_by: user?.id,
          notes: "Generated via Unified Engine (pdfmake)",
        });

        toast({
          title: "Success",
          description: "Cost Report generated and saved successfully.",
        });
        onReportGenerated?.();

        // 5. Download
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error(result.error || "Generation failed");
      }

    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Could not generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Export Report
        </>
      )}
    </Button>
  );
};
