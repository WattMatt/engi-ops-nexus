import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddLineItemDialog } from "./AddLineItemDialog";
import { AddVariationDialog } from "./AddVariationDialog";
import { LineItemRow } from "./LineItemRow";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface CategoryCardProps {
  category: any;
  onUpdate: () => void;
}

export const CategoryCard = ({ category, onUpdate }: CategoryCardProps) => {
  const { toast } = useToast();
  const [addLineItemOpen, setAddLineItemOpen] = useState(false);
  const [addVariationOpen, setAddVariationOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Check if this is the Variations category
  const isVariationsCategory = category.description?.toUpperCase().includes("VARIATION");

  // Fetch variations if this is the Variations category
  const { data: variations = [], refetch: refetchVariations } = useQuery({
    queryKey: ["cost-variations-for-category", category.cost_report_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select(`
          *,
          tenants (
            shop_name,
            shop_number
          )
        `)
        .eq("cost_report_id", category.cost_report_id)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: isVariationsCategory,
  });

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
    enabled: !isVariationsCategory,
  });

  // Calculate category totals
  let categoryOriginalBudget = 0;
  let categoryPreviousReport = 0;
  let categoryAnticipatedFinal = 0;

  if (isVariationsCategory) {
    // For variations, sum amounts directly (already have correct signs)
    categoryAnticipatedFinal = variations.reduce(
      (sum, v) => sum + Number(v.amount || 0),
      0
    );
  } else {
    // For regular line items
    categoryOriginalBudget = lineItems.reduce(
      (sum, item) => sum + Number(item.original_budget),
      0
    );
    categoryPreviousReport = lineItems.reduce(
      (sum, item) => sum + Number(item.previous_report),
      0
    );
    categoryAnticipatedFinal = lineItems.reduce(
      (sum, item) => sum + Number(item.anticipated_final),
      0
    );
  }

  const categoryVarianceCurrent = categoryAnticipatedFinal - categoryPreviousReport;
  const categoryVarianceOriginal = categoryAnticipatedFinal - categoryOriginalBudget;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // First delete all line items
      const { error: lineItemsError } = await supabase
        .from("cost_line_items")
        .delete()
        .eq("category_id", category.id);

      if (lineItemsError) throw lineItemsError;

      // Then delete the category
      const { error: categoryError } = await supabase
        .from("cost_categories")
        .delete()
        .eq("id", category.id);

      if (categoryError) throw categoryError;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="w-full">
              {/* Category Header Row */}
              <div className="grid grid-cols-24 gap-2 bg-cyan-400 text-black font-bold text-sm py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 flex items-center gap-2 cursor-pointer">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {category.code}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-5 cursor-pointer">{category.description}</div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-3 text-right cursor-pointer">
                    R{categoryOriginalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-3 text-right cursor-pointer">
                    R{categoryPreviousReport.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-3 text-right cursor-pointer">
                    R{categoryAnticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-4 text-right cursor-pointer">
                    {categoryVarianceCurrent < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceCurrent).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-4 text-right cursor-pointer">
                    {categoryVarianceOriginal < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceOriginal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                
                {/* Action Buttons */}
                <div className="col-span-24 flex items-center gap-2 mt-2 pt-2 border-t border-black/10">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                    className="h-7 text-black hover:bg-black/10"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogOpen(true);
                    }}
                    className="h-7 text-black hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Line Items or Variations */}
              {isVariationsCategory ? (
                <>
                  {variations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30">
                      <p className="mb-4">No variations added yet</p>
                      <Button size="sm" onClick={() => setAddVariationOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Variation
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {variations.map((variation, index) => (
                        <div 
                          key={variation.id} 
                          className={`grid grid-cols-24 gap-2 text-sm py-2 px-4 border-b ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                          } hover:bg-muted/40 transition-colors group`}
                        >
                          <div className="col-span-2 font-medium">{variation.code}</div>
                          <div className="col-span-5">
                            {variation.description}
                            {variation.tenants && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {variation.tenants.shop_number} - {variation.tenants.shop_name}
                              </div>
                            )}
                          </div>
                          <div className="col-span-3 text-right">-</div>
                          <div className="col-span-3 text-right">-</div>
                          <div className="col-span-3 text-right font-medium">
                            {variation.is_credit ? "-" : "+"}R
                            {Number(variation.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-4 text-right">
                            {variation.is_credit ? "-" : "+"}R
                            {Number(variation.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-4 text-right">
                            {variation.is_credit ? "-" : "+"}R
                            {Number(variation.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2 border-t bg-muted/20">
                    <Button size="sm" variant="outline" onClick={() => setAddVariationOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variation
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                  <div className="px-4 py-2 border-t bg-muted/20">
                    <Button size="sm" variant="outline" onClick={() => setAddLineItemOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line Item
                    </Button>
                  </div>
                </>
              )}
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

      <AddVariationDialog
        open={addVariationOpen}
        onOpenChange={setAddVariationOpen}
        reportId={category.cost_report_id}
        projectId={category.project_id}
        onSuccess={() => {
          refetchVariations();
          onUpdate();
          setAddVariationOpen(false);
        }}
      />

      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={category}
        onSuccess={() => {
          onUpdate();
          setEditDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category "{category.code} - {category.description}"?
              This will also delete all line items within this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
};
