import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Link2 } from "lucide-react";
import { toast } from "sonner";

interface LineShopTemplate {
  id: string;
  min_area: number;
  max_area: number;
  area_label: string;
  db_size: string | null;
  is_global: boolean;
  project_id: string | null;
}

interface TemplateItem {
  id?: string;
  template_id?: string;
  master_material_id: string | null;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  supply_rate: number;
  install_rate: number;
  category: string;
  display_order: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Props {
  template: LineShopTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORIES = [
  "Conduits & Fittings",
  "Conductors & Cables",
  "Appliances & Accessories",
  "Lighting",
  "Distribution",
  "Earthing",
  "Other",
];

const DB_SIZES = [
  "40A TP",
  "60A TP",
  "80A TP",
  "100A TP",
  "125A TP",
  "160A TP",
  "200A TP",
];

export function LineShopTemplateEditor({ template, onClose, onSave }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [formData, setFormData] = useState({
    min_area: template?.min_area || 0,
    max_area: template?.max_area || 40,
    area_label: template?.area_label || "",
    db_size: template?.db_size || "",
    is_global: template?.is_global ?? true,
  });

  const [items, setItems] = useState<TemplateItem[]>([]);

  // Auto-generate area label
  useEffect(() => {
    if (!template) {
      setFormData((prev) => ({
        ...prev,
        area_label: `${prev.min_area}m² - ${prev.max_area}m²`,
      }));
    }
  }, [formData.min_area, formData.max_area, template]);

  // Fetch existing items if editing
  const { data: existingItems } = useQuery({
    queryKey: ["line-shop-template-items", template?.id],
    queryFn: async () => {
      if (!template?.id) return [];
      const { data, error } = await supabase
        .from("line_shop_template_items")
        .select("*")
        .eq("template_id", template.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as TemplateItem[];
    },
    enabled: !!template?.id,
  });

  // Fetch master materials for linking
  const { data: masterMaterials } = useQuery({
    queryKey: ["master-materials-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_materials")
        .select("id, material_code, material_name, description, unit, standard_supply_cost, standard_install_cost")
        .order("material_code", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingItems) {
      setItems(existingItems);
    }
  }, [existingItems]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let templateId = template?.id;

      if (isEditing) {
        // Update existing template
        const { error } = await supabase
          .from("line_shop_material_templates")
          .update({
            min_area: formData.min_area,
            max_area: formData.max_area,
            area_label: formData.area_label,
            db_size: formData.db_size || null,
            is_global: formData.is_global,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from("line_shop_material_templates")
          .insert({
            min_area: formData.min_area,
            max_area: formData.max_area,
            area_label: formData.area_label,
            db_size: formData.db_size || null,
            is_global: formData.is_global,
          })
          .select()
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Handle items
      const deletedItems = items.filter((i) => i.isDeleted && i.id);
      const newItems = items.filter((i) => i.isNew && !i.isDeleted);
      const updatedItems = items.filter((i) => !i.isNew && !i.isDeleted && i.id);

      // Delete removed items
      if (deletedItems.length > 0) {
        const { error } = await supabase
          .from("line_shop_template_items")
          .delete()
          .in("id", deletedItems.map((i) => i.id!));
        if (error) throw error;
      }

      // Insert new items
      if (newItems.length > 0) {
        const { error } = await supabase.from("line_shop_template_items").insert(
          newItems.map((item, idx) => ({
            template_id: templateId,
            master_material_id: item.master_material_id,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            category: item.category,
            display_order: idx,
          }))
        );
        if (error) throw error;
      }

      // Update existing items
      for (const item of updatedItems) {
        const { error } = await supabase
          .from("line_shop_template_items")
          .update({
            master_material_id: item.master_material_id,
            item_code: item.item_code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            supply_rate: item.supply_rate,
            install_rate: item.install_rate,
            category: item.category,
            display_order: item.display_order,
          })
          .eq("id", item.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Template updated" : "Template created");
      onSave();
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        master_material_id: null,
        item_code: "",
        description: "",
        unit: "No",
        quantity: 1,
        supply_rate: 0,
        install_rate: 0,
        category: "Other",
        display_order: prev.length,
        isNew: true,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isDeleted: true } : item
      )
    );
  };

  const linkMaterial = (index: number, materialId: string) => {
    const material = masterMaterials?.find((m) => m.id === materialId);
    if (material) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                master_material_id: material.id,
                item_code: material.material_code || item.item_code,
                description: material.material_name || material.description || item.description,
                unit: material.unit || item.unit,
                supply_rate: material.standard_supply_cost || item.supply_rate,
                install_rate: material.standard_install_cost || item.install_rate,
              }
            : item
        )
      );
    }
  };

  const visibleItems = items.filter((i) => !i.isDeleted);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Template" : "New Template"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure area range and materials
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Min Area (m²)</Label>
              <Input
                type="number"
                value={formData.min_area}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_area: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Max Area (m²)</Label>
              <Input
                type="number"
                value={formData.max_area}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_area: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Area Label</Label>
              <Input
                value={formData.area_label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, area_label: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>DB Size</Label>
              <Select
                value={formData.db_size}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, db_size: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select DB size" />
                </SelectTrigger>
                <SelectContent>
                  {DB_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Materials ({visibleItems.length})</CardTitle>
          <Button size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Material
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[100px]">Supply</TableHead>
                  <TableHead className="w-[100px]">Install</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="w-[100px]">Link</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item, index) => {
                  const originalIndex = items.findIndex((i) => i === item);
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.item_code}
                          onChange={(e) =>
                            updateItem(originalIndex, "item_code", e.target.value)
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(originalIndex, "description", e.target.value)
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(originalIndex, "unit", e.target.value)
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              originalIndex,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.supply_rate}
                          onChange={(e) =>
                            updateItem(
                              originalIndex,
                              "supply_rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.install_rate}
                          onChange={(e) =>
                            updateItem(
                              originalIndex,
                              "install_rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.category}
                          onValueChange={(value) =>
                            updateItem(originalIndex, "category", value)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.master_material_id || ""}
                          onValueChange={(value) => linkMaterial(originalIndex, value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={<Link2 className="h-3 w-3" />} />
                          </SelectTrigger>
                          <SelectContent>
                            {masterMaterials?.slice(0, 100).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.material_code} - {(m.material_name || m.description)?.slice(0, 30)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteItem(originalIndex)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibleItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No materials added yet. Click "Add Material" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
}
