import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Sparkles, PencilLine } from "lucide-react";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size_allowance: string | null;
  db_size_scope_of_work: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
  shop_category: string;
  cost_reported: boolean;
}

interface TenantDialogProps {
  projectId: string;
  tenant?: Tenant | null;
  onSuccess: () => void;
}

export const TenantDialog = ({ projectId, tenant, onSuccess }: TenantDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDbSizeAutoCalculated, setIsDbSizeAutoCalculated] = useState(false);
  const [sizingRules, setSizingRules] = useState<Array<{ min_area: number; max_area: number; db_size_allowance: string; db_size_scope_of_work: string | null; category: string }>>([]);
  const [formData, setFormData] = useState({
    shop_name: tenant?.shop_name || "",
    shop_number: tenant?.shop_number || "",
    area: tenant?.area?.toString() || "",
    db_size_allowance: tenant?.db_size_allowance || "",
    db_size_scope_of_work: tenant?.db_size_scope_of_work || "",
    shop_category: tenant?.shop_category || "standard",
    sow_received: tenant?.sow_received || false,
    layout_received: tenant?.layout_received || false,
    db_ordered: tenant?.db_ordered || false,
    db_cost: tenant?.db_cost?.toString() || "",
    lighting_ordered: tenant?.lighting_ordered || false,
    lighting_cost: tenant?.lighting_cost?.toString() || "",
    cost_reported: tenant?.cost_reported || false,
  });

  // Load DB sizing rules from database
  useEffect(() => {
    const loadSizingRules = async () => {
      const { data, error } = await supabase
        .from("db_sizing_rules")
        .select("*")
        .eq("project_id", projectId)
        .order("min_area", { ascending: true });

      if (!error && data) {
        setSizingRules(data);
      }
    };
    
    loadSizingRules();
  }, [projectId]);

  // Auto-calculate DB size when dialog opens
  useEffect(() => {
    if (open && sizingRules.length > 0) {
      let calculatedDbSize = null;
      
      // For standard shops, need area to calculate
      if (formData.shop_category === 'standard' && formData.area && !isNaN(parseFloat(formData.area))) {
        const area = parseFloat(formData.area);
        calculatedDbSize = getDbSizeFromArea(area, formData.shop_category);
      }
      // For fast_food and restaurant, get fixed size (no area needed)
      else if (['fast_food', 'restaurant'].includes(formData.shop_category)) {
        calculatedDbSize = getFixedDbSize(formData.shop_category);
      }
      
      if (calculatedDbSize) {
        setFormData(prev => ({ ...prev, db_size_allowance: calculatedDbSize }));
        setIsDbSizeAutoCalculated(true);
      }
    }
  }, [open, sizingRules]);

  // Get DB size from area using configured rules (for standard only)
  const getDbSizeFromArea = (area: number, category: string): string | null => {
    if (category !== 'standard') return null;
    
    const rule = sizingRules.find(
      r => r.category === category && area >= r.min_area && area < r.max_area + 1
    );
    
    return rule?.db_size_scope_of_work || rule?.db_size_allowance || null;
  };

  // Get fixed DB size for fast_food and restaurant categories
  const getFixedDbSize = (category: string): string | null => {
    if (!['fast_food', 'restaurant'].includes(category)) return null;
    
    // For fixed sizes, just get the first rule for this category
    const rule = sizingRules.find(r => r.category === category);
    return rule?.db_size_scope_of_work || rule?.db_size_allowance || null;
  };

  const handleAreaChange = (value: string) => {
    setFormData({ ...formData, area: value });
    
    // Auto-calculate DB size when area is entered (for standard only)
    if (value && !isNaN(parseFloat(value)) && formData.shop_category === 'standard') {
      const calculatedDbSize = getDbSizeFromArea(parseFloat(value), formData.shop_category);
      if (calculatedDbSize) {
        setFormData(prev => ({ ...prev, area: value, db_size_allowance: calculatedDbSize }));
        setIsDbSizeAutoCalculated(true);
      }
    }
  };

  const handleCategoryChange = (value: string) => {
    let calculatedDbSize = null;
    
    // For standard shops, calculate from area
    if (value === 'standard' && formData.area && !isNaN(parseFloat(formData.area))) {
      calculatedDbSize = getDbSizeFromArea(parseFloat(formData.area), value);
    }
    // For fast_food and restaurant, get fixed size
    else if (['fast_food', 'restaurant'].includes(value)) {
      calculatedDbSize = getFixedDbSize(value);
    }
    
    // Update form data with category and calculated DB size
    setFormData(prev => ({ 
      ...prev, 
      shop_category: value, 
      db_size_allowance: calculatedDbSize || (value === 'national' ? '' : prev.db_size_allowance)
    }));
    
    if (calculatedDbSize) {
      setIsDbSizeAutoCalculated(true);
    } else if (value === 'national') {
      setIsDbSizeAutoCalculated(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        project_id: projectId,
        shop_name: formData.shop_name,
        shop_number: formData.shop_number,
        area: formData.area ? parseFloat(formData.area) : null,
        db_size_allowance: formData.db_size_allowance || null,
        db_size_scope_of_work: formData.db_size_scope_of_work || null,
        shop_category: formData.shop_category,
        sow_received: formData.sow_received,
        layout_received: formData.layout_received,
        db_ordered: formData.db_ordered,
        db_cost: formData.db_cost ? parseFloat(formData.db_cost) : null,
        lighting_ordered: formData.lighting_ordered,
        lighting_cost: formData.lighting_cost ? parseFloat(formData.lighting_cost) : null,
        cost_reported: formData.cost_reported,
      };

      if (tenant) {
        const { error } = await supabase
          .from("tenants")
          .update(data)
          .eq("id", tenant.id);
        if (error) throw error;
        toast.success("Tenant updated successfully");
      } else {
        const { error } = await supabase
          .from("tenants")
          .insert([data]);
        if (error) throw error;
        toast.success("Tenant created successfully");
      }

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tenant ? (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shop_name">Shop Name *</Label>
              <Input
                id="shop_name"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="shop_number">Shop Number *</Label>
              <Input
                id="shop_number"
                value={formData.shop_number}
                onChange={(e) => setFormData({ ...formData, shop_number: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="shop_category">Shop Category *</Label>
              <select
                id="shop_category"
                value={formData.shop_category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                required
              >
                <option value="standard">Standard</option>
                <option value="fast_food">Fast Food</option>
                <option value="restaurant">Restaurant</option>
                <option value="national">National Shop</option>
              </select>
              {formData.shop_category === 'national' && (
                <p className="text-xs text-muted-foreground mt-1">
                  National shops have fixed DB sizes - set manually below
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="area">Area (m²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area}
                onChange={(e) => handleAreaChange(e.target.value)}
                placeholder="Enter shop area"
              />
              {formData.shop_category === 'standard' && (
                <p className="text-xs text-muted-foreground mt-1">
                  DB size will auto-calculate based on area
                </p>
              )}
              {['fast_food', 'restaurant'].includes(formData.shop_category) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Area is optional - DB size is fixed for this category
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="db_size_allowance">
                  DB Allowance {formData.shop_category === 'national' ? '*' : ''}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center">
                        {isDbSizeAutoCalculated ? (
                          <Sparkles className="h-4 w-4 text-primary" />
                        ) : (
                          <PencilLine className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {isDbSizeAutoCalculated 
                          ? "Auto-calculated from sizing rules - you can still edit" 
                          : "Manual entry required"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="db_size_allowance"
                value={formData.db_size_allowance}
                onChange={(e) => {
                  setFormData({ ...formData, db_size_allowance: e.target.value });
                  setIsDbSizeAutoCalculated(false);
                }}
                placeholder="e.g., 60A TP"
                required={formData.shop_category === 'national'}
              />
              {formData.shop_category === 'standard' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-calculated from area and rules, but you can override
                </p>
              )}
              {['fast_food', 'restaurant'].includes(formData.shop_category) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fixed size from rules, but you can override
                </p>
              )}
              {formData.shop_category === 'national' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Manual entry required for national shops
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="db_size_scope_of_work">DB Scope of Work (Optional)</Label>
              <Input
                id="db_size_scope_of_work"
                value={formData.db_size_scope_of_work}
                onChange={(e) => setFormData({ ...formData, db_size_scope_of_work: e.target.value })}
                placeholder="e.g., 80A TP"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter adjusted DB size from scope of work
              </p>
            </div>
            <div>
              <Label htmlFor="db_cost">DB Cost (R)</Label>
              <Input
                id="db_cost"
                type="number"
                step="0.01"
                value={formData.db_cost}
                onChange={(e) => setFormData({ ...formData, db_cost: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lighting_cost">Lighting Cost (R)</Label>
              <Input
                id="lighting_cost"
                type="number"
                step="0.01"
                value={formData.lighting_cost}
                onChange={(e) => setFormData({ ...formData, lighting_cost: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status Checkboxes</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sow_received"
                  checked={formData.sow_received}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, sow_received: checked as boolean })
                  }
                />
                <Label htmlFor="sow_received" className="font-normal">SOW Received</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="layout_received"
                  checked={formData.layout_received}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, layout_received: checked as boolean })
                  }
                />
                <Label htmlFor="layout_received" className="font-normal">Layout Received</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="db_ordered"
                  checked={formData.db_ordered}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, db_ordered: checked as boolean })
                  }
                />
                <Label htmlFor="db_ordered" className="font-normal">DB Ordered</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lighting_ordered"
                  checked={formData.lighting_ordered}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, lighting_ordered: checked as boolean })
                  }
                />
                <Label htmlFor="lighting_ordered" className="font-normal">Lighting Ordered</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cost_reported"
                  checked={formData.cost_reported}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, cost_reported: checked as boolean })
                  }
                />
                <Label htmlFor="cost_reported" className="font-normal">Cost Reported</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : tenant ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
