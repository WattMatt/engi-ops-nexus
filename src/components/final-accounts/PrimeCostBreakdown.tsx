import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Link2, Unlink, Calculator, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface PrimeCostBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemDescription: string;
  projectId: string;
  currentActualCost: number;
  onActualCostChange: (newTotal: number) => void;
}

type ComponentType = 'tenant_db_total' | 'tenant_lighting_total' | 'order' | 'manual';

interface ComponentForm {
  type: ComponentType;
  description: string;
  amount: string;
  orderReference: string;
}

const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  tenant_db_total: 'Tenant Schedule - DB Total',
  tenant_lighting_total: 'Tenant Schedule - Lighting Total',
  order: 'Order',
  manual: 'Manual Entry',
};

export function PrimeCostBreakdown({
  open,
  onOpenChange,
  itemId,
  itemDescription,
  projectId,
  currentActualCost,
  onActualCostChange,
}: PrimeCostBreakdownProps) {
  const queryClient = useQueryClient();
  const [newComponent, setNewComponent] = useState<ComponentForm>({
    type: 'order',
    description: '',
    amount: '',
    orderReference: '',
  });

  // Fetch existing components for this item
  const { data: components = [], isLoading: loadingComponents } = useQuery({
    queryKey: ["prime-cost-components", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_cost_components")
        .select("*")
        .eq("prime_cost_item_id", itemId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!itemId,
  });

  // Fetch tenant schedule totals (excluding tenants who handle their own DB/lighting)
  const { data: tenantTotals, isLoading: loadingTenants } = useQuery({
    queryKey: ["tenant-schedule-totals", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_number, shop_name, db_cost, lighting_cost, db_by_tenant, lighting_by_tenant, exclude_from_totals")
        .eq("project_id", projectId);
      
      if (error) throw error;
      
      // For DB total: exclude tenants who handle their own DB or are excluded from totals
      const dbTenants = (data || []).filter(t => !t.db_by_tenant && !t.exclude_from_totals);
      // For Lighting total: exclude tenants who handle their own lighting or are excluded from totals
      const lightingTenants = (data || []).filter(t => !t.lighting_by_tenant && !t.exclude_from_totals);
      
      const dbTotal = dbTenants.reduce((sum, t) => sum + (Number(t.db_cost) || 0), 0);
      const lightingTotal = lightingTenants.reduce((sum, t) => sum + (Number(t.lighting_cost) || 0), 0);
      
      return { 
        dbTotal, 
        lightingTotal, 
        dbTenantCount: dbTenants.length,
        lightingTenantCount: lightingTenants.length 
      };
    },
    enabled: open && !!projectId,
  });

  // Add component mutation
  const addComponentMutation = useMutation({
    mutationFn: async (component: {
      type: ComponentType;
      description: string;
      amount: number;
      orderReference?: string;
      isAutoCalculated: boolean;
    }) => {
      const { error } = await supabase
        .from("prime_cost_components")
        .insert({
          prime_cost_item_id: itemId,
          component_type: component.type,
          description: component.description,
          amount: component.amount,
          order_reference: component.orderReference || null,
          is_auto_calculated: component.isAutoCalculated,
          project_id: projectId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prime-cost-components", itemId] });
      toast.success("Component added");
      setNewComponent({ type: 'order', description: '', amount: '', orderReference: '' });
    },
    onError: () => {
      toast.error("Failed to add component");
    },
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: async (componentId: string) => {
      const { error } = await supabase
        .from("prime_cost_components")
        .delete()
        .eq("id", componentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prime-cost-components", itemId] });
      toast.success("Component removed");
    },
    onError: () => {
      toast.error("Failed to remove component");
    },
  });

  // Update component amount mutation (for auto-calculated ones)
  const updateComponentMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from("prime_cost_components")
        .update({ amount })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prime-cost-components", itemId] });
    },
  });

  const handleAddComponent = () => {
    if (!newComponent.description || !newComponent.amount) {
      toast.error("Please enter description and amount");
      return;
    }

    addComponentMutation.mutate({
      type: newComponent.type,
      description: newComponent.description,
      amount: parseFloat(newComponent.amount) || 0,
      orderReference: newComponent.orderReference,
      isAutoCalculated: false,
    });
  };

  const handleLinkTenantTotal = (type: 'tenant_db_total' | 'tenant_lighting_total') => {
    const amount = type === 'tenant_db_total' ? tenantTotals?.dbTotal : tenantTotals?.lightingTotal;
    const count = type === 'tenant_db_total' ? tenantTotals?.dbTenantCount : tenantTotals?.lightingTenantCount;
    const description = type === 'tenant_db_total' 
      ? `Tenant Schedule DB Total (${count || 0} tenants)`
      : `Tenant Schedule Lighting Total (${count || 0} tenants)`;

    addComponentMutation.mutate({
      type,
      description,
      amount: amount || 0,
      isAutoCalculated: true,
    });
  };

  const handleRefreshAutoCalculated = (component: any) => {
    let newAmount = 0;
    if (component.component_type === 'tenant_db_total') {
      newAmount = tenantTotals?.dbTotal || 0;
    } else if (component.component_type === 'tenant_lighting_total') {
      newAmount = tenantTotals?.lightingTotal || 0;
    }
    updateComponentMutation.mutate({ id: component.id, amount: newAmount });
  };

  // Calculate total from components
  const componentsTotal = components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // Check if tenant totals are already linked
  const hasDBLink = components.some(c => c.component_type === 'tenant_db_total');
  const hasLightingLink = components.some(c => c.component_type === 'tenant_lighting_total');

  const handleApplyTotal = () => {
    onActualCostChange(componentsTotal);
    toast.success("Actual cost updated from breakdown");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Prime Cost Breakdown
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {itemDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Auto-Calculated Tenant Schedule Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Tenant Schedule Links
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DB Total</span>
                  {loadingTenants ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(tenantTotals?.dbTotal || 0)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tenantTotals?.dbTenantCount || 0} tenants (excl. own DB)
                </p>
                <Button
                  size="sm"
                  variant={hasDBLink ? "outline" : "default"}
                  className="w-full"
                  onClick={() => handleLinkTenantTotal('tenant_db_total')}
                  disabled={hasDBLink || addComponentMutation.isPending}
                >
                  {hasDBLink ? "Already Linked" : "Link DB Total"}
                </Button>
              </div>
              
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lighting Total</span>
                  {loadingTenants ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(tenantTotals?.lightingTotal || 0)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tenantTotals?.lightingTenantCount || 0} tenants (excl. own lighting)
                </p>
                <Button
                  size="sm"
                  variant={hasLightingLink ? "outline" : "default"}
                  className="w-full"
                  onClick={() => handleLinkTenantTotal('tenant_lighting_total')}
                  disabled={hasLightingLink || addComponentMutation.isPending}
                >
                  {hasLightingLink ? "Already Linked" : "Link Lighting Total"}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Manual Components / Orders */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Component / Order
            </h4>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Label className="text-xs">Type</Label>
                <Select
                  value={newComponent.type}
                  onValueChange={(v) => setNewComponent({ ...newComponent, type: v as ComponentType })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Label className="text-xs">Description</Label>
                <Input
                  className="h-9"
                  placeholder="e.g., Order #123"
                  value={newComponent.description}
                  onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Reference</Label>
                <Input
                  className="h-9"
                  placeholder="PO#"
                  value={newComponent.orderReference}
                  onChange={(e) => setNewComponent({ ...newComponent, orderReference: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Amount</Label>
                <Input
                  className="h-9"
                  type="number"
                  placeholder="0.00"
                  value={newComponent.amount}
                  onChange={(e) => setNewComponent({ ...newComponent, amount: e.target.value })}
                />
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleAddComponent}
                  disabled={addComponentMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Components List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Components ({components.length})</h4>
            {loadingComponents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : components.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No components added yet. Add tenant schedule links or individual orders above.
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between border rounded-lg p-3 bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {component.description}
                        </span>
                        {component.is_auto_calculated && (
                          <Badge variant="secondary" className="text-xs">
                            Auto-linked
                          </Badge>
                        )}
                        {component.order_reference && (
                          <Badge variant="outline" className="text-xs">
                            {component.order_reference}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {COMPONENT_TYPE_LABELS[component.component_type as ComponentType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(component.amount)}
                      </span>
                      {component.is_auto_calculated && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRefreshAutoCalculated(component)}
                          title="Refresh from tenant schedule"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteComponentMutation.mutate(component.id)}
                        disabled={deleteComponentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with totals */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Components Total:</span>
            <span className="text-lg font-bold">{formatCurrency(componentsTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Actual Cost:</span>
            <span className={cn(
              "font-medium",
              Math.abs(componentsTotal - currentActualCost) > 0.01 && "text-amber-600"
            )}>
              {formatCurrency(currentActualCost)}
            </span>
          </div>
          {components.length > 0 && Math.abs(componentsTotal - currentActualCost) > 0.01 && (
            <Button className="w-full" onClick={handleApplyTotal}>
              Apply Breakdown Total as Actual Cost
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
