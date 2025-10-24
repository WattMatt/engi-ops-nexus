import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { CreateBudgetDialog } from "@/components/budgets/CreateBudgetDialog";

const ElectricalBudgets = () => {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const projectId = localStorage.getItem("selectedProjectId");

  const { data: budgets = [], isLoading, refetch } = useQuery({
    queryKey: ["electrical-budgets", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("project_id", projectId)
        .order("budget_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleBudgetClick = (budgetId: string) => {
    navigate(`/dashboard/budgets/electrical/${budgetId}`);
  };

  if (isLoading) {
    return <div>Loading budgets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Electrical Budgets</h1>
          <p className="text-muted-foreground mt-1">
            Manage project electrical budget estimates
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No budgets yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first electrical budget estimate
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Card
              key={budget.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleBudgetClick(budget.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Budget #{budget.budget_number}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {budget.revision}
                  </span>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(budget.budget_date), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budget.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {budget.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateBudgetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId || ""}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
};

export default ElectricalBudgets;
