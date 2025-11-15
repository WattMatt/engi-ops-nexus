import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash, Pencil } from "lucide-react";
import { AddVariationDialog } from "./AddVariationDialog";
import { VariationSheetDialog } from "./VariationSheetDialog";
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
import { toast } from "sonner";

interface CostVariationsManagerProps {
  reportId: string;
  projectId: string;
}

export const CostVariationsManager = ({
  reportId,
  projectId,
}: CostVariationsManagerProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variationToDelete, setVariationToDelete] = useState<any>(null);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (variationId: string) => {
      // Get the variation to check for tenant_id
      const { data: variation } = await supabase
        .from("cost_variations")
        .select("tenant_id")
        .eq("id", variationId)
        .single();

      // Delete line items first
      const { error: itemsError } = await supabase
        .from("variation_line_items")
        .delete()
        .eq("variation_id", variationId);

      if (itemsError) throw itemsError;

      // Delete the variation
      const { error: variationError } = await supabase
        .from("cost_variations")
        .delete()
        .eq("id", variationId);

      if (variationError) throw variationError;

      // Update tenant tracker if a tenant was assigned
      if (variation?.tenant_id) {
        const { data: otherVariations } = await supabase
          .from("cost_variations")
          .select("id")
          .eq("tenant_id", variation.tenant_id);

        if (!otherVariations || otherVariations.length === 0) {
          await supabase
            .from("tenants")
            .update({ cost_reported: false })
            .eq("id", variation.tenant_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Variation deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setVariationToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete variation");
      console.error("Delete error:", error);
    },
  });

  const { data: variations = [], refetch } = useQuery({
    queryKey: ["cost-variations", reportId],
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
        .eq("cost_report_id", reportId);
      if (error) throw error;
      
      // Fetch line items for all variations
      const variationsWithLineItems = await Promise.all(
        (data || []).map(async (variation) => {
          const { data: lineItems } = await supabase
            .from("variation_line_items")
            .select("*")
            .eq("variation_id", variation.id)
            .order("line_number");
          
          return {
            ...variation,
            line_items: lineItems || []
          };
        })
      );
      
      // Natural sort by code (handles G1, G2, G10 correctly)
      return variationsWithLineItems.sort((a, b) => {
        const aMatch = a.code.match(/([A-Z]+)(\d+)/);
        const bMatch = b.code.match(/([A-Z]+)(\d+)/);
        
        if (!aMatch || !bMatch) return a.code.localeCompare(b.code);
        
        // Compare letter prefix first
        const prefixCompare = aMatch[1].localeCompare(bMatch[1]);
        if (prefixCompare !== 0) return prefixCompare;
        
        // Then compare numbers numerically
        return parseInt(aMatch[2]) - parseInt(bMatch[2]);
      });
    },
  });

  const totalVariations = variations.reduce(
    (sum, v) => sum + Number(v.amount || 0),
    0
  );


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Variations</h3>
          <p className="text-sm text-muted-foreground">
            Total: {totalVariations < 0 ? "Credit" : "Extra"} R
            {Math.abs(totalVariations).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Variation
        </Button>
      </div>

      {variations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No variations added yet</p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Variation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm">
                    <th className="p-4">Code</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Tenant</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((variation) => (
                    <tr key={variation.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{variation.code}</td>
                      <td className="p-4">{variation.description}</td>
                      <td className="p-4">
                        {variation.tenants
                          ? `${variation.tenants.shop_number} - ${variation.tenants.shop_name}`
                          : "General"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-medium ${
                            Number(variation.amount || 0) < 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {Number(variation.amount || 0) < 0 ? "-" : "+"}R
                          {Math.abs(Number(variation.amount || 0)).toLocaleString("en-ZA", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            variation.is_credit
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {variation.is_credit ? "Credit" : "Extra"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVariationId(variation.id);
                              setSheetDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setVariationToDelete(variation);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AddVariationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        reportId={reportId}
        projectId={projectId}
        onSuccess={(variationId) => {
          refetch();
          setSelectedVariationId(variationId);
          setSheetDialogOpen(true);
        }}
      />

      {selectedVariationId && (
        <VariationSheetDialog
          open={sheetDialogOpen}
          onOpenChange={setSheetDialogOpen}
          variationId={selectedVariationId}
          costReportId={reportId}
          projectId={projectId}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete variation{" "}
              <strong>{variationToDelete?.code}</strong>: {variationToDelete?.description}?
              {variationToDelete?.tenants && (
                <>
                  <br />
                  This variation is assigned to tenant:{" "}
                  <strong>
                    {variationToDelete.tenants.shop_number} - {variationToDelete.tenants.shop_name}
                  </strong>
                </>
              )}
              <br />
              <br />
              This action cannot be undone. All line items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(variationToDelete?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
