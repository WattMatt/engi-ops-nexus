import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  generateElectricalBudgetHtml, 
  type ElectricalBudgetPdfData 
} from "@/utils/pdf/electricalBudgetHtmlTemplate";

interface ElectricalBudgetExportPDFButtonProps {
  budgetId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ElectricalBudgetExportPDFButton = ({
  budgetId,
  variant = "default",
  size = "default",
}: ElectricalBudgetExportPDFButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

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

  // Fetch project separately
  const { data: project } = useQuery({
    queryKey: ["project-for-budget-pdf", budget?.project_id],
    queryFn: async () => {
      if (!budget?.project_id) return null;
      const { data, error } = await supabase
        .from("projects") as any
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
      
      const sectionIds = sectionsData.map(s => s.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from("budget_line_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order");
      
      if (itemsError) throw itemsError;
      
      return sectionsData.map(section => ({
        ...section,
        items: (itemsData || []).filter(item => item.section_id === section.id)
      }));
    },
    enabled: !!budgetId,
  });

  // Fetch reference drawings
  const { data: referenceDrawings = [] } = useQuery({
    queryKey: ["budget-drawings-for-pdf", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_reference_drawings")
        .select("id, file_name, drawing_number, revision, description")
        .eq("budget_id", budgetId)
        .order("created_at");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings-for-pdf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const handleExport = async () => {
    if (!budget) {
      toast({ title: "Error", description: "Budget data not loaded yet", variant: "destructive" });
      return;
    }

    setIsExporting(true);

    try {
      const pdfData: ElectricalBudgetPdfData = {
        budget: {
          id: budget.id,
          budget_number: budget.budget_number,
          revision: budget.revision,
          budget_date: budget.budget_date,
          notes: budget.notes,
          baseline_allowances: budget.baseline_allowances,
          exclusions: budget.exclusions,
          prepared_for_company: budget.prepared_for_company,
          prepared_for_contact: budget.prepared_for_contact,
          prepared_for_tel: budget.prepared_for_tel,
          prepared_by_contact: budget.prepared_by_contact,
          client_logo_url: budget.client_logo_url,
          consultant_logo_url: budget.consultant_logo_url,
        },
        project: project ? {
          name: project.name || '',
          project_number: project.project_number || '',
          address: '',
        } : null,
        sections: sections.map(section => ({
          id: section.id,
          section_code: section.section_code,
          section_name: section.section_name,
          display_order: section.display_order || 0,
          items: section.items.map((item: any) => ({
            id: item.id,
            item_number: item.item_number,
            description: item.description,
            area: item.area,
            area_unit: item.area_unit,
            base_rate: item.base_rate,
            ti_rate: item.ti_rate,
            total: item.total,
            display_order: item.display_order || 0,
          })),
        })),
        referenceDrawings,
        companySettings: companySettings ? {
          company_name: companySettings.company_name,
          company_logo_url: companySettings.company_logo_url,
          contact_name: companySettings.client_name,
          contact_email: null,
          contact_phone: companySettings.client_phone,
          company_address: companySettings.client_address_line1,
        } : null,
      };

      const html = generateElectricalBudgetHtml(pdfData);
      const projectName = (project as any)?.name || 'Budget';
      const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '-')}_${budget.budget_number}_Rev${budget.revision}.pdf`;

      const { data: result, error } = await supabase.functions.invoke(
        "generate-electrical-budget-pdf",
        { body: { budgetId, html, filename } }
      );

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || "PDF generation failed");

      if (result.pdf) {
        const byteCharacters = atob(result.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({ title: "Success", description: "Budget PDF exported successfully" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting || !budget} variant={variant} size={size}>
      {isExporting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : (<><FileDown className="h-4 w-4 mr-2" />Export PDF</>)}
    </Button>
  );
};
