import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddLineItemDialog } from "./AddLineItemDialog";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);

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
              <div className="grid grid-cols-12 gap-2 bg-cyan-400 text-black font-bold text-sm py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="col-span-1 flex items-center gap-2 cursor-pointer">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {category.code}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 cursor-pointer">{category.description}</div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 text-right cursor-pointer">
                    R{categoryOriginalBudget.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 text-right cursor-pointer">
                    R{categoryPreviousReport.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 text-right cursor-pointer">
                    R{categoryAnticipatedFinal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-2 text-right cursor-pointer">
                    {categoryVarianceCurrent < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceCurrent).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleTrigger asChild>
                  <div className="col-span-1 text-right cursor-pointer">
                    {categoryVarianceOriginal < 0 ? "-" : "+"}R
                    {Math.abs(categoryVarianceOriginal).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </div>
                </CollapsibleTrigger>
                
                {/* Action Buttons */}
                <div className="col-span-12 flex items-center gap-2 mt-2 pt-2 border-t border-black/10">
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
