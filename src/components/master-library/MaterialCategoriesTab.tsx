import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, FolderTree, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  parent_category_id: string | null;
  sort_order: number;
  is_active: boolean;
}

const categorySchema = z.object({
  category_code: z.string().min(1, "Code is required").max(10, "Max 10 characters"),
  category_name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  parent_category_id: z.string().optional(),
  sort_order: z.coerce.number().min(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const MaterialCategoriesTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["material-categories-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("category_code");
      if (error) throw error;
      return data as Category[];
    },
  });

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category_code: "",
      category_name: "",
      description: "",
      parent_category_id: "",
      sort_order: 0,
    },
  });

  const watchedParentId = useWatch({ control: form.control, name: "parent_category_id" });
  const watchedCode = useWatch({ control: form.control, name: "category_code" });

  // Auto-prefix category code when parent is selected (for new categories)
  const handleParentChange = (parentId: string) => {
    if (!selectedCategory && parentId && parentId !== "__none__") {
      const parentCategory = categories?.find(c => c.id === parentId);
      if (parentCategory) {
        const currentCode = form.getValues("category_code");
        // Only add prefix if the code doesn't already start with parent prefix
        if (!currentCode.startsWith(`${parentCategory.category_code}-`)) {
          form.setValue("category_code", `${parentCategory.category_code}-`);
        }
      }
    } else if (!selectedCategory && (!parentId || parentId === "__none__")) {
      // If removing parent, clear the prefix if it matches a parent code
      const currentCode = form.getValues("category_code");
      const matchingParent = rootCategories.find(p => currentCode.startsWith(`${p.category_code}-`));
      if (matchingParent && currentCode === `${matchingParent.category_code}-`) {
        form.setValue("category_code", "");
      }
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = {
        category_code: data.category_code,
        category_name: data.category_name,
        description: data.description || null,
        parent_category_id: data.parent_category_id || null,
        sort_order: data.sort_order,
      };

      if (selectedCategory) {
        const { error } = await supabase
          .from("material_categories")
          .update(payload)
          .eq("id", selectedCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("material_categories")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-categories"] });
      toast.success(selectedCategory ? "Category updated" : "Category created");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save category");
    },
  });

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    form.reset({
      category_code: category.category_code,
      category_name: category.category_name,
      description: category.description || "",
      parent_category_id: category.parent_category_id || "",
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCategory(null);
    form.reset({
      category_code: "",
      category_name: "",
      description: "",
      parent_category_id: "",
      sort_order: (categories?.length || 0) + 1,
    });
    setDialogOpen(true);
  };

  // Build category tree
  const rootCategories = categories?.filter((c) => !c.parent_category_id) || [];
  const getChildren = (parentId: string) =>
    categories?.filter((c) => c.parent_category_id === parentId) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Material Categories
            </CardTitle>
            <CardDescription>
              Organize materials into hierarchical categories
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rootCategories.map((category) => (
                  <>
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.category_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.category_code}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {category.description || "—"}
                      </TableCell>
                      <TableCell className="text-center">{category.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {getChildren(category.id).map((child) => (
                      <TableRow key={child.id} className="bg-muted/30">
                        <TableCell className="font-medium pl-8">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            {child.category_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{child.category_code}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {child.description || "—"}
                        </TableCell>
                        <TableCell className="text-center">{child.sort_order}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(child)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                {selectedCategory
                  ? "Update the category details"
                  : "Create a new material category"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. HV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HV Equipment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category (Optional)</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const actualVal = val === "__none__" ? "" : val;
                          field.onChange(actualVal);
                          handleParentChange(val);
                        }} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None (Top Level)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None (Top Level)</SelectItem>
                          {rootCategories
                            .filter((c) => c.id !== selectedCategory?.id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.category_code} - {c.category_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                        <Textarea placeholder="Category description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : selectedCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
