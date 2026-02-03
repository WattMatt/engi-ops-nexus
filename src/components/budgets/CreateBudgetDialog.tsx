import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ContactCombobox } from "@/components/shared/ContactCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus } from "lucide-react";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

// Helper to increment revision string (Rev 0 -> Rev 1, Rev A -> Rev B, etc.)
const incrementRevision = (revision: string): string => {
  const match = revision.match(/^(Rev\s*)(\d+)$/i);
  if (match) {
    return `${match[1]}${parseInt(match[2]) + 1}`;
  }
  const letterMatch = revision.match(/^(Rev\s*)([A-Z])$/i);
  if (letterMatch) {
    const nextChar = String.fromCharCode(letterMatch[2].charCodeAt(0) + 1);
    return `${letterMatch[1]}${nextChar}`;
  }
  // Default: append " (New)"
  return `${revision} (New)`;
};

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
  const [duplicateFromId, setDuplicateFromId] = useState<string>("new");
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
    baseline_allowances: "",
    exclusions: "",
  });

  // Fetch existing budgets for this project to allow duplication
  const { data: existingBudgets = [] } = useQuery({
    queryKey: ["electrical-budgets-for-duplication", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("id, budget_number, revision, budget_date")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!projectId,
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

  // Handle selection of budget to duplicate from
  useEffect(() => {
    if (duplicateFromId && duplicateFromId !== "new") {
      const sourceBudget = existingBudgets.find(b => b.id === duplicateFromId);
      if (sourceBudget) {
        setFormData(prev => ({
          ...prev,
          budget_number: sourceBudget.budget_number,
          revision: incrementRevision(sourceBudget.revision),
        }));
      }
    } else if (duplicateFromId === "new") {
      setFormData(prev => ({
        ...prev,
        budget_number: "",
        revision: "Rev 0",
      }));
    }
  }, [duplicateFromId, existingBudgets]);

  // Auto-populate consultant logo from company settings
  useEffect(() => {
    if (companySettings?.company_logo_url && !useCustomConsultantLogo) {
      setFormData(prev => ({ ...prev, consultant_logo_url: companySettings.company_logo_url }));
    }
  }, [companySettings, useCustomConsultantLogo]);

  // Handle contact selection with auto-population
  const handleContactSelect = (contact: { 
    id: string; 
    organization_name: string | null; 
    contact_person_name: string | null; 
    phone: string | null; 
    logo_url: string | null;
  } | null) => {
    if (contact) {
      setFormData(prev => ({
        ...prev,
        prepared_for_company: contact.organization_name || "",
        prepared_for_contact: contact.contact_person_name || "",
        prepared_for_tel: contact.phone || "",
        client_logo_url: contact.logo_url || "",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        prepared_for_company: "",
        prepared_for_contact: "",
        prepared_for_tel: "",
        client_logo_url: "",
      }));
    }
  };

  const duplicateBudgetData = async (sourceBudgetId: string, newBudgetId: string) => {
    // Fetch source budget details for additional fields
    const { data: sourceBudget } = await supabase
      .from("electrical_budgets")
      .select("baseline_allowances, exclusions, prepared_for_company, prepared_for_contact, prepared_for_tel, consultant_logo_url, client_logo_url")
      .eq("id", sourceBudgetId)
      .single();

    // Update new budget with source budget's additional fields if not already set
    if (sourceBudget) {
      await supabase
        .from("electrical_budgets")
        .update({
          baseline_allowances: formData.baseline_allowances || sourceBudget.baseline_allowances,
          exclusions: formData.exclusions || sourceBudget.exclusions,
          prepared_for_company: formData.prepared_for_company || sourceBudget.prepared_for_company,
          prepared_for_contact: formData.prepared_for_contact || sourceBudget.prepared_for_contact,
          prepared_for_tel: formData.prepared_for_tel || sourceBudget.prepared_for_tel,
        })
        .eq("id", newBudgetId);
    }

    // Fetch sections from source budget
    const { data: sections, error: sectionsError } = await supabase
      .from("budget_sections")
      .select("*")
      .eq("budget_id", sourceBudgetId)
      .order("display_order");

    if (sectionsError) throw sectionsError;
    if (!sections || sections.length === 0) return;

    // Create mapping of old section IDs to new section IDs
    const sectionIdMap: Record<string, string> = {};

    // Insert new sections
    for (const section of sections) {
      const { data: newSection, error: insertError } = await supabase
        .from("budget_sections")
        .insert({
          budget_id: newBudgetId,
          section_code: section.section_code,
          section_name: section.section_name,
          display_order: section.display_order,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      sectionIdMap[section.id] = newSection.id;
    }

    // Fetch line items from all source sections
    const sectionIds = sections.map(s => s.id);
    const { data: lineItems, error: lineItemsError } = await supabase
      .from("budget_line_items")
      .select("*")
      .in("section_id", sectionIds)
      .order("display_order");

    if (lineItemsError) throw lineItemsError;
    if (!lineItems || lineItems.length === 0) return;

    // Insert line items with new section IDs
    const newLineItems = lineItems.map(item => ({
      section_id: sectionIdMap[item.section_id],
      item_number: item.item_number,
      description: item.description,
      area: item.area,
      area_unit: item.area_unit,
      base_rate: item.base_rate,
      ti_rate: item.ti_rate,
      total: item.total,
      display_order: item.display_order,
      master_rate_id: item.master_rate_id,
      master_material_id: item.master_material_id,
      rate_overridden: item.rate_overridden,
      override_reason: item.override_reason,
      tenant_id: item.tenant_id,
      is_tenant_item: item.is_tenant_item,
      shop_number: item.shop_number,
    }));

    const { error: insertLineItemsError } = await supabase
      .from("budget_line_items")
      .insert(newLineItems);

    if (insertLineItemsError) throw insertLineItemsError;
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

      // If duplicating from existing budget, copy sections and line items
      if (duplicateFromId && duplicateFromId !== "new") {
        await duplicateBudgetData(duplicateFromId, budget.id);
      }

      toast({
        title: "Success",
        description: duplicateFromId !== "new" 
          ? "Budget revision created with duplicated data" 
          : "Budget created successfully",
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

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setDuplicateFromId("new");
      setSelectedContactId("");
      setFormData({
        budget_number: "",
        revision: "Rev 0",
        budget_date: new Date().toISOString().split("T")[0],
        prepared_for_company: "",
        prepared_for_contact: "",
        prepared_for_tel: "",
        notes: "",
        consultant_logo_url: "",
        client_logo_url: "",
        baseline_allowances: "",
        exclusions: "",
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Electrical Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Budget Source Selection */}
          {existingBudgets.length > 0 && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
              <Label>Create From</Label>
              <Select value={duplicateFromId} onValueChange={setDuplicateFromId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Start Fresh (Empty Budget)</span>
                    </div>
                  </SelectItem>
                  {existingBudgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        <span>
                          {budget.budget_number} - {budget.revision} ({new Date(budget.budget_date).toLocaleDateString()})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {duplicateFromId !== "new" && (
                <p className="text-sm text-muted-foreground">
                  All sections and line items will be copied to the new revision.
                </p>
              )}
            </div>
          )}

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
                <ContactCombobox
                  value={selectedContactId}
                  onValueChange={setSelectedContactId}
                  onContactSelect={handleContactSelect}
                  label="Client Contact"
                  includeCustomOption={true}
                  useGlobalContacts={true}
                />
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
                ) : null}
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
              {loading 
                ? (duplicateFromId !== "new" ? "Creating Revision..." : "Creating...") 
                : (duplicateFromId !== "new" ? "Create Revision" : "Create Budget")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
