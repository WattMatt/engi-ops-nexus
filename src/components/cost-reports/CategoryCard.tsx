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

  // Calculate category totals from line items
  const categoryOriginalBudget = lineItems.reduce(
    (sum, item) => sum + Number(item.original_budget),
    0
  );
  const categoryPreviousReport = lineItems.reduce(
    (sum, item) => sum + Number(item.previous_report),
    0
  );
  const categoryAnticipatedFinal = lineItems.reduce(
    (sum, item) => sum + Number(item.anticipated_final),
    0
  );

  const categoryVarianceCurrent = categoryAnticipatedFinal - categoryPreviousReport;
  const categoryVarianceOriginal = categoryAnticipatedFinal - categoryOriginalBudget;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="w-full">
              {/* Category Header Row */}
              <CollapsibleTrigger asChild>
                <div className="grid grid-cols-12 gap-2 bg-cyan-400 text-black font-bold text-sm py-3 px-4 cursor-pointer hover:bg-cyan-500 transition-colors">
                  <div className="col-span-1 flex items-center gap-2">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {category.code}
                  </div>
                  <div className="col-span-3">{category.description}</div>
                  <div className="col-span-2 text-right">
                    R{categoryOriginalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-2 text-right">
                    R{categoryPreviousReport.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-2 text-right">
                    R{categoryAnticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right">
                    {categoryVarianceCurrent < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceCurrent).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-1 text-right">
                    {categoryVarianceOriginal < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceOriginal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Line Items */}
              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30">
                  <p className="mb-4">No line items added yet</p>
                  <Button size="sm" onClick={() => setAddLineItemOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line Item
                  </Button>
                </div>
              ) : (
                <div>
                  {lineItems.map((item, index) => (
                    <LineItemRow 
                      key={item.id} 
                      item={item} 
                      onUpdate={refetchLineItems}
                      isEven={index % 2 === 0}
                    />
                  ))}
                </div>
              )}

              {/* Add Line Item Button */}
              <div className="px-4 py-2 border-t bg-muted/20">
                <Button size="sm" variant="outline" onClick={() => setAddLineItemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line Item
                </Button>
              </div>
            </div>
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
