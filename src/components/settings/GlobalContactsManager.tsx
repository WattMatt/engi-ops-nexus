import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Settings2, FolderOpen, Filter, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GlobalContact {
  id: string;
  contact_type: string;
  organization_name: string;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  logo_url: string | null;
  notes: string | null;
}

// Default contact categories
const DEFAULT_CONTACT_TYPES = [
  { value: "supply_authority", label: "Supply Authority" },
  { value: "client", label: "Client" },
  { value: "architect", label: "Architect" },
  { value: "mechanical", label: "Mechanical" },
  { value: "fire", label: "Fire" },
  { value: "structural", label: "Structural" },
  { value: "civil", label: "Civil" },
  { value: "wet_services", label: "Wet Services" },
  { value: "tenant_coordinator", label: "Tenant Coordinator" },
  { value: "safety", label: "Safety" },
  { value: "landscaping", label: "Landscaping" },
  { value: "quantity_surveyor", label: "Quantity Surveyor" },
  { value: "contractor", label: "Contractor" },
  { value: "engineer", label: "Engineer" },
  { value: "consultant", label: "Consultant" },
];

export function GlobalContactsManager() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GlobalContact | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["client"]));
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom categories from database
  const { data: customCategories = [] } = useQuery({
    queryKey: ["contact-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_categories")
        .select("value, label")
        .eq("is_custom", true)
        .order("label");
      
      if (error) throw error;
      return data as Array<{ value: string; label: string }>;
    },
  });

  // Combined categories
  const allContactTypes = [...DEFAULT_CONTACT_TYPES, ...customCategories];

  const [formData, setFormData] = useState({
    contact_type: "client",
    organization_name: "",
    contact_person_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    logo_url: "",
    notes: "",
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["global-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_contacts")
        .select("*")
        .order("organization_name");
      
      if (error) throw error;
      return data as GlobalContact[];
    },
  });

  // Fetch project usage for each global contact
  const { data: contactProjectUsage } = useQuery({
    queryKey: ["global-contacts-project-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select(`
          global_contact_id,
          project_id,
          projects:project_id (
            id,
            name,
            project_number
          )
        `)
        .not("global_contact_id", "is", null);
      
      if (error) throw error;
      
      // Group by global_contact_id
      const usage: Record<string, Array<{ id: string; name: string; project_number: string | null }>> = {};
      data?.forEach((item: any) => {
        if (item.global_contact_id && item.projects) {
          if (!usage[item.global_contact_id]) {
            usage[item.global_contact_id] = [];
          }
          // Avoid duplicates
          if (!usage[item.global_contact_id].some(p => p.id === item.projects.id)) {
            usage[item.global_contact_id].push({
              id: item.projects.id,
              name: item.projects.name,
              project_number: item.projects.project_number,
            });
          }
        }
      });
      
      return usage;
    },
  });

  // Filter contacts based on usage
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (usageFilter === "all") return contacts;
    
    return contacts.filter(contact => {
      const isUsed = contactProjectUsage?.[contact.id]?.length > 0;
      return usageFilter === "used" ? isUsed : !isUsed;
    });
  }, [contacts, contactProjectUsage, usageFilter]);

  // Group filtered contacts by type
  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const type = contact.contact_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(contact);
    return acc;
  }, {} as Record<string, GlobalContact[]>);

  // Get categories that have contacts
  const categoriesWithContacts = Object.keys(groupedContacts);
  
  // All categories to display (those with contacts + all defined types)
  const allCategoriesToDisplay = [...new Set([
    ...allContactTypes.map(t => t.value),
    ...categoriesWithContacts
  ])];

  // Helper to navigate to a project
  const navigateToProject = (projectId: string) => {
    localStorage.setItem("selectedProjectId", projectId);
    navigate("/dashboard");
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryLabel.trim()) return;
    
    const value = newCategoryLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if already exists in local list
    if (allContactTypes.some(t => t.value === value || t.label.toLowerCase() === newCategoryLabel.toLowerCase())) {
      toast({
        title: "Category exists",
        description: "This category already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("contact_categories")
        .insert({
          value,
          label: newCategoryLabel.trim(),
          is_custom: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Category created successfully:", data);

      // Force refetch the categories
      await queryClient.invalidateQueries({ queryKey: ["contact-categories"] });
      await queryClient.refetchQueries({ queryKey: ["contact-categories"] });
      
      toast({
        title: "Category added",
        description: `"${newCategoryLabel}" has been added to the categories`,
      });
      
      setNewCategoryLabel("");
      setCategoryDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryValue: string) => {
    const contactsInCategory = groupedContacts[categoryValue]?.length || 0;
    if (contactsInCategory > 0) {
      toast({
        title: "Cannot delete",
        description: `This category has ${contactsInCategory} contact(s). Move or delete them first.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("contact_categories")
        .delete()
        .eq("value", categoryValue);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["contact-categories"] });
      
      toast({
        title: "Category removed",
        description: "The category has been removed",
      });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `contact-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Get existing logo for an organization (for auto-populating)
  const getOrganizationLogo = (orgName: string): string | null => {
    if (!contacts || !orgName.trim()) return null;
    const existingContact = contacts.find(
      c => c.organization_name.toLowerCase() === orgName.toLowerCase() && c.logo_url
    );
    return existingContact?.logo_url || null;
  };

  // When organization name changes, check if we should auto-populate logo
  const handleOrganizationNameChange = (newName: string) => {
    setFormData(prev => {
      const existingLogo = getOrganizationLogo(newName);
      // Only auto-populate if current form has no logo and org has an existing one
      if (existingLogo && !prev.logo_url) {
        return { ...prev, organization_name: newName, logo_url: existingLogo };
      }
      return { ...prev, organization_name: newName };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('global_contacts')
          .update({
            contact_type: formData.contact_type,
            organization_name: formData.organization_name,
            contact_person_name: formData.contact_person_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address_line1: formData.address_line1 || null,
            address_line2: formData.address_line2 || null,
            logo_url: formData.logo_url || null,
            notes: formData.notes || null,
          })
          .eq('id', editingContact.id);

        if (error) throw error;

        // Sync logo across all contacts with the same organization name
        if (formData.logo_url) {
          await supabase
            .from('global_contacts')
            .update({ logo_url: formData.logo_url })
            .eq('organization_name', formData.organization_name)
            .neq('id', editingContact.id);
        }

        toast({
          title: "Success",
          description: "Contact updated successfully",
        });
      } else {
        // Check if organization already has a logo we should use
        const existingLogo = getOrganizationLogo(formData.organization_name);
        const logoToUse = formData.logo_url || existingLogo;

        const { error } = await supabase
          .from('global_contacts')
          .insert({
            contact_type: formData.contact_type,
            organization_name: formData.organization_name,
            contact_person_name: formData.contact_person_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address_line1: formData.address_line1 || null,
            address_line2: formData.address_line2 || null,
            logo_url: logoToUse || null,
            notes: formData.notes || null,
          });

        if (error) throw error;

        // If a new logo was uploaded, sync it to other contacts with same org
        if (formData.logo_url && formData.logo_url !== existingLogo) {
          await supabase
            .from('global_contacts')
            .update({ logo_url: formData.logo_url })
            .eq('organization_name', formData.organization_name);
        }

        toast({
          title: "Success",
          description: "Contact added to library",
        });

        // Expand the category the contact was added to
        setExpandedCategories(prev => new Set([...prev, formData.contact_type]));
      }

      queryClient.invalidateQueries({ queryKey: ["global-contacts"] });
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact from the library? It will still remain linked to existing projects.")) return;

    try {
      const { error } = await supabase
        .from('global_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact removed from library",
      });

      queryClient.invalidateQueries({ queryKey: ["global-contacts"] });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (contact: GlobalContact) => {
    setEditingContact(contact);
    setFormData({
      contact_type: contact.contact_type,
      organization_name: contact.organization_name,
      contact_person_name: contact.contact_person_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address_line1: contact.address_line1 || "",
      address_line2: contact.address_line2 || "",
      logo_url: contact.logo_url || "",
      notes: contact.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      contact_type: "client",
      organization_name: "",
      contact_person_name: "",
      email: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      logo_url: "",
      notes: "",
    });
  };

  const getContactTypeLabel = (type: string) => {
    return allContactTypes.find(t => t.value === type)?.label || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isCustomCategory = (categoryValue: string) => {
    return customCategories.some(c => c.value === categoryValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Global Contacts Library</CardTitle>
            <CardDescription>
              Manage your contacts library organized by category for quick selection across all projects
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Usage Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={usageFilter} onValueChange={(value: "all" | "used" | "unused") => setUsageFilter(value)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="used">Used in Projects</SelectItem>
                  <SelectItem value="unused">Not Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Manage Categories Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Categories
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Categories</DialogTitle>
                  <DialogDescription>
                    Add custom categories to organize your contacts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name..."
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button onClick={handleAddCategory} disabled={!newCategoryLabel.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Default Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_CONTACT_TYPES.map(type => (
                        <span
                          key={type.value}
                          className="px-2 py-1 bg-muted rounded-md text-sm"
                        >
                          {type.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {customCategories.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Custom Categories</Label>
                      <div className="space-y-1">
                        {customCategories.map(type => (
                          <div
                            key={type.value}
                            className="flex items-center justify-between px-2 py-1 bg-muted rounded-md"
                          >
                            <span className="text-sm">{type.label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteCategory(type.value)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Contact Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                  <DialogDescription>
                    Add a contact to your global library for easy reuse across projects
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_type">Category *</Label>
                      <Select
                        value={formData.contact_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, contact_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allContactTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organization_name">Organization Name *</Label>
                      <Input
                        id="organization_name"
                        value={formData.organization_name}
                        onChange={(e) => handleOrganizationNameChange(e.target.value)}
                        onBlur={() => {
                          // Also check on blur in case they paste a name
                          const existingLogo = getOrganizationLogo(formData.organization_name);
                          if (existingLogo && !formData.logo_url) {
                            setFormData(prev => ({ ...prev, logo_url: existingLogo }));
                          }
                        }}
                        placeholder="ABC Company (Pty) Ltd"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Organization Logo</Label>
                    <div className="flex items-center gap-4">
                      {formData.logo_url && (
                        <img
                          src={formData.logo_url}
                          alt="Logo"
                          className="h-16 w-auto object-contain border rounded p-2"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG or SVG recommended
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_person_name">Contact Person</Label>
                      <Input
                        id="contact_person_name"
                        value={formData.contact_person_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_person_name: e.target.value }))}
                        placeholder="John Smith"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(012) 345 6789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                      placeholder="City, Province, Postal Code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional information..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingContact ? "Update Contact" : "Add Contact"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!contacts || contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No contacts in library yet</p>
            <p className="text-sm">Add contacts to quickly assign them to projects</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allContactTypes.map((type) => {
              const categoryContacts = groupedContacts[type.value] || [];
              const isExpanded = expandedCategories.has(type.value);
              const hasContacts = categoryContacts.length > 0;

              return (
                <Collapsible
                  key={type.value}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(type.value)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${hasContacts ? 'bg-muted hover:bg-muted/80' : 'bg-muted/30 hover:bg-muted/50'}`}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{type.label}</span>
                        <span className="text-sm text-muted-foreground">
                          ({categoryContacts.length})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, contact_type: type.value }));
                          setDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {hasContacts ? (
                      <div className="grid gap-3 md:grid-cols-2 p-3 pt-2">
                        {categoryContacts.map((contact) => {
                          const projectsUsingContact = contactProjectUsage?.[contact.id] || [];
                          const projectCount = projectsUsingContact.length;
                          
                          return (
                          <div key={contact.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {contact.logo_url && (
                                  <img
                                    src={contact.logo_url}
                                    alt={contact.organization_name}
                                    className="h-10 w-auto object-contain"
                                  />
                                )}
                                <div>
                                  <h4 className="font-semibold">{contact.organization_name}</h4>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(contact)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(contact.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              {contact.contact_person_name && (
                                <p className="text-muted-foreground">Contact: {contact.contact_person_name}</p>
                              )}
                              {contact.email && (
                                <p className="text-muted-foreground">Email: {contact.email}</p>
                              )}
                              {contact.phone && (
                                <p className="text-muted-foreground">Phone: {contact.phone}</p>
                              )}
                            </div>

                            {/* Projects using this contact */}
                            {projectCount > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-2 mb-2">
                                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Used in {projectCount} project{projectCount !== 1 ? 's' : ''}:
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {projectsUsingContact.slice(0, 3).map((project) => (
                                    <Badge
                                      key={project.id}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs gap-1"
                                      onClick={() => navigateToProject(project.id)}
                                    >
                                      {project.project_number || project.name}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </Badge>
                                  ))}
                                  {projectCount > 3 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs cursor-help">
                                          +{projectCount - 3} more
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" align="start" className="max-w-xs">
                                        <div className="space-y-1">
                                          <p className="font-medium text-sm">More projects:</p>
                                          <ul className="text-xs space-y-1">
                                            {projectsUsingContact.slice(3).map((project) => (
                                              <li 
                                                key={project.id} 
                                                className="flex items-center gap-1 cursor-pointer hover:text-primary"
                                                onClick={() => navigateToProject(project.id)}
                                              >
                                                <span>
                                                  {project.project_number ? `${project.project_number} - ` : ''}
                                                  {project.name}
                                                </span>
                                                <ExternalLink className="h-2.5 w-2.5" />
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No contacts in this category
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
