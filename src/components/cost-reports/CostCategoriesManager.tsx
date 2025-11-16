import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Info, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
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

  const handleCopyPlaceholder = (placeholder: string, fieldName: string) => {
    navigator.clipboard.writeText(`{${placeholder}}`);
    setCopiedField(fieldName);
    toast({
      description: "Placeholder copied to clipboard",
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <TooltipProvider>
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
            <div className="col-span-2 flex items-center gap-1">
              CODE
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Code", "code")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Code}`}</p>
                    {copiedField === "code" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-5 flex items-center gap-1">
              DESCRIPTION
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Description", "description")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Description}`}</p>
                    {copiedField === "description" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end gap-1">
              ORIGINAL BUDGET
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Original_Budget", "original_budget")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Original_Budget}`}</p>
                    {copiedField === "original_budget" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end gap-1">
              PREVIOUS COST REPORT
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Previous_Report", "previous_report")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Previous_Report}`}</p>
                    {copiedField === "previous_report" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-3 text-right flex items-center justify-end gap-1">
              ANTICIPATED FINAL COST
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Anticipated_Final", "anticipated_final")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Anticipated_Final}`}</p>
                    {copiedField === "anticipated_final" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-4 text-right flex items-center justify-end gap-1">
              CURRENT (SAVING)/ EXTRA
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Current_Variance", "current_variance")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Current_Variance}`}</p>
                    {copiedField === "current_variance" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="col-span-4 text-right flex items-center justify-end gap-1">
              (SAVING)/ EXTRA ORIGINAL BUDGET
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="h-3 w-3 cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <button
                    onClick={() => handleCopyPlaceholder("Category_Original_Variance", "original_variance")}
                    className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded transition-colors"
                  >
                    <p className="font-mono text-xs">{`{Category_Original_Variance}`}</p>
                    {copiedField === "original_variance" ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </TooltipContent>
              </Tooltip>
            </div>
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
    </TooltipProvider>
  );
};
