import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Pencil } from "lucide-react";
import { AddVariationDialog } from "./AddVariationDialog";
import { VariationSheetDialog } from "./VariationSheetDialog";
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

  const queryClient = useQueryClient();

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
      
      // Natural sort by code (handles G1, G2, G10 correctly)
      return (data || []).sort((a, b) => {
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
                              setSelectedVariationId(variation.id);
                              setSheetDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4" />
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
    </div>
  );
};
