import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  db_size: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  db_cost: number | null;
  lighting_ordered: boolean;
  lighting_cost: number | null;
}

interface TenantDialogProps {
  projectId: string;
  tenant?: Tenant | null;
  onSuccess: () => void;
}

export const TenantDialog = ({ projectId, tenant, onSuccess }: TenantDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shop_name: tenant?.shop_name || "",
    shop_number: tenant?.shop_number || "",
    area: tenant?.area?.toString() || "",
    db_size: tenant?.db_size || "",
    sow_received: tenant?.sow_received || false,
    layout_received: tenant?.layout_received || false,
    db_ordered: tenant?.db_ordered || false,
    db_cost: tenant?.db_cost?.toString() || "",
    lighting_ordered: tenant?.lighting_ordered || false,
    lighting_cost: tenant?.lighting_cost?.toString() || "",
  });

  // DB sizing ranges configuration
  const getDbSizeFromArea = (area: number): string => {
    if (area <= 80) return "60A TP";
    if (area <= 200) return "80A TP";
    if (area <= 300) return "100A TP";
    if (area <= 450) return "125A TP";
    if (area <= 600) return "160A TP";
    if (area <= 1200) return "200A TP";
    return "200A TP"; // default for > 1200m²
  };

  const handleAreaChange = (value: string) => {
    setFormData({ ...formData, area: value });
    
    // Auto-calculate DB size when area is entered
    if (value && !isNaN(parseFloat(value))) {
      const calculatedDbSize = getDbSizeFromArea(parseFloat(value));
      setFormData(prev => ({ ...prev, area: value, db_size: calculatedDbSize }));
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
        db_size: formData.db_size || null,
        sow_received: formData.sow_received,
        layout_received: formData.layout_received,
        db_ordered: formData.db_ordered,
        db_cost: formData.db_cost ? parseFloat(formData.db_cost) : null,
        lighting_ordered: formData.lighting_ordered,
        lighting_cost: formData.lighting_cost ? parseFloat(formData.lighting_cost) : null,
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
              <p className="text-xs text-muted-foreground mt-1">
                DB size will auto-calculate based on area
              </p>
            </div>
            <div>
              <Label htmlFor="db_size">DB Size (Auto-calculated)</Label>
              <Input
                id="db_size"
                value={formData.db_size}
                onChange={(e) => setFormData({ ...formData, db_size: e.target.value })}
                placeholder="e.g., 60A TP"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can edit this after auto-calculation
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
