import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    project_name: "",
    client_name: "",
    client_vat_number: "",
    client_address: "",
    agreed_fee: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const agreedFee = parseFloat(formData.agreed_fee);

      const { error } = await supabase.from("invoice_projects").insert([
        {
          project_name: formData.project_name,
          client_name: formData.client_name,
          client_vat_number: formData.client_vat_number || null,
          client_address: formData.client_address || null,
          agreed_fee: agreedFee,
          total_invoiced: 0,
          outstanding_amount: agreedFee,
          status: "active",
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({ title: "Project created successfully" });
      onOpenChange(false);
      onSuccess?.();
      setFormData({
        project_name: "",
        client_name: "",
        client_vat_number: "",
        client_address: "",
        agreed_fee: "",
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to track invoicing and payments
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="SEGONYANA - PV INSTALLATION"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="ZINVOMAX (PTY) LTD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_vat_number">Client VAT Number</Label>
                <Input
                  id="client_vat_number"
                  value={formData.client_vat_number}
                  onChange={(e) => setFormData({ ...formData, client_vat_number: e.target.value })}
                  placeholder="41 503 052 50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_address">Client Address</Label>
              <Textarea
                id="client_address"
                value={formData.client_address}
                onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                placeholder="PO BOX 72689, LYNNWOOD RIDGE, 0040"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreed_fee">Agreed Fee (R)</Label>
              <Input
                id="agreed_fee"
                type="number"
                step="0.01"
                value={formData.agreed_fee}
                onChange={(e) => setFormData({ ...formData, agreed_fee: e.target.value })}
                placeholder="470000.00"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
