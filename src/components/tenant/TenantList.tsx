import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Circle, Calculator } from "lucide-react";
import { TenantDialog } from "./TenantDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size: string | null;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
}

interface TenantListProps {
  tenants: Tenant[];
  projectId: string;
  onUpdate: () => void;
}

export const TenantList = ({ tenants, projectId, onUpdate }: TenantListProps) => {
  const [isCalculating, setIsCalculating] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) return;

    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tenant deleted");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete tenant");
    }
  };

  const handleCategoryChange = async (tenantId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ shop_category: newCategory })
        .eq("id", tenantId);

      if (error) throw error;
      
      toast.success("Category updated");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update category");
    }
  };

  const handleBulkAutoCalc = async () => {
    if (!confirm("This will recalculate DB sizes for all standard category tenants with areas. Continue?")) return;
    
    setIsCalculating(true);
    try {
      // Fetch sizing rules
      const { data: rules, error: rulesError } = await supabase
        .from("db_sizing_rules")
        .select("*")
        .eq("project_id", projectId)
        .eq("category", "standard")
        .order("min_area", { ascending: true });

      if (rulesError) throw rulesError;
      if (!rules || rules.length === 0) {
        toast.error("No DB sizing rules configured for this project");
        return;
      }

      // Get all standard tenants with areas
      const standardTenants = tenants.filter(
        t => t.shop_category === 'standard' && t.area != null
      );

      let updated = 0;
      let skipped = 0;

      for (const tenant of standardTenants) {
        // Use < for max_area to handle boundary cases (e.g., 200.51 should match 201-300, not 81-200)
        const rule = rules.find(
          r => tenant.area! >= r.min_area && tenant.area! < r.max_area + 1
        );

        if (rule) {
          const { error } = await supabase
            .from("tenants")
            .update({ db_size: rule.db_size })
            .eq("id", tenant.id);

          if (!error) {
            updated++;
          }
        } else {
          skipped++;
        }
      }

      toast.success(`Updated ${updated} tenant(s). Skipped ${skipped} (no matching rule).`);
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to bulk calculate: " + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const StatusIcon = ({ checked }: { checked: boolean }) => (
    checked ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />
  );

  const getCategoryVariant = (category: string) => {
    const variants = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700"
    };
    return variants[category as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={handleBulkAutoCalc} 
          disabled={isCalculating}
          variant="outline"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isCalculating ? "Calculating..." : "Bulk Auto-Calculate DB Sizes"}
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shop #</TableHead>
            <TableHead>Shop Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Area (sqm)</TableHead>
            <TableHead>DB Size</TableHead>
            <TableHead className="text-center">SOW</TableHead>
            <TableHead className="text-center">Layout</TableHead>
            <TableHead className="text-center">DB Order</TableHead>
            <TableHead className="text-right">DB Cost</TableHead>
            <TableHead className="text-center">Lighting</TableHead>
            <TableHead className="text-right">Light Cost</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center text-muted-foreground">
                No tenants added yet
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                <TableCell>{tenant.shop_name}</TableCell>
                <TableCell>
                  <Select 
                    value={tenant.shop_category} 
                    onValueChange={(value) => handleCategoryChange(tenant.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue>
                        <Badge variant="outline" className={getCategoryVariant(tenant.shop_category)}>
                          {getCategoryLabel(tenant.shop_category)}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        <Badge variant="outline" className={getCategoryVariant("standard")}>
                          Standard
                        </Badge>
                      </SelectItem>
                      <SelectItem value="fast_food">
                        <Badge variant="outline" className={getCategoryVariant("fast_food")}>
                          Fast Food
                        </Badge>
                      </SelectItem>
                      <SelectItem value="restaurant">
                        <Badge variant="outline" className={getCategoryVariant("restaurant")}>
                          Restaurant
                        </Badge>
                      </SelectItem>
                      <SelectItem value="national">
                        <Badge variant="outline" className={getCategoryVariant("national")}>
                          National
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{tenant.area?.toFixed(2) || "-"}</TableCell>
                <TableCell>{tenant.db_size || "-"}</TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.sow_received} />
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.layout_received} />
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.db_ordered} />
                </TableCell>
                <TableCell className="text-right">
                  {tenant.db_cost ? `R${tenant.db_cost.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <StatusIcon checked={tenant.lighting_ordered} />
                </TableCell>
                <TableCell className="text-right">
                  {tenant.lighting_cost ? `R${tenant.lighting_cost.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TenantDialog projectId={projectId} tenant={tenant} onSuccess={onUpdate} />
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(tenant.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
