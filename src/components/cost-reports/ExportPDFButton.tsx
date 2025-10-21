import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateCostReportPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ExportPDFButtonProps {
  report: any;
}

export const ExportPDFButton = ({ report }: ExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["cost-categories", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", report.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allLineItems = [] } = useQuery({
    queryKey: ["all-line-items", report.id],
    queryFn: async () => {
      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length === 0) return [];

      const { data, error } = await supabase
        .from("cost_line_items")
        .select("*")
        .in("category_id", categoryIds)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: categories.length > 0,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ["cost-variations", report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select(`
          *,
          tenants (
            shop_name,
            shop_number
          )
        `)
        .eq("cost_report_id", report.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      // Group line items by category code
      const lineItemsByCategory: Record<string, any[]> = {};
      categories.forEach((cat) => {
        lineItemsByCategory[cat.code] = allLineItems.filter(
          (item) => item.category_id === cat.id
        );
      });

      generateCostReportPDF(report, categories, lineItemsByCategory, variations);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Export PDF"}
    </Button>
  );
};
