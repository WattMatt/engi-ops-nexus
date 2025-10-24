import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BudgetOverview } from "@/components/budgets/BudgetOverview";
import { BudgetSectionsManager } from "@/components/budgets/BudgetSectionsManager";

const ElectricalBudgetDetail = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();

  const { data: budget, isLoading } = useQuery({
    queryKey: ["electrical-budget", budgetId],
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

  if (isLoading) {
    return <div>Loading budget...</div>;
  }

  if (!budget) {
    return <div>Budget not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/budgets/electrical")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Budget #{budget.budget_number} - {budget.revision}
          </h1>
          <p className="text-muted-foreground">
            {new Date(budget.budget_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <BudgetOverview budget={budget} />
      <BudgetSectionsManager budgetId={budgetId!} />
    </div>
  );
};

export default ElectricalBudgetDetail;
