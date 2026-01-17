import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2, Edit, Copy, Package } from "lucide-react";
import { toast } from "sonner";
import { LineShopTemplateEditor } from "./LineShopTemplateEditor";
import { LineShopTemplateImport } from "./LineShopTemplateImport";
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

interface LineShopTemplate {
  id: string;
  min_area: number;
  max_area: number;
  area_label: string;
  db_size: string | null;
  is_global: boolean;
  project_id: string | null;
  created_at: string;
  item_count?: number;
}

export function LineShopTemplatesTab() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<LineShopTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<LineShopTemplate | null>(null);

  // Fetch templates with item counts
  const { data: templates, isLoading } = useQuery({
    queryKey: ["line-shop-templates"],
    queryFn: async () => {
      const { data: templatesData, error: templatesError } = await supabase
        .from("line_shop_material_templates")
        .select("*")
        .order("min_area", { ascending: true });

      if (templatesError) throw templatesError;

      // Get item counts for each template
      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count } = await supabase
            .from("line_shop_template_items")
            .select("*", { count: "exact", head: true })
            .eq("template_id", template.id);

          return {
            ...template,
            item_count: count || 0,
          };
        })
      );

      return templatesWithCounts as LineShopTemplate[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("line_shop_material_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-shop-templates"] });
      toast.success("Template deleted successfully");
      setDeleteTemplate(null);
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (template: LineShopTemplate) => {
      // Create new template
      const { data: newTemplate, error: templateError } = await supabase
        .from("line_shop_material_templates")
        .insert({
          min_area: template.max_area,
          max_area: template.max_area + (template.max_area - template.min_area),
          area_label: `${template.max_area}m² - ${template.max_area + (template.max_area - template.min_area)}m²`,
          db_size: template.db_size,
          is_global: template.is_global,
          project_id: template.project_id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Copy items
      const { data: items, error: itemsError } = await supabase
        .from("line_shop_template_items")
        .select("*")
        .eq("template_id", template.id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const newItems = items.map((item) => ({
          template_id: newTemplate.id,
          master_material_id: item.master_material_id,
          item_code: item.item_code,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          supply_rate: item.supply_rate,
          install_rate: item.install_rate,
          category: item.category,
          display_order: item.display_order,
        }));

        const { error: insertError } = await supabase
          .from("line_shop_template_items")
          .insert(newItems);

        if (insertError) throw insertError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["line-shop-templates"] });
      toast.success("Template duplicated successfully");
    },
    onError: (error) => {
      toast.error("Failed to duplicate template: " + error.message);
    },
  });

  if (editingTemplate || isCreating) {
    return (
      <LineShopTemplateEditor
        template={editingTemplate}
        onClose={() => {
          setEditingTemplate(null);
          setIsCreating(false);
        }}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["line-shop-templates"] });
          setEditingTemplate(null);
          setIsCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Line Shop Material Templates</h3>
          <p className="text-sm text-muted-foreground">
            Configure material packages for different shop area ranges
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import from Excel
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.area_label}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.db_size || "No DB size specified"}
                    </p>
                  </div>
                  <Badge variant={template.is_global ? "default" : "secondary"}>
                    {template.is_global ? "Global" : "Project"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {template.item_count} material{template.item_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateMutation.mutate(template)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTemplate(template)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No Templates Yet</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create area-based templates to auto-generate Line Shop BOQ items
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import from Excel
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <LineShopTemplateImport
        open={showImport}
        onOpenChange={setShowImport}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["line-shop-templates"] });
          setShowImport(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deleteTemplate?.area_label}"? 
              This will also delete all {deleteTemplate?.item_count} associated materials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
