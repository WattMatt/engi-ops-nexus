import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
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
} from "@/utils/svg-pdf/costReportPdfBuilder";
import { generateStandardizedPDFFilename, generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { format } from "date-fns";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface SvgPdfExportButtonProps {
  report: any;
  onReportGenerated?: () => void;
}

export const SvgPdfExportButton = ({ report, onReportGenerated }: SvgPdfExportButtonProps) => {
  const { toast } = useToast();
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    const buildFn = async () => {
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

      const companyData = await fetchCompanyData();

      const cats = categoriesData || [];
      const vars = variationsData || [];
      const allLineItems = cats.flatMap((c: any) => c.cost_line_items || []);

      // Calculate Totals
      const categoryTotals = calculateCategoryTotals(cats, allLineItems, vars);
      const grandTotals = calculateGrandTotals(categoryTotals);

      // 2. Build SVG pages
      const pages: SVGSVGElement[] = [];

      // Cover page
      pages.push(buildCoverPageSvg({
        companyName: companyData.companyName || 'Company',
        projectName: report.project_name || 'Project',
        reportNumber: report.report_number || 1,
        revision: report.revision || 'A',
        date: format(new Date(), 'dd MMMM yyyy'),
        projectNumber: report.project_number,
        companyLogoBase64: companyData.companyLogoBase64,
        companyAddress: companyData.companyAddress,
        companyPhone: companyData.companyPhone,
        contactOrganization: companyData.contactOrganization,
        contactPhone: companyData.contactPhone,
      }));

      // Executive Summary
      pages.push(buildExecutiveSummarySvg({
        rows: categoryTotals.map(cat => ({
          code: cat.code,
          description: cat.description,
          originalBudget: cat.originalBudget,
          anticipatedFinal: cat.anticipatedFinal,
          currentVariance: cat.currentVariance,
        })),
        grandTotal: {
          code: '',
          description: 'GRAND TOTAL',
          originalBudget: grandTotals.originalBudget,
          anticipatedFinal: grandTotals.anticipatedFinal,
          currentVariance: grandTotals.currentVariance,
        },
      }));

      // Category Details
      const categoryDetails: CategoryDetailData[] = categoryTotals.map(cat => ({
        code: cat.code,
        description: cat.description,
        lineItems: (cats.find((c: any) => c.id === cat.id)?.cost_line_items || []).map((item: any) => ({
          description: item.description,
          original_budget: Number(item.original_budget || 0),
          previous_report: Number(item.previous_report || 0),
          anticipated_final: Number(item.anticipated_final || 0),
        })),
        subtotals: {
          originalBudget: cat.originalBudget,
          previousReport: cat.previousReport,
          anticipatedFinal: cat.anticipatedFinal,
          variance: cat.originalVariance,
        },
      }));
      pages.push(...buildCategoryDetailsSvg(categoryDetails));

      // Variations
      if (vars.length > 0) {
        const variationItems: VariationItem[] = vars.map((v: any) => ({
          code: v.code || '',
          description: v.description || '',
          amount: Number(v.amount || 0),
          status: v.is_credit ? 'credit' : 'addition',
          tenantName: v.tenants?.shop_name || '',
        }));
        pages.push(...buildVariationsSvg({
          items: variationItems,
          totalAmount: vars.reduce((sum: number, v: any) => sum + Number(v.amount || 0), 0),
        }));

        // Variation Sheets
        const sheets: VariationSheetData[] = vars.map((v: any) => ({
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
            comments: li.comments || '',
          })),
        }));
        pages.push(...buildVariationSheetsSvg(sheets));
      }

      // Budget Distribution Chart
      if (categoryTotals.length > 0) {
        pages.push(buildBudgetDistributionSvg({
          categories: categoryTotals.map(cat => ({
            code: cat.code,
            description: cat.description,
            amount: cat.anticipatedFinal,
          })),
          totalBudget: grandTotals.anticipatedFinal,
        }));
      }

      // Variance Comparison
      if (categoryTotals.length > 0) {
        pages.push(buildVarianceComparisonSvg({
          categories: categoryTotals.map(cat => ({
            code: cat.code,
            description: cat.description,
            originalBudget: cat.originalBudget,
            anticipatedFinal: cat.anticipatedFinal,
          })),
        }));
      }

      // Project Health
      pages.push(buildProjectHealthSvg({
        totalOriginalBudget: grandTotals.originalBudget,
        totalAnticipatedFinal: grandTotals.anticipatedFinal,
        totalCurrentVariance: grandTotals.currentVariance,
        totalOriginalVariance: grandTotals.originalVariance,
        categoryCount: cats.length,
        categoriesOverBudget: categoryTotals.filter(c => c.anticipatedFinal > c.originalBudget).length,
        categoriesUnderBudget: categoryTotals.filter(c => c.anticipatedFinal < c.originalBudget).length,
        categoriesOnTrack: categoryTotals.filter(c => c.anticipatedFinal === c.originalBudget).length,
        variationsCount: vars.length,
        variationsTotal: vars.reduce((sum: number, v: any) => sum + Number(v.amount || 0), 0),
      }));

      // Notes
      if (report.notes) {
        pages.push(...buildNotesPageSvg({ notes: report.notes }));
      }

      // Contractors
      const contractors = [
        { role: 'Electrical', name: report.electrical_contractor, icon: 'E', accentColor: '#2563eb' },
        { role: 'CCTV & Access', name: report.cctv_contractor, icon: 'C', accentColor: '#7c3aed' },
        { role: 'Earthing', name: report.earthing_contractor, icon: 'L', accentColor: '#16a34a' },
        { role: 'Standby Plants', name: report.standby_plants_contractor, icon: 'G', accentColor: '#ea580c' },
      ].filter(c => c.name);
      if (contractors.length > 0) {
        pages.push(buildContractorSummarySvg({ contractors }));
      }

      // TOC (insert at position 1)
      const tocEntries = [
        { label: 'Executive Summary', pageNumber: 3 },
        { label: 'Category Details', pageNumber: 4 },
      ];
      let pn = 4 + categoryDetails.length;
      if (vars.length > 0) {
        tocEntries.push({ label: 'Variations', pageNumber: pn });
        pn += 1;
        tocEntries.push({ label: 'Variation Sheets', pageNumber: pn, indent: true } as any);
        pn += vars.length;
      }
      if (categoryTotals.length > 0) {
        tocEntries.push({ label: 'Budget Distribution', pageNumber: pn });
        pn++;
        tocEntries.push({ label: 'Variance Comparison', pageNumber: pn });
        pn++;
      }
      tocEntries.push({ label: 'Project Health', pageNumber: pn });
      pn++;
      if (report.notes) {
        tocEntries.push({ label: 'Notes & Assumptions', pageNumber: pn });
        pn++;
      }
      if (contractors.length > 0) {
        tocEntries.push({ label: 'Contractor Summary', pageNumber: pn });
      }
      const tocPage = buildTableOfContentsSvg(tocEntries);
      pages.splice(1, 0, tocPage);

      // Apply footers
      applyPageFooters(pages);

      return pages;
    };

    await generateAndPersist(buildFn, {
      storageBucket: "cost-report-pdfs",
      dbTable: "cost_report_pdfs",
      foreignKeyColumn: "cost_report_id",
      foreignKeyValue: report.id,
      projectId: report.project_id,
      revision: report.revision || "A",
      reportName: generateStandardizedPDFFilename({
        projectNumber: report.project_number,
        reportType: 'CostReport',
        revision: report.revision,
        reportNumber: report.report_number,
      }),
    }, () => {
      onReportGenerated?.();
    });
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
