import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variationId: string;
  projectId: string;
  onSuccess: () => void;
}

export const EditVariationDialog = ({
  open,
  onOpenChange,
  variationId,
  projectId,
  onSuccess,
}: EditVariationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    tenant_id: "",
    is_credit: false,
  });

  const { data: variation } = useQuery({
    queryKey: ["variation-detail", variationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select("*")
        .eq("id", variationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!variationId && open,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["project-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number")
        .eq("project_id", projectId)
        .order("shop_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open,
  });

  useEffect(() => {
    if (variation) {
      setFormData({
        code: variation.code || "",
        description: variation.description || "",
        tenant_id: variation.tenant_id || "none",
        is_credit: variation.is_credit || false,
      });
    }
  }, [variation]);

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast({
        title: "Error",
        description: "Variation code is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const oldTenantId = variation?.tenant_id;
      const newTenantId = formData.tenant_id === "none" ? null : formData.tenant_id;

      const { error } = await supabase
        .from("cost_variations")
        .update({
          code: formData.code.trim(),
          description: formData.description.trim(),
          tenant_id: newTenantId,
          is_credit: formData.is_credit,
        })
        .eq("id", variationId);

      if (error) throw error;

      // Handle tenant cost_reported flag updates
      if (oldTenantId !== newTenantId) {
        // If old tenant exists and was changed, check if it has other variations
        if (oldTenantId) {
          const { data: otherVariations } = await supabase
            .from("cost_variations")
            .select("id")
            .eq("tenant_id", oldTenantId)
            .neq("id", variationId);
          
          // If no other variations, unset cost_reported
          if (!otherVariations || otherVariations.length === 0) {
            await supabase
              .from("tenants")
              .update({ cost_reported: false })
              .eq("id", oldTenantId);
          }
        }
        
        // If new tenant is assigned, set cost_reported to true
        if (newTenantId) {
          await supabase
            .from("tenants")
            .update({ cost_reported: true })
            .eq("id", newTenantId);
        }
      }

      toast({
        title: "Success",
        description: "Variation updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Variation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="VO-001"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Variation description"
            />
          </div>

          <div>
            <Label htmlFor="tenant">Tenant (Optional)</Label>
            <Select
              value={formData.tenant_id}
              onValueChange={(value) =>
                setFormData({ ...formData, tenant_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General (No Tenant)</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.shop_number} - {tenant.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_credit">Credit Note</Label>
            <Switch
              id="is_credit"
              checked={formData.is_credit}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_credit: checked })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
