import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const materialSchema = z.object({
  material_code: z.string().min(1, "Code is required"),
  material_name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  standard_supply_cost: z.coerce.number().min(0, "Must be positive"),
  standard_install_cost: z.coerce.number().min(0, "Must be positive"),
  unit: z.string().min(1, "Unit is required"),
  manufacturer: z.string().optional(),
  notes: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: {
    id: string;
    material_code: string;
    material_name: string;
    description: string | null;
    category_id: string;
    standard_supply_cost: number;
    standard_install_cost: number;
    unit: string;
    specifications: Record<string, unknown>;
  } | null;
}

export const MaterialDialog = ({ open, onOpenChange, material }: MaterialDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!material;

  const { data: categories } = useQuery({
    queryKey: ["material-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("id, category_code, category_name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing materials to determine next sequence number
  const { data: existingMaterials } = useQuery({
    queryKey: ["master-materials-for-code"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_materials")
        .select("material_code, category_id");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      material_code: "",
      material_name: "",
      description: "",
      category_id: "",
      standard_supply_cost: 0,
      standard_install_cost: 0,
      unit: "each",
      manufacturer: "",
      notes: "",
    },
  });

  const watchedCategoryId = useWatch({ control: form.control, name: "category_id" });

  // Auto-generate material code when category changes (only for new materials)
  useEffect(() => {
    if (!isEditing && watchedCategoryId && categories && existingMaterials) {
      const selectedCategory = categories.find(c => c.id === watchedCategoryId);
      if (selectedCategory) {
        // Find highest existing number for this category
        const categoryMaterials = existingMaterials.filter(m => m.category_id === watchedCategoryId);
        const codePrefix = `${selectedCategory.category_code}-`;
        
        let maxNumber = 0;
        categoryMaterials.forEach(m => {
          if (m.material_code?.startsWith(codePrefix)) {
            const numPart = parseInt(m.material_code.replace(codePrefix, ''), 10);
            if (!isNaN(numPart) && numPart > maxNumber) {
              maxNumber = numPart;
            }
          }
        });
        
        const nextNumber = maxNumber + 1;
        const generatedCode = `${codePrefix}${String(nextNumber).padStart(3, '0')}`;
        form.setValue("material_code", generatedCode);
      }
    }
  }, [watchedCategoryId, categories, existingMaterials, isEditing, form]);

  useEffect(() => {
    if (material) {
      form.reset({
        material_code: material.material_code,
        material_name: material.material_name,
        description: material.description || "",
        category_id: material.category_id,
        standard_supply_cost: material.standard_supply_cost,
        standard_install_cost: material.standard_install_cost,
        unit: material.unit,
        manufacturer: (material.specifications as Record<string, string>)?.manufacturer || "",
        notes: "",
      });
    } else {
      form.reset({
        material_code: "",
        material_name: "",
        description: "",
        category_id: "",
        standard_supply_cost: 0,
        standard_install_cost: 0,
        unit: "each",
        manufacturer: "",
        notes: "",
      });
    }
  }, [material, form]);

  const mutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const payload = {
        material_code: data.material_code,
        material_name: data.material_name,
        description: data.description || null,
        category_id: data.category_id,
        standard_supply_cost: data.standard_supply_cost,
        standard_install_cost: data.standard_install_cost,
        unit: data.unit,
        specifications: { manufacturer: data.manufacturer },
        notes: data.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("master_materials")
          .update(payload)
          .eq("id", material.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("master_materials")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-materials"] });
      toast.success(isEditing ? "Material updated" : "Material created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save material");
    },
  });

  const onSubmit = (data: MaterialFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Material" : "Add Material"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the material details and pricing"
              : "Add a new material to the master library"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="material_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Code {!isEditing && "(Auto-generated)"}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isEditing ? "e.g. RMU-12KV-3WAY" : "Select category first"} 
                        {...field} 
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-muted" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.category_code} - {cat.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="material_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12kV Ring Main Unit - 3 Way" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the material..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="standard_supply_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supply Cost (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="standard_install_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Install Cost (R)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="each">Each</SelectItem>
                        <SelectItem value="m">Meter (m)</SelectItem>
                        <SelectItem value="m²">Square Meter (m²)</SelectItem>
                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                        <SelectItem value="set">Set</SelectItem>
                        <SelectItem value="lot">Lot</SelectItem>
                        <SelectItem value="pair">Pair</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ABB, Siemens, CBI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Reason for price update (for audit trail)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
