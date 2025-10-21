import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddLineItemDialog } from "./AddLineItemDialog";
import { LineItemRow } from "./LineItemRow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CategoryCardProps {
  category: any;
  onUpdate: () => void;
}

export const CategoryCard = ({ category, onUpdate }: CategoryCardProps) => {
  const [addLineItemOpen, setAddLineItemOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const { data: lineItems = [], refetch: refetchLineItems } = useQuery({
    queryKey: ["cost-line-items", category.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_line_items")
        .select("*")
        .eq("category_id", category.id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const totalOriginalBudget = lineItems.reduce(
    (sum, item) => sum + Number(item.original_budget),
    0
  );
  const totalAnticipatedFinal = lineItems.reduce(
    (sum, item) => sum + Number(item.anticipated_final),
    0
  );
  const variance = totalAnticipatedFinal - totalOriginalBudget;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer flex-1">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <CardTitle className="text-lg">
                  {category.code} - {category.description}
                </CardTitle>
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-bold">
                  R{totalAnticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-xs ${
                    variance < 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {variance < 0 ? "Saving" : "Extra"}: R
                  {Math.abs(variance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button size="sm" onClick={() => setAddLineItemOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No line items added yet</p>
                <Button size="sm" onClick={() => setAddLineItemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line Item
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                  <div>Code</div>
                  <div>Description</div>
                  <div className="text-right">Original Budget</div>
                  <div className="text-right">Previous Report</div>
                  <div className="text-right">Anticipated Final</div>
                  <div className="text-right">Variance</div>
                </div>
                {lineItems.map((item) => (
                  <LineItemRow key={item.id} item={item} onUpdate={refetchLineItems} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <AddLineItemDialog
        open={addLineItemOpen}
        onOpenChange={setAddLineItemOpen}
        categoryId={category.id}
        onSuccess={() => {
          refetchLineItems();
          setAddLineItemOpen(false);
        }}
      />
    </Collapsible>
  );
};
