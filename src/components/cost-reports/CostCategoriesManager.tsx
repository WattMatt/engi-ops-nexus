import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddCategoryDialog } from "./AddCategoryDialog";
import { CategoryCard } from "./CategoryCard";
import { calculateCategoryTotals, calculateGrandTotals } from "@/utils/costReportCalculations";

interface CostCategoriesManagerProps {
  reportId: string;
  projectId: string;
}

export const CostCategoriesManager = ({ reportId, projectId }: CostCategoriesManagerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["cost-categories", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", reportId)
        .order("code");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ["all-line-items", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_line_items")
        .select("*, cost_categories!inner(cost_report_id)")
        .eq("cost_categories.cost_report_id", reportId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: variations = [] } = useQuery({
    queryKey: ["cost-variations-summary", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select("*")
        .eq("cost_report_id", reportId);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals using shared utility and sort alphabetically
  const categoryTotals = calculateCategoryTotals(categories, lineItems, variations)
    .sort((a, b) => a.code.localeCompare(b.code));
  const grandTotals = calculateGrandTotals(categoryTotals);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">CODE</th>
                  <th className="text-left py-2 px-3 font-medium">CATEGORY</th>
                  <th className="text-right py-2 px-3 font-medium">ORIGINAL BUDGET</th>
                  <th className="text-right py-2 px-3 font-medium">PREVIOUS REPORT</th>
                  <th className="text-right py-2 px-3 font-medium">ANTICIPATED FINAL</th>
                  <th className="text-right py-2 px-3 font-medium">% OF TOTAL</th>
                  <th className="text-right py-2 px-3 font-medium">CURRENT VARIANCE</th>
                  <th className="text-right py-2 px-3 font-medium">ORIGINAL VARIANCE</th>
                </tr>
              </thead>
              <tbody>
                {categoryTotals.map((cat) => (
                  <tr key={cat.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{cat.code}</td>
                    <td className="py-2 px-3">{cat.description}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      R{cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      R{cat.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      R{cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {cat.percentageOfTotal.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      R{cat.currentVariance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      R{cat.originalVariance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-muted/50">
                  <td className="py-3 px-3" colSpan={2}>GRAND TOTAL</td>
                  <td className="py-3 px-3 text-right font-mono">
                    R{grandTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    R{grandTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    R{grandTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono">
                    R{grandTotals.currentVariance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    R{grandTotals.originalVariance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categories & Line Items</h2>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No categories added yet</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryCard 
              key={category.id} 
              category={{ ...category, project_id: projectId }} 
              onUpdate={refetch} 
            />
          ))}
        </div>
      )}
      
      <AddCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        reportId={reportId}
        onSuccess={refetch}
      />
    </div>
  );
};
