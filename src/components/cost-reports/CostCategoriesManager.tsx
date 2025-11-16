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
import { generateExecutiveSummaryTableData, formatCurrency, formatVariance } from "@/utils/executiveSummaryTable";

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

  // Generate table data using shared utility
  const tableData = generateExecutiveSummaryTableData(categoryTotals, grandTotals);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card id="executive-summary-table">
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {tableData.headers.map((header, index) => (
                    <th
                      key={index}
                      className={`py-2 px-3 font-medium ${
                        index < 2 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.categoryRows.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{row.code}</td>
                    <td className="py-2 px-3">{row.description}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatCurrency(row.originalBudget)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatCurrency(row.previousReport)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatCurrency(row.anticipatedFinal)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {row.percentOfTotal}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatVariance(row.currentVariance)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatVariance(row.originalVariance)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-muted/50">
                  <td className="py-3 px-3" colSpan={2}>{tableData.grandTotalRow.description}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatCurrency(tableData.grandTotalRow.originalBudget)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatCurrency(tableData.grandTotalRow.previousReport)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatCurrency(tableData.grandTotalRow.anticipatedFinal)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">{tableData.grandTotalRow.percentOfTotal}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatVariance(tableData.grandTotalRow.currentVariance)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {formatVariance(tableData.grandTotalRow.originalVariance)}
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
