import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ElectricalBudgetReportPreview } from "./ElectricalBudgetReportPreview";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildElectricalBudgetPdf, type ElectricalBudgetPdfData, type BudgetSection } from "@/utils/svg-pdf/electricalBudgetPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface ElectricalBudgetExportPDFButtonProps {
  budgetId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  onReportSaved?: () => void;
}

export const ElectricalBudgetExportPDFButton = ({
  budgetId,
  variant = "default",
  size = "default",
  onReportSaved,
}: ElectricalBudgetExportPDFButtonProps) => {
  const [previewReport, setPreviewReport] = useState<any>(null);
  const { isGenerating, progress, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  // Fetch budget data
  const { data: budget } = useQuery({
    queryKey: ["electrical-budget-for-pdf", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("id", budgetId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: ["project-for-budget-pdf", budget?.project_id],
    queryFn: async () => {
      if (!budget?.project_id) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("name, project_number")
        .eq("id", budget.project_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!budget?.project_id,
  });

  // Fetch sections with items
  const { data: sections = [] } = useQuery({
    queryKey: ["budget-sections-for-pdf", budgetId],
    queryFn: async () => {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("budget_sections")
        .select("*")
        .eq("budget_id", budgetId)
        .order("display_order");

      if (sectionsError) throw sectionsError;
      if (!sectionsData || sectionsData.length === 0) return [];

      const sectionIds = sectionsData.map((s) => s.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from("budget_line_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order");

      if (itemsError) throw itemsError;

      return sectionsData.map((section) => ({
        ...section,
        items: (itemsData || []).filter((item) => item.section_id === section.id),
      }));
    },
    enabled: !!budgetId,
  });

  const handleExport = async () => {
    if (!budget) return;

    const buildFn = async () => {
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Electrical Budget",
        reportSubtitle: `Budget #${budget.budget_number}`,
        projectName: project?.name || "Project",
        projectNumber: project?.project_number,
        revision: budget.revision,
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const pdfSections: BudgetSection[] = sections.map((s: any) => {
        const items = (s.items || []).map((item: any) => ({
          item_number: item.item_number,
          description: item.description,
          area: item.area,
          base_rate: item.base_rate,
          ti_rate: item.ti_rate,
          total: item.total || 0,
          is_tenant_item: item.is_tenant_item,
          shop_number: item.shop_number,
        }));
        return {
          section_code: s.section_code,
          section_name: s.section_name,
          items,
          total: items.reduce((sum: number, i: any) => sum + (i.total || 0), 0),
        };
      });

      const grandTotal = pdfSections.reduce((s, sec) => s + sec.total, 0);
      const tenantTotal = pdfSections.reduce((s, sec) => 
        s + sec.items.filter((i: any) => i.is_tenant_item).reduce((t: number, i: any) => t + (i.total || 0), 0), 0);

      const pdfData: ElectricalBudgetPdfData = {
        coverData,
        budgetName: `Budget ${budget.budget_number}`,
        projectName: project?.name || "Project",
        sections: pdfSections,
        grandTotal,
        tenantTotal,
        landlordTotal: grandTotal - tenantTotal,
      };

      return buildElectricalBudgetPdf(pdfData);
    };

    await generateAndPersist(
      buildFn,
      {
        storageBucket: "budget-reports",
        dbTable: "electrical_budget_reports",
        foreignKeyColumn: "budget_id",
        foreignKeyValue: budgetId,
        projectId: budget.project_id,
        reportName: `Budget_${budget.budget_number}`,
      },
      () => onReportSaved?.(),
    );
  };

  const progressLabel = progress === 'building' ? 'Preparing data...'
    : progress === 'converting' ? 'Generating PDF...'
    : progress === 'uploading' ? 'Uploading...'
    : progress === 'saving' ? 'Saving report...'
    : null;

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={isGenerating || !budget}
        variant={variant}
        size={size}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {progressLabel || "Generating..."}
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </>
        )}
      </Button>

      <ElectricalBudgetReportPreview
        report={previewReport}
        open={!!previewReport}
        onOpenChange={(open) => !open && setPreviewReport(null)}
        storageBucket="budget-reports"
      />
    </>
  );
};
