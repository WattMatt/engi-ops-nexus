import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddCategoryDialog } from "./AddCategoryDialog";
import { CategoryCard } from "./CategoryCard";

interface CostCategoriesManagerProps {
  reportId: string;
  projectId: string;
}

export const CostCategoriesManager = ({ reportId, projectId }: CostCategoriesManagerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // Calculate totals for each category
  const categoryTotals = categories.map(category => {
    const items = lineItems.filter(item => item.category_id === category.id);
    const originalBudget = items.reduce((sum, item) => sum + Number(item.original_budget || 0), 0);
    const previousReport = items.reduce((sum, item) => sum + Number(item.previous_report || 0), 0);
    const anticipatedFinal = items.reduce((sum, item) => sum + Number(item.anticipated_final || 0), 0);
    
    return {
      ...category,
      originalBudget,
      previousReport,
      anticipatedFinal,
      currentVariance: anticipatedFinal - previousReport,
      originalVariance: anticipatedFinal - originalBudget
    };
  });

  // Calculate grand totals
  const grandTotals = categoryTotals.reduce((acc, cat) => ({
    originalBudget: acc.originalBudget + cat.originalBudget,
    previousReport: acc.previousReport + cat.previousReport,
    anticipatedFinal: acc.anticipatedFinal + cat.anticipatedFinal,
    currentVariance: acc.currentVariance + cat.currentVariance,
    originalVariance: acc.originalVariance + cat.originalVariance
  }), {
    originalBudget: 0,
    previousReport: 0,
    anticipatedFinal: 0,
    currentVariance: 0,
    originalVariance: 0
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Cost Categories</h3>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
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
          {/* Column Headers */}
          <div className="grid grid-cols-24 gap-2 text-xs font-semibold text-muted-foreground pb-2 px-4 border-b-2">
            <div className="col-span-2">CODE</div>
            <div className="col-span-5">DESCRIPTION</div>
            <div className="col-span-3 text-right">ORIGINAL BUDGET</div>
            <div className="col-span-3 text-right">PREVIOUS COST REPORT</div>
            <div className="col-span-3 text-right">ANTICIPATED FINAL COST</div>
            <div className="col-span-4 text-right">CURRENT (SAVING)/ EXTRA</div>
            <div className="col-span-4 text-right">(SAVING)/ EXTRA ORIGINAL BUDGET</div>
          </div>

          {categories.map((category) => (
            <CategoryCard 
              key={category.id} 
              category={{ ...category, project_id: projectId }} 
              onUpdate={refetch} 
            />
          ))}
          
          {/* Category Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Category Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryTotals.map((cat) => (
                  <div key={cat.id} className="grid grid-cols-24 gap-2 items-center text-sm py-2 border-b last:border-0">
                    <div className="col-span-2 font-medium">{cat.code}</div>
                    <div className="col-span-5 text-muted-foreground">{cat.description}</div>
                    <div className="col-span-3 text-right font-mono">
                      R{cat.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-3 text-right font-mono">
                      R{cat.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-3 text-right font-mono">
                      R{cat.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`col-span-4 text-right font-mono ${cat.currentVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{Math.abs(cat.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`col-span-4 text-right font-mono ${cat.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{Math.abs(cat.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
                
                {/* Grand Total */}
                <div className="grid grid-cols-24 gap-2 items-center text-sm font-bold py-3 border-t-2 border-primary/20 bg-muted/50 -mx-6 px-6">
                  <div className="col-span-7">GRAND TOTAL</div>
                  <div className="col-span-3 text-right font-mono">
                    R{grandTotals.originalBudget.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-3 text-right font-mono">
                    R{grandTotals.previousReport.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-3 text-right font-mono">
                    R{grandTotals.anticipatedFinal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`col-span-4 text-right font-mono ${grandTotals.currentVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R{Math.abs(grandTotals.currentVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`col-span-4 text-right font-mono ${grandTotals.originalVariance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R{Math.abs(grandTotals.originalVariance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AddCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        reportId={reportId}
        onSuccess={() => {
          refetch();
          setAddDialogOpen(false);
        }}
      />
    </div>
  );
};
