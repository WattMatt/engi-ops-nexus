import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { LogoUpload } from "@/components/LogoUpload";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export const CreateBudgetDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateBudgetDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    budget_number: "",
    revision: "Rev 0",
    budget_date: new Date().toISOString().split("T")[0],
    prepared_for_company: "",
    prepared_for_contact: "",
    prepared_for_tel: "",
    notes: "",
    consultant_logo_url: "",
    client_logo_url: "",
  });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!projectId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: budget, error } = await supabase
        .from("electrical_budgets")
        .insert({
          project_id: projectId,
          budget_number: formData.budget_number,
          revision: formData.revision,
          budget_date: formData.budget_date,
          prepared_for_company: formData.prepared_for_company || null,
          prepared_for_contact: formData.prepared_for_contact || null,
          prepared_for_tel: formData.prepared_for_tel || null,
          notes: formData.notes || null,
          consultant_logo_url: formData.consultant_logo_url || null,
          client_logo_url: formData.client_logo_url || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget created successfully",
      });

      onSuccess();
      navigate(`/dashboard/budgets/electrical/${budget.id}`);
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
          <DialogTitle>Create Electrical Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget_number">Budget Number *</Label>
              <Input
                id="budget_number"
                value={formData.budget_number}
                onChange={(e) =>
                  setFormData({ ...formData, budget_number: e.target.value })
                }
                placeholder="BUD-001"
                required
              />
            </div>
            <div>
              <Label htmlFor="revision">Revision</Label>
              <Input
                id="revision"
                value={formData.revision}
                onChange={(e) =>
                  setFormData({ ...formData, revision: e.target.value })
                }
                placeholder="Rev 0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="budget_date">Budget Date *</Label>
            <Input
              id="budget_date"
              type="date"
              value={formData.budget_date}
              onChange={(e) =>
                setFormData({ ...formData, budget_date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Company Logos</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Consultant Logo (Your Company)</Label>
                <LogoUpload
                  currentUrl={formData.consultant_logo_url}
                  onUrlChange={(url) =>
                    setFormData({ ...formData, consultant_logo_url: url })
                  }
                  label="Upload Logo"
                  id="consultant-logo"
                />
              </div>
              <div>
                <Label>Client Logo</Label>
                <LogoUpload
                  currentUrl={formData.client_logo_url}
                  onUrlChange={(url) =>
                    setFormData({ ...formData, client_logo_url: url })
                  }
                  label="Upload Logo"
                  id="client-logo"
                />
              </div>
            </div>
          </div>

          {project && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Project Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Project Number</p>
                  <p className="font-medium">{project.project_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Project Name</p>
                  <p className="font-medium">{project.name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Prepared For</h4>
            <div>
              <Label htmlFor="prepared_for_company">Company</Label>
              <Input
                id="prepared_for_company"
                value={formData.prepared_for_company}
                onChange={(e) =>
                  setFormData({ ...formData, prepared_for_company: e.target.value })
                }
                placeholder="Client Company Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepared_for_contact">Contact Person</Label>
                <Input
                  id="prepared_for_contact"
                  value={formData.prepared_for_contact}
                  onChange={(e) =>
                    setFormData({ ...formData, prepared_for_contact: e.target.value })
                  }
                  placeholder="Contact Name"
                />
              </div>
              <div>
                <Label htmlFor="prepared_for_tel">Telephone</Label>
                <Input
                  id="prepared_for_tel"
                  value={formData.prepared_for_tel}
                  onChange={(e) =>
                    setFormData({ ...formData, prepared_for_tel: e.target.value })
                  }
                  placeholder="(012) 123 4567"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
