import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";

interface AddVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  projectId: string;
  onSuccess: (variationId: string) => void;
}

export const AddVariationDialog = ({
  open,
  onOpenChange,
  reportId,
  projectId,
  onSuccess,
}: AddVariationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    tenant_id: "none",
    is_credit: "true",
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      
      return data ? sortTenantsByShopNumber(data) : [];
    },
    enabled: !!projectId,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ["cost-variations", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_variations")
        .select("code, tenant_id")
        .eq("cost_report_id", reportId)
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!reportId && open,
  });

  // Filter out tenants already assigned to variations
  const availableTenants = tenants.filter(
    tenant => !variations.some(v => v.tenant_id === tenant.id)
  );

  // Auto-calculate next variation code when dialog opens
  useEffect(() => {
    if (open && variations.length >= 0) {
      // Extract numbers from existing codes (e.g., "G1" -> 1, "G2" -> 2)
      const existingNumbers = variations
        .map(v => {
          const match = v.code.match(/G(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      const nextNumber = existingNumbers.length > 0 
        ? Math.max(...existingNumbers) + 1 
        : 1;
      
      setFormData(prev => ({ ...prev, code: `G${nextNumber}` }));
    }
  }, [open, variations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.from("cost_variations").insert({
        cost_report_id: reportId,
        tenant_id: formData.tenant_id === "none" ? null : formData.tenant_id,
        code: formData.code,
        description: formData.description,
        amount: 0,
        is_credit: formData.is_credit === "true",
        display_order: 0,
      }).select().single();

      if (error) throw error;

      // Update tenant's cost_reported flag if tenant is assigned
      if (formData.tenant_id !== "none") {
        const { error: tenantError } = await supabase
          .from("tenants")
          .update({ cost_reported: true })
          .eq("id", formData.tenant_id);
        
        if (tenantError) console.error("Failed to update tenant:", tenantError);
      }

      toast({
        title: "Success",
        description: "Variation created. Add line items to calculate total.",
      });

      setFormData({
        code: "",
        description: "",
        tenant_id: "none",
        is_credit: "true",
      });
      
      onOpenChange(false);
      onSuccess(data.id);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Variation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="G1, G2..."
                required
              />
            </div>
            <div>
              <Label htmlFor="is_credit">Type *</Label>
              <Select
                value={formData.is_credit}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_credit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Credit (Saving)</SelectItem>
                  <SelectItem value="false">Extra (Additional Cost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Project Credit / Tenant Credit"
              required
            />
          </div>

          <div>
            <Label htmlFor="tenant_id">Related Tenant (Optional)</Label>
            <Select
              value={formData.tenant_id}
              onValueChange={(value) =>
                setFormData({ ...formData, tenant_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tenant (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (General)</SelectItem>
                {availableTenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.shop_number} - {tenant.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Variation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
