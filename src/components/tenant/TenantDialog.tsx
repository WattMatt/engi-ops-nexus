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
import { InputWithSuffix } from "@/components/ui/input-with-suffix";
 import { calculateOrderDeadlines } from "@/utils/dateCalculations";
 import { addDays, format } from "date-fns";
 import { DeadlineOverrideFields } from "./DeadlineOverrideFields";

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
  db_order_date: string | null;
  db_cost: number | null;
  db_by_tenant: boolean;
  lighting_ordered: boolean;
  lighting_order_date: string | null;
  lighting_cost: number | null;
  lighting_by_tenant: boolean;
  shop_category: string;
  cost_reported: boolean;
  opening_date: string | null;
  beneficial_occupation_days: number | null;
   db_last_order_date?: string | null;
   db_delivery_date?: string | null;
   lighting_last_order_date?: string | null;
   lighting_delivery_date?: string | null;
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
  
  const getInitialFormData = () => ({
    shop_name: tenant?.shop_name || "",
    shop_number: tenant?.shop_number || "",
    area: tenant?.area?.toString() || "",
    db_size_allowance: tenant?.db_size_allowance || "",
    db_size_scope_of_work: tenant?.db_size_scope_of_work || "",
    shop_category: tenant?.shop_category || "standard",
    sow_received: tenant?.sow_received || false,
    layout_received: tenant?.layout_received || false,
    db_ordered: tenant?.db_ordered || false,
    db_order_date: tenant?.db_order_date || "",
    db_cost: tenant?.db_cost?.toString() || "",
    db_by_tenant: tenant?.db_by_tenant || false,
    lighting_ordered: tenant?.lighting_ordered || false,
    lighting_order_date: tenant?.lighting_order_date || "",
    lighting_cost: tenant?.lighting_cost?.toString() || "",
    lighting_by_tenant: tenant?.lighting_by_tenant || false,
    cost_reported: tenant?.cost_reported || false,
    opening_date: tenant?.opening_date || "",
    beneficial_occupation_days: tenant?.beneficial_occupation_days?.toString() || "90",
     db_last_order_date: tenant?.db_last_order_date || "",
     db_delivery_date: tenant?.db_delivery_date || "",
     lighting_last_order_date: tenant?.lighting_last_order_date || "",
     lighting_delivery_date: tenant?.lighting_delivery_date || "",
     useManualOverride: false,
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Reset form when dialog opens or tenant changes
  useEffect(() => {
    if (open) {
      if (!tenant) {
        // Clear form for new tenant
        setFormData({
          shop_name: "",
          shop_number: "",
          area: "",
          db_size_allowance: "",
          db_size_scope_of_work: "",
          shop_category: "standard",
          sow_received: false,
          layout_received: false,
          db_ordered: false,
          db_order_date: "",
          db_cost: "",
          db_by_tenant: false,
          lighting_ordered: false,
          lighting_order_date: "",
          lighting_cost: "",
          lighting_by_tenant: false,
          cost_reported: false,
          opening_date: "",
          beneficial_occupation_days: "90",
           db_last_order_date: "",
           db_delivery_date: "",
           lighting_last_order_date: "",
           lighting_delivery_date: "",
           useManualOverride: false,
        });
        setIsDbSizeAutoCalculated(false);
      } else {
        // Load tenant data when editing
        setFormData({
          shop_name: tenant.shop_name || "",
          shop_number: tenant.shop_number || "",
          area: tenant.area?.toString() || "",
          db_size_allowance: tenant.db_size_allowance || "",
          db_size_scope_of_work: tenant.db_size_scope_of_work || "",
          shop_category: tenant.shop_category || "standard",
          sow_received: tenant.sow_received || false,
          layout_received: tenant.layout_received || false,
          db_ordered: tenant.db_ordered || false,
          db_order_date: tenant.db_order_date || "",
          db_cost: tenant.db_cost?.toString() || "",
          db_by_tenant: tenant.db_by_tenant || false,
          lighting_ordered: tenant.lighting_ordered || false,
          lighting_order_date: tenant.lighting_order_date || "",
          lighting_cost: tenant.lighting_cost?.toString() || "",
          lighting_by_tenant: tenant.lighting_by_tenant || false,
          cost_reported: tenant.cost_reported || false,
          opening_date: tenant.opening_date || "",
          beneficial_occupation_days: tenant.beneficial_occupation_days?.toString() || "90",
           db_last_order_date: tenant.db_last_order_date || "",
           db_delivery_date: tenant.db_delivery_date || "",
           lighting_last_order_date: tenant.lighting_last_order_date || "",
           lighting_delivery_date: tenant.lighting_delivery_date || "",
           useManualOverride: !!(tenant.db_last_order_date || tenant.lighting_last_order_date),
        });
      }
    }
  }, [open, tenant]);

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
    return rule?.db_size_allowance || null;
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
        // Calculate deadline dates - use manual overrides if set, otherwise auto-calculate
        let deadlineDates: {
         db_last_order_date: string | null;
         db_delivery_date: string | null;
         lighting_last_order_date: string | null;
         lighting_delivery_date: string | null;
       } = {
          db_last_order_date: formData.db_last_order_date || null,
          db_delivery_date: formData.db_delivery_date || null,
          lighting_last_order_date: formData.lighting_last_order_date || null,
          lighting_delivery_date: formData.lighting_delivery_date || null,
       };
 
        // Only auto-calculate if not using manual override
        if (formData.opening_date && !formData.useManualOverride) {
         const openingDate = new Date(formData.opening_date);
         const beneficialDays = parseInt(formData.beneficial_occupation_days) || 90;
         const boDate = addDays(openingDate, -beneficialDays);
         
         const deadlines = calculateOrderDeadlines(boDate);
         deadlineDates = {
           db_last_order_date: format(deadlines.dbLastOrderDate, 'yyyy-MM-dd'),
           db_delivery_date: format(deadlines.dbDeliveryDate, 'yyyy-MM-dd'),
           lighting_last_order_date: format(deadlines.lightingLastOrderDate, 'yyyy-MM-dd'),
           lighting_delivery_date: format(deadlines.lightingDeliveryDate, 'yyyy-MM-dd'),
         };
       }
 
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
        db_order_date: formData.db_order_date || null,
        db_cost: formData.db_cost ? parseFloat(formData.db_cost) : null,
        db_by_tenant: formData.db_by_tenant,
        lighting_ordered: formData.lighting_ordered,
        lighting_order_date: formData.lighting_order_date || null,
        lighting_cost: formData.lighting_cost ? parseFloat(formData.lighting_cost) : null,
        lighting_by_tenant: formData.lighting_by_tenant,
        cost_reported: formData.cost_reported,
        opening_date: formData.opening_date || null,
        beneficial_occupation_days: formData.beneficial_occupation_days ? parseInt(formData.beneficial_occupation_days) : 90,
         ...deadlineDates,
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
              <Label htmlFor="area">Area</Label>
              <InputWithSuffix
                id="area"
                type="number"
                step="0.01"
                suffix="m²"
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
              <Label htmlFor="db_cost">DB Cost</Label>
              <InputWithSuffix
                id="db_cost"
                type="number"
                step="0.01"
                suffix="R"
                value={formData.db_cost}
                onChange={(e) => setFormData({ ...formData, db_cost: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="db_order_date">DB Order Date</Label>
              <Input
                id="db_order_date"
                type="date"
                value={formData.db_order_date}
                onChange={(e) => setFormData({ ...formData, db_order_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lighting_cost">Lighting Cost</Label>
              <InputWithSuffix
                id="lighting_cost"
                type="number"
                step="0.01"
                suffix="R"
                value={formData.lighting_cost}
                onChange={(e) => setFormData({ ...formData, lighting_cost: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lighting_order_date">Lighting Order Date</Label>
              <Input
                id="lighting_order_date"
                type="date"
                value={formData.lighting_order_date}
                onChange={(e) => setFormData({ ...formData, lighting_order_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="opening_date">Opening Date</Label>
              <Input
                id="opening_date"
                type="date"
                value={formData.opening_date}
                onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="beneficial_occupation_days">Beneficial Occupation Period</Label>
              <select
                id="beneficial_occupation_days"
                value={formData.beneficial_occupation_days}
                onChange={(e) => setFormData({ ...formData, beneficial_occupation_days: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="30">30 days</option>
                <option value="45">45 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
          
          {formData.opening_date && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Calculated Dates:</p>
               <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Beneficial Occupation:</span>
                  <span className="ml-2 font-medium">
                    {new Date(new Date(formData.opening_date).getTime() - parseInt(formData.beneficial_occupation_days) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
 
           <DeadlineOverrideFields
             dbLastOrderDate={formData.db_last_order_date}
             dbDeliveryDate={formData.db_delivery_date}
             lightingLastOrderDate={formData.lighting_last_order_date}
             lightingDeliveryDate={formData.lighting_delivery_date}
             useManualOverride={formData.useManualOverride}
             calculatedDates={formData.opening_date ? (() => {
               const openingDate = new Date(formData.opening_date);
               const beneficialDays = parseInt(formData.beneficial_occupation_days) || 90;
               const boDate = addDays(openingDate, -beneficialDays);
               const deadlines = calculateOrderDeadlines(boDate);
               return {
                 dbLastOrderDate: format(deadlines.dbLastOrderDate, 'yyyy-MM-dd'),
                 dbDeliveryDate: format(deadlines.dbDeliveryDate, 'yyyy-MM-dd'),
                 lightingLastOrderDate: format(deadlines.lightingLastOrderDate, 'yyyy-MM-dd'),
                 lightingDeliveryDate: format(deadlines.lightingDeliveryDate, 'yyyy-MM-dd'),
               };
             })() : null}
             onChange={(field, value) => {
               if (field === 'useManualOverride') {
                 // When disabling manual override, reset to calculated dates
                 if (!value && formData.opening_date) {
                   const openingDate = new Date(formData.opening_date);
                   const beneficialDays = parseInt(formData.beneficial_occupation_days) || 90;
                   const boDate = addDays(openingDate, -beneficialDays);
                   const deadlines = calculateOrderDeadlines(boDate);
                   setFormData(prev => ({
                     ...prev,
                     useManualOverride: false,
                     db_last_order_date: format(deadlines.dbLastOrderDate, 'yyyy-MM-dd'),
                     db_delivery_date: format(deadlines.dbDeliveryDate, 'yyyy-MM-dd'),
                     lighting_last_order_date: format(deadlines.lightingLastOrderDate, 'yyyy-MM-dd'),
                     lighting_delivery_date: format(deadlines.lightingDeliveryDate, 'yyyy-MM-dd'),
                   }));
                 } else {
                   setFormData(prev => ({ ...prev, useManualOverride: !!value }));
                 }
               } else {
                 setFormData(prev => ({ ...prev, [field]: value }));
               }
             }}
             onResetToCalculated={() => {
               if (formData.opening_date) {
                 const openingDate = new Date(formData.opening_date);
                 const beneficialDays = parseInt(formData.beneficial_occupation_days) || 90;
                 const boDate = addDays(openingDate, -beneficialDays);
                 const deadlines = calculateOrderDeadlines(boDate);
                 setFormData(prev => ({
                   ...prev,
                   db_last_order_date: format(deadlines.dbLastOrderDate, 'yyyy-MM-dd'),
                   db_delivery_date: format(deadlines.dbDeliveryDate, 'yyyy-MM-dd'),
                   lighting_last_order_date: format(deadlines.lightingLastOrderDate, 'yyyy-MM-dd'),
                   lighting_delivery_date: format(deadlines.lightingDeliveryDate, 'yyyy-MM-dd'),
                 }));
               }
             }}
           />

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
                  id="db_by_tenant"
                  checked={formData.db_by_tenant}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, db_by_tenant: checked as boolean })
                  }
                />
                <Label htmlFor="db_by_tenant" className="font-normal">DB by Tenant</Label>
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
                  id="lighting_by_tenant"
                  checked={formData.lighting_by_tenant}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, lighting_by_tenant: checked as boolean })
                  }
                />
                <Label htmlFor="lighting_by_tenant" className="font-normal">Lighting by Tenant</Label>
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
