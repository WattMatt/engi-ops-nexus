import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar, MoreVertical, Trash2, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { CreateBudgetDialog } from "@/components/budgets/CreateBudgetDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const ElectricalBudgets = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      // First delete all line items for sections in this budget
      const { data: sections } = await supabase
        .from("budget_sections")
        .select("id")
        .eq("budget_id", budgetId);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        await supabase
          .from("budget_line_items")
          .delete()
          .in("section_id", sectionIds);
      }

      // Delete sections
      await supabase
        .from("budget_sections")
        .delete()
        .eq("budget_id", budgetId);

      // Delete reference drawings
      await supabase
        .from("budget_reference_drawings")
        .delete()
        .eq("budget_id", budgetId);

      // Delete budget reports
      await supabase
        .from("electrical_budget_reports")
        .delete()
        .eq("budget_id", budgetId);

      // Finally delete the budget
      const { error } = await supabase
        .from("electrical_budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Budget deleted",
        description: "The budget and all related data have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["electrical-budgets", projectId] });
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBudgetClick = (budgetId: string) => {
    navigate(`/dashboard/budgets/electrical/${budgetId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, budget: { id: string; budget_number: string; revision: string }) => {
    e.stopPropagation();
    setBudgetToDelete({ id: budget.id, name: `${budget.budget_number} - ${budget.revision}` });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (budgetToDelete) {
      deleteMutation.mutate(budgetToDelete.id);
    }
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
              className="cursor-pointer hover:shadow-lg transition-shadow group relative"
              onClick={() => handleBudgetClick(budget.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="truncate">Budget #{budget.budget_number}</span>
                    </CardTitle>
                    <span className="text-sm font-normal text-muted-foreground">
                      {budget.revision}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleBudgetClick(budget.id)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Budget
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setCreateDialogOpen(true);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Create Revision
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => handleDeleteClick(e, budget)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Budget
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(budget.budget_date), "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budget.prepared_for_company && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Client:</span> {budget.prepared_for_company}
                  </p>
                )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{budgetToDelete?.name}</strong>? 
              This will permanently remove the budget along with all its sections, line items, 
              reference drawings, and generated reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ElectricalBudgets;
