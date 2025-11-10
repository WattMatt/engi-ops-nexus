import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Edit, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
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
import { EditVariationDialog } from "./EditVariationDialog";

interface VariationSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variationId: string;
  costReportId: string;
  projectId: string;
  onSuccess: () => void;
}

interface LineItem {
  id?: string;
  line_number: number;
  description: string;
  comments: string;
  quantity: string;
  rate: string;
  amount: number;
}

export const VariationSheetDialog = ({
  open,
  onOpenChange,
  variationId,
  costReportId,
  projectId,
  onSuccess,
}: VariationSheetDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { line_number: 1, description: "", comments: "", quantity: "0", rate: "0", amount: 0 },
  ]);

  const { data: variation } = useQuery({
    queryKey: ["variation-detail", variationId],
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
        .eq("id", variationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!variationId && open,
  });

  const { data: costReport } = useQuery({
    queryKey: ["cost-report-basic", costReportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_reports")
        .select("project_name, report_date")
        .eq("id", costReportId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!costReportId && open,
  });

  const { data: existingLineItems, refetch: refetchLineItems } = useQuery({
    queryKey: ["variation-line-items", variationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("variation_line_items")
        .select("*")
        .eq("variation_id", variationId)
        .order("line_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!variationId && open,
  });

  // Load existing line items when they're fetched
  useEffect(() => {
    if (existingLineItems && existingLineItems.length > 0) {
      setLineItems(
        existingLineItems.map((item) => ({
          id: item.id,
          line_number: item.line_number,
          description: item.description,
          comments: item.comments || "",
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
          amount: Number(item.amount),
        }))
      );
    }
  }, [existingLineItems]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        line_number: lineItems.length + 1,
        description: "",
        comments: "",
        quantity: "0",
        rate: "0",
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    // Renumber items
    newItems.forEach((item, i) => {
      item.line_number = i + 1;
    });
    setLineItems(newItems);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate amount if quantity or rate changed
    if (field === "quantity" || field === "rate") {
      const qty = parseFloat(field === "quantity" ? value : newItems[index].quantity) || 0;
      const rate = parseFloat(field === "rate" ? value : newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }

    setLineItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing line items
      if (existingLineItems && existingLineItems.length > 0) {
        const { error: deleteError } = await supabase
          .from("variation_line_items")
          .delete()
          .eq("variation_id", variationId);
        if (deleteError) throw deleteError;
      }

      // Insert new line items
      const itemsToInsert = lineItems.map((item, index) => ({
        variation_id: variationId,
        line_number: index + 1,
        description: item.description,
        comments: item.comments || null,
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: item.amount,
        display_order: index,
      }));

      const { error: insertError } = await supabase
        .from("variation_line_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      // Update variation total amount
      const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const { error: updateError } = await supabase
        .from("cost_variations")
        .update({ amount: total })
        .eq("id", variationId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Variation sheet saved successfully",
      });

      // Invalidate all related queries to update totals across the app
      queryClient.invalidateQueries({ queryKey: ["cost-variations", costReportId] });
      queryClient.invalidateQueries({ queryKey: ["cost-variations-overview", costReportId] });
      queryClient.invalidateQueries({ queryKey: ["variation-line-items", variationId] });
      
      refetchLineItems();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete line items first
      const { error: lineItemsError } = await supabase
        .from("variation_line_items")
        .delete()
        .eq("variation_id", variationId);

      if (lineItemsError) throw lineItemsError;

      // Delete the variation
      const { error } = await supabase
        .from("cost_variations")
        .delete()
        .eq("id", variationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Variation deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["cost-variations", costReportId] });
      queryClient.invalidateQueries({ queryKey: ["cost-variations-overview", costReportId] });
      
      onSuccess();
      onOpenChange(false);
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

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  // Determine the actual sign based on the calculated total
  const isNegative = total < 0;
  const displayTotal = total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Variation Sheet - {variation?.code}</DialogTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Header Section */}
        <Card className="p-6 bg-cyan-50 dark:bg-cyan-950/20">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-cyan-600">
                {variation?.is_credit 
                  ? (variation?.tenants ? "TENANT CREDIT" : "CREDIT NOTE")
                  : (variation?.tenants ? "TENANT VARIATION ORDER" : "VARIATION ORDER")
                }
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">PROJECT:</Label>
                <p className="font-medium">{costReport?.project_name}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">DATE:</Label>
                <p className="font-medium">
                  {costReport?.report_date
                    ? new Date(costReport.report_date).toLocaleDateString()
                    : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">VARIATION ORDER NO.:</Label>
                <p className="font-medium">{variation?.code}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">REVISION:</Label>
                <p className="font-medium">0</p>
              </div>
            </div>

            {variation?.tenants && (
              <div className="bg-black text-white p-2 text-center font-bold">
                TENANT: {variation.tenants.shop_number} - {variation.tenants.shop_name}
              </div>
            )}
          </div>
        </Card>

        {/* Line Items Table */}
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left w-12">NO</th>
                  <th className="border p-2 text-left">DESCRIPTION</th>
                  <th className="border p-2 text-left">COMMENTS/DETAIL</th>
                  <th className="border p-2 text-right w-24">QTY</th>
                  <th className="border p-2 text-right w-32">RATE</th>
                  <th className="border p-2 text-right w-40">AMOUNT</th>
                  <th className="border p-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2 text-center">{item.line_number}</td>
                    <td className="border p-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        placeholder="Description"
                        className="h-8"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        value={item.comments}
                        onChange={(e) => updateLineItem(index, "comments", e.target.value)}
                        placeholder="Comments"
                        className="h-8"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, "rate", e.target.value)}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="border p-2 text-right font-medium">
                      {item.amount < 0 ? "-" : ""}R
                      {Math.abs(item.amount).toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="border p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={addLineItem} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>

        {/* Total */}
        <Card className="p-4 bg-cyan-400 dark:bg-cyan-600">
          <div className="flex justify-between items-center">
            <span className="font-bold text-black dark:text-white">
              TOTAL ADDITIONAL WORKS EXCLUSIVE OF VAT
            </span>
            <span className="text-xl font-bold text-black dark:text-white">
              {isNegative ? "-" : "+"}R
              {Math.abs(displayTotal).toLocaleString("en-ZA", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Sheet"}
          </Button>
        </div>
      </DialogContent>

      <EditVariationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        variationId={variationId}
        projectId={projectId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["variation-detail", variationId] });
          queryClient.invalidateQueries({ queryKey: ["cost-variations", costReportId] });
          onSuccess();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variation? This will also delete all
              associated line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
    </Dialog>
  );
};
