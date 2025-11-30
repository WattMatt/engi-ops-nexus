import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, History, Package, ChevronDown, ChevronRight, Filter, LayoutList, Grid3X3 } from "lucide-react";
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
    id: string;
    category_code: string;
    category_name: string;
    parent_category_id: string | null;
  };
}

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  parent_category_id: string | null;
  description: string | null;
}

export const MaterialsLibraryTab = () => {
  const [search, setSearch] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["material-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: materials, isLoading } = useQuery({
    queryKey: ["master-materials", search, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("master_materials")
        .select(`
          *,
          material_categories (
            id,
            category_code,
            category_name,
            parent_category_id
          )
        `)
        .eq("is_active", true)
        .order("material_name");

      if (search) {
        query = query.or(`material_name.ilike.%${search}%,material_code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (categoryFilter && categoryFilter !== "all") {
        // Include parent category and its children
        const selectedCat = categories?.find(c => c.id === categoryFilter);
        if (selectedCat) {
          const childIds = categories?.filter(c => c.parent_category_id === categoryFilter).map(c => c.id) || [];
          query = query.in("category_id", [categoryFilter, ...childIds]);
        }
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!categories,
  });

  // Group materials by category
  const groupedMaterials = useMemo(() => {
    if (!materials || !categories) return new Map<string, { category: Category; materials: Material[] }>();
    
    const grouped = new Map<string, { category: Category; materials: Material[] }>();
    
    // Get parent categories only
    const parentCategories = categories.filter(c => !c.parent_category_id);
    
    parentCategories.forEach(parent => {
      const childCategoryIds = categories
        .filter(c => c.parent_category_id === parent.id)
        .map(c => c.id);
      
      const categoryMaterials = materials.filter(m => 
        m.category_id === parent.id || childCategoryIds.includes(m.category_id)
      );
      
      if (categoryMaterials.length > 0) {
        grouped.set(parent.id, { category: parent, materials: categoryMaterials });
      }
    });
    
    // Also group uncategorized
    const uncategorized = materials.filter(m => !m.material_categories);
    if (uncategorized.length > 0) {
      grouped.set("uncategorized", { 
        category: { id: "uncategorized", category_code: "UC", category_name: "Uncategorized", parent_category_id: null, description: null }, 
        materials: uncategorized 
      });
    }
    
    return grouped;
  }, [materials, categories]);

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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Array.from(groupedMaterials.keys())));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Get parent categories for filter
  const parentCategories = categories?.filter(c => !c.parent_category_id) || [];

  // Calculate totals
  const totals = useMemo(() => {
    if (!materials) return { count: 0, supplyTotal: 0, installTotal: 0 };
    return {
      count: materials.length,
      supplyTotal: materials.reduce((sum, m) => sum + (m.standard_supply_cost || 0), 0),
      installTotal: materials.reduce((sum, m) => sum + (m.standard_install_cost || 0), 0),
    };
  }, [materials]);

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
              {totals.count} materials • Total Value: {formatCurrency(totals.supplyTotal + totals.installTotal)}
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {parentCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.category_code} - {cat.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grouped" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grouped")}
              title="Grouped View"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : materials?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No materials found. Add your first material or import from a BOQ.
          </div>
        ) : viewMode === "grouped" ? (
          /* Grouped View */
          <div className="space-y-2">
            <div className="flex justify-end gap-2 text-sm">
              <Button variant="ghost" size="sm" onClick={expandAll}>Expand All</Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>Collapse All</Button>
            </div>
            
            {Array.from(groupedMaterials.entries()).map(([categoryId, { category, materials: catMaterials }]) => {
              const isExpanded = expandedCategories.has(categoryId);
              const categoryTotal = catMaterials.reduce((sum, m) => 
                sum + (m.standard_supply_cost || 0) + (m.standard_install_cost || 0), 0
              );
              
              return (
                <Collapsible key={categoryId} open={isExpanded} onOpenChange={() => toggleCategory(categoryId)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Badge variant="outline" className="font-mono">
                        {category.category_code}
                      </Badge>
                      <span className="font-semibold">{category.category_name}</span>
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(categoryTotal)}
                        </span>
                        <Badge variant="secondary">{catMaterials.length} items</Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 pt-2">
                      <MaterialsTable
                        materials={catMaterials}
                        onEdit={handleEdit}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onHistory={setHistoryMaterial}
                        showCategory={false}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="rounded-md border overflow-x-auto">
            <MaterialsTable
              materials={materials || []}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              onHistory={setHistoryMaterial}
              showCategory={true}
            />
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

// Extracted table component
interface MaterialsTableProps {
  materials: Material[];
  onEdit: (material: Material) => void;
  onDelete: (id: string) => void;
  onHistory: (material: Material) => void;
  showCategory: boolean;
}

const MaterialsTable = ({ materials, onEdit, onDelete, onHistory, showCategory }: MaterialsTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Code</TableHead>
        <TableHead>Material</TableHead>
        {showCategory && <TableHead>Category</TableHead>}
        <TableHead className="text-right">Supply</TableHead>
        <TableHead className="text-right">Install</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead>Unit</TableHead>
        <TableHead className="text-center">Uses</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {materials.map((material) => (
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
          {showCategory && (
            <TableCell>
              <Badge variant="outline">
                {material.material_categories?.category_code || "—"}
              </Badge>
            </TableCell>
          )}
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
                onClick={() => onHistory(material)}
                title="Price History"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(material)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(material.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
