import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportTenantsFromBudgetProps {
  projectId: string;
  onSuccess?: () => void;
}

interface TenantPreview {
  shop_number: string;
  shop_name: string;
  area: number;
  base_rate: number | null;
  ti_rate: number | null;
  exists: boolean;
}

export function ImportTenantsFromBudget({ projectId, onSuccess }: ImportTenantsFromBudgetProps) {
  const [open, setOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch budgets for this project
  const { data: budgets = [] } = useQuery({
    queryKey: ["project-budgets", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("id, budget_number, budget_date, revision")
        .eq("project_id", projectId)
        .order("budget_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  // Fetch existing tenants for comparison
  const { data: existingTenants = [] } = useQuery({
    queryKey: ["existing-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("shop_number")
        .eq("project_id", projectId);
      if (error) throw error;
      return data.map(t => t.shop_number.toLowerCase().trim());
    },
    enabled: open && !!projectId,
  });

  // Fetch tenant items from selected budget
  const { data: tenantPreview = [], isLoading: isLoadingPreview } = useQuery({
    queryKey: ["budget-tenants", selectedBudgetId],
    queryFn: async () => {
      if (!selectedBudgetId) return [];

      // Get the budget sections
      const { data: sections } = await supabase
        .from("budget_sections")
        .select("id")
        .eq("budget_id", selectedBudgetId);

      if (!sections?.length) return [];

      // Get tenant line items from these sections
      const { data: items, error } = await supabase
        .from("budget_line_items")
        .select("shop_number, description, area, base_rate, ti_rate")
        .in("section_id", sections.map(s => s.id))
        .eq("is_tenant_item", true)
        .not("shop_number", "is", null);

      if (error) throw error;

      // Group by shop_number and get unique tenants
      const tenantMap = new Map<string, TenantPreview>();
      
      for (const item of items || []) {
        const shopNum = item.shop_number?.trim();
        if (!shopNum || shopNum === "0") continue;

        const key = shopNum.toLowerCase();
        const existing = tenantMap.get(key);
        
        // Use the item with the largest area or most data
        if (!existing || (item.area && item.area > (existing.area || 0))) {
          tenantMap.set(key, {
            shop_number: shopNum,
            shop_name: item.description || `Shop ${shopNum}`,
            area: item.area || 0,
            base_rate: item.base_rate,
            ti_rate: item.ti_rate,
            exists: existingTenants.includes(key),
          });
        }
      }

      return Array.from(tenantMap.values()).sort((a, b) => {
        const numA = parseInt(a.shop_number.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.shop_number.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });
    },
    enabled: !!selectedBudgetId,
  });

  // Initialize selection when preview loads
  const handleBudgetChange = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setSelectedTenants(new Set());
  };

  // Update selection when preview loads (select all non-existing)
  const selectAllNew = () => {
    const newTenants = tenantPreview.filter(t => !t.exists).map(t => t.shop_number);
    setSelectedTenants(new Set(newTenants));
  };

  const toggleTenant = (shopNumber: string) => {
    const newSet = new Set(selectedTenants);
    if (newSet.has(shopNumber)) {
      newSet.delete(shopNumber);
    } else {
      newSet.add(shopNumber);
    }
    setSelectedTenants(newSet);
  };

  const toggleAll = () => {
    if (selectedTenants.size === tenantPreview.filter(t => !t.exists).length) {
      setSelectedTenants(new Set());
    } else {
      selectAllNew();
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const tenantsToImport = tenantPreview
        .filter(t => selectedTenants.has(t.shop_number) && !t.exists);

      if (tenantsToImport.length === 0) {
        throw new Error("No tenants selected for import");
      }

      const { error } = await supabase.from("tenants").insert(
        tenantsToImport.map(t => ({
          project_id: projectId,
          shop_number: t.shop_number,
          shop_name: t.shop_name,
          area: t.area,
          shop_category: "standard",
        }))
      );

      if (error) throw error;
      return tenantsToImport.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} tenant(s) successfully`);
      queryClient.invalidateQueries({ queryKey: ["tenants", projectId] });
      setOpen(false);
      setSelectedBudgetId("");
      setSelectedTenants(new Set());
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const newTenantsCount = tenantPreview.filter(t => !t.exists).length;
  const selectedNewCount = Array.from(selectedTenants).filter(
    s => !tenantPreview.find(t => t.shop_number === s)?.exists
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Import from Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Tenants from Budget</DialogTitle>
          <DialogDescription>
            Select a budget to import tenant schedule data from the retail section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Budget</label>
            <Select value={selectedBudgetId} onValueChange={handleBudgetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a budget..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.budget_number} - {budget.revision} ({new Date(budget.budget_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBudgetId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Tenants Found ({tenantPreview.length})
                </label>
                {newTenantsCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedTenants.size === newTenantsCount ? "Deselect All" : "Select All New"}
                  </Button>
                )}
              </div>

              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : tenantPreview.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No tenant items found in this budget.
                </p>
              ) : (
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {tenantPreview.map((tenant) => (
                      <div
                        key={tenant.shop_number}
                        className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${
                          tenant.exists ? "opacity-50" : ""
                        }`}
                      >
                        <Checkbox
                          checked={selectedTenants.has(tenant.shop_number)}
                          onCheckedChange={() => toggleTenant(tenant.shop_number)}
                          disabled={tenant.exists}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              Shop {tenant.shop_number}
                            </span>
                            {tenant.exists && (
                              <Badge variant="secondary" className="text-xs">
                                Already exists
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {tenant.shop_name}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{tenant.area} m²</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={selectedTenants.size === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedTenants.size} Tenant(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
