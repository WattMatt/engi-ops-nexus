import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddSectionDialog } from "./AddSectionDialog";
import { BudgetSectionCard } from "./BudgetSectionCard";

interface BudgetSectionsManagerProps {
  budgetId: string;
}

export const BudgetSectionsManager = ({ budgetId }: BudgetSectionsManagerProps) => {
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["budget-sections", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_sections")
        .select("*")
        .eq("budget_id", budgetId)
        .order("display_order");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ["budget-line-items", budgetId],
    queryFn: async () => {
      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length === 0) return [];

      const { data, error } = await supabase
        .from("budget_line_items")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order");
      
      if (error) throw error;
      return data || [];
    },
    enabled: sections.length > 0,
  });

  const totalBudget = lineItems.reduce((sum, item) => sum + Number(item.total), 0);

  if (isLoading) {
    return <div>Loading sections...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Budget Breakdown</CardTitle>
            <Button onClick={() => setAddSectionOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg mb-4">
            <span className="text-lg font-semibold">Total Budget</span>
            <span className="text-2xl font-bold">
              R {totalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No sections added yet</p>
            <Button onClick={() => setAddSectionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <BudgetSectionCard
              key={section.id}
              section={section}
              lineItems={lineItems.filter((item) => item.section_id === section.id)}
            />
          ))}
        </div>
      )}

      <AddSectionDialog
        open={addSectionOpen}
        onOpenChange={setAddSectionOpen}
        budgetId={budgetId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["budget-sections", budgetId] });
          setAddSectionOpen(false);
        }}
      />
    </div>
  );
};
