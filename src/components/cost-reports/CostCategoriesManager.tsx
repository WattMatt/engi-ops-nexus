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
}

export const CostCategoriesManager = ({ reportId }: CostCategoriesManagerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: categories = [], refetch } = useQuery({
    queryKey: ["cost-categories", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("cost_report_id", reportId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
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
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} onUpdate={refetch} />
          ))}
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
