import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { LogoUpload } from "@/components/LogoUpload";
import { Switch } from "@/components/ui/switch";

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
  const [useCustomConsultantLogo, setUseCustomConsultantLogo] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
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

  // Fetch company settings for default consultant logo
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch project contacts for client selection
  const { data: projectContacts = [] } = useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", projectId)
        .order("is_primary", { ascending: false })
        .order("organization_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
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

  // Auto-populate consultant logo from company settings
  useEffect(() => {
    if (companySettings?.company_logo_url && !useCustomConsultantLogo) {
      setFormData(prev => ({ ...prev, consultant_logo_url: companySettings.company_logo_url }));
    }
  }, [companySettings, useCustomConsultantLogo]);

  // Auto-populate client details when contact is selected
  useEffect(() => {
    if (selectedContactId) {
      const contact = projectContacts.find(c => c.id === selectedContactId);
      if (contact) {
        setFormData(prev => ({
          ...prev,
          prepared_for_company: contact.organization_name || "",
          prepared_for_contact: contact.contact_person_name || "",
          prepared_for_tel: contact.phone || "",
          client_logo_url: contact.logo_url || "",
        }));
      }
    }
  }, [selectedContactId, projectContacts]);

  const getContactTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client: "Client",
      quantity_surveyor: "Quantity Surveyor",
      architect: "Architect",
      contractor: "Contractor",
      engineer: "Engineer",
      consultant: "Consultant",
      other: "Other",
    };
    return labels[type] || type;
  };

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
              <div className="space-y-3">
                <Label>Consultant Logo (Your Company)</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={useCustomConsultantLogo}
                    onCheckedChange={(checked) => {
                      setUseCustomConsultantLogo(checked);
                      if (!checked && companySettings?.company_logo_url) {
                        setFormData(prev => ({ ...prev, consultant_logo_url: companySettings.company_logo_url }));
                      }
                    }}
                  />
                  <span className="text-muted-foreground">Use custom logo</span>
                </div>
                {useCustomConsultantLogo ? (
                  <LogoUpload
                    currentUrl={formData.consultant_logo_url}
                    onUrlChange={(url) =>
                      setFormData({ ...formData, consultant_logo_url: url })
                    }
                    label="Upload Logo"
                    id="consultant-logo"
                  />
                ) : (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    {formData.consultant_logo_url ? (
                      <img
                        src={formData.consultant_logo_url}
                        alt="Company logo"
                        className="max-h-16 object-contain"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No company logo set. Configure in Settings.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label>Client Logo</Label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from project contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom upload...</SelectItem>
                    {projectContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.organization_name} ({getContactTypeLabel(contact.contact_type)})
                        {contact.is_primary && " ⭐"}
                        {contact.logo_url && " 🖼️"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContactId === "custom" ? (
                  <LogoUpload
                    currentUrl={formData.client_logo_url}
                    onUrlChange={(url) =>
                      setFormData({ ...formData, client_logo_url: url })
                    }
                    label="Upload Logo"
                    id="client-logo"
                  />
                ) : formData.client_logo_url ? (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <img
                      src={formData.client_logo_url}
                      alt="Client logo"
                      className="max-h-16 object-contain"
                    />
                  </div>
                ) : selectedContactId ? (
                  <p className="text-sm text-muted-foreground">
                    Selected contact has no logo. You can upload one in Project Contacts.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a contact to use their logo, or choose "Custom upload".
                  </p>
                )}
                {projectContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No contacts available. Add contacts in Project Settings.
                  </p>
                )}
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
            {selectedContactId && selectedContactId !== "custom" && (
              <p className="text-sm text-muted-foreground">
                Auto-populated from selected contact. You can edit below if needed.
              </p>
            )}
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
