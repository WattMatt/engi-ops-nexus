import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, History, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { MaterialDialog } from "./MaterialDialog";
import { MaterialPriceHistory } from "./MaterialPriceHistory";

interface Material {
  id: string;
  material_code: string;
  material_name: string;
  description: string | null;
  category_id: string;
  standard_supply_cost: number;
  standard_install_cost: number;
  unit: string;
  usage_count: number;
  is_active: boolean;
  specifications: Record<string, unknown>;
  material_categories?: {
    category_code: string;
    category_name: string;
  };
}

export const MaterialsLibraryTab = () => {
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const queryClient = useQueryClient();

  const { data: materials, isLoading } = useQuery({
    queryKey: ["master-materials", search],
    queryFn: async () => {
      let query = supabase
        .from("master_materials")
        .select(`
          *,
          material_categories (
            category_code,
            category_name
          )
        `)
        .eq("is_active", true)
        .order("material_name");

      if (search) {
        query = query.or(`material_name.ilike.%${search}%,material_code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Material[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("master_materials")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-materials"] });
      toast.success("Material deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate material");
    },
  });

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedMaterial(null);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Master Materials Library
            </CardTitle>
            <CardDescription>
              Centralized database of equipment and materials with standard pricing
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials by name, code, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : materials?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No materials found. Add your first material to get started.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Supply</TableHead>
                  <TableHead className="text-right">Install</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-center">Uses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials?.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono text-sm">
                      {material.material_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{material.material_name}</div>
                        {material.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {material.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {material.material_categories?.category_code || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(material.standard_supply_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(material.standard_install_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(material.standard_supply_cost + material.standard_install_cost)}
                    </TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{material.usage_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setHistoryMaterial(material)}
                          title="Price History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(material.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <MaterialDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          material={selectedMaterial}
        />

        <MaterialPriceHistory
          material={historyMaterial}
          open={!!historyMaterial}
          onOpenChange={(open) => !open && setHistoryMaterial(null)}
        />
      </CardContent>
    </Card>
  );
};
