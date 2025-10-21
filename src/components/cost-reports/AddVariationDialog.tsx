import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface AddVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  projectId: string;
  onSuccess: () => void;
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
    tenant_id: "",
    amount: "",
    is_credit: "true",
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId)
        .order("shop_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("cost_variations").insert({
        cost_report_id: reportId,
        tenant_id: formData.tenant_id || null,
        code: formData.code,
        description: formData.description,
        amount: parseFloat(formData.amount),
        is_credit: formData.is_credit === "true",
        display_order: 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Variation added successfully",
      });

      onSuccess();
      setFormData({
        code: "",
        description: "",
        tenant_id: "",
        amount: "",
        is_credit: "true",
      });
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
                <SelectItem value="">None (General)</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.shop_number} - {tenant.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
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
